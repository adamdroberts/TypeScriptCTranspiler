import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {earlyControlFlowStaticSemanticsFailure} from '../../src/control-static-semantics';
import {createEcmaSourceFile} from '../../src/ecmascript-source';
import {nodeReferenceSync} from './node-reference';

const NODE=process.env.TSC2C_NODE_REFERENCE??'node';

/* A ForDeclaration or var ForBinding in a for-in/of head takes no Initializer
 * except Annex B's non-strict `for (var BindingIdentifier Initializer in ...)`.
 * Generated heads over declaration kinds, binding shapes, loop kinds and
 * strictness compare the early verdict with Node's parser; one deep pattern
 * checks the walk. At runtime (B.3.5) the initializer is evaluated once, with
 * NamedEvaluation, and bound before the object expression: generated loops
 * over contexts, initializers and objects compare their logs with Node. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const kinds=['var','let','const'];
const bindings=['x','[x]','{x}','[x = 1]','{x = 1}','{a: [x]}'];
function head(random:()=>number):string{
 const kind=kinds[Math.floor(random()*kinds.length)]!;
 const binding=bindings[Math.floor(random()*bindings.length)]!;
 const initializer=random()<0.6?` = ${['1','o','[]','{}','f()'][Math.floor(random()*5)]!}`:'';
 const loop=random()<0.5?'in o':'of []';
 return `for (${kind} ${binding}${initializer} ${loop}) ;`;
}
function program(random:()=>number,strict:boolean):string{
 return `${strict?'"use strict";\n':''}var o = {}, f = () => 1;\nfunction g() {\n${head(random)}\n}\n`;
}
function ours(source:string):boolean{
 const file=createEcmaSourceFile('x.js',source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,'script');
 const parse=(file as ts.SourceFile&{parseDiagnostics?:readonly ts.Diagnostic[]}).parseDiagnostics??[];
 return parse.length>0||earlyControlFlowStaticSemanticsFailure(file)!==null;
}
function nodeVerdicts(sources:readonly string[]):boolean[]{
 const script='const sources=JSON.parse(require("node:fs").readFileSync(0,"utf8"));process.stdout.write(JSON.stringify(sources.map(source=>{try{new Function(source);return false;}catch(error){return error instanceof SyntaxError;}})));';
 const node=nodeReferenceSync([NODE,'-e',script],{stdin:Buffer.from(JSON.stringify(sources)),stdout:'pipe',stderr:'pipe',timeout:60000});
 expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
 return JSON.parse(node.stdout.toString());
}

test('iteration head initializers are early errors exactly when Node rejects them',()=>{
 const random=rng(0x4ead);
 const sources:string[]=[];
 for(let index=0;index<240;index++)sources.push(program(random,index%2===0));
 const expected=nodeVerdicts(sources);
 expect(expected.filter(Boolean).length).toBeGreaterThan(60);
 expect(expected.filter(value=>!value).length).toBeGreaterThan(60);
 for(const [index,source] of sources.entries())expect({source,early:ours(source)}).toEqual({source,early:expected[index]!});
});

test('one deep pattern with an initializer is rejected and the plain Annex B head is kept',()=>{
 let pattern='x';
 for(let depth=0;depth<800;depth++)pattern=depth%2?`[${pattern}]`:`{k: ${pattern}}`;
 expect(ours(`function g(){ for (var ${pattern} = 1 in o) ; }`)).toBe(true);
 expect(ours(`function g(){ for (var ${pattern} of []) ; }`)).toBe(false);
 expect(ours(`function g(){ for (var x = 1 in o) ; }`)).toBe(false);
 expect(ours(`function g(){ "use strict"; for (var x = 1 in o) ; }`)).toBe(true);
});

const initializers=['f()','function () {}','() => {}','(log.push("init"), 5)','++effects','class {}'];
const objects=['{p: 1, q: 2}','(log.push("rhs:" + String(a && a.name || a)), o)','[]','null'];
function loop(random:()=>number,index:number):string{
 const initializer=initializers[Math.floor(random()*initializers.length)]!;
 const object=objects[Math.floor(random()*objects.length)]!;
 const body=`for (var a = ${initializer} in ${object}) log.push("body:" + a); log.push("after:" + (typeof a === "function" ? a.name : String(a)));`;
 switch(Math.floor(random()*3)){
  case 0:return `${body}\n`;
  case 1:return `(function run${index}() { ${body} })();\n`;
  default:return `(function run${index}() { { ${body} } })();\n`;
 }
}
function runtimeProgram(random:()=>number,count:number):string{
 let text='var log = [], effects = 0, a, o = {x: 1};\nfunction f() { log.push("f"); return "F"; }\n';
 for(let index=0;index<count;index++)text+=loop(random,index);
 return text+'console.log(log.join("\\n"), effects);\n';
}

test('Annex B for-in head initializers run once, with NamedEvaluation, before the object expression',async()=>{
 const source=runtimeProgram(rng(0xf0e1),24);
 const root=await mkdtemp(join(tmpdir(),'tsc2c-for-in-initializer-'));
 try{
  const entry=join(root,'main.cjs');await writeFile(entry,source);
  const node=nodeReferenceSync([NODE,entry],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const diagnostics:string[]=[],output=join(root,'program');
  const built=await compile({entry,output,buildDir:join(root,'build'),diagnosticWriter:x=>diagnostics.push(x)});
  expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:node.stdout.toString()});
 }finally{await rm(root,{recursive:true,force:true});}
},600000);

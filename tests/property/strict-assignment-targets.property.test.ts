import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {earlyFunctionStaticSemanticsFailure} from '../../src/function-static-semantics';
import {createEcmaSourceFile} from '../../src/ecmascript-source';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* In strict code an IdentifierReference named `eval` or `arguments` has an
 * invalid AssignmentTargetType: plain and compound assignment, update
 * operators, for-in/of heads and every destructuring target position are
 * early SyntaxErrors, while reads, member targets, pattern defaults and
 * property names are not. The same target positions reject a parenthesized
 * object or array literal and an object rest target that is a pattern. Generated programs compare our verdict with
 * Node's parser; one deep pattern checks the target ascent. The sloppy
 * `delete arguments` runtime value (false: the binding is non-deletable) is
 * compared with Node as well. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const names=['arguments','eval','x','o.arguments','a[0]'];
function target(random:()=>number,depth:number):string{
 const name=names[Math.floor(random()*names.length)]!;
 if(depth===0||random()<0.4)return name;
 switch(Math.floor(random()*6)){
  case 0:return `[${target(random,depth-1)}]`;
  case 1:return `[${target(random,depth-1)} = ${name}]`;
  case 2:return `{a: ${target(random,depth-1)}}`;
  case 3:return `[...${target(random,depth-1)}]`;
  case 4:return `{...${target(random,depth-1)}}`;
  default:return `(${target(random,depth-1)})`;
 }
}
function statement(random:()=>number):string{
 const t=target(random,3);
 const simple=!/[\[\]{}(]/.test(t);
 switch(Math.floor(random()*7)){
  case 0:return `${t.startsWith('{')?`(${t} = o)`:`${t} = o`};`;
  case 1:return simple?`${t} += 1;`:`${t.startsWith('{')?`(${t} = o)`:`${t} = o`};`;
  case 2:return simple?`${t}++;`:`for (${t} of []);`;
  case 3:return simple?`--${t};`:`for (${t} in o);`;
  case 4:return `g(${t.startsWith('{')?`(${t})`:t});`;
  case 5:return `for (${t} of []);`;
  default:return `({${t.startsWith('{')||t.startsWith('[')||t.startsWith('(')?'k: 1':t.replace(/[^\w]/g,'')+': 1'}});`;
 }
}
function program(random:()=>number,strict:boolean):string{
 return `${strict?'"use strict";\n':''}var x, o = {}, a = [], g = () => {};\nfunction f(){\n${statement(random)}\n}\n`;
}
function ours(source:string):boolean{
 const file=createEcmaSourceFile('x.js',source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,'script');
 const parse=(file as ts.SourceFile&{parseDiagnostics?:readonly ts.Diagnostic[]}).parseDiagnostics??[];
 return parse.length>0||earlyFunctionStaticSemanticsFailure(file)!==null;
}
function nodeVerdicts(sources:readonly string[]):boolean[]{
 const script='const sources=JSON.parse(require("node:fs").readFileSync(0,"utf8"));process.stdout.write(JSON.stringify(sources.map(source=>{try{new Function(source);return false;}catch(error){return error instanceof SyntaxError;}})));';
 const node=nodeReferenceSync(['node','-e',script],{stdin:Buffer.from(JSON.stringify(sources)),stdout:'pipe',stderr:'pipe',timeout:60000});
 expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
 return JSON.parse(node.stdout.toString());
}

test('strict eval/arguments assignment targets are early errors exactly when Node rejects them',()=>{
 const random=rng(0xa551);
 const sources:string[]=[];
 for(let index=0;index<300;index++)sources.push(program(random,index%2===0));
 const expected=nodeVerdicts(sources);
 expect(expected.filter(Boolean).length).toBeGreaterThan(40);
 expect(expected.filter(value=>!value).length).toBeGreaterThan(40);
 for(const [index,source] of sources.entries())expect({source,early:ours(source)}).toEqual({source,early:expected[index]!});
});

test('one deep destructuring pattern reaches the target at the bottom',()=>{
 let pattern='arguments';
 for(let depth=0;depth<1500;depth++)pattern=depth%2?`[${pattern}]`:`{k: ${pattern}}`;
 expect(ours(`"use strict"; function f(){ (${pattern} = o); }`)).toBe(true);
 expect(ours(`function f(){ (${pattern} = o); }`)).toBe(false);
 expect(ours(`"use strict"; function f(){ ([x = ${pattern}] = o); }`)).toBe(false);
});

test('sloppy delete arguments is false like Node',async()=>{
 const source=`function f1() { const r = []; r.push(delete arguments); r.push((delete arguments) === false); var x = delete arguments; r.push(x); return r; }
function f2(a) { return [delete arguments[0], arguments.length, a, delete arguments.length, "length" in arguments]; }
console.log(JSON.stringify([f1(), f2(5)]));
`;
 const root=await mkdtemp(join(tmpdir(),'tsc2c-delete-arguments-'));
 try{
  const entry=join(root,'main.cjs');await writeFile(entry,source);
  const node=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:60000});
  expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const diagnostics:string[]=[],output=join(root,'program');
  const built=await compile({entry,output,buildDir:join(root,'build'),diagnosticWriter:x=>diagnostics.push(x)});
  expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:60000});
  expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:node.stdout.toString()});
 }finally{await rm(root,{recursive:true,force:true});}
},600000);

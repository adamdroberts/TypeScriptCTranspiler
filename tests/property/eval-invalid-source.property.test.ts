import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildProgram} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* PerformEval: eval code that does not parse as a Script throws a
 * SyntaxError before anything runs (super outside a method, a return
 * outside a function, an unterminated expression), so the caught error is a
 * SyntaxError and the analysis gives the call that exception, not an
 * unknown. SerializeJSONProperty reads toJSON before treating a callable
 * value as undefined; no built-in function or constructor owns or inherits
 * one, so JSON.stringify(TypeError) is the known undefined. Generated
 * programs catch invalid sources and format their constructors into
 * messages while a trailing direct eval must stay finite; one program with
 * many such sites is the stress input. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const invalid=['super.property;','super();','return 1;','yield 1;','1 +;','{','new.target.x = ;','let let = 1;','break;','for (;;) { continue outer; }'];
const valid=['1;','"ok";','typeof undefinedName;','[1, 2].length;'];
const constructors=['SyntaxError','TypeError','Error','RangeError','Array','Object','Function','Promise','Map','Symbol','JSON.stringify','Math.max'];
function block(random:()=>number,index:number):string{
 const source=random()<0.7?invalid[Math.floor(random()*invalid.length)]!:valid[Math.floor(random()*valid.length)]!;
 const ctor=constructors[Math.floor(random()*constructors.length)]!;
 const site=random()<0.5?`eval(${JSON.stringify(source)})`:`(function () { return eval(${JSON.stringify(source)}); })()`;
 return `try { out.push("v" + String(${site})); } catch (e) { out.push("caught " + e.constructor.name + " " + (e instanceof SyntaxError) + " " + JSON.stringify(e.constructor) + " " + String(JSON.stringify(${ctor})) + " " + JSON.stringify({ k: ${ctor}, n: ${index} })); }\n`;
}
function program(random:()=>number,count:number):string{
 let text='const executeSource = eval;\nconst out = [];\n';
 for(let index=0;index<count;index++)text+=block(random,index);
 return text+'out.push(String(executeSource("17;")));\nconsole.log(out.join("\\n"));\n';
}
async function compare(name:string,source:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-eval-invalid-'));
 try{
  const entry=join(root,'main.cjs');await writeFile(entry,source);
  const node=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({name,code:node.exitCode,stderr:node.stderr.toString()}).toEqual({name,code:0,stderr:''});
  const diagnostics:string[]=[],output=join(root,'program');
  const built=await compile({entry,output,buildDir:join(root,'build'),diagnosticWriter:x=>diagnostics.push(x)});
  expect({name,code:built.exitCode,diagnostics}).toEqual({name,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({name,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({name,code:0,stderr:'',stdout:node.stdout.toString()});
 }finally{await rm(root,{recursive:true,force:true});}
}
async function verdict(source:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-eval-invalid-verdict-'));
 try{
  const entry=join(root,'main.js');await writeFile(entry,source);
  const built=buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]});
  const calls=sourceEvaluationInvocations(built.program,{roots:[entry]}).filter(call=>call.operation==='eval');
  expect(calls.every(call=>call.choices!==null)).toBe(true);
  expect(calls.some(call=>call.choices?.includes('17;'))).toBe(true);
 }finally{await rm(root,{recursive:true,force:true});}
}

test('invalid eval sources throw SyntaxError and keep every eval source finite',async()=>{
 const source=program(rng(0x5e1f),16);
 await verdict(source);
 await compare('sites',source);
},600000);

test('one program with many invalid eval sites',async()=>{
 const source=program(rng(0x1e5),48);
 await verdict(source);
 await compare('stress',source);
},600000);

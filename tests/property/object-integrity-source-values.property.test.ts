import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildProgram} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* Object.preventExtensions, seal and freeze return their argument (a
 * primitive as itself) after SetIntegrityLevel, and isExtensible, isSealed
 * and isFrozen answer a boolean; none of them runs code or escapes its
 * argument. The analysis models them so: a program that locks the global
 * object or formats such results into a message keeps a trailing direct
 * eval source finite, and the runtime applies the real integrity levels
 * (sloppy writes to a frozen object are ignored, strict ones throw, a var
 * created by eval on a non-extensible global is a TypeError). Generated
 * programs compare observations with Node; one program of many frozen
 * objects is the stress input. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const operations=['preventExtensions','seal','freeze'];
function block(random:()=>number,index:number):string{
 const operation=operations[Math.floor(random()*operations.length)]!;
 const target=random()<0.7?`{ a: ${index}, b: [1, 2] }`:random()<0.5?`[${index}, ${index + 1}]`:`${index}`;
 const strict=random()<0.4;
 const body=`const o = Object.${operation}(${target});
  out.push(typeof o, Object.isExtensible(o), Object.isSealed(o), Object.isFrozen(o), String(o === o));
  try { o.c = 'added'; out.push("added " + String(o.c)); } catch (e) { out.push("add " + e.constructor.name); }
  try { if (typeof o === "object") { o.a = 'changed'; out.push("changed " + String(o.a)); } } catch (e) { out.push("change " + e.constructor.name); }
  try { delete o.a; out.push("deleted " + String(o.a)); } catch (e) { out.push("delete " + e.constructor.name); }
  out.push(JSON.stringify(o), String(Object.keys(Object(o)).length));`;
 return strict?`(function () { "use strict"; ${body} })();\n`:`{ ${body} }\n`;
}
function program(random:()=>number,count:number):string{
 let text='const executeSource = eval;\nconst out = [];\n';
 for(let index=0;index<count;index++)text+=block(random,index);
 text+=`Object.preventExtensions(globalThis);
out.push(String(Object.isExtensible(globalThis)));
try { executeSource("var createdOnLockedGlobal = 1;"); out.push("var ok"); } catch (e) { out.push("var " + e.constructor.name); }
`;
 return text+'out.push(String(executeSource("17;")));\nconsole.log(out.join("\\n"));\n';
}
function stressProgram(count:number):string{
 let text='const out = [];\n';
 for(let index=0;index<count;index++)text+=`{ const o = Object.freeze({ v: ${index} }); o.v = -1; out.push(o.v + Object.isFrozen(o)); }\n`;
 return text+'console.log(out.length, out[0], out[out.length - 1], String(eval("17;")));\n';
}
async function compare(name:string,source:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-integrity-'));
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
 const root=await mkdtemp(join(tmpdir(),'tsc2c-integrity-verdict-'));
 try{
  const entry=join(root,'main.js');await writeFile(entry,source);
  const built=buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]});
  const calls=sourceEvaluationInvocations(built.program,{roots:[entry]}).filter(call=>call.operation==='eval');
  expect(calls.every(call=>call.choices!==null)).toBe(true);
  expect(calls.some(call=>call.choices?.includes('17;'))).toBe(true);
 }finally{await rm(root,{recursive:true,force:true});}
}

test('integrity levels keep the eval source finite and behave like Node',async()=>{
 const source=program(rng(0x1e9e1),30);
 await verdict(source);
 await compare('levels',source);
},600000);

test('one program of many frozen objects',async()=>{
 const source=stressProgram(300);
 await verdict(source);
 await compare('stress',source);
},600000);

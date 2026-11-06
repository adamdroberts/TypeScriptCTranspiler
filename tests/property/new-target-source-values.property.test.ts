import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildProgram} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* new.target is the NewTarget of the nearest non-arrow function activation
 * (undefined for a call, the construct target for a construction; an arrow
 * and direct eval code read the enclosing or calling function's). The
 * analysis gives every function owner a NewTarget cell fed by its call and
 * construct sites, so a message that formats new.target keeps a trailing
 * direct eval source finite instead of escaping every global. Generated
 * programs compare observations with Node; one deep construction chain is
 * the stress input. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
function block(random:()=>number,index:number):string{
 const read=random()<0.5?'new.target':random()<0.5?'(() => new.target)()':'eval("new.target")';
 const shape=Math.floor(random()*4);
 const definition=shape===0?`function F${index}() { out.push("f" + ${index} + " " + String(${read}) + " " + typeof ${read}); }`
  :shape===1?`class F${index} { constructor() { out.push("c" + ${index} + " " + (${read} === F${index}) + " " + String(${read}).length); } }`
  :shape===2?`class B${index} { constructor() { out.push("b" + ${index} + " " + (${read} === F${index}) + " " + (${read} === B${index})); } } class F${index} extends B${index} {}`
  :`const F${index} = function () { out.push("e" + ${index} + " " + (${read} === undefined) + " " + String(${read})); };`;
 const uses=[`new F${index}();`,shape===1||shape===2?'':`F${index}();`,`Reflect.construct(F${index}, []);`,shape===1||shape===2?'':`F${index}.call({});`];
 return `${definition}\n${uses.filter(Boolean).filter(()=>random()<0.8).join(' ')}\n`;
}
function program(random:()=>number,count:number):string{
 let text='const executeSource = eval;\nconst out = [];\n';
 for(let index=0;index<count;index++)text+=block(random,index);
 return text+'out.push(String(executeSource("17;")));\nconsole.log(out.join("\\n"));\n';
}
function stressProgram(depth:number):string{
 let text='const out = [];\nclass K0 { constructor() { out.push(new.target.name); } }\n';
 for(let level=1;level<=depth;level++)text+=`class K${level} extends K${level-1} {}\n`;
 return text+`new K${depth}();\nconsole.log(out.join(","), String(eval("17;")));\n`;
}
async function compare(name:string,source:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-new-target-'));
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
 const root=await mkdtemp(join(tmpdir(),'tsc2c-new-target-verdict-'));
 try{
  const entry=join(root,'main.js');await writeFile(entry,source);
  const built=buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]});
  const calls=sourceEvaluationInvocations(built.program,{roots:[entry]}).filter(call=>call.operation==='eval');
  expect(calls.every(call=>call.choices!==null)).toBe(true);
  expect(calls.some(call=>call.choices?.includes('17;'))).toBe(true);
 }finally{await rm(root,{recursive:true,force:true});}
}

test('new.target observations keep the eval source finite and match Node',async()=>{
 const source=program(rng(0x7a9e7),30);
 await verdict(source);
 await compare('targets',source);
},600000);

test('one deep construction chain',async()=>{
 const source=stressProgram(200);
 await verdict(source);
 await compare('stress',source);
},600000);

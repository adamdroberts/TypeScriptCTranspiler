import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildProgram} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* Object.keys, Object.values and Object.entries are EnumerableOwnProperties
 * over the ordinary own-key order: enumerable string keys only, values read
 * through [[Get]] (getters run), inherited and symbol keys excluded, with
 * ToObject on primitives and a TypeError on null or undefined. The source
 * analysis models the three through the own-key array shared with
 * Object.getOwnPropertyNames, so a program that formats their result into a
 * message no longer escapes every global binding: the analysis verdict is
 * observable as a finite direct eval source after such a call. Generated
 * objects mix key kinds, attributes and prototype interference; one wide
 * object is the stress input. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const keys=['a','b','2','10','x y','length','__proto__2','1.5','-1','constructor'];
function objectProgram(random:()=>number,count:number):string{
 let text=`const out = [];
const show = (o) => { try { return JSON.stringify([Object.keys(o), Object.values(o).map(String), Object.entries(o).map(([k, v]) => k + '=' + String(v))]); } catch (error) { return error.name; } };
const parent = { inherited: 1, [Symbol('s')]: 2 };
`;
 for(let index=0;index<count;index++){
  const members:string[]=[];
  const memberCount=Math.floor(random()*5);
  for(let member=0;member<memberCount;member++){
   const key=keys[Math.floor(random()*keys.length)]!;
   const roll=random();
   if(roll<0.5)members.push(`${JSON.stringify(key)}: ${member}`);
   else if(roll<0.65)members.push(`get ${JSON.stringify(key)}() { out.push('get ${key}'); return 'g${member}'; }`);
   else if(roll<0.8)members.push(`[Symbol.iterator]: ${member}`);
   else members.push(`...{ ${JSON.stringify(key)}: 'spread' }`);
  }
  const shape=Math.floor(random()*6);
  const literal=`{ ${members.join(', ')} }`;
  const setup=shape===0?`const o = ${literal};`:shape===1?`const o = Object.assign(Object.create(parent), ${literal});`:shape===2?`const o = ${literal}; Object.defineProperty(o, 'hidden', { value: 1, enumerable: false }); Object.defineProperty(o, 'shown', { value: 2, enumerable: true });`:shape===3?`const o = [${index}, , ${index + 1}]; o.extra = 'e';`:shape===4?`const o = ${random()<0.5?JSON.stringify('str'+index):String(index)};`:`const o = ${random()<0.5?'null':'undefined'};`;
  text+=`{ ${setup} out.push(show(o)); }\n`;
 }
 return text+'console.log(out.join("\\n"));\n';
}
function stressProgram(width:number):string{
 let text='const o = {};\n';
 for(let index=0;index<width;index++)text+=`o.k${index} = ${index};\n`;
 return text+`Object.defineProperty(o, 'k${Math.floor(width/2)}', { enumerable: false });\nconsole.log(Object.keys(o).length, Object.values(o).length, Object.entries(o)[0].join(), Object.keys(o).at(-1));\n`;
}
const verdictProgram=`const executeSource = eval;
function describe(value) { return "value=" + String(value) + " keys=" + Object.keys(value).join() + " values=" + Object.values(value).length + " entries=" + Object.entries(value).length; }
const o = { a: 1, get b() { return 2; } };
Object.defineProperty(o, 'c', { value: 3, enumerable: false });
describe(o); describe([1, 2]); describe("str");
console.log(executeSource("17;"));
`;

async function compare(name:string,source:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-enumerable-'));
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

test('a message formatted from Object.keys, values and entries keeps the eval source finite',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-enumerable-verdict-'));
 try{
  const entry=join(root,'main.js');await writeFile(entry,verdictProgram);
  const built=buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]});
  const choices=sourceEvaluationInvocations(built.program,{roots:[entry]}).filter(call=>call.operation==='eval').map(call=>call.choices);
  expect(choices).toEqual([['17;']]);
 }finally{await rm(root,{recursive:true,force:true});}
 await compare('verdict',verdictProgram);
},600000);

test('generated objects enumerate like Node',async()=>{
 // 36 objects: every argument of the shared helper joins one call-site
 // union, so the analysis cost grows quadratically with the count (the
 // define-property shape dominates), an open analysis item.
 await compare('objects',objectProgram(rng(0xe9c5),36));
},600000);

test('one wide object',async()=>{
 await compare('stress',stressProgram(3000));
},600000);

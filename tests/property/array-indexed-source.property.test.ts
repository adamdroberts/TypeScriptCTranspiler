import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildProgram} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';
import {parseHostObservation} from '../test262/protocol';
const reference=(source:string)=>{
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({external:C=>new C("19;"),print:v=>fs.writeSync(1,String(v)+"\\n")});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});return node.stdout.toString();
};
async function choices(directory:string,source:string){
 const entry=join(directory,'subject.js');await writeFile(entry,source);
 const built=buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]});
 return sourceEvaluationInvocations(built.program,{roots:[entry]}).map(call=>call.choices);
}
const producers=[
 'const queue=[];',
 'function make(...values){return values;}const queue=make();',
 'const queue=Reflect.ownKeys({});',
 'const queue=JSON.parse("[]");',
 'const queue={length:0};',
];
const stored='class C{constructor(body){print(eval(body));}}';
test('indexed writes preserve callable values, key domains and actual conversion effects',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-array-indexed-source-'));
 try{
  for(const producer of producers){
   const source=stored+producer+'Array.prototype.push.call(queue,C);new queue[0]("17;");';
   expect(reference(source)).toBe('17\n');expect({producer,choices:await choices(directory,source)}).toEqual({producer,choices:[['17;']]});
  }
  const untouched='let body="17;";const queue={__proto__:{set named(value){body=external;}},length:0};Array.prototype.push.call(queue,"item");print(eval(body));';
  expect(reference(untouched)).toBe('17\n');expect(await choices(directory,untouched)).toEqual([['17;']]);
  for(const source of [
   'let body="17;";const queue={get length(){body="19;";return 0;}};try{Array.prototype.push.call(queue,"item");}catch(error){if(!(error instanceof TypeError))throw error;}print(eval(body));',
   'let body="17;";const queue=[];queue.push("item");queue.join({toString(){body="19;";return "|";}});print(eval(body));',
  ]){expect(reference(source)).toBe('19\n');expect(await choices(directory,source)).toEqual([expect.arrayContaining(['19;'])]);}
  const escaped=stored+'new C("17;");const queue={length:0,set 0(C){external(C);}};Array.prototype.push.call(queue,C);';
  expect(reference(escaped)).toBe('17\n19\n');expect(await choices(directory,escaped)).toEqual([null]);
  for(const source of [
   'const queue=[];queue.push(String(Math.random()));eval(queue[0]);',
   'let body="17;";const queue=[];queue.push({toString(){body=String(Math.random());return "item";}});queue.join("|");eval(body);',
   'let body="17;";const args=[];args.push({toString(){body=String(Math.random());return "|";}});["item"].join(...args);eval(body);',
  ])expect(await choices(directory,source)).toEqual([null]);
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('unknown indexed extents retain iterable values and composition effects',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-array-indexed-iteration-'));
 try{
  for(const method of ['values','entries']){
   const selected=method==='entries'?'item[1]':'item';
   const source='let body="17;";const queue=[];queue.push("19;");for(const item of queue.'+method+'())body='+selected+';print(eval(body));';
   expect(reference(source)).toBe('19\n');expect(await choices(directory,source)).toEqual([expect.arrayContaining(['19;'])]);
  }
  const combined='let body="17;";const args=[];args.push({toString(){body="19;";return "|";}});["item"].join(...args);print(eval(body));["23;"].some(value=>{body=value;return true;});print(eval(body));["29;"].every(value=>{body=value;return true;});print(eval(body));';
  expect(reference(combined)).toBe('19\n23\n29\n');const calls=await choices(directory,combined);for(const [index,body]of ['19;','23;','29;'].entries())expect(calls[index]).toContain(body);
  for(const source of [
   'const queue=[];queue.push(String(Math.random()));function consume(body){eval(body);}consume(...queue);',
   'let body="17;";const args=[];args.push("ignored","ignored");const descriptor={get(){const saved=body;body=String(Math.random());return saved;},configurable:true};Object.defineProperty(args,"0",descriptor);Object.defineProperty(args,"1",descriptor);function consume(first,second){eval(second);}consume(...args);',
  ])expect(await choices(directory,source)).toEqual([null]);
 }finally{await rm(directory,{recursive:true,force:true});}
});
function nativeSource():string{
 const routes=['queue.push(...actual)','Array.prototype.push.call(queue,...actual)','Array.prototype.push.apply(queue,actual)','Reflect.apply(Array.prototype.push,queue,actual)','Array.prototype.push.bind(queue,...actual)()'];
 return routes.map((route,index)=>'{const marker={},symbol=Symbol("value"),callback=()=>marker,queue=[],actual=[undefined,marker,symbol,callback,17n,null];const length='+route+';print("route'+index+':"+(length===actual.length&&queue.length===actual.length&&actual.every((value,index)=>queue[index]===value)));}').join('\n')+
 '\n{const events=[],queue={get length(){events.push("get");return {valueOf(){events.push("coerce");return 0;}}},set 0(value){events.push("index:"+value);},set length(value){events.push("length:"+value);}};const result=Array.prototype.push.call(queue,(events.push("argument"),"item"));print(result);print(events.join("|"));}'+
 '\n{try{Array.prototype.push.call(null,"item");}catch(error){print(error.name);}const queue=[];queue.length=4294967295;try{queue.push("item");}catch(error){print(error.name);}}'+
 '\nconst events=[];events.push("before",undefined,17,true);print(events.join("|"));let owner={code:"31;"};'+Array.from({length:512},()=> 'owner={next:owner};').join('\n')+
 '\nconst kept=owner;COLLECT for(let index=0;index<512;index++)owner=owner.next;print(eval(owner.code));print(kept!==owner);print("array-indexed-complete");';
}
test('array indexed effects and retained source values match complete Node output in both memory modes',async()=>{
 const source=nativeSource(),expected=reference(source.replace('COLLECT',''));expect(expected.endsWith('31\ntrue\narray-indexed-complete\n')).toBe(true);
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-array-indexed-native-'));
 try{for(const noGc of [false,true]){
  const entry=join(directory,'subject.js'),output=join(directory,'program-'+noGc),diagnostics:string[]=[];await writeFile(entry,source.replace('COLLECT',noGc?'':'$262.gc();'));
  const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/array-indexed-source.js#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:m=>diagnostics.push(m)});
  expect({exitCode:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(expected);
 }}finally{await rm(directory,{recursive:true,force:true});}
},600000);

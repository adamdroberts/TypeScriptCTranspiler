import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(collect:boolean):string{return `'use strict';
function check(value,label){if(!value)throw label}
const other=$262.createRealm().global;
check(other.Iterator!==Iterator&&other.Iterator.prototype!==Iterator.prototype,'realm-owners');
for(const operation of ['next','return']){
 let sibling;const child=other.Iterator.prototype.map.call(other.Array.prototype.values.call([1]),()=>sibling[operation]());
 sibling=Iterator.prototype.map.call(child,value=>value);const outer=Iterator.prototype.map.call(child,value=>value);
 let error;try{outer.next()}catch(e){error=e}check(error instanceof other.TypeError&&!(error instanceof TypeError),'captured-child-realm');console.log('reentrant',operation,error instanceof other.TypeError,error instanceof TypeError);
 check(Object.getPrototypeOf(Iterator.from([]).map(x=>x).next())===Object.prototype,'caller-restored');
}
for(const borrowed of [false,true]){
 const owner=other.Iterator.prototype.map.call(other.Array.prototype.values.call([7]),value=>value);
 const next=borrowed?Object.getPrototypeOf(Iterator.from([]).map(x=>x)).next:owner.next;
 const result=next.call(owner);check(Object.getPrototypeOf(result)===(borrowed?Object.prototype:other.Object.prototype),'method-result-realm');console.log('result-realm',borrowed,result.value,result.done);
}
let observed='';const source={next(){return{done:false,value:1}},return(){observed+='close';throw 'marker'}};
const foreign=other.Iterator.prototype.map.call(source,value=>value),local=Iterator.prototype.map.call(foreign,value=>value);local.next();let rejected=false;try{local.return()}catch(e){rejected=e==='marker'}check(rejected&&observed==='close','cross-close-error');
check(Object.getPrototypeOf(local.next())===Object.prototype,'abrupt-restored');
const owner={marker:7};let trace='';let deep=Iterator.from({next(){return{value:owner,done:false}},return(){trace+='close';return {}}});
for(let index=0;index<4096;index++){const prototype=index%2?Iterator.prototype:other.Iterator.prototype;deep=prototype.map.call(deep,value=>value)}
__COLLECT__
queueMicrotask(()=>{check(deep.next().value===owner,'deep-realm-value');check(deep.return().done&&trace==='close','deep-realm-close');check(Object.getPrototypeOf(Iterator.from([]).map(x=>x).next())===Object.prototype,'deep-restored');console.log('retained-realms',owner.marker,trace)});
`.replace("__COLLECT__",collect?"$262.gc();":"")}

test('Iterator helper worklist preserves captured method Realms and abrupt restoration',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-iterator-helper-realm-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,'import vm from "node:vm"; globalThis.$262={createRealm(){return {global:vm.runInNewContext("globalThis")}}};\n'+subject(false));
  const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile&&!noGc));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'iterator-helper-realm.ts#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
   if(observation)expect({noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({noGc,kind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

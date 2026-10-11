import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(collect:boolean):string{return `'use strict';
function check(value,label){if(!value)throw label}
for(const key of ['0','1','2','-0','-1','1.5','NaN','Infinity','01','1e0',Symbol('key')]){
 const owner=Buffer.from([1,2]);const converted={valueOf(){return 258}};
 const present=Reflect.has(owner,key),descriptor=Reflect.getOwnPropertyDescriptor(owner,key),set=Reflect.set(owner,key,converted);
 const value=Reflect.get(owner,key);const defined=Reflect.defineProperty(owner,key,{value:7});const removed=Reflect.deleteProperty(owner,key);
 console.log('partition',String(key),present,descriptor?descriptor.value:'missing',set,value===converted?'object':String(value),defined,removed,owner[0],owner[1]);
}
for(const key of ['0','-0','2']){
 const owner=Buffer.from([1,2]),receiver={};let trace='';const value={valueOf(){trace+='convert';return 258}};const set=Reflect.set(owner,key,value,receiver);console.log('receiver',key,set,trace,owner[0],Object.hasOwn(receiver,key),receiver[key]===value);
}
{const owner=Buffer.from([1]),prototype=Object.create(Object.getPrototypeOf(owner));let called=false;Object.defineProperty(prototype,'0',{set(){called=true}});Object.setPrototypeOf(owner,prototype);const receiver={};const value={};check(Reflect.set(owner,'0',value,receiver)&&receiver[0]===value&&!called,'indexed-own-descriptor');console.log('inherited-setter',called,receiver[0]===value)}
for(const key of ['0','-0','2'])for(const descriptor of [{writable:false},{enumerable:false},{configurable:false},{get(){return 1}},{value:7}]){
 const owner=Buffer.from([1,2]);console.log('define',key,Object.keys(descriptor).join(','),Reflect.defineProperty(owner,key,descriptor),owner[0]);
}
let trace='';const owner=Buffer.from([1,2]),marker={};for(const key of ['0','-0','2']){let rejected=false;try{Reflect.set(owner,key,{valueOf(){trace+=key+'|';throw marker}})}catch(e){rejected=e===marker}check(rejected,'convert-invalid-index')}console.log('conversion',trace);
const wrapped=new Proxy(Buffer.from([1,2]),{});check(wrapped[0]===1&&Reflect.set(wrapped,'0',9)&&wrapped[0]===9,'proxy-forward');console.log('keys',Reflect.ownKeys(wrapped).map(String).join(','));
const frozen=Buffer.from([1,2]);Object.preventExtensions(frozen);check(Reflect.set(frozen,'0',7)&&frozen[0]===7&&!Reflect.defineProperty(frozen,'extra',{value:1}),'indexed-extensibility');
let chain=null;for(let index=0;index<4096;index++){const owner=Buffer.from([index%256,7]);chain={owner,next:chain}}
__COLLECT__
queueMicrotask(()=>{let visited=0;while(chain){const owner=chain.owner;check(Reflect.getOwnPropertyDescriptor(owner,'1').value===7,'retained-descriptor');Reflect.set(owner,'0',258);check(owner[0]===2,'retained-store');chain=chain.next;visited++}check(visited===4096,'retained-graph');console.log('retained',visited)});
`.replace("__COLLECT__",collect?"$262.gc();":"")}

test('Integer-indexed Buffer adapter shares canonical keys and post-conversion witnesses',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-integer-indexed-owner-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false));
  const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile&&!noGc));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'integer-indexed-owner.ts#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
   if(observation)expect({noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({noGc,kind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

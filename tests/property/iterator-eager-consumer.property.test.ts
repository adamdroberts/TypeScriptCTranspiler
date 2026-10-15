import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(collect:boolean):string{return `'use strict';
function check(value,label){if(!value)throw label}
const prototype=Object.getPrototypeOf(Object.getPrototypeOf([].values()));
for(const name of ['forEach','reduce','some','every','find','toArray']){const descriptor=Object.getOwnPropertyDescriptor(prototype,name);console.log('metadata',name,descriptor.value.name,descriptor.value.length,descriptor.writable,descriptor.enumerable,descriptor.configurable)}
for(const values of [[],[0],[1,2,3],[0,false,'',null,undefined]])for(const name of ['some','every','find','toArray']){
 let trace='';const iterator=values.values();const result=name==='toArray'?iterator[name]():iterator[name](function(value,index){check(this===undefined&&arguments.length===2,'callback');trace+=index;return value});console.log('partition',name,typeof result==='object'&&result!==null?JSON.stringify(result):String(result),trace,iterator.next().done);
}
function source(values,trace,close){let index=0;return{get next(){trace.push('get-next');return function(){trace.push('next');return index<values.length?{value:values[index++],done:false}:{done:true}}},get return(){trace.push('get-return');return function(){trace.push('return');return close()}}}}
for(const name of ['some','every','find','forEach','reduce']){
 const trace=[];const iterator=source([1,2,3],trace,()=>({}));const method=prototype[name];let result;if(name==='reduce')result=method.call(iterator,(total,value,index)=>{trace.push('callback'+index);return total+value},0);else result=method.call(iterator,(value,index)=>{trace.push('callback'+index);return name==='every'?value<2:value===2});console.log('direct',name,String(result),trace.join(','));
}
for(const name of ['some','every','find','forEach','reduce']){
 const trace=[];const iterator=source([1],trace,()=>{throw 'close'});let rejected=false;try{prototype[name].call(iterator,0)}catch(error){rejected=error instanceof TypeError}check(rejected&&trace.join(',')==='get-return,return','invalid-callback-close');
}
for(const name of ['some','every','find','forEach','reduce']){
 const trace=[];const marker={name};const iterator=source([1],trace,()=>{throw 'close'});let identical=false;try{prototype[name].call(iterator,()=>{throw marker},0)}catch(error){identical=error===marker}check(identical&&trace.join(',')==='get-next,next,get-return,return','callback-abrupt-close');
}
for(const name of ['some','every','find','toArray']){
 let closes=0;const marker={name};const iterator={next(){throw marker},return(){closes++;return{}}};let identical=false;try{prototype[name].call(iterator,()=>true)}catch(error){identical=error===marker}check(identical&&closes===0,'next-abrupt');
}
for(const name of ['some','every','find']){const marker={name};const iterator={next(){return{value:1,done:false}},return(){throw marker}};let identical=false;try{prototype[name].call(iterator,()=>name!=='every')}catch(error){identical=error===marker}check(identical,'normal-close-abrupt');}
let chain=null;for(let index=0;index<4096;++index){const owner={index};chain={owner,iterator:new Set([owner]).values(),next:chain}}
__COLLECT__
queueMicrotask(()=>{let visited=0;while(chain){const owner=chain.owner;check(chain.iterator.find(value=>value===owner)===owner,'retained-consumer');chain=chain.next;visited++}check(visited===4096,'retained-graph');console.log('retained',visited)});
`.replace("__COLLECT__",collect?"$262.gc();":"")}

test('Iterator eager consumers share direct records, callbacks and close completions',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-iterator-eager-consumer-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false));
  const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile&&!noGc));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'iterator-eager-consumer.ts#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
   if(observation)expect({noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({noGc,kind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

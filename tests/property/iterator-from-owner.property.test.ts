import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(collect:boolean):string{return `'use strict';
function check(value,label){if(!value)throw label}
const intrinsic=Iterator,prototype=Iterator.prototype;
console.log('owner',intrinsic.name,intrinsic.length,intrinsic.from.name,intrinsic.from.length,Object.getPrototypeOf(prototype)===Object.prototype);
for(const owner of [intrinsic,prototype])for(const key of owner===intrinsic?['prototype','from']:['constructor',Symbol.toStringTag]){
 const d=Object.getOwnPropertyDescriptor(owner,key);console.log('descriptor',String(key),d.get?d.get.name:d.value===prototype?'prototype':d.value.name,d.get?d.get.length:d.value.length,d.set?d.set.name:'-',d.set?d.set.length:'-',String(d.writable),d.enumerable,d.configurable);
}
for(const invoke of [()=>intrinsic(),()=>new intrinsic()]){let rejected=false;try{invoke()}catch(e){rejected=e instanceof TypeError}check(rejected,'abstract-constructor')}
class Derived extends intrinsic { next(){return {done:true}} }
const derived=new Derived;check(Object.getPrototypeOf(derived)===Derived.prototype&&derived instanceof intrinsic,'derived');
function Target(){};Target.prototype=1;
check(Object.getPrototypeOf(Reflect.construct(intrinsic,[],Target))===prototype,'default-prototype');
for(const key of ['constructor',Symbol.toStringTag]){
 const d=Object.getOwnPropertyDescriptor(prototype,key);for(const receiver of [undefined,null,0,prototype]){let rejected=false;try{d.set.call(receiver,7)}catch(e){rejected=e instanceof TypeError}check(rejected,'setter-receiver')}
 const receiver=Object.create(prototype);d.set.call(receiver,7);const own=Object.getOwnPropertyDescriptor(receiver,key);check(own.value===7&&own.writable&&own.enumerable&&own.configurable,'create-own');
 let trace='';const holder={};Object.defineProperty(holder,key,{set(v){trace+='set'+v},configurable:true});d.set.call(holder,8);check(trace==='set8','existing-setter');
 const locked=Object.freeze(Object.create(prototype));let rejected=false;try{d.set.call(locked,9)}catch(e){rejected=e instanceof TypeError}check(rejected,'nonextensible');
 const traceKeys=[];const proxy=new Proxy(Object.create(prototype),{getOwnPropertyDescriptor(t,k){traceKeys.push('get');return Reflect.getOwnPropertyDescriptor(t,k)},defineProperty(t,k,v){traceKeys.push('define');return Reflect.defineProperty(t,k,v)}});d.set.call(proxy,10);console.log('setter-proxy',String(key),traceKeys.join(','));
}
for(const values of [[],[1,2,3],'ab']){const iterator=intrinsic.from(values);check(intrinsic.from(iterator)===iterator,'identity');console.log('values',iterator.toArray().join(','))}
for(const source of [undefined,null,0,true,Symbol('x'),1n]){let rejected=false;try{intrinsic.from(source)}catch(e){rejected=e instanceof TypeError}check(rejected,'primitive')}
let trace='';const first={raw:true},last=3;
const source={get [Symbol.iterator](){trace+='iterator|';return undefined},get next(){trace+='next-get|';return function(){check(this===source&&arguments.length===0,'next-arguments');trace+='next|';return first}},get return(){trace+='return-get|';return function(){check(this===source&&arguments.length===0,'return-arguments');trace+='return|';return last}}};
const wrapper=intrinsic.from(source);check(wrapper!==source&&wrapper.next(1,2)===first,'raw-next');check(wrapper.return(1,2)===last,'raw-return');console.log('wrapper',trace,Object.prototype.toString.call(wrapper));
for(const key of ['next','return']){let rejected=false;try{wrapper[key].call(new Proxy(wrapper,{}))}catch(e){rejected=e instanceof TypeError}check(rejected,'wrapper-brand')}
const noReturn=intrinsic.from({next(){return 5}});check(noReturn.next()===5&&noReturn.return().done,'raw-no-return');
let reads=0;const mutable={get next(){reads++;return function(){return {value:reads,done:false}}}};const captured=intrinsic.from(mutable);check(captured.next().value===1&&captured.next().value===1&&reads===1,'captured-next');
for(const source of [{[Symbol.iterator]:0},{[Symbol.iterator](){return 0}},{get [Symbol.iterator](){throw 'marker'}},{get next(){throw 'marker'}}]){let rejected=false;try{intrinsic.from(source)}catch(e){rejected=e==='marker'||e instanceof TypeError}check(rejected,'open-abrupt')}
let chain=null;for(let index=0;index<4096;index++){const owner={index};const source={next(){return {value:owner,done:false}}};chain={owner,iterator:intrinsic.from(source),next:chain}}
__COLLECT__
queueMicrotask(()=>{let visited=0;while(chain){check(chain.iterator.next().value===chain.owner,'retained-wrapper');chain=chain.next;visited++}check(visited===4096,'retained-graph');console.log('retained',visited)});
`.replace("__COLLECT__",collect?"$262.gc();":"")}

test('Iterator.from retains ordinary owners, direct records and wrapper forwarding',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-iterator-from-owner-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false));
  const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile&&!noGc));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'iterator-from-owner.ts#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
   if(observation)expect({noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({noGc,kind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

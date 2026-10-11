import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(collect:boolean):string{return `'use strict';
function check(value,label){if(!value)throw label}
function bytes(buffer){const view=new DataView(buffer),result=[];for(let index=0;index<view.byteLength;index++)result.push(view.getUint8(index));return result.join(',')}
function fill(buffer){const view=new DataView(buffer);for(let index=0;index<view.byteLength;index++)view.setUint8(index,index+1)}
const intrinsic=ArrayBuffer,prototype=intrinsic.prototype;
console.log('constructor',intrinsic.name,intrinsic.length,Object.getOwnPropertyNames(intrinsic).join('|'),Object.getOwnPropertyNames(prototype).join('|'),Object.prototype.toString.call(new intrinsic(0)));
for(const owner of [intrinsic,prototype])for(const key of Reflect.ownKeys(owner)){
 const descriptor=Object.getOwnPropertyDescriptor(owner,key);
 if(typeof key==='symbol')console.log('symbol',String(key),descriptor.get?descriptor.get.name:descriptor.value,descriptor.enumerable,descriptor.configurable);
 else if(descriptor.get)console.log('getter',key,descriptor.get.name,descriptor.get.length,descriptor.enumerable,descriptor.configurable);
 else if(typeof descriptor.value==='function')console.log('method',key,descriptor.value.name,descriptor.value.length,descriptor.writable,descriptor.enumerable,descriptor.configurable,Object.hasOwn(descriptor.value,'prototype'));
}
check(intrinsic[Symbol.species]===intrinsic,'species-getter');
const speciesGetter=Object.getOwnPropertyDescriptor(intrinsic,Symbol.species).get,receiver={};check(speciesGetter.call(receiver)===receiver,'generic-species');
let trace='';
const options=new Proxy(function(){},{get(target,key){if(key==='maxByteLength'){trace+='maximum|';return {valueOf(){trace+='max-value|';return 32.8}}}return Reflect.get(target,key)}});
const buffer=new intrinsic({valueOf(){trace+='length|';return 8.9}},options,(()=>{trace+='extra|';return 9})());
check(trace==='extra|length|maximum|max-value|'&&buffer.byteLength===8&&buffer.maxByteLength===32&&buffer.resizable,'constructor-order');
fill(buffer);
const tracking=new DataView(buffer,2),fixed=new DataView(buffer,2,4);
const records=[];
for(const length of [4,1,0,8,16,3,12]){
 buffer.resize(length);let fixedState;
 try{fixedState=fixed.byteLength+':'+fixed.getUint8(0)}catch(error){check(error instanceof TypeError,'fixed-out-of-bounds');fixedState='TypeError'}
 let trackingState;try{trackingState=tracking.byteLength+':'+(tracking.byteLength?tracking.getUint8(0):'-')}catch(error){check(error instanceof TypeError,'tracking-out-of-bounds');trackingState='TypeError'}
 records.push(length+':'+bytes(buffer)+':'+trackingState+':'+fixedState);
}
console.log('resize',records.join('|'));
buffer.resize(8);
tracking.setUint8({valueOf(){buffer.resize(4);return 1}},77);check(tracking.byteLength===2&&tracking.getUint8(1)===77,'index-resize-witness');
buffer.resize(8);let afterValue=false;
try{fixed.setUint8(0,{valueOf(){buffer.resize(1);return 9}})}catch(error){afterValue=error instanceof TypeError}check(afterValue,'value-resize-witness');
buffer.resize(8);fill(buffer);
let speciesTrace='';function Species(length){speciesTrace+='construct:'+length+'|';const result=new intrinsic(length+2);new DataView(result).setUint8(length+1,99);buffer.resize(3);return result}
Object.defineProperty(buffer,'constructor',{get(){speciesTrace+='constructor|';return {[Symbol.species]:Species}},configurable:true});
const sliced=buffer.slice({valueOf(){speciesTrace+='start|';return 1}},6);
console.log('slice',speciesTrace,sliced.byteLength,bytes(sliced));check(sliced.byteLength===7&&bytes(sliced)==='2,3,0,0,0,0,99','species-resize-copy');
delete buffer.constructor;
for(const result of [buffer,{},new intrinsic(0)]){
 buffer.resize(4);buffer.constructor={[Symbol.species]:function(){return result}};
 let rejected=false;try{buffer.slice(0,2)}catch(error){rejected=error instanceof TypeError}check(rejected,'species-result-validation');
}
delete buffer.constructor;buffer.resize(8);fill(buffer);
const moved=buffer.transfer({valueOf(){buffer.resize(4);return 6}});
check(buffer.detached&&buffer.byteLength===0&&buffer.maxByteLength===0&&buffer.resizable,'detached-metadata');
check(moved.resizable&&moved.maxByteLength===32&&bytes(moved)==='1,2,3,4,0,0','transfer-current-bytes');
let viewDetached=false;try{tracking.byteLength}catch(error){viewDetached=error instanceof TypeError}check(viewDetached&&tracking.buffer===buffer,'transfer-detaches-views');
const fixedMove=moved.transferToFixedLength(3);check(moved.detached&&!fixedMove.resizable&&fixedMove.maxByteLength===3&&bytes(fixedMove)==='1,2,3','fixed-transfer');
console.log('transfer',bytes(fixedMove),moved.detached,buffer.detached);
for(const operation of ['resize','slice','transfer','transferToFixedLength']){
 let rejected=false;try{prototype[operation].call(new Proxy(new intrinsic(4,{maxByteLength:8}),{}),0)}catch(error){rejected=error instanceof TypeError}check(rejected,'proxy-brand');
}
let converted=false,rejected=false;try{new intrinsic(4).resize({valueOf(){converted=true;return 1}})}catch(error){rejected=error instanceof TypeError}check(rejected&&!converted,'fixed-resize-before-conversion');
for(const args of [[-1],[4,{maxByteLength:3}],[0,{maxByteLength:-1}],[1n],[0,{maxByteLength:1n}]]){let rejected=false;try{Reflect.construct(intrinsic,args)}catch(error){rejected=error instanceof TypeError||error instanceof RangeError}check(rejected,'constructor-validation')}
class Derived extends intrinsic{}
const derived=new Derived(2,{maxByteLength:8});check(derived instanceof Derived&&derived instanceof intrinsic&&derived.resizable,'derived-owner');
let prototypeReads=0;
const target=new Proxy(function(){},{get(object,key,receiver){if(key==='prototype'){prototypeReads++;return {marker:'custom'}}return Reflect.get(object,key,receiver)}});
const custom=Reflect.construct(intrinsic,[2,{maxByteLength:4}],target);check(Object.getPrototypeOf(custom).marker==='custom'&&Object.getOwnPropertyDescriptor(prototype,'resizable').get.call(custom)&&prototypeReads===1,'new-target-prototype');
try{Reflect.construct(intrinsic,[4,{maxByteLength:2}],target)}catch(error){check(error instanceof RangeError&&prototypeReads===1,'range-before-prototype')}
const prototypeBuffer=new intrinsic(8,{maxByteLength:16});
const viewTarget=new Proxy(function(){},{get(object,key,receiver){if(key==='prototype'){prototypeBuffer.resize(12);return DataView.prototype}return Reflect.get(object,key,receiver)}});
const constructedTracking=Reflect.construct(DataView,[prototypeBuffer,2],viewTarget);check(constructedTracking.byteLength===10,'tracking-after-prototype-resize');
const byteLengthDescriptor=Object.getOwnPropertyDescriptor(prototype,'byteLength');Object.defineProperty(prototype,'byteLength',{get(){return 'public-length'},configurable:true});check(derived.byteLength==='public-length'&&Buffer.byteLength(derived)==='public-length','mutable-buffer-accessor');Object.defineProperty(prototype,'byteLength',byteLengthDescriptor);
let detachedConversion=false,detachedRejected=false;try{buffer.transfer({valueOf(){detachedConversion=true;return 0}})}catch(error){detachedRejected=error instanceof TypeError}check(detachedConversion&&detachedRejected,'detached-transfer-after-conversion');
let chain=null;
for(let index=0;index<4096;++index){const buffer=new intrinsic(4,{maxByteLength:16});const view=new DataView(buffer);view.setUint32(0,index,true);buffer.resize(8);chain={buffer,view,index,next:chain}}
__COLLECT__
queueMicrotask(()=>{let visited=0;while(chain){check(chain.view.getUint32(0,true)===chain.index&&chain.view.byteLength===8,'retained-resized-owner');const transferred=chain.buffer.transferToFixedLength();check(new DataView(transferred).getUint32(0,true)===chain.index&&chain.buffer.detached,'retained-transfer');chain=chain.next;visited++}check(visited===4096,'retained-worklist');console.log('retained',visited)});
let calls=0;globalThis.ArrayBuffer=function Replacement(){calls++;this.marker='ordinary'};
new ArrayBuffer(2);check(calls===1&&new ArrayBuffer(1).marker==='ordinary','mutable-constructor');globalThis.ArrayBuffer=intrinsic;
console.log('semantics',trace);
`.replace("__COLLECT__",collect?"$262.gc();":"")}

test('ArrayBuffer owners and storage transitions retain ordinary references and view witnesses',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-arraybuffer-owner-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false));
  const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile&&!noGc));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'arraybuffer-owner.ts#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
   if(observation)expect({noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({noGc,kind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

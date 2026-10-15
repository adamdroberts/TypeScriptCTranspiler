import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(collect:boolean,pinned=false){return `'use strict';
function check(value,message){if(!value)throw new Error(message)}
const formats=[Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float16Array,Float32Array,Float64Array,BigInt64Array,BigUint64Array];
for(const C of formats){
 const big=C===BigInt64Array||C===BigUint64Array,values=big?[1n,2n,3n]:[1,2,3],owner=new C(values),prototype=Object.getPrototypeOf(C.prototype);
 check(prototype.toString===Array.prototype.toString,'array-tostring-identity');
 for(const method of ['join','toLocaleString','toString']){const fn=prototype[method],descriptor=Object.getOwnPropertyDescriptor(prototype,method);check(fn.name===method&&fn.length===(method==='join'?1:0)&&!Object.hasOwn(fn,'prototype')&&descriptor.writable&&!descriptor.enumerable&&descriptor.configurable,'metadata')}
 Object.defineProperty(owner,'length',{value:99});console.log('method',C.name,owner.join('|'),owner.toLocaleString(),owner.toString());
 check(Array.prototype.join.call(owner,'|').split('|').length===99,'generic-array-length');
 for(const separator of [undefined,null,7,false,'😀',''])console.log('separator',C.name,String(separator),owner.join(separator));
 let rejected=false;try{owner.join(Symbol('separator'))}catch(e){rejected=e instanceof TypeError}check(rejected,'symbol-separator');
 for(const receiver of [{},C.prototype,new Proxy(new C(),{})])for(const method of ['join','toLocaleString']){let rejected=false;try{prototype[method].call(receiver)}catch(e){rejected=e instanceof TypeError}check(rejected,'brand')}
}
const toString=Int8Array.prototype.toString;
check(toString.call({join(){check(this.marker===7&&arguments.length===0,'join-arguments');return 11},marker:7})===11,'generic-tostring-raw-result');
check(toString.call({join:null,[Symbol.toStringTag]:'Fallback'})==='[object Fallback]','generic-tostring-fallback');
const ordinary=new Uint8Array([1,2]);ordinary.join=function(){return 'replacement'};check(ordinary.toString()==='replacement','live-join');ordinary.join=null;check(ordinary.toString()==='[object Uint8Array]','typed-tag-fallback');
for(const mutation of ['shrink','detach','grow']){
 const buffer=new ArrayBuffer(3,{maxByteLength:6}),owner=new Uint8Array(buffer);owner.set([1,2,3]);let calls=0;
 const result=owner.join({toString(){calls++;if(mutation==='shrink')buffer.resize(1);else if(mutation==='detach')buffer.transfer();else buffer.resize(5);return '|'}});
 check(calls===1,'separator-once');console.log('separator-mutation',mutation,result);
}
const zero=new Uint8Array();let separatorCalls=0;check(zero.join({toString(){separatorCalls++;return '|'}})===''&&separatorCalls===1,'empty-separator-conversion');
const detachedBuffer=new ArrayBuffer(0),detached=new Uint8Array(detachedBuffer);detachedBuffer.transfer();for(const method of ['join','toLocaleString']){let rejected=false;try{detached[method]({toString(){throw new Error('separator used')}})}catch(e){rejected=e instanceof TypeError}check(rejected,'detached-before-conversion')}
const descriptors=[Object.getOwnPropertyDescriptor(Number.prototype,'toLocaleString'),Object.getOwnPropertyDescriptor(BigInt.prototype,'toLocaleString')];
for(const [prototype,big] of [[Number.prototype,false],[BigInt.prototype,true]]){
 let trace='';Object.defineProperty(prototype,'toLocaleString',{configurable:true,get(){const value=this;trace+='get:'+String(value)+'|';return function(){check(this===value&&arguments.length===(__PINNED__?0:2),'selected-no-402-invoke');trace+='call:'+String(this)+'|';return {toString(){trace+='convert:'+String(value)+'|';return 'v'+String(value)}}}}});
 const owner=big?new BigInt64Array([1n,2n]):new Float64Array([1,2]);check(owner.toLocaleString({valueOf(){throw new Error('reserved converted')}},Symbol('reserved'))==='v1,v2','locale-elements');console.log('locale-trace',big,trace);
 const marker={};Object.defineProperty(prototype,'toLocaleString',{configurable:true,get(){throw marker}});let propagated=false;try{owner.toLocaleString()}catch(e){propagated=e===marker}check(propagated,'locale-getter-abrupt');
 Object.defineProperty(prototype,'toLocaleString',{configurable:true,value:function(){return {toString(){throw marker}}}});propagated=false;try{owner.toLocaleString()}catch(e){propagated=e===marker}check(propagated,'locale-result-conversion-abrupt');
 Object.defineProperty(prototype,'toLocaleString',{configurable:true,value:null});let rejected=false;try{owner.toLocaleString()}catch(e){rejected=e instanceof TypeError}check(rejected,'locale-method-not-callable');
 Object.defineProperty(prototype,'toLocaleString',descriptors[big?1:0]);
}
const buffer=new ArrayBuffer(3,{maxByteLength:6}),owner=new Uint8Array(buffer);owner.set([1,2,3]);let calls=0;Object.defineProperty(Number.prototype,'toLocaleString',{configurable:true,value:function(){calls++;buffer.resize(1);return String(this)}});check(owner.toLocaleString()==='1,,'&&calls===1,'locale-live-get');Object.defineProperty(Number.prototype,'toLocaleString',descriptors[0]);
if(__PINNED_FALLBACK__){check(new Float64Array([1000,0.123456]).toLocaleString({bad:true})==='1000,0.123456','decimal-no-402-fallback');check(new BigInt64Array([1000n,-1000n]).toLocaleString()==='1000,-1000','bigint-no-402-fallback')}
const original=Int16Array.prototype.join;Int16Array.prototype.join=function(){return 'shadow'};const changed=new Int16Array([1,2]);check(changed.join()==='shadow'&&original.call(changed)==='1,2','mutable-join');delete Int16Array.prototype.join;
const marker={};let trace='';const arrayLike={get length(){trace+='length|';return 3},get 0(){trace+='get0|';return {toString(){trace+='convert0|';return 'a'}}},get 1(){trace+='get1|';return null},get 2(){trace+='get2|';return 'c'}};
const joined=Array.prototype.join.call(arrayLike,{toString(){trace+='separator|';return '|'}});check(joined==='a||c'&&trace==='length|separator|get0|convert0|get1|get2|','array-join-order');
const localeArray=[{toLocaleString(){check(arguments.length===(__PINNED_ARRAY__?0:2),'array-no-402-invoke');return 'a'}},null,{toLocaleString(){return 'c'}}];check(localeArray.toLocaleString()==='a,,c','array-locale');
let state=0x12abc;for(let trial=0;trial<16;trial++){state=(Math.imul(state,1664525)+1013904223)>>>0;const length=state%83,values=[];for(let i=0;i<length;i++)values.push((state+i)%255);const owner=new Uint8Array(values);check(owner.join('😀')===values.join('😀'),'generated-join');check(owner.toString()===values.join(','),'generated-tostring')}
let chain=null;for(let index=0;index<4096;index++){const C=formats[index%formats.length],big=C===BigInt64Array||C===BigUint64Array;const owner=C.of(...(big?[11n,13n]:[11,13]));chain={owner,join:owner.join,next:chain}}
__COLLECT__
queueMicrotask(()=>{let visited=0;while(chain){check(chain.join.call(chain.owner,'|')==='11|13'&&chain.owner.toLocaleString()==='11,13','retained-string-owner');chain=chain.next;visited++}check(visited===4096,'retained-graph');console.log('retained',visited)});
`.replace("__COLLECT__",collect?"$262.gc();":"").replace("__PINNED__",String(pinned)).replace("__PINNED_FALLBACK__",String(pinned)).replace("__PINNED_ARRAY__",String(pinned))}

test('TypedArray and Array string methods share captured ranges and live indexed Reads',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-typed-array-string-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false));
  const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile&&!noGc,true));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'typed-array-string.ts#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
   if(observation)expect({noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({noGc,kind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

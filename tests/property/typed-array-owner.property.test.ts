import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(collect:boolean,pinned=false){return `'use strict';
function check(value,message){if(!value)throw new Error(message)}
const numeric=[Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float16Array,Float32Array,Float64Array];
const formats=numeric.concat([BigInt64Array,BigUint64Array]);
for(const C of formats){
 const big=C===BigInt64Array||C===BigUint64Array;
 const source=big?[0n,-1n,18446744073709551617n]:[0,-1,258,2.5,3.5,NaN,Infinity,-Infinity,-0,1.0004882812500002];
 const owner=new C(source),width=C.BYTES_PER_ELEMENT;
 const inherited=Object.getPrototypeOf(C.prototype);
 check(owner.buffer instanceof ArrayBuffer&&owner.byteLength===source.length*width&&ArrayBuffer.isView(owner),'owner');
 check(owner instanceof C&&Object.getPrototypeOf(owner)===C.prototype&&C.length===3,'constructor');
 check(C.prototype.BYTES_PER_ELEMENT===width&&Object.getOwnPropertyDescriptor(C,'BYTES_PER_ELEMENT').writable===false,'width');
 check(owner.values===owner[Symbol.iterator]&&Object.prototype.toString.call(owner)==='[object '+C.name+']','tag');
 console.log('format',C.name,Array.from(owner,x=>Object.is(x,-0)?'-0':String(x)).join(','));
 console.log('bytes',C.name,Array.from(new Uint8Array(owner.buffer)).join(','));
 for(const key of ['0','-0','-1','1.5','NaN','Infinity','01','1e0','99']){
  const before=owner[0];let conversions=0;const value={valueOf(){conversions++;return big?7n:7}};
  const receiver={};const success=Reflect.set(owner,key,value,receiver);
  const descriptor=Object.getOwnPropertyDescriptor(owner,key);
  console.log('key',C.name,key,key in owner,success,Object.hasOwn(receiver,key),conversions,descriptor?descriptor.writable+','+descriptor.enumerable+','+descriptor.configurable:'none');
  Reflect.set(owner,key,value);console.log('set',C.name,key,conversions,String(owner[key]));
 }
 const clone=new C(owner);check(clone.buffer!==owner.buffer&&clone.length===owner.length,'copy');
 console.log('clone',C.name,Array.from(clone,String).join(','));
 let invalid=false;try{new C(new Proxy(owner,{}))}catch(e){invalid=e instanceof TypeError}check(invalid,'proxy-constructor-brand');
 invalid=false;try{Object.getOwnPropertyDescriptor(inherited,'length').get.call(new Proxy(owner,{}))}catch(e){invalid=e instanceof TypeError}check(invalid,'proxy-getter-brand');
}
for(const C of numeric){const owner=new C(new Uint8Array([1,255]));console.log('cross',C.name,Array.from(owner,String).join(','))}
let mismatch=0;for(const make of [()=>new BigInt64Array(new Int8Array()),()=>new Int8Array(new BigInt64Array())])try{make()}catch(e){if(e instanceof TypeError)mismatch++}check(mismatch===2,'empty-content-mismatch');
const clamped=new Uint8ClampedArray([-1,0.5,1.5,2.5,254.5,255.5,NaN]);check(Array.from(clamped).join(',')==='0,0,2,2,254,255,0','clamped');
let trace='';const arrayLike={get length(){trace+='length|';return 2},get 0(){trace+='get0|';return {valueOf(){trace+='convert0|';return 4}}},get 1(){trace+='get1|';return 5}};
console.log('arraylike',Array.from(new Int16Array(arrayLike)).join(','),trace);
trace='';const iterable={ [Symbol.iterator](){trace+='open|';let index=0;return {next(){trace+='next|';return index++<2?{value:{valueOf(){trace+='convert|';return index}},done:false}:{done:true}}}}};
console.log('iterable',Array.from(new Int16Array(iterable)).join(','),trace);
class Derived extends Int16Array{}const derived=new Derived([4,5]);check(derived instanceof Derived&&derived instanceof Int16Array&&derived[1]===5,'derived');
for(const C of formats){
 const width=C.BYTES_PER_ELEMENT,big=C===BigInt64Array||C===BigUint64Array;
 const buffer=new ArrayBuffer(width*4,{maxByteLength:width*8});
 const tracking=new C(buffer,width),fixed=new C(buffer,width,2);
 tracking[0]=big?11n:11;check(fixed[0]===tracking[0],'shared-storage');
 check(!Reflect.preventExtensions(tracking)&&!Reflect.preventExtensions(fixed),'resizable-extensibility');
 buffer.resize(width);check(tracking.length===0&&fixed.length===0&&fixed.byteOffset===0&&!('0' in fixed),'oob');
 buffer.resize(width*5);check(tracking.length===4&&fixed.length===2&&fixed.byteOffset===width&&fixed[0]===(big?0n:0),'recover');
 let calls=0;Reflect.set(fixed,'0',{valueOf(){calls++;buffer.resize(width);return big?7n:7}});check(calls===1&&fixed.length===0,'coercion-shrink');
 buffer.resize(width*4);Reflect.set(fixed,'99',{valueOf(){calls++;buffer.resize(width*5);return big?7n:7}});check(calls===2&&fixed.length===2,'invalid-index-conversion');
 const iterator=tracking.values();check(iterator.next().value===(big?0n:0),'iterator-first');
 buffer.resize(0);let failed=false;try{iterator.next()}catch(e){failed=e instanceof TypeError}check(failed,'iterator-oob');
 buffer.resize(width*5);check(iterator.next().value===(big?0n:0),'iterator-recovery');
 const old=tracking.buffer;buffer.transfer();check(tracking.buffer===old&&tracking.length===0&&tracking.byteOffset===0&&tracking[0]===undefined,'detach');
 Reflect.set(tracking,'0',{valueOf(){calls++;return big?2n:2}});check(calls===3,'detached-conversion');
 console.log('resize',C.name,calls);
}
const aligned=new ArrayBuffer(5,{maxByteLength:9}),odd=new Uint16Array(aligned);check(odd.length===2,'tracking-floor');
let unaligned=false;try{new Uint16Array(new ArrayBuffer(5))}catch(e){unaligned=e instanceof RangeError}check(unaligned,'fixed-alignment');
const fixed=new Int16Array([1,2]);Object.defineProperty(fixed,'length',{value:99});check(Array.from(fixed).join(',')==='1,2','iterator-internal-length');check(Reflect.preventExtensions(fixed),'fixed-extensibility');
let chain=null;for(let index=0;index<4096;index++){const C=formats[index%formats.length],big=C===BigInt64Array||C===BigUint64Array;const buffer=new ArrayBuffer(C.BYTES_PER_ELEMENT*2,{maxByteLength:C.BYTES_PER_ELEMENT*4});const owner=new C(buffer);owner[0]=big?13n:13;chain={owner,next:chain}}
__COLLECT__
if(__PINNED__){
 const marker={};const target=new Proxy(function(){},{get(t,k,r){if(k==='prototype')throw marker;return Reflect.get(t,k,r)}});
 let rejected=false;try{Reflect.construct(Uint8Array,[{get length(){throw new Error('wrong order')}}],target)}catch(e){rejected=e===marker}check(rejected,'pinned-prototype-before-source');
 const buffer=new ArrayBuffer(8,{maxByteLength:16});let order='';const target2=new Proxy(function(){},{get(t,k,r){if(k==='prototype'){order+='prototype|';return Uint16Array.prototype}return Reflect.get(t,k,r)}});
 const owner=Reflect.construct(Uint16Array,[buffer,{valueOf(){order+='offset|';return 0}},{valueOf(){order+='length|';buffer.resize(4);return 2}}],target2);
 check(order==='prototype|offset|length|'&&owner.length===2,'pinned-constructor-order');
}
queueMicrotask(()=>{let visited=0;while(chain){const owner=chain.owner;check(String(owner[0])==='13','retained-element');owner.buffer.resize(owner.BYTES_PER_ELEMENT*3);check(owner.length===3,'retained-view');chain=chain.next;visited++}check(visited===4096,'retained-graph');console.log('retained',visited)});
`.replace("__COLLECT__",collect?"$262.gc();":"").replace("__PINNED__",String(pinned))}

test('TypedArray owners share format records and current ArrayBuffer witnesses',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-typed-array-owner-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false));
  const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile&&!noGc,true));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'typed-array-owner.ts#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
   if(observation)expect({noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({noGc,kind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

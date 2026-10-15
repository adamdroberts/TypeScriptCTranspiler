import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(collect:boolean){return `'use strict';
function check(value,message){if(!value)throw new Error(message)}
function rejects(fn,C,message){let found=false;try{fn()}catch(e){found=e instanceof C}check(found,message)}
const P=SharedArrayBuffer.prototype;
check(SharedArrayBuffer.name==='SharedArrayBuffer'&&SharedArrayBuffer.length===1&&Object.getPrototypeOf(P)===Object.prototype,'constructor-metadata');
check(P.constructor===SharedArrayBuffer&&!Object.getOwnPropertyDescriptor(SharedArrayBuffer,'prototype').writable,'prototype-metadata');
for(const name of ['byteLength','maxByteLength','growable']){const d=Object.getOwnPropertyDescriptor(P,name);check(d.get.name==='get '+name&&d.get.length===0&&!d.enumerable&&d.configurable&&!Object.hasOwn(d.get,'prototype'),'getter-metadata')}
for(const name of ['grow','slice']){const d=Object.getOwnPropertyDescriptor(P,name);check(d.value.name===name&&d.value.length===(name==='grow'?1:2)&&d.writable&&!d.enumerable&&d.configurable&&!Object.hasOwn(d.value,'prototype'),'method-metadata')}
check(Object.getOwnPropertyDescriptor(SharedArrayBuffer,Symbol.species).get.call(17)===17,'species-generic');
check(Object.prototype.toString.call(new SharedArrayBuffer())==='[object SharedArrayBuffer]'&&!Object.hasOwn(P,'resize')&&!Object.hasOwn(P,'transfer'),'tag');
for(const receiver of [{},P,new ArrayBuffer(0),new Proxy(new SharedArrayBuffer(0),{})]){
 for(const name of ['byteLength','maxByteLength','growable'])rejects(()=>Object.getOwnPropertyDescriptor(P,name).get.call(receiver),TypeError,'getter-brand');
 rejects(()=>P.slice.call(receiver),TypeError,'slice-brand');rejects(()=>P.grow.call(receiver,0),TypeError,'grow-brand');
}
const fixed=new SharedArrayBuffer(3);check(fixed.byteLength===3&&fixed.maxByteLength===3&&!fixed.growable,'fixed');
let converted=false;rejects(()=>fixed.grow({valueOf(){converted=true;return 3}}),TypeError,'fixed-grow');check(!converted,'fixed-grow-before-convert');
for(const name of ['byteLength','maxByteLength','resizable','detached'])rejects(()=>Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,name).get.call(fixed),TypeError,'ordinary-brand');
for(const name of ['resize','transfer','transferToFixedLength','slice'])rejects(()=>ArrayBuffer.prototype[name].call(fixed,0),TypeError,'ordinary-method-brand');
rejects(()=>SharedArrayBuffer(1),TypeError,'call-without-new');rejects(()=>new SharedArrayBuffer(-1),RangeError,'negative');rejects(()=>new SharedArrayBuffer(Infinity),RangeError,'infinity');rejects(()=>new SharedArrayBuffer(2,{maxByteLength:1}),RangeError,'maximum');
const trace=[];const b=new SharedArrayBuffer({valueOf(){trace.push('length');return 4}}, {get maxByteLength(){trace.push('maximum-get');return {valueOf(){trace.push('maximum-convert');return 12}}}});
check(trace.join('|')==='length|maximum-get|maximum-convert','construction-order');
const tracking=new Uint8Array(b),fixedView=new Uint8Array(b,0,4),data=new DataView(b),fixedData=new DataView(b,1,2);tracking.set([1,2,3,4]);
Object.defineProperty(b,'byteLength',{value:99});check(tracking.length===4&&data.byteLength===4,'private-length');
check(tracking.buffer===b&&data.buffer===b&&ArrayBuffer.isView(tracking)&&ArrayBuffer.isView(data)&&!ArrayBuffer.isView(b),'owners');
let growthTrace='';const grown=b.grow({valueOf(){growthTrace+='convert';check(tracking.length===4,'before-grow');return 8}});check(grown===undefined&&growthTrace==='convert','grow-result');
check(tracking.length===8&&data.byteLength===8&&fixedView.length===4&&fixedData.byteLength===2,'growing-views');
check(tracking.join(',')==='1,2,3,4,0,0,0,0','preserve-zero-fill');b.grow(8);rejects(()=>b.grow(7),RangeError,'shrink');rejects(()=>b.grow(13),RangeError,'excessive');
const iterator=tracking.values();check(iterator.next().value===1,'iterator-start');b.grow(12);let values=[];for(let item=iterator.next();!item.done;item=iterator.next())values.push(item.value);check(values.length===11,'live-growing-iterator');
check(Reflect.preventExtensions(fixedView)&&!Reflect.preventExtensions(tracking),'fixed-shared-integrity');
data.setUint32(4,0x12345678,true);check(tracking[4]===0x78&&data.getUint32(4,true)===0x12345678,'scalar-storage');
const sub=tracking.subarray(4);check(sub.buffer===b&&sub.length===8,'shared-subarray');
const formats=[Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float16Array,Float32Array,Float64Array,BigInt64Array,BigUint64Array];
for(const C of formats){const width=C.BYTES_PER_ELEMENT,big=C===BigInt64Array||C===BigUint64Array,buffer=new SharedArrayBuffer(width*3,{maxByteLength:width*6}),owner=new C(buffer),bounded=new C(buffer,width,1);const initialValues=big?[11n,13n,17n]:[11,13,17];owner.set(initialValues);
 const copy=new C(owner);check(copy.join('|')==='11|13|17','shared-typed-copy');buffer.grow(width*5);check(owner.length===5&&bounded.length===1&&owner[3]===(big?0n:0),'format-grow');owner.copyWithin(1,0,3);check(owner.join('|')==='11|11|13|17|0','shared-copy-within');const slice=owner.slice(1,4);check(slice.join('|')==='11|13|17','shared-slice');const destination=new C(new SharedArrayBuffer(width*5));destination.set(owner);check(destination.join('|')===owner.join('|'),'shared-set');console.log('format',C.name,owner.join('|'));
}
const odd=new SharedArrayBuffer(3,{maxByteLength:9}),oddView=new Uint16Array(odd);check(oddView.length===1,'unaligned-growable-length');odd.grow(5);check(oddView.length===2,'rounded-tracking');rejects(()=>new Uint16Array(new SharedArrayBuffer(3)),RangeError,'fixed-misalignment');
const slicing=new SharedArrayBuffer(4,{maxByteLength:8});new Uint8Array(slicing).set([1,2,3,4]);let order='';const part=slicing.slice({valueOf(){order+='start|';slicing.grow(6);return 1}},{valueOf(){order+='end|';return 99}});check(order==='start|end|'&&part.byteLength===3&&new Uint8Array(part).join('|')==='2|3|4'&&!part.growable,'slice-captured-length');
const defaultSpecies=SharedArrayBuffer[Symbol.species];check(defaultSpecies===SharedArrayBuffer,'species');
for(const kind of ['same','short','ordinary','proxy']){const source=new SharedArrayBuffer(3);source.constructor={[Symbol.species]:function(length){check(length===2&&arguments.length===1,'species-actuals');if(kind==='same')return source;if(kind==='short')return new SharedArrayBuffer(1);if(kind==='ordinary')return new ArrayBuffer(length);return new Proxy(new SharedArrayBuffer(length),{})}};rejects(()=>source.slice(1),TypeError,'species-validation')}
const customSource=new SharedArrayBuffer(3);new Uint8Array(customSource).set([5,7,9]);const customTarget=new SharedArrayBuffer(5,{maxByteLength:7});customSource.constructor={get [Symbol.species](){order+='species|';return function(length){check(length===2,'custom-species-length');return customTarget}}};check(customSource.slice(1)===customTarget&&new Uint8Array(customTarget).join('|')==='7|9|0|0|0','custom-species-copy');
class Derived extends SharedArrayBuffer{}const derived=new Derived(2,{maxByteLength:4});check(derived instanceof Derived&&derived instanceof SharedArrayBuffer&&derived.slice() instanceof Derived,'derived');
let state=0x3918;for(let trial=0;trial<16;trial++){state=(Math.imul(state,1664525)+1013904223)>>>0;const length=state%97,buffer=new SharedArrayBuffer(length,{maxByteLength:length*2+1}),owner=new Uint8Array(buffer);for(let i=0;i<length;i++)owner[i]=(i+state)%256;const expected=Array.from(owner);buffer.grow(length*2+1);check(owner.length===length*2+1&&owner.slice(0,length).join('|')===expected.join('|'),'generated-preserve');for(let i=length;i<owner.length;i++)check(owner[i]===0,'generated-zero-fill')}
let chain=null;for(let index=0;index<4096;index++){const buffer=new SharedArrayBuffer(2,{maxByteLength:4}),view=new Uint8Array(buffer);view[0]=index%255;chain={view,grow:buffer.grow,buffer,next:chain}}
__COLLECT__
queueMicrotask(()=>{let visited=0;while(chain){chain.grow.call(chain.buffer,4);check(chain.view.length===4&&chain.view[0]===(4095-visited)%255&&chain.view[2]===0,'retained-shared-storage');chain=chain.next;visited++}check(visited===4096,'retained-graph');console.log('retained',visited)});
`.replace("__COLLECT__",collect?"$262.gc();":"")}

test('SharedArrayBuffer owners retain stable storage and publish growing view lengths',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-shared-array-buffer-owner-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false));
  const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile&&!noGc));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'shared-array-buffer-owner.ts#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
   if(observation)expect({noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({noGc,kind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

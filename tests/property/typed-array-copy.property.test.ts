import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(collect:boolean){return `'use strict';
function check(value,message){if(!value)throw new Error(message)}
function text(value){return ArrayBuffer.isView(value)?value.constructor.name+':'+Array.from(value,String).join(','):String(value)}
const formats=[Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float16Array,Float32Array,Float64Array,BigInt64Array,BigUint64Array];
const methods=['copyWithin','fill','reverse','slice','subarray','set','toReversed','with'];
for(const C of formats){
 const big=C===BigInt64Array||C===BigUint64Array,values=big?[1n,2n,3n,4n]:[1,2,3,4];
 for(const method of methods){
  const owner=new C(values);Object.defineProperty(owner,'length',{value:99});const fn=owner[method];const descriptor=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(C.prototype),method);
  check(fn.name===method&&fn.length===(method==='copyWithin'||method==='slice'||method==='subarray'||method==='with'?2:method==='reverse'||method==='toReversed'?0:1)&&!Object.hasOwn(fn,'prototype')&&descriptor.writable&&!descriptor.enumerable&&descriptor.configurable,'metadata');
  const result=method==='copyWithin'?fn.call(owner,1,0,3):method==='fill'?fn.call(owner,big?7n:7,-3,-1):method==='set'?fn.call(owner,big?[9n,8n]:[9,8],1):method==='slice'||method==='subarray'?fn.call(owner,1,-1):method==='with'?fn.call(owner,-1,big?9n:9):fn.call(owner);
  console.log('method',C.name,method,text(owner),text(result),result===owner,ArrayBuffer.isView(result)?result.buffer===owner.buffer:false);
 }
 const owner=new C(values);owner.set(owner.subarray(0,3),1);check(Array.from(owner,String).join(',')==='1,1,2,3','same-storage-set');
 for(const receiver of [{},new Proxy(new C(),{}),C.prototype])for(const method of methods){let rejected=false;try{C.prototype[method].call(receiver)}catch(e){rejected=e instanceof TypeError}check(rejected,'receiver-brand')}
}
for(const sourceC of [Uint8Array,Uint16Array,Uint32Array,Float32Array])for(const targetC of [Uint8Array,Uint16Array,Uint32Array,Float32Array]){
 const buffer=new ArrayBuffer(32),source=new sourceC(buffer,0,4);source.set([17,258,3,255]);const target=new targetC(buffer,0,4);target.set(source);console.log('overlap',sourceC.name,targetC.name,Array.from(target,String).join(','));
}
for(const C of [Float16Array,Float32Array,Float64Array]){
 const width=C.BYTES_PER_ELEMENT,buffer=new ArrayBuffer(width*4),bytes=new Uint8Array(buffer);for(let i=0;i<bytes.length;i++)bytes[i]=255;bytes[0]=1;bytes[width]=3;
 const owner=new C(buffer),before=Array.from(bytes).join(','),copy=owner.slice();check(Array.from(new Uint8Array(copy.buffer)).join(',')===before,'slice-raw-bits');
 owner.copyWithin(1,0,3);const actual=new Uint8Array(owner.buffer),expected=new Uint8Array(copy.buffer);for(let i=0;i<width*3;i++)check(actual[width+i]===expected[i],'copywithin-raw-bits');
 const target=new C(4);target.set(copy);check(Array.from(new Uint8Array(target.buffer)).join(',')===before,'set-raw-bits');console.log('raw',C.name,before);
}
let trace='';const marker={};const mark=(name,value)=>({valueOf(){trace+=name+'|';return value}});
const copy=new Int16Array([1,2,3,4]);copy.copyWithin(mark('target',1),mark('start',0),mark('end',3));check(trace==='target|start|end|','copy-conversion-order');
trace='';copy.fill(mark('value',7),mark('start',1),mark('end',3));check(trace==='value|start|end|','fill-conversion-order');
trace='';let rejected=false;try{copy.with(mark('index',99),{valueOf(){trace+='value|';throw marker}})}catch(e){rejected=e===marker}check(rejected&&trace==='index|value|','with-value-before-range');
for(const mutation of ['shrink','detach'])for(const method of ['copyWithin','fill','slice','with']){
 const buffer=new ArrayBuffer(4,{maxByteLength:8}),owner=new Uint8Array(buffer);owner.set([1,2,3,4]);let trace='';const convert={valueOf(){trace+='convert|';if(mutation==='shrink')buffer.resize(2);else buffer.transfer();return method==='fill'?8:method==='with'?9:0}};
 let result,error='';try{result=method==='copyWithin'?owner.copyWithin(convert,1,4):method==='fill'?owner.fill(convert,0,4):method==='slice'?owner.slice(convert,4):owner.with(0,convert)}catch(e){error=e.name}
 console.log('coercion',mutation,method,error,text(result),owner.length,trace);
}
const zero=new ArrayBuffer(4,{maxByteLength:8}),zeroOwner=new Uint8Array(zero);check(zeroOwner.copyWithin(0,4,{valueOf(){zero.transfer();return 4}})===zeroOwner,'zero-copy-skips-revalidation');
const fillZero=new ArrayBuffer(0),fillOwner=new Uint8Array(fillZero);let fillError=false;try{fillOwner.fill({valueOf(){fillZero.transfer();return 1}})}catch(e){fillError=e instanceof TypeError}check(fillError,'zero-fill-revalidates');
for(const tracking of [false,true]){
 const buffer=new ArrayBuffer(8,{maxByteLength:16}),owner=tracking?new Uint16Array(buffer,2):new Uint16Array(buffer,2,2);owner[0]=7;
 const view=owner.subarray(1),fixed=owner.subarray(1,2);check(view.buffer===buffer&&view.byteOffset===4&&fixed.length===1,'subarray-owner');buffer.resize(12);console.log('subarray-resize',tracking,view.length,fixed.length);
 buffer.resize(2);let error='';try{owner.subarray()}catch(e){error=e.name}console.log('subarray-oob',tracking,error);
}
for(const method of ['slice','subarray']){
 const owner=new Int16Array([1,2,3]);trace='';let parameters;
 Object.defineProperty(owner,'constructor',{value:{get [Symbol.species](){trace+='species|';return function(...args){parameters=args;return method==='slice'?new Float64Array(args[0]):new Int16Array(...args)}}}});
 const result=owner[method](mark('start',1),mark('end',3));console.log('species',method,trace,parameters.length,typeof parameters[0],text(result));
}
const alias=new Uint8Array([1,2,3,4]);Object.defineProperty(alias,'constructor',{value:{[Symbol.species]:function(){return new Uint8Array(alias.buffer,1,3)}}});const aliased=alias.slice(0,3);check(Array.from(alias).join(',')==='1,1,1,1'&&Array.from(aliased).join(',')==='1,1,1','slice-forward-alias');
const noSpecies=new Int16Array([1,2,3]);Object.defineProperty(noSpecies,'constructor',{get(){throw marker}});check(noSpecies.toReversed()[0]===3&&noSpecies.with(1,9)[1]===9,'copy-by-intrinsic');
for(const method of ['toReversed','with']){class Derived extends Int16Array{}const owner=new Derived([1,2]);const result=method==='with'?owner.with(0,3):owner.toReversed();check(result instanceof Int16Array&&!(result instanceof Derived),'same-type-intrinsic')}
const target=new Uint8Array(3);trace='';const source={get length(){trace+='length|';return 2},get 0(){trace+='get0|';return mark('value0',7)},get 1(){trace+='get1|';return 8}};target.set(source,mark('offset',1));check(trace==='offset|length|get0|value0|get1|','arraylike-set-order');console.log('arraylike',Array.from(target).join(','),trace);
for(const offset of [-1,-Infinity,Infinity,9]){let trace='',error='';try{target.set({get length(){trace+='length|';return 0}},offset)}catch(e){error=e.name}console.log('offset',String(offset),trace,error)}
const altered=new ArrayBuffer(3,{maxByteLength:6}),alteredOwner=new Uint8Array(altered);let conversions=0;alteredOwner.set({length:3,get 0(){altered.transfer();return {valueOf(){conversions++;return 1}}},get 1(){return {valueOf(){conversions++;return 2}}},get 2(){return {valueOf(){conversions++;return 3}}}});check(conversions===3&&alteredOwner.length===0,'set-post-get-detachment');
const detachedBuffer=new ArrayBuffer(2),detachedOwner=new Uint8Array(detachedBuffer);detachedBuffer.transfer();trace='';let offsetError=false;try{detachedOwner.set({get length(){trace+='length|';return 0}},mark('offset',0))}catch(e){offsetError=e instanceof TypeError}check(offsetError&&trace==='offset|','set-coercion-before-bounds');
for(const source of [new BigInt64Array(),new BigInt64Array([1n])]){let rejected=false;try{target.set(source)}catch(e){rejected=e instanceof TypeError}check(rejected,'set-content-type')}
let state=0x13579;for(let trial=0;trial<16;trial++){state=(Math.imul(state,1664525)+1013904223)>>>0;const length=state%61,values=[];for(let i=0;i<length;i++)values.push(i);const owner=new Int16Array(values),reference=values.slice();const start=length?state%length:0;owner.copyWithin(0,start);reference.copyWithin(0,start);check(Array.from(owner).join(',')===reference.join(','),'generated-copy');check(Array.from(owner.toReversed()).join(',')===reference.slice().reverse().join(','),'generated-reverse')}
let chain=null;for(let index=0;index<4096;index++){const C=formats[index%formats.length],big=C===BigInt64Array||C===BigUint64Array;const owner=C.of(...(big?[11n,13n]:[11,13])).slice();const view=owner.subarray();chain={owner,view,next:chain}}
__COLLECT__
queueMicrotask(()=>{let visited=0;while(chain){chain.owner.reverse();check(String(chain.view[0])==='13','retained-shared-view');chain=chain.next;visited++}check(visited===4096,'retained-graph');console.log('retained',visited)});
`.replace("__COLLECT__",collect?"$262.gc();":"")}

test('TypedArray copies and mutations share live witnesses and byte records',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-typed-array-copy-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false));
  const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile&&!noGc));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'typed-array-copy.ts#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
   if(observation)expect({noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({noGc,kind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(collect:boolean,detach=false):string{return `'use strict';
function check(value,label){if(!value)throw label}
function text(value){return typeof value==='number'&&Object.is(value,-0)?'-0':String(value)}
const formats=[['Int8',1],['Uint8',1],['Int16',2],['Uint16',2],['Int32',4],['Uint32',4],['Float16',2],['Float32',4],['Float64',8],['BigInt64',8],['BigUint64',8]];
const ordinary=new DataView(new ArrayBuffer(16),2,12),prototype=DataView.prototype;
check(ordinary instanceof DataView&&ordinary.constructor===DataView&&Object.getPrototypeOf(ordinary)===prototype,'ordinary-owner');
check(Object.getPrototypeOf(prototype)===Object.prototype&&Object.keys(ordinary).length===0,'prototype-owner');
console.log('properties',Object.getOwnPropertyNames(prototype).join('|'),Object.prototype.toString.call(ordinary));
for(const name of Object.getOwnPropertyNames(prototype)){
 const descriptor=Object.getOwnPropertyDescriptor(prototype,name);
 if(descriptor.get)console.log('getter',name,descriptor.get.name,descriptor.get.length,descriptor.enumerable,descriptor.configurable,descriptor.set===undefined);
 else console.log('method',name,descriptor.value.name,descriptor.value.length,descriptor.writable,descriptor.enumerable,descriptor.configurable,Object.hasOwn(descriptor.value,'prototype'));
}
const tag=Object.getOwnPropertyDescriptor(prototype,Symbol.toStringTag);console.log('tag',tag.value,tag.writable,tag.enumerable,tag.configurable);
for(const [name,width] of formats){
 const values=name.startsWith('Big')?[0n,-1n,1n<<63n,(1n<<80n)+17n,-(1n<<90n)-3n]:[0,-0,1,-1,0x12345678,NaN,Infinity,-Infinity,-3.75,65504,65520,2**-24,2**-25,1+2**-11,1+2**-11+2**-40,1+2**-24];
 let observed=[];
 for(const value of values)for(const little of [false,true]){
  const buffer=new ArrayBuffer(width+4),view=new DataView(buffer,1,width+2);
  view['set'+name](1,value,little);
  const bytes=[];for(let i=0;i<width;i++)bytes.push(view.getUint8(1+i));
  observed.push(text(view['get'+name](1,little))+':'+bytes.join(','));
 }
 console.log(name,observed.join('|'));
}
let order='';
const offset={valueOf(){order+='index|';return 0.9}},value={valueOf(){order+='value|';return 258}},little={valueOf(){throw 'endian conversion'}};
ordinary.setUint16(offset,value,little);check(order==='index|value|'&&ordinary.getUint16(0,true)===258,'ordered-conversion');
const rangeValue={valueOf(){order+='range-value|';return 9}};
let range=false;try{ordinary.setUint8(ordinary.byteLength,rangeValue)}catch(error){range=error instanceof RangeError}check(range&&order.endsWith('range-value|'),'value-before-bounds');
const get=prototype.getUint8;
for(const receiver of [{},Object.create(prototype),new Proxy(ordinary,{get(){throw 'proxy trap'}})]){
 let rejected=false;try{get.call(receiver,{valueOf(){throw 'index conversion'}})}catch(error){rejected=error instanceof TypeError}check(rejected,'receiver-before-index');
}
for(const index of [1n,Symbol('index'),Infinity,-1]){
 let rejected=false;try{get.call(ordinary,index)}catch(error){rejected=error instanceof TypeError||error instanceof RangeError}check(rejected,'index-conversion');
}
for(const [name,value] of [['setUint8',1n],['setUint8',Symbol('number')],['setBigInt64',1],['setBigInt64',null]]){
 let rejected=false;try{ordinary[name](0,value)}catch(error){rejected=error instanceof TypeError}check(rejected,'number-bigint-conversion');
}
const lengthDescriptor=Object.getOwnPropertyDescriptor(prototype,'byteLength');
Object.defineProperty(prototype,'byteLength',{get(){return 77},configurable:true});check(ordinary.byteLength===77&&Buffer.byteLength(ordinary)===77,'mutable-accessor');Object.defineProperty(prototype,'byteLength',{get(){return 'boxed-length'},configurable:true});check(Buffer.byteLength(ordinary)==='boxed-length','boxed-byte-length');Object.defineProperty(prototype,'byteLength',lengthDescriptor);
Object.defineProperty(ordinary,'byteOffset',{value:999,configurable:true});check(ordinary.byteOffset===999,'own-property');delete ordinary.byteOffset;
let effect='';
function mark(label,result){effect+=label;return result}
const created=Reflect.construct(DataView,[mark('buffer|',new ArrayBuffer(4)),mark('offset|',0),mark('length|',4),mark('extra|',9)]);
created.setUint8(...[mark('index|',0),mark('value|',7),mark('endian|',false),mark('last|',8)]);
check(effect==='buffer|offset|length|extra|index|value|endian|last|'&&created.getUint8(0)===7,'complete-argument-list');
for(const args of [[],[{}],[new ArrayBuffer(2),-1],[new ArrayBuffer(2),3],[new ArrayBuffer(2),1,2]]){
 let rejected=false;try{Reflect.construct(DataView,args)}catch(error){rejected=error instanceof TypeError||error instanceof RangeError}check(rejected,'constructor-validation');
}
class Derived extends DataView{}
const derived=new Derived(new ArrayBuffer(4));derived.setUint32(0,123);check(derived instanceof Derived&&derived instanceof DataView&&derived.getUint32(0)===123,'derived-owner');
const replacement={marker:'custom'};function Target(){}Target.prototype=replacement;
const custom=Reflect.construct(DataView,[new ArrayBuffer(1)],Target);
check(Object.getPrototypeOf(custom)===replacement&&get.call(custom,0)===0,'new-target-prototype');
const original=prototype.getUint8;prototype.getUint8=function(index){return this===ordinary&&index===0?77:-1};
check(ordinary.getUint8(0)===77&&original.call(ordinary,0)===2,'mutable-method');prototype.getUint8=original;
let chain=null;
for(let index=0;index<4096;++index){const view=new DataView(new ArrayBuffer(8));view.setUint32(1,index,true);chain={view,index,next:chain}}
__COLLECT__
__DETACH__
queueMicrotask(()=>{let count=0;while(chain){check(chain.view.getUint32(1,true)===chain.index&&chain.view.buffer.byteLength===8,'retained-view-buffer');chain=chain.next;count++}check(count===4096,'retained-worklist');console.log('retained',count)});
const saved=DataView;let constructorCalls=0;globalThis.DataView=function Other(){constructorCalls++;this.marker='ordinary'};
new DataView(new ArrayBuffer(1));check(constructorCalls===1,'unused-mutable-constructor');
check(new DataView().marker==='ordinary','mutable-constructor');globalThis.DataView=saved;
console.log('semantics',order,effect);
`.replace("__COLLECT__",collect?"$262.gc();":"").replace("__DETACH__",detach?`const detachedBuffer=new ArrayBuffer(4),detachedView=new DataView(detachedBuffer);
let detached=false;
try{detachedView.getUint8({valueOf(){ $262.detachArrayBuffer(detachedBuffer);return 0}})}catch(error){detached=error instanceof TypeError}
check(detached&&detachedView.buffer===detachedBuffer,'get-detachment-order');
for(const name of ['byteOffset','byteLength']){let rejected=false;try{detachedView[name]}catch(error){rejected=error instanceof TypeError}check(rejected,'detached-accessor')}
const setBuffer=new ArrayBuffer(4),setView=new DataView(setBuffer);let setDetached=false;
try{setView.setUint8(0,{valueOf(){$262.detachArrayBuffer(setBuffer);return 42}})}catch(error){setDetached=error instanceof TypeError}
check(setDetached,'set-detachment-order');
const constructorBuffer=new ArrayBuffer(4);let constructorDetached=false,constructorOrder='';
const newTarget=new Proxy(function(){},{get(target,name,receiver){if(name==='prototype'){constructorOrder+='prototype|';return {}}return Reflect.get(target,name,receiver)}});
try{Reflect.construct(DataView,[constructorBuffer,0,{valueOf(){constructorOrder+='length|';$262.detachArrayBuffer(constructorBuffer);return 1}}],newTarget)}catch(error){constructorDetached=error instanceof TypeError}
check(constructorDetached&&constructorOrder==='length|prototype|','constructor-detachment-order');
`:"")}

test('DataView owners and byte accesses preserve ordinary references and conversion order',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-dataview-owner-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false,true));
  const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");globalThis.$262={detachArrayBuffer:b=>b.transfer()};console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile&&!noGc,profile));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'dataview-owner.ts#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
   if(observation)expect({noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({noGc,kind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(collect:boolean,pinned=false){return `'use strict';
function check(value,message){if(!value)throw new Error(message)}
function rejects(fn,C,message){let found=false;try{fn()}catch(e){found=e instanceof C}check(found,message)}
function collectNow(){__COLLECT__}
const methods=[['add',3],['and',3],['compareExchange',4],['exchange',3],['isLockFree',1],['load',2],['or',3],['store',3],['sub',3],['xor',3]];
check(Object.getPrototypeOf(Atomics)===Object.prototype&&Object.prototype.toString.call(Atomics)==='[object Atomics]','owner');
for(const [name,arity] of methods){const fn=Atomics[name],d=Object.getOwnPropertyDescriptor(Atomics,name);check(fn.name===name&&fn.length===arity&&!Object.hasOwn(fn,'prototype')&&d.writable&&!d.enumerable&&d.configurable,'metadata');rejects(()=>new fn(),TypeError,'nonconstructor')}
const tag=Object.getOwnPropertyDescriptor(Atomics,Symbol.toStringTag);check(tag.value==='Atomics'&&!tag.writable&&!tag.enumerable&&tag.configurable,'tag-metadata');
for(const size of [undefined,null,NaN,Infinity,-Infinity,-1,0,1,2,3,4,8,16,'4'])console.log('lock-free',String(size),Atomics.isLockFree(size));rejects(()=>Atomics.isLockFree(1n),TypeError,'lock-free-bigint');check(Atomics.isLockFree(4),'mandated-lock-free-word');check(Atomics.isLockFree(1.9)===(__PINNED_LOCK_FREE__?true:false),'pinned-size-integer-conversion');
const formats=[Int8Array,Uint8Array,Int16Array,Uint16Array,Int32Array,Uint32Array,BigInt64Array,BigUint64Array];
for(const C of formats)for(const shared of [false,true]){
 const width=C.BYTES_PER_ELEMENT,big=C===BigInt64Array||C===BigUint64Array,buffer=shared?new SharedArrayBuffer(width*3,{maxByteLength:width*6}):new ArrayBuffer(width*3,{maxByteLength:width*6}),owner=new C(buffer),one=big?1n:1,initial=big?11n:11;
 Object.defineProperty(owner,'length',{value:99});Atomics.store(owner,0,initial);rejects(()=>Atomics.load(owner,3),RangeError,'private-length');
 for(const method of ['add','sub','and','or','xor','exchange']){const operand=big?5n:5;const before=owner[0],read=Atomics[method].call(Symbol('ignored-this'),owner,0,operand);check(read===before,'read-old-word');console.log('operation',C.name,shared,method,String(read),String(owner[0]))}
 Atomics.store(owner,0,initial);check(Atomics.compareExchange(owner,0,big?12n:12,one)===initial&&owner[0]===initial,'compare-miss');check(Atomics.compareExchange(owner,0,initial,one)===initial&&owner[0]===one,'compare-hit');
 const values=big?[0n,-1n,9007199254740993n,18446744073709551617n,-18446744073709551617n]:[undefined,null,NaN,Infinity,-Infinity,1.75,-0,34359738369,-1099511627776];
 for(const value of values){const stored=Atomics.store(owner,1,value);console.log('stored',C.name,shared,String(value),String(stored),String(Atomics.load(owner,1)));if(!big&&Object.is(value,-0))check(Object.is(stored,0),'store-positive-zero')}
 const modulo=big?18446744073709551616n:2**(width*8);Atomics.store(owner,0,initial);check(Atomics.compareExchange(owner,0,modulo+initial,one)===initial&&owner[0]===one,'expected-modular-bits');
 let trace='';const expected={valueOf(){trace+='expected|';collectNow();return one}},replacement={valueOf(){trace+='replacement|';collectNow();return initial}};
 check(Atomics.compareExchange(owner,{valueOf(){trace+='index|';return 0}},expected,replacement)===one&&trace==='index|expected|replacement|','ordered-compare-conversions');
 for(const value of big?[1,undefined,null,Symbol('value')]:[1n,Symbol('value')])rejects(()=>Atomics.store(owner,0,value),TypeError,'content-conversion');
}
for(const method of ['load','store','add','compareExchange'])for(const owner of [{},new Proxy(new Int32Array(1),{}),new Float16Array(1),new Float32Array(1),new Float64Array(1),new Uint8ClampedArray(1)]){let converted=false;rejects(()=>Atomics[method](owner,{valueOf(){converted=true;return 0}},1,2),TypeError,'invalid-owner');check(!converted,'brand-before-index')}
for(const index of [-1,Infinity,-Infinity])rejects(()=>Atomics.load(new Int32Array(2),index),RangeError,'invalid-index');rejects(()=>Atomics.load(new Int32Array(2),Symbol()),TypeError,'symbol-index');
const indexed=new Int32Array([7,11]);for(const index of [undefined,null,NaN,-0,'0',0.9])check(Atomics.load(indexed,index)===7,'index-normalization');check(Atomics.load(indexed,1.9)===11,'fractional-index');
for(const fixed of [false,true])for(const method of ['load','store','add','compareExchange']){
 const buffer=new ArrayBuffer(12,{maxByteLength:24}),owner=fixed?new Int32Array(buffer,0,3):new Int32Array(buffer);let trace='';
 const index={valueOf(){trace+='index|';buffer.resize(4);return 2}},first={valueOf(){trace+='first|';return 1}},second={valueOf(){trace+='second|';return 2}};
 const expectedError=fixed?TypeError:(__PINNED__?RangeError:TypeError);rejects(()=>Atomics[method](owner,index,first,second),expectedError,'revalidate-after-conversion');check(trace===(method==='load'?'index|':method==='compareExchange'?'index|first|second|':'index|first|'),'conversion-before-revalidation');
}
for(const method of ['load','store','add','compareExchange']){const buffer=new ArrayBuffer(4),owner=new Int32Array(buffer);let trace='';const index={valueOf(){trace+='index|';buffer.transfer();return 0}},first={valueOf(){trace+='first|';return 1}},second={valueOf(){trace+='second|';return 2}};rejects(()=>Atomics[method](owner,index,first,second),TypeError,'detachment');check(trace===(method==='load'?'index|':method==='compareExchange'?'index|first|second|':'index|first|'),'detach-conversion-order')}
for(const shared of [false,true]){const buffer=shared?new SharedArrayBuffer(4,{maxByteLength:12}):new ArrayBuffer(4,{maxByteLength:12}),owner=new Int32Array(buffer);rejects(()=>Atomics.load(owner,{valueOf(){if(shared)buffer.grow(12);else buffer.resize(12);return 2}}),RangeError,'capture-before-index-grow')}
if(__PINNED_EXTENT__){const buffer=new ArrayBuffer(4,{maxByteLength:8}),owner=new Uint16Array(buffer);let diagnostic='';try{Atomics.load(owner,{valueOf(){buffer.resize(3);return 1}})}catch(e){check(e instanceof RangeError,'partial-element-fail-closed');diagnostic=e.message}check(diagnostic==='Atomic element extent is outside its current buffer','stable-extent-diagnostic')}
const primary=new Int32Array([1]);const storedAdd=Atomics.add;Atomics.add=function(){return 'replacement'};check(Atomics.add() ==='replacement'&&storedAdd.call(null,primary,0,2)===1&&primary[0]===3,'ordinary-stored-method');Atomics.add=storedAdd;
const bytes=Buffer.from([1,2]);check(Atomics.add(bytes,0,7)===1&&Atomics.load(bytes,0)===8,'buffer-storage-adapter');
let state=0x1933;for(let trial=0;trial<16;trial++){state=(Math.imul(state,1664525)+1013904223)>>>0;const length=1+state%83,owner=new Uint32Array(new SharedArrayBuffer(length*4));for(let i=0;i<length;i++){const before=(state+i)>>>0,operand=(state^i)>>>0;Atomics.store(owner,i,before);check(Atomics.add(owner,i,operand)===before&&Atomics.load(owner,i)===Number((BigInt(before)+BigInt(operand))&4294967295n),'generated-modular-add')}}
let chain=null;for(let index=0;index<4096;index++){const owner=new BigInt64Array(new SharedArrayBuffer(8));Atomics.store(owner,0,9007199254740993n);chain={owner,add:Atomics.add,next:chain}}
collectNow();queueMicrotask(()=>{let visited=0;while(chain){check(chain.add.call(undefined,chain.owner,0,2n)===9007199254740993n&&Atomics.load(chain.owner,0)===9007199254740995n,'retained-atomic-owner');chain=chain.next;visited++}check(visited===4096,'retained-graph');console.log('retained',visited)});
`.replace("__COLLECT__",collect?"$262.gc();":"").replace("__PINNED__",String(pinned)).replace("__PINNED_LOCK_FREE__",String(pinned)).replace("__PINNED_EXTENT__",String(pinned))}

test('Atomics word operations use captured integer views and native atomic storage',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-atomics-word-owner-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false));
  const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile&&!noGc,true));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'atomics-word-owner.ts#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
   if(observation)expect({noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({noGc,kind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

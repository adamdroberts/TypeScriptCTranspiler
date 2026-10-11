import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(collect:boolean,pinned=false){return `'use strict';
function check(value,message){if(!value)throw new Error(message)}
function describe(value){return ArrayBuffer.isView(value)?value.constructor.name+':'+Array.from(value,String).join(','):value&&typeof value==='object'?JSON.stringify(value):String(value)}
const formats=[Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float16Array,Float32Array,Float64Array,BigInt64Array,BigUint64Array];
const callbacks=['forEach','map','filter','some','every','find','findIndex','findLast','findLastIndex','reduce','reduceRight'];
const methods=['at','includes','indexOf','lastIndexOf'].concat(callbacks);
for(const C of formats){
 const big=C===BigInt64Array||C===BigUint64Array;
 for(const method of methods){
  const owner=new C(big?[1n,2n,1n,3n]:[1,2,1,3]),fn=owner[method];
  const descriptor=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(C.prototype),method);check(fn.name===method&&fn.length===1&&!Object.hasOwn(fn,'prototype')&&descriptor.writable&&!descriptor.enumerable&&descriptor.configurable,'metadata');
  Object.defineProperty(owner,'length',{value:99});
  let trace='';const receiver={};let result;
  if(method==='at')result=fn.call(owner,-1);
  else if(method==='includes'||method==='indexOf'||method==='lastIndexOf')result=fn.call(owner,big?1n:1);
  else if(method==='reduce'||method==='reduceRight')result=fn.call(owner,function(acc,value,index,array){check(this===undefined&&arguments.length===4&&array===owner,'reduce-arguments');trace+=index+'|';return {value:acc.value+String(value)}},{value:''});
  else result=fn.call(owner,function(value,index,array){check(this===receiver&&arguments.length===3&&array===owner,'callback-arguments');trace+=index+'|';return method==='map'?(big?value+BigInt(index):value+index):index%2===0},receiver);
  console.log('operation',C.name,method,describe(result),trace);
 }
 const empty=new C();for(const method of callbacks){let rejected=false;try{empty[method](null)}catch(e){rejected=e instanceof TypeError}check(rejected,'empty-callback-validation')}
 for(const method of ['reduce','reduceRight']){let rejected=false;try{empty[method](()=>0)}catch(e){rejected=e instanceof TypeError}check(rejected,'empty-no-initial');check(empty[method](()=>{throw new Error('empty')},undefined)===undefined,'explicit-undefined-initial')}
 for(const receiver of [{},new Proxy(new C(),{}),C.prototype])for(const method of methods){let rejected=false;try{C.prototype[method].call(receiver)}catch(e){rejected=e instanceof TypeError}check(rejected,'receiver-brand')}
}
const floats=new Float64Array([NaN,-0,1,1]);for(const index of [undefined,NaN,-0,0.9,-1,-1.9,Infinity,-Infinity,9])for(const method of ['at','includes','indexOf','lastIndexOf'])console.log('search',method,String(index),describe(method==='at'?floats[method](index):floats[method](method==='includes'?NaN:1,index)));
check(floats.includes(NaN)&&floats.indexOf(NaN)===-1&&floats.includes(0)&&floats.indexOf(0)===1,'equality');
check(floats.lastIndexOf(1)===3&&floats.lastIndexOf(1,undefined)===-1,'omitted-index');
let trace='';const empty=new Uint8Array();for(const method of ['includes','indexOf','lastIndexOf'])empty[method](1,{valueOf(){trace+='index|';return 0}});check(trace==='','empty-before-fromindex');
for(const method of ['at','includes','indexOf','lastIndexOf']){
 const buffer=new ArrayBuffer(3,{maxByteLength:6}),owner=new Uint8Array(buffer);const convert={valueOf(){buffer.resize(0);return 0}};
 console.log('search-shrink',method,describe(method==='at'?owner[method](convert):owner[method](undefined,convert)));
}
for(const method of callbacks){
 const buffer=new ArrayBuffer(4,{maxByteLength:8}),owner=new Uint8Array(buffer);owner[0]=4;owner[1]=5;owner[2]=6;owner[3]=7;
 let trace='';const reduce=method==='reduce'||method==='reduceRight';
 const callback=reduce?function(acc,value,index){trace+=index+':'+String(value)+'|';buffer.resize(0);return acc}:function(value,index){trace+=index+':'+String(value)+'|';buffer.resize(0);return method==='some'||method==='find'||method==='findIndex'||method==='findLast'||method==='findLastIndex'?false:method==='map'?value:true};
 const result=reduce?owner[method](callback,{}):owner[method](callback);console.log('callback-shrink',method,describe(result),trace);
}
for(const method of ['map','filter']){
 const owner=new Int16Array([1,2,3]);trace='';let count=0;
 function Species(length){trace+='construct:'+length+'|';return new Float64Array(length)}
 Object.defineProperty(owner,'constructor',{value:{get [Symbol.species](){trace+='species|';return Species}}});
 const result=owner[method](function(value,index){trace+='callback:'+index+'|';count++;return method==='map'?value+0.5:index!==1});console.log('species',method,describe(result),trace);
 check(count===3&&result instanceof Float64Array,'custom-species');
 for(const species of [function(){return {}},function(){return new Int16Array(0)},function(length){return new Proxy(new Int16Array(length),{})}]){
  const owner=new Int16Array([1,2]);Object.defineProperty(owner,'constructor',{value:{[Symbol.species]:species}});let rejected=false,calls=0;
  try{owner[method](value=>{calls++;return method==='map'?value:true})}catch(e){rejected=e instanceof TypeError}
  check(rejected&&calls===(method==='map'?0:2),'species-validation-order');
 }
 const mismatch=new Int16Array([1,2]);Object.defineProperty(mismatch,'constructor',{value:{[Symbol.species]:function(length){return new BigInt64Array(length)}}});let mismatchCalls=0,mismatchRejected=false;
 try{mismatch[method](value=>{mismatchCalls++;return method==='map'?value:true})}catch(e){mismatchRejected=e instanceof TypeError}
 check(mismatchRejected&&mismatchCalls===(method==='filter'?2:__PINNED__?0:1),'content-type-check-before-map-callback');
 const marker={};const abrupt=new Int16Array([1]);Object.defineProperty(abrupt,'constructor',{get(){throw marker}});let rejected=false;
 try{abrupt[method](()=>{if(method==='filter')throw marker;return 1})}catch(e){rejected=e===marker}check(rejected,'abrupt-species-or-callback');
}
for(const method of methods){const buffer=new ArrayBuffer(2);const owner=new Uint8Array(buffer);buffer.transfer();let rejected=false;try{owner[method](null)}catch(e){rejected=e instanceof TypeError}check(rejected,'detached-validation')}
const marker={};for(const method of callbacks){let rejected=false;try{new Int8Array([1,2])[method](()=>{throw marker},0)}catch(e){rejected=e===marker}check(rejected,'callback-abrupt-identity')}
const owner=new Int8Array([1,2]),original=owner.map;owner.map=function(){return 'shadow'};check(owner.map()==='shadow'&&original.call(owner,value=>value+1)[1]===3,'mutable-method');
let state=0x12345678;for(let trial=0;trial<16;trial++){state=(Math.imul(state,1664525)+1013904223)>>>0;const length=state%73,input=[];for(let i=0;i<length;i++)input.push((state+i)%127);const owner=new Int16Array(input);const mapped=owner.map((value,index)=>value+index),selected=owner.filter((value,index)=>index%3===0);check(Array.from(mapped).join(',')===input.map((value,index)=>value+index).join(',')&&Array.from(selected).join(',')===input.filter((value,index)=>index%3===0).join(','),'generated-lengths');check(owner.reduce((acc,value)=>acc+value,0)===input.reduce((acc,value)=>acc+value,0),'generated-reduction')}
let chain=null;for(let index=0;index<4096;index++){const C=formats[index%formats.length],big=C===BigInt64Array||C===BigUint64Array;const owner=C.of(...(big?[11n,13n]:[11,13])).map(value=>value);chain={owner,next:chain}}
__COLLECT__
queueMicrotask(()=>{let visited=0;while(chain){const result=chain.owner.reduce((acc,value)=>({text:acc.text+String(value)}),{text:''});check(result.text==='1113','retained-accumulator');chain=chain.next;visited++}check(visited===4096,'retained-graph');console.log('retained',visited)});
`.replace("__COLLECT__",collect?"$262.gc();":"").replace("__PINNED__",String(pinned))}

test('TypedArray traversals share captured ranges and live indexed values',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-typed-array-traversal-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false));
  const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile&&!noGc,true));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'typed-array-traversal.ts#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
   if(observation)expect({noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({noGc,kind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

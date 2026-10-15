import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(collect:boolean){return `'use strict';
function check(value,message){if(!value)throw new Error(message)}
const formats=[Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float16Array,Float32Array,Float64Array,BigInt64Array,BigUint64Array];
for(const C of formats){
 const big=C===BigInt64Array||C===BigUint64Array;
 const values=big?[1n,-1n,18446744073709551617n]:[1,-1,258,2.5,3.5];
 check(C.from===Int8Array.from&&C.of===Int8Array.of&&!Object.hasOwn(C,'from'),'inherited-method');
 for(const name of ['from','of']){const fn=C[name],descriptor=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(C),name);check(fn.name===name&&fn.length===(name==='from'?1:0)&&!Object.hasOwn(fn,'prototype')&&descriptor.writable&&!descriptor.enumerable&&descriptor.configurable,'metadata')}
 const from=C.from(values),of=C.of(...values);check(from instanceof C&&of instanceof C,'owner');
 console.log('format',C.name,Array.from(from,String).join(','),Array.from(of,String).join(','));
 const receiver={};let calls=0;const mapped=C.from(values,function(value,index){check(this===receiver&&arguments.length===2,'mapper-arguments');calls++;return big?value+BigInt(index):value+index},receiver);
 check(calls===values.length,'mapper-length');console.log('mapped',C.name,Array.from(mapped,String).join(','));
 class Derived extends C{}const derived=Derived.from(values);check(derived instanceof Derived&&derived instanceof C,'derived');
 console.log('empty',C.name,C.from([]).length,C.of().length);
}
const from=Uint8Array.from,of=Uint8Array.of,marker={};
for(const receiver of [undefined,null,{},()=>{},function(){}.bind(null)]){
 let trace='',rejected=false;try{from.call(receiver,{get [Symbol.iterator](){trace+='source|';throw marker}},null)}catch(e){rejected=e instanceof TypeError||e===marker}
 check(rejected&&trace==='','constructor-before-mapper-before-source');
}
let trace='';const iteratorSource={get [Symbol.iterator](){trace+='get-iterator|';return function(){trace+='open|';let index=0;return {next(){trace+='next|';return index<3?{done:false,value:index++}:{done:true}},return(){throw new Error('unexpected close')}}}}};
let target;function Capture(length){trace+='construct:'+length+'|';target=new Uint16Array(length);return target}
const result=from.call(Capture,iteratorSource,function(value,index){trace+='map:'+index+'|';return {valueOf(){trace+='convert:'+index+'|';return value+7}}});
check(result===target&&trace==='get-iterator|open|next|next|next|next|construct:3|map:0|convert:0|map:1|convert:1|map:2|convert:2|','iterable-before-construction');console.log('iterable',trace,Array.from(result).join(','));
trace='';const arrayLike={get [Symbol.iterator](){trace+='iterator|';return undefined},get length(){trace+='length|';return 3},get 0(){trace+='get0|';return 1},get 1(){trace+='get1|';return 2},get 2(){trace+='get2|';return 3}};
const arrayResult=from.call(Capture,arrayLike,function(value,index){trace+='map:'+index+'|';return value});
check(trace==='iterator|length|construct:3|get0|map:0|get1|map:1|get2|map:2|','arraylike-order');console.log('arraylike',trace,Array.from(arrayResult).join(','));
for(const source of ['123','1😀2',{length:3,0:8,2:9},false,7])console.log('source',typeof source,Array.from(Uint8Array.from(source),String).join(','));
for(const replacement of [{},[],new Uint8Array(0),new Proxy(new Uint8Array(4),{})]){
 let called=0,rejected=false;function Invalid(){called++;return replacement}
 try{from.call(Invalid,[1,2])}catch(e){rejected=e instanceof TypeError}check(rejected&&called===1,'constructor-result-brand-or-length');
 rejected=false;try{of.call(Invalid,1,2)}catch(e){rejected=e instanceof TypeError}check(rejected&&called===2,'of-result-brand-or-length');
}
const small=new Uint8Array(0);Object.defineProperty(small,'length',{value:100});function Shadow(){return small}let shadow=false;try{of.call(Shadow,1)}catch(e){shadow=e instanceof TypeError}check(shadow,'internal-length-validation');
for(const operation of [()=>from.call(Uint8Array,{get [Symbol.iterator](){throw marker}}),()=>from.call(Uint8Array,{length:{valueOf(){throw marker}}}),()=>from.call(Uint8Array,{length:1,get 0(){throw marker}}),()=>from.call(Uint8Array,[1],()=>{throw marker}),()=>of.call(Uint8Array,{valueOf(){throw marker}})]){let propagated=false;try{operation()}catch(e){propagated=e===marker}check(propagated,'abrupt-identity')}
let closes=0;const source={ [Symbol.iterator](){let index=0;return {next(){return index++?{done:true}:{value:1,done:false}},return(){closes++;return {done:true}}}}};let abrupt=false;try{Uint8Array.from(source,()=>{throw marker})}catch(e){abrupt=e===marker}check(abrupt&&closes===0,'exhausted-before-mapper');
for(const resize of [false,true]){
 const buffer=new ArrayBuffer(3,{maxByteLength:8});const view=new Uint8Array(buffer);function Target(){return view}let calls=0,conversions=0;
 const result=from.call(Target,[1,2,3],function(value,index){calls++;if(index===0){if(resize)buffer.resize(0);else buffer.transfer()}return {valueOf(){conversions++;return value}}});
 check(result===view&&calls===3&&conversions===3&&view.length===0,'post-mapping-storage');console.log('mutated',resize,calls,conversions);
}
const buffer=new ArrayBuffer(3,{maxByteLength:6});const view=new Uint8Array(buffer);function Detached(){buffer.transfer();return view}let rejected=false;try{of.call(Detached,1)}catch(e){rejected=e instanceof TypeError}check(rejected,'detached-result-validation');
const actuals=[1,2,3];trace='';const ctor=new Proxy(Uint8Array,{construct(t,args,newTarget){trace+='construct:'+args.length+':'+args[0]+'|';return Reflect.construct(t,args,newTarget)}});const proxied=of.call(ctor,...actuals);check(trace==='construct:1:3|'&&Array.from(proxied).join(',')==='1,2,3','proxy-constructor-list');
const original=Uint8Array.from;Uint8Array.from=function(source){return source};check(Uint8Array.from(actuals)===actuals&&Array.from(original.call(Uint8Array,actuals)).join(',')==='1,2,3','mutable-factory');delete Uint8Array.from;
let chain=null;for(let index=0;index<4096;index++){const C=formats[index%formats.length],big=C===BigInt64Array||C===BigUint64Array;const owner=C.of(...(big?[17n,19n]:[17,19]));chain={owner,next:chain}}
__COLLECT__
queueMicrotask(()=>{let visited=0;while(chain){check(String(chain.owner[1])==='19','retained-factory-result');chain=chain.next;visited++}check(visited===4096,'retained-graph');console.log('retained',visited)});
`.replace("__COLLECT__",collect?"$262.gc();":"")}

test('TypedArray factories share actual Lists and validated constructor results',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-typed-array-factory-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false));
  const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile&&!noGc));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'typed-array-factory.ts#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
   if(observation)expect({noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({noGc,kind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

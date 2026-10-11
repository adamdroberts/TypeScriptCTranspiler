import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(collect:boolean){return `'use strict';
function check(value,message){if(!value)throw new Error(message)}
function text(value){if(value.length===0)return '';return Array.from(value,x=>Object.is(x,-0)?'-0':String(x)).join(',')}
const formats=[Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float16Array,Float32Array,Float64Array,BigInt64Array,BigUint64Array];
for(const C of formats){
 const big=C===BigInt64Array||C===BigUint64Array,values=big?[3n,-1n,0n,1n,1n<<63n,9n]:[3,-0,0,-1,NaN,Infinity,-Infinity,9,NaN];
 for(const method of ['sort','toSorted']){
  const owner=new C(values);Object.defineProperty(owner,'length',{value:99});const fn=owner[method];const descriptor=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(C.prototype),method);check(fn.name===method&&fn.length===1&&!Object.hasOwn(fn,'prototype')&&descriptor.writable&&!descriptor.enumerable&&descriptor.configurable,'metadata');
  Object.defineProperty(owner,'constructor',{get(){throw new Error('species used')}});
  const result=fn.call(owner);console.log('default',C.name,method,text(result),result===owner);
  const source=new C(big?[1n,4n,2n,3n]:[1,4,2,3]);let calls=0;
  const sorted=source[method](function(left,right){check(this===undefined&&arguments.length===2,'comparator-arguments');calls++;return {valueOf(){return left<right?1:left>right?-1:NaN}}});check(calls>0,'comparator-called');console.log('custom',C.name,method,text(sorted));
  const stable=new C(big?[3n,1n,4n,2n]:[3,1,4,2]);const equal=stable[method](()=>NaN);check(text(equal)===text(stable),'nan-comparison-stable');
  class Derived extends C{}const derived=new Derived(big?[2n,1n]:[2,1]);const output=derived[method]();check(output instanceof C&&(method==='sort'?output===derived:!(output instanceof Derived)),'result-kind');
 }
 for(const receiver of [{},C.prototype,new Proxy(new C(),{})])for(const method of ['sort','toSorted']){let rejected=false;try{C.prototype[method].call(receiver)}catch(e){rejected=e instanceof TypeError}check(rejected,'brand')}
 for(const bad of [null,false,1,{},Symbol('compare')])for(const method of ['sort','toSorted']){let rejected=false;try{new C()[method](bad)}catch(e){rejected=e instanceof TypeError}check(rejected,'empty-comparator-validation')}
}
const floats=new Float64Array([0,-0,NaN,2,NaN,-Infinity,Infinity]);check(text(floats.sort())==='-Infinity,-0,0,2,Infinity,NaN,NaN','numeric-default-order');
for(const method of ['sort','toSorted']){
 const owner=new Float64Array([3.1,1.2,4.3,2.4]);const result=owner[method]((a,b)=>Math.floor(a)%2-Math.floor(b)%2);check(text(result)==='4.3,2.4,3.1,1.2','stable-partitions');
 for(const value of [1n,Symbol('result')]){const source=new Uint8Array([2,1]);let rejected=false;try{source[method](()=>value)}catch(e){rejected=e instanceof TypeError}check(rejected&&text(source)==='2,1','comparison-conversion-abrupt')}
 const marker={};const source=new Uint8Array([2,1]);let rejected=false;try{source[method](()=>{throw marker})}catch(e){rejected=e===marker}check(rejected&&text(source)==='2,1','abrupt-before-writeback');
}
for(const mutate of ['shrink','detach','overwrite'])for(const method of ['sort','toSorted']){
 const buffer=new ArrayBuffer(4,{maxByteLength:8}),owner=new Uint8Array(buffer);owner.set([4,3,2,1]);let first=true;
 const result=owner[method](function(a,b){if(first){first=false;if(mutate==='shrink')buffer.resize(2);else if(mutate==='detach')buffer.transfer();else owner.fill(9)}return a-b});
 console.log('mutation',mutate,method,text(result),text(owner));
}
const compare=Int8Array.prototype.sort;let accessed=false;const receiver={get length(){accessed=true;throw new Error('length')}};let rejected=false;try{compare.call(receiver,null)}catch(e){rejected=e instanceof TypeError}check(rejected&&!accessed,'comparator-before-brand');
const detached=new ArrayBuffer(0),empty=new Uint8Array(detached);detached.transfer();for(const method of ['sort','toSorted']){let rejected=false;try{empty[method]()}catch(e){rejected=e instanceof TypeError}check(rejected,'detached-empty')}
const original=Uint8Array.prototype.sort;Uint8Array.prototype.sort=function(){return 'replacement'};const changed=new Uint8Array([2,1]);check(changed.sort()==='replacement'&&original.call(changed)===changed&&changed[0]===1,'mutable-sort');delete Uint8Array.prototype.sort;
// Array consumers keep lexicographic defaults and share the same stable List.
check([10,2,1].sort().join(',')==='1,10,2'&&[10,2,1].toSorted().join(',')==='1,10,2','array-default');
const records=[{key:2,id:'a'},{key:1,id:'b'},{key:2,id:'c'},{key:1,id:'d'}];check(records.sort((a,b)=>a.key-b.key).map(x=>x.id).join(',')==='b,d,a,c','array-stability');
const sparse=[3,,1,undefined];sparse.sort((a,b)=>a-b);check(sparse[0]===1&&sparse[1]===3&&Object.hasOwn(sparse,2)&&!Object.hasOwn(sparse,3),'array-holes');
let state=0x123456;for(let trial=0;trial<16;trial++){state=(Math.imul(state,1664525)+1013904223)>>>0;const values=[],length=state%101;for(let i=0;i<length;i++)values.push((state+i*17)%997);const source=new Int16Array(values),expected=values.slice().sort((a,b)=>a-b);check(text(source.toSorted())===expected.join(',')&&text(source.sort())===expected.join(','),'generated-sort')}
let chain=null;for(let index=0;index<4096;index++){const C=formats[index%formats.length],big=C===BigInt64Array||C===BigUint64Array;const owner=C.of(...(big?[19n,17n]:[19,17])).toSorted();chain={owner,next:chain}}
__COLLECT__
queueMicrotask(()=>{let visited=0;while(chain){const result=chain.owner.sort((a,b)=>a<b?1:a>b?-1:0);check(String(result[0])==='19'&&String(result[1])==='17','retained-sort-list');chain=chain.next;visited++}check(visited===4096,'retained-graph');console.log('retained',visited)});
`.replace("__COLLECT__",collect?"$262.gc();":"")}

test('TypedArray and Array sorting share one retained stable value List',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-typed-array-sort-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false));
  const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile&&!noGc));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'typed-array-sort.ts#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
   if(observation)expect({noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({noGc,kind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

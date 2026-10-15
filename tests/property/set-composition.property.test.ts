import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(collect:boolean):string{return `'use strict';
function check(value,label){if(!value)throw label}
function dump(set){return Array.from(set).map(value=>typeof value==='object'?'object':String(value)).join(',')}
const operations=['union','intersection','difference','symmetricDifference','isSubsetOf','isSupersetOf','isDisjointFrom'];
const token={token:true};
const samples=[[],[1],[2,1],[NaN,-0,token,2]];
for(const left of samples)for(const right of samples)for(const operation of operations){
 const receiver=new Set(left),other=new Set(right);const result=receiver[operation](other);
 console.log('partition',operation,dump(receiver),dump(other),typeof result==='boolean'?result:dump(result));
}
for(const operation of operations){const method=Set.prototype[operation],descriptor=Object.getOwnPropertyDescriptor(Set.prototype,operation);check(method.name===operation&&method.length===1&&descriptor.writable&&!descriptor.enumerable&&descriptor.configurable,'metadata');}
for(const size of [0,1,10,Infinity])for(const operation of operations){
 let trace='';const original=new Set([1,2,3]);
 const other={get size(){trace+='s';return{valueOf(){trace+='n';return size}}},get has(){trace+='h';return function(value){check(this===other&&arguments.length===1,'has-call');trace+='H'+value;return value%2===0}},get keys(){trace+='k';return function(){check(this===other&&arguments.length===0,'keys-call');trace+='K';let index=0;const values=[2,2,4,-0];return{next(){trace+='N';return index<values.length?{value:values[index++],done:false}:{done:true}},return(){trace+='R';return{}}}}}};
 const result=original[operation](other);console.log('set-like',size,operation,typeof result==='boolean'?result:dump(result),trace);
}
for(const bad of [null,{}, {size:NaN},{size:-1},{size:1,has:0},{size:1,has(){},keys:0}])for(const operation of operations){
 let errorName='';try{new Set([1])[operation](bad)}catch(error){errorName=error.name}console.log('validation',operation,errorName);
}
let brandTrace='';const brandedOther={get size(){brandTrace+='size';return 0}};let brandRejected=false;
try{Set.prototype.union.call(new Proxy(new Set(),{}),brandedOther)}catch(error){brandRejected=error instanceof TypeError}check(brandRejected&&brandTrace==='','brand-before-other');
const closeError={marker:'close'};let closes=0;const closing={size:0,has(){return false},keys(){return{next(){return{value:9,done:false}},return(){closes++;throw closeError}}}};
let seenClose=false;try{new Set([1]).isSupersetOf(closing)}catch(error){seenClose=error===closeError}check(seenClose&&closes===1,'close-abrupt');
for(const operation of ['intersection','difference','isSubsetOf','isDisjointFrom']){
 const original=new Set([1,2]);let trace='';let changed=false;const other={size:10,has(value){trace+=value;if(!changed){changed=true;original.delete(2);original.add(3);original.add(2)}return value!==3},keys(){throw 'unexpected-keys'}};
 const result=original[operation](other);console.log('has-mutation',operation,typeof result==='boolean'?result:dump(result),dump(original),trace);
}
for(const operation of ['union','symmetricDifference','intersection','difference']){
 const original=new Set([1,2]);let index=0;const other={size:0,has(){throw 'unexpected-has'},keys(){original.add(3);return{next(){if(index++===0){original.delete(2);original.add(4);return{value:2,done:false}}return{done:true}}}}};
 const result=original[operation](other);console.log('keys-mutation',operation,dump(result),dump(original));
}
const target=new Set([1]);const fakeConstructor={get [Symbol.species](){throw 'unexpected-species'}};target.constructor=fakeConstructor;check(Object.getPrototypeOf(target.union(new Set([2])))===Set.prototype,'intrinsic-result');
let argumentTrace='';const extra={size:1,has(){return true},keys(){return [2].values()}};
function mark(label,value){argumentTrace+=label;return value}target.union(...[mark('a',extra),mark('b',0)]);check(argumentTrace==='ab','actual-list');
const saved=Set.prototype.union;Set.prototype.union=function replacement(){return 'mutable'};check(new Set().union(extra)==='mutable','mutable-method');Set.prototype.union=saved;
for(const size of [-0.5,0.5,-Infinity,1n]){
 let trace='',errorName='';const other={get size(){trace+='s';return size},get has(){trace+='h';return()=>true},get keys(){trace+='k';return()=>[].values()}};
 try{new Set([1]).union(other)}catch(error){errorName=error.name}console.log('size-conversion',String(size),trace,errorName);
}
for(const operation of ['union','intersection','difference','symmetricDifference','isSupersetOf','isDisjointFrom']){
 const abrupt={marker:operation};let closes=0;const other={size:0,has(){throw 'unexpected-has'},keys(){return{next(){throw abrupt},return(){closes++;return{}}}}};let caught=false;
 try{new Set([1])[operation](other)}catch(error){caught=error===abrupt}check(caught&&closes===0,'next-abrupt');
}
for(const operation of operations){
 const original=new Set([1,2]);const other={get size(){original.clear();original.add(3);return 10},has(value){return value===3},keys(){return [3,4].values()}};
 const result=original[operation](other);console.log('record-mutation',operation,typeof result==='boolean'?result:dump(result));
}
let chain=null;for(let index=0;index<4096;++index){const owner=new Set([index,token]);const result=owner.union(new Set([index+1]));chain={owner,result,index,next:chain}}
__COLLECT__
queueMicrotask(()=>{let visited=0;while(chain){check(chain.result.has(chain.index)&&chain.result.has(chain.index+1)&&chain.result.has(token),'retained-result');check(chain.owner.size===2,'retained-owner');chain=chain.next;visited++}check(visited===4096,'retained-graph');console.log('retained',visited)});
`.replace("__COLLECT__",collect?"$262.gc();":"")}

test('Set composition preserves set-like records, insertion cursors and iterator closing',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-set-composition-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false));
  const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile&&!noGc));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'set-composition.ts#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
   if(observation)expect({noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({noGc,kind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

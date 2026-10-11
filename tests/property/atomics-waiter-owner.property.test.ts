import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(collect:boolean,profile=false,pinned=false){return `'use strict';
function check(value,message){if(!value)throw new Error(message)}
function rejects(fn,C,message){let found=false;try{fn()}catch(e){found=e instanceof C}check(found,message)}
function collectNow(){__COLLECT__}
async function main(){
 for(const [name,arity] of [['wait',4],['waitAsync',4],['notify',3]]){const fn=Atomics[name],d=Object.getOwnPropertyDescriptor(Atomics,name);check(fn.name===name&&fn.length===arity&&!Object.hasOwn(fn,'prototype')&&d.writable&&!d.enumerable&&d.configurable,'metadata');rejects(()=>new fn(),TypeError,'nonconstructor')}
 const buffer=new SharedArrayBuffer(16,{maxByteLength:32}),words=new Int32Array(buffer),big=new BigInt64Array(buffer),alias=new Int32Array(buffer);
 for(const owner of [{},new Proxy(words,{}),new Uint32Array(buffer),new BigUint64Array(buffer),new Int16Array(buffer),new Float32Array(buffer)])for(const method of ['wait','waitAsync','notify']){let converted=false;rejects(()=>Atomics[method](owner,{valueOf(){converted=true;return 0}},0,0),TypeError,'waitable-brand');check(!converted,'brand-before-index')}
 for(const method of ['wait','waitAsync']){let converted=false;rejects(()=>Atomics[method](new Int32Array(1),{valueOf(){converted=true;return 0}},0,0),TypeError,'requires-shared');check(!converted,'shared-before-index')}
 Object.defineProperty(words,'length',{value:99});rejects(()=>Atomics.notify(words,4),RangeError,'private-length');
 for(const index of [-1,Infinity,-Infinity])rejects(()=>Atomics.waitAsync(words,index,0,0),RangeError,'invalid-index');rejects(()=>Atomics.waitAsync(words,Symbol(),0,0),TypeError,'symbol-index');
 let trace='';const immediate=Atomics.waitAsync.call(Symbol('ignored'),words,{valueOf(){trace+='index|';return 0}},{valueOf(){trace+='value|';collectNow();return 0}},{valueOf(){trace+='timeout|';collectNow();return -1}});
 check(trace==='index|value|timeout|'&&!immediate.async&&immediate.value==='timed-out','wait-conversion-order');
 check(Object.getPrototypeOf(immediate)===Object.prototype&&Object.keys(immediate).join('|')==='async|value','result-owner');for(const name of ['async','value']){const d=Object.getOwnPropertyDescriptor(immediate,name);check(d.writable&&d.enumerable&&d.configurable,'result-descriptors')}
 Atomics.store(words,0,7);for(const timeout of [0,-1,-Infinity,NaN,Infinity,undefined]){const result=Atomics.waitAsync(words,0,0,timeout);check(!result.async&&result.value==='not-equal','mismatch-before-timeout')}Atomics.store(words,0,0);
 for(const timeout of [0,-0,-1,-Infinity,null]){const result=Atomics.waitAsync(words,0,0,timeout);check(!result.async&&result.value==='timed-out','immediate-timeout')}
 for(const value of [1n,Symbol('value')])rejects(()=>Atomics.waitAsync(words,0,value,0),TypeError,'number-conversion');for(const value of [1,undefined,null,Symbol('value')])rejects(()=>Atomics.waitAsync(big,0,value,0),TypeError,'bigint-conversion');rejects(()=>Atomics.waitAsync(words,0,0,1n),TypeError,'timeout-conversion');
 check(!Atomics.waitAsync(big,0,18446744073709551616n,0).async,'bigint-modular-expected');
 const nativeProfile=__PROFILE__;
 if(nativeProfile){let order='';rejects(()=>Atomics.wait(words,{valueOf(){order+='index|';return 0}},{valueOf(){order+='value|';return 1}},{valueOf(){order+='timeout|';return 0}}),TypeError,'cannot-block');check(order==='index|value|timeout|','policy-after-conversions')}
 else{check(Atomics.wait(words,0,1,0)==='not-equal'&&Atomics.wait(words,0,0,0)==='timed-out','sync-fast-results');const started=Date.now();check(Atomics.wait(words,0,0,2)==='timed-out'&&Date.now()-started>=1,'sync-positive-timeout')}
 trace='';const ordinary=new ArrayBuffer(8,{maxByteLength:16}),ordinaryWords=new Int32Array(ordinary);const nonshared=()=>Atomics.notify(ordinaryWords,{valueOf(){trace+='index|';ordinary.resize(0);return 1}},{valueOf(){trace+='count|';ordinary.transfer();return 1}});if(__PINNED_NOTIFY__){check(nonshared()===0&&trace==='index|count|','notify-nonshared-order-without-revalidation')}else{rejects(nonshared,RangeError,'node-notify-late-length');check(trace==='index|','node-notify-trace')}
 const grown=new SharedArrayBuffer(4,{maxByteLength:12}),tracking=new Int32Array(grown);const growAccess=()=>Atomics.waitAsync(tracking,{valueOf(){grown.grow(12);return 2}},0,0);if(__PINNED_ACCESS__){rejects(growAccess,RangeError,'captured-before-grow')}else{check(growAccess().value==='timed-out','node-wait-late-length')}
 for(const count of [0,-0,-1,-Infinity,NaN,null])check(Atomics.notify(words,0,count)===0,'empty-count');rejects(()=>Atomics.notify(words,0,1n),TypeError,'count-conversion');
 let order='';const first=Atomics.waitAsync(words,0,0),second=Atomics.waitAsync(big,0,0n),otherOffset=Atomics.waitAsync(words,1,0),otherBuffer=new Int32Array(new SharedArrayBuffer(4)),other=Atomics.waitAsync(otherBuffer,0,0);
 check(first.async&&second.async&&otherOffset.async&&other.async&&first.value instanceof Promise,'async-promise');first.value.then(()=>{order+='first|'});second.value.then(()=>{order+='second|'});otherOffset.value.then(()=>{order+='offset|'});other.value.then(()=>{order+='block|'});
 check(Atomics.notify(alias,0,1)===1,'fifo-prefix');check(await first.value==='ok','notified-first');check(order==='first|','prefix-only');
 check(Atomics.notify(big,0,1.9)===1,'mixed-width-location');check(await second.value==='ok','notified-second');check(Atomics.notify(words,1)===1&&Atomics.notify(otherBuffer,0,Infinity)===1,'location-keys');await Promise.all([otherOffset.value,other.value]);check(order==='first|second|offset|block|','fifo-key-order');check(Atomics.notify(words,0)===0,'completed-unlinked');console.log('fifo',order);
 const intrinsicPromise=Promise;Promise=function(){throw new Error('global-promise-used')};const intrinsic=Atomics.waitAsync(words,0,0);Promise=intrinsicPromise;check(intrinsic.async&&intrinsic.value instanceof intrinsicPromise,'intrinsic-promise');check(Atomics.notify(words,0)===1&&await intrinsic.value==='ok','intrinsic-notify');
 const stored=Atomics.waitAsync;Atomics.waitAsync=function(){return 'replacement'};check(Atomics.waitAsync()==='replacement','mutable-method');const retained=stored.call(null,words,0,0,0);check(!retained.async&&retained.value==='timed-out','stored-method');Atomics.waitAsync=stored;
 const deadlineWait=Atomics.waitAsync(words,0,0,3),keepalive=setTimeout(()=>{},100);check(deadlineWait.async&&await deadlineWait.value==='timed-out','async-deadline');clearTimeout(keepalive);check(Atomics.notify(words,0)===0,'timeout-unlinked');
 const large=Atomics.waitAsync(words,0,0,2147483648),largeKeep=setTimeout(()=>{check(Atomics.notify(words,0)===1,'large-deadline-not-clamped')},3);check(large.async&&await large.value==='ok','unbounded-deadline');clearTimeout(largeKeep);
 const notified=Atomics.waitAsync(words,0,0,100);check(Atomics.notify(words,0)===1&&await notified.value==='ok','notify-wins-timeout');
 let state=0x4218;for(let trial=0;trial<12;trial++){state=(Math.imul(state,1664525)+1013904223)>>>0;const length=state%67,prefix=length?state%length:0,promises=[],events=[];for(let index=0;index<length;index++){const record=Atomics.waitAsync(words,0,0);check(record.async,'generated-enqueue');promises.push(record.value.then(value=>{check(value==='ok','generated-value');events.push(index)}))}check(Atomics.notify(words,0,prefix)===prefix,'generated-prefix-count');await Promise.all(promises.slice(0,prefix));check(events.join('|')===Array.from({length:prefix},(_,i)=>i).join('|'),'generated-prefix-order');check(Atomics.notify(words,0)===length-prefix,'generated-remainder');await Promise.all(promises);check(events.join('|')===Array.from({length},(_,i)=>i).join('|'),'generated-fifo')}
 let chain=null;const promises=[];for(let index=0;index<4096;index++){const owner=index%2?new Int32Array(buffer):new BigInt64Array(buffer),expected=index%2?0:0n,record=Atomics.waitAsync(owner,0,expected);check(record.async,'deep-pending');chain={owner,method:Atomics.notify,record,next:chain};promises.push(record.value)}
 collectNow();check(chain.method.call(Symbol(),chain.owner,0)===4096,'deep-notify');const results=await Promise.all(promises);check(results.every(value=>value==='ok'),'deep-results');let visited=0;while(chain){check(chain.record.value instanceof Promise,'retained-record');chain=chain.next;visited++}check(visited===4096&&Atomics.notify(words,0)===0,'deep-released-worklist');console.log('retained',visited);
 console.log('waiters','ok');
}
main();
`.replace("__COLLECT__",collect?"$262.gc();":"").replace("__PROFILE__",String(profile)).replace("__PINNED_NOTIFY__",String(pinned)).replace("__PINNED_ACCESS__",String(pinned))}

test('Atomics waiters share FIFO location queues, terminal transitions and owning-agent promise jobs',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-atomics-waiter-owner-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false));
  const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile&&!noGc,profile,true));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'atomics-waiter-owner.ts#module',setupEntries:[],testEntry:entry,async:false,canBlock:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
   if(observation)expect({noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({noGc,kind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

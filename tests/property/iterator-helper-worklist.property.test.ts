import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(collect:boolean):string{return `'use strict';
function check(value,label){if(!value)throw label}
const prototype=Iterator.prototype;
for(const name of ['map','filter','take','drop','flatMap']){const d=Object.getOwnPropertyDescriptor(prototype,name);console.log('method',name,d.value.name,d.value.length,d.writable,d.enumerable,d.configurable)}
const helper=Iterator.from([]).map(x=>x),hp=Object.getPrototypeOf(helper);
for(const key of ['next','return',Symbol.toStringTag]){const d=Object.getOwnPropertyDescriptor(hp,key);console.log('helper',String(key),typeof d.value==='function'?d.value.name:d.value,typeof d.value==='function'?d.value.length:'-',d.writable,d.enumerable,d.configurable)}
check(Object.getPrototypeOf(hp)===prototype,'helper-prototype');
for(const values of [[],[0],[1,2,3],[0,false,'',null,undefined]])for(const op of ['map','filter','take','drop','flatMap']){
 let trace='';const callback=function(value,index){check(this===undefined&&arguments.length===2,'callback');trace+=index;return op==='map'?String(value)+index:op==='flatMap'?[value,index]:value};
 const iterator=Iterator.from(values)[op](op==='take'||op==='drop'?1.9:callback);console.log('partition',op,JSON.stringify(iterator.toArray()),trace);
}
function source(values,trace,close){let index=0;return{get next(){trace.push('get-next');return function(){trace.push('next');return index<values.length?{value:values[index++],done:false}:{done:true}}},get return(){trace.push('get-return');return function(){check(arguments.length===0,'close-arguments');trace.push('return');return close()}}}}
for(const op of ['map','filter','flatMap']){const trace=[],iterator=source([1],trace,()=>{throw 'close'});let rejected=false;try{prototype[op].call(iterator,0)}catch(e){rejected=e instanceof TypeError}check(rejected&&trace.join(',')==='get-return,return','invalid-callback')}
for(const op of ['take','drop'])for(const limit of [NaN,-1,-Infinity,1n,Symbol('x'),{valueOf(){throw 'marker'}}]){const trace=[],iterator=source([1],trace,()=>{throw 'close'});let rejected=false;try{prototype[op].call(iterator,limit)}catch(e){rejected=e==='marker'||e instanceof TypeError||e instanceof RangeError}check(rejected&&trace.join(',')==='get-return,return','invalid-limit')}
for(const op of ['take','drop'])for(const limit of [-0,-.5,0,1,Infinity]){const trace=[],iterator=prototype[op].call(source([1,2],trace,()=>({})),limit);const values=iterator.toArray();console.log('limit',op,String(limit),values.join(','),trace.join(','))}
const skipped={next(){return {done:false,get value(){throw 'read-skipped'}}},return(){return {}}};check(prototype.drop.call(skipped,1).take(0).next().done,'drop-start-close');
let skipIndex=0;const skip={next(){skipIndex++;return skipIndex===1?{done:false,get value(){throw 'read-skipped'}}:skipIndex===2?{value:2,done:false}:{done:true}}};check(prototype.drop.call(skip,1).next().value===2,'drop-does-not-get-value');
for(const op of ['map','filter','flatMap']){const trace=[],iterator=prototype[op].call(source([1],trace,()=>{throw 'close'}),()=>{throw 'marker'});let rejected=false;try{iterator.next()}catch(e){rejected=e==='marker'}check(rejected&&trace.join(',')==='get-next,next,get-return,return'&&iterator.next().done,'callback-throw')}
for(const op of ['map','filter','take','drop','flatMap']){let closed=false;const receiver={next(){throw 'marker'},return(){closed=true;return {}}},iterator=prototype[op].call(receiver,op==='take'||op==='drop'?1:x=>[x]);let rejected=false;try{iterator.next()}catch(e){rejected=e==='marker'}check(rejected&&!closed&&iterator.next().done,'next-abrupt')}
for(const field of ['done','value'])for(const inner of [false,true]){let closed='';const bad={next(){const result={done:false,value:1};Object.defineProperty(result,field,{get(){throw 'marker'}});return result},return(){closed+='bad';return {}}};const outer={next(){return {done:false,value:1}},return(){closed+='outer';throw 'close'}};const iterator=inner?prototype.flatMap.call(outer,()=>bad):prototype.map.call(bad,x=>x);let rejected=false;try{iterator.next()}catch(e){rejected=e==='marker'}check(rejected&&closed===(inner?'outer':'')&&iterator.next().done,'result-abrupt');console.log('result-abrupt',field,inner,closed)}
for(const phase of ['start','suspended']){const trace=[],outer=source([1,2],trace,()=>({})),iterator=prototype.flatMap.call(outer,()=>source([10,20],trace,()=>({})));if(phase==='suspended')check(iterator.next().value===10,'inner-yield');check(iterator.return(9).done,'helper-return');console.log('flat-close',phase,trace.join(','))}
for(const errorPart of ['inner','outer']){const trace=[],outer=source([1],trace,()=>{if(errorPart==='outer')throw 'outer';return {}}),inner=source([10],trace,()=>{if(errorPart==='inner')throw 'inner';return {}}),iterator=prototype.flatMap.call(outer,()=>inner);iterator.next();let result='';try{iterator.return()}catch(e){result=e}check(result===errorPart,'close-error');console.log('close-error',errorPart,trace.join(','))}
{const trace=[],outer=source([1],trace,()=>{throw 'outer'}),inner={next(){throw 'inner'},return(){trace.push('unexpected');return {}}},iterator=prototype.flatMap.call(outer,()=>inner);let rejected=false;try{iterator.next()}catch(e){rejected=e==='inner'}check(rejected&&trace.join(',')==='get-next,next,get-return,return','inner-step-abrupt')}
{const trace=[],outer=source([1],trace,()=>{throw 'outer'}),inner=source([10],trace,()=>{throw 'inner'}),iterator=prototype.flatMap.call(outer,()=>inner);iterator.next();let rejected=false;try{iterator.return()}catch(e){rejected=e==='inner'}check(rejected&&iterator.next().done,'both-close-throws');console.log('both-close',trace.join(','))}
let running;running=Iterator.from([1]).map(()=>{let rejected=false;try{running.next()}catch(e){rejected=e instanceof TypeError}check(rejected,'reentrant');return 7});check(running.next().value===7,'reentrant-recovery');
for(const method of ['next','return']){let rejected=false;try{helper[method].call(new Proxy(helper,{}))}catch(e){rejected=e instanceof TypeError}check(rejected,'helper-brand')}
const concatTrace=[];function iterable(label,values){return{get [Symbol.iterator](){concatTrace.push('get'+label);return function(){concatTrace.push('open'+label);return source(values,concatTrace,()=>({}))}}}}
const concatenated=Iterator.concat(iterable('a',[1]),iterable('b',[2]));check(concatTrace.join(',')==='geta,getb','concat-eager-methods');check(concatenated.next().value===1,'concat-yield');concatenated.return();console.log('concat-close',concatTrace.join(','));
const unopened=Iterator.concat(iterable('c',[3]));unopened.return();console.log('concat-unopened',concatTrace.join(','));
check(Iterator.concat().next().done,'empty-concat');for(const item of [0,'str',{}, {[Symbol.iterator]:0}]){let rejected=false;try{Iterator.concat(item)}catch(e){rejected=e instanceof TypeError}check(rejected,'concat-item')}
const owner={marker:7};let trace='';let deep=Iterator.from(source([owner],[],()=>{trace+='close|';return {}}));
for(let index=0;index<4096;index++){const operation=index%5;deep=operation===0?deep.map(x=>x):operation===1?deep.filter(()=>true):operation===2?deep.take(Infinity):operation===3?deep.drop(0):deep.flatMap(x=>[x])}
__COLLECT__
queueMicrotask(()=>{check(deep.next().value===owner,'deep-value');check(deep.return().done&&trace==='close|','deep-close');console.log('deep-worklist',owner.marker,trace)});
`.replace("__COLLECT__",collect?"$262.gc();":"")}

test('Iterator helpers share a depth-independent step and close activation worklist',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-iterator-helper-worklist-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false));
  const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile&&!noGc));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'iterator-helper-worklist.ts#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
   if(observation)expect({noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({noGc,kind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

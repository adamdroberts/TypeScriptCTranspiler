import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(profile:boolean,collect:boolean):string{return `
function check(value,label){if(!value)throw label;${profile?'print':'console.log'}(label+':true')}
function throwsType(action){try{action()}catch(error){return error instanceof TypeError}return false}
const originalMap=WeakMap,originalSet=WeakSet;
for(const [name,ctor] of [['WeakMap',WeakMap],['WeakSet',WeakSet]]){
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,name),prototype=Object.getOwnPropertyDescriptor(ctor,'prototype');
 check(ctor.name===name&&ctor.length===0&&descriptor.writable&&descriptor.configurable&&!descriptor.enumerable,'constructor-metadata-'+name);
 check(!prototype.writable&&!prototype.enumerable&&!prototype.configurable&&ctor.prototype.constructor===ctor&&Object.getPrototypeOf(ctor.prototype)===Object.prototype,'prototype-owner-'+name);
 check(throwsType(()=>Reflect.apply(ctor,undefined,[])),'constructor-requires-new-'+name);
 check(Object.prototype.toString.call(new ctor())==='[object '+name+']','instance-brand-'+name);
}
const keys=[{},[],function(){},Symbol('key'),Symbol.iterator];const map=new WeakMap(),set=new WeakSet();
for(const key of keys){check(map.set(key,key)===map&&set.add(key)===set,'insertion-returns-owner');check(map.get(key)===key&&map.has(key)&&set.has(key),'weak-key-partition');check(map.delete(key)&&set.delete(key)&&!map.has(key)&&!set.has(key),'deletion-partition');}
for(const key of [undefined,null,false,3,1n,'key',Symbol.for('registered')]){
 check(map.get(key)===undefined&&!map.has(key)&&!map.delete(key)&&!set.has(key)&&!set.delete(key),'invalid-key-read-partition');
 check(throwsType(()=>map.set(key,1))&&throwsType(()=>set.add(key))&&throwsType(()=>map.getOrInsert(key,1)),'invalid-key-insertion-partition');
}
const key={};let calls=0;check(map.getOrInsert(key,1)===1&&map.getOrInsert(key,2)===1,'default-insertion');
check(map.getOrInsertComputed(key,()=>{calls++;return 3})===1&&calls===0,'existing-computed-insertion');
check(throwsType(()=>map.getOrInsertComputed(key,null)),'callback-validated-before-existing-key');map.delete(key);
check(map.getOrInsertComputed(key,argument=>{calls++;map.set(argument,'intermediate');return 'computed'})==='computed'&&map.get(key)==='computed'&&calls===1,'computed-insertion-overwrites-reentrant-value');
for(const [ctor,names] of [[WeakMap,['get','has','delete','set','getOrInsert','getOrInsertComputed']],[WeakSet,['add','has','delete']]]){
 for(const name of names){const method=ctor.prototype[name],descriptor=Object.getOwnPropertyDescriptor(ctor.prototype,name);
  check(method.name===name&&method.length===(name==='set'||name==='getOrInsert'||name==='getOrInsertComputed'?2:1)&&descriptor.writable&&descriptor.configurable&&!descriptor.enumerable,'method-metadata-'+ctor.name+'-'+name);
  check(throwsType(()=>Reflect.construct(method,[]))&&throwsType(()=>Reflect.apply(method,{},[])),'method-brand-and-nonconstructor');
 }
}
let order='';const pair={get 0(){order+='k';return key},get 1(){order+='v';return {text:'fresh'}}};
function* entries(){order+='i';yield pair;order+='n'}
const fromIterable=new WeakMap(entries());check(fromIterable.get(key).text==='fresh'&&order==='ikvn','constructor-iterable-and-entry-get-order');
let closed=false;const broken={ [Symbol.iterator](){return {next(){return {done:false,value:[3,'invalid']}},return(){closed=true;return {done:true}}}}};
check(throwsType(()=>new WeakMap(broken))&&closed,'constructor-closes-on-insertion-abrupt');
let nextClosed=false;const nextError={ [Symbol.iterator](){return {next(){throw 'next error'},return(){nextClosed=true;return {done:true}}}}};
try{new WeakSet(nextError)}catch(error){check(error==='next error'&&!nextClosed,'constructor-next-abrupt-does-not-close')}
let adderEvents='';const originalAdder=WeakMap.prototype.set;
Object.defineProperty(WeakMap.prototype,'set',{get(){adderEvents+='g';return function(k,v){adderEvents+='s';return Reflect.apply(originalAdder,this,[k,v])}},configurable:true});
const constructed=new WeakMap([[key,1],[key,2]]);check(constructed.get(key)===2&&adderEvents==='gss','constructor-captures-adder-once');
Object.defineProperty(WeakMap.prototype,'set',{value:originalAdder,writable:true,configurable:true});
function Alternate(){}const alternate=Reflect.construct(originalMap,[],Alternate);check(Object.getPrototypeOf(alternate)===Alternate.prototype&&Reflect.apply(originalAdder,alternate,[key,4])===alternate,'new-target-prototype');
const proxyKey={};const proxiedCallback=new Proxy(argument=>argument===proxyKey?'proxy-computed':'wrong',{});check(map.getOrInsertComputed(proxyKey,proxiedCallback)==='proxy-computed','callable-proxy-callback');
const revoked=Proxy.revocable(argument=>argument,{});revoked.revoke();check(map.getOrInsertComputed(proxyKey,revoked.proxy)==='proxy-computed'&&throwsType(()=>map.getOrInsertComputed({},revoked.proxy)),'revoked-callable-validation');
class DerivedMap extends WeakMap{token='derived'}const derived=new DerivedMap([[key,'derived-value']]);check(derived instanceof DerivedMap&&derived instanceof originalMap&&derived.get(key)==='derived-value'&&derived.token==='derived','derived-weak-constructor');
const foreign={};for(const [ctor,method] of [[WeakMap,'get'],[WeakSet,'has']])check(throwsType(()=>Reflect.apply(ctor.prototype[method],new Proxy(new ctor(),{}),[foreign])),'proxy-does-not-forward-brand');
const saved=map.set;await Promise.resolve();Reflect.apply(saved,map,[key,'resumed']);check(map.get(key)==='resumed','retained-method-through-await');
globalThis.WeakMap=function(){return foreign};check(new WeakMap()===foreign&&new originalMap() instanceof originalMap,'mutable-global-constructor-reference');globalThis.WeakMap=originalMap;
const chainMap=new WeakMap(),chainSet=new WeakSet();const first={index:0};let current=first;
for(let index=0;index<4096;index++){const next={index:index+1};chainMap.set(current,next);chainSet.add(current);current=next}
${collect?'$262.gc();':''}
let cursor=first,valid=true;for(let index=0;index<4096;index++){valid=valid&&cursor.index===index&&chainSet.has(cursor);cursor=chainMap.get(cursor)}
check(valid&&cursor.index===4096,'deep-ephemeron-closure');
`}

test('Weak collection owners share actual Lists and an ephemeron closure',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-weak-owner-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false,false));
  const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile,profile&&!noGc));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'weak-collection-owner.mjs#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({mode,noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({mode,noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({mode,noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({mode,noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect({mode,noGc,observationKind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({mode,noGc,observationKind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

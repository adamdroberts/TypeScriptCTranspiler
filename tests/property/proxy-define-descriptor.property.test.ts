import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(collect:boolean):string{return `'use strict';
function check(value,label){if(!value)throw label}
const forms=[()=>({}),()=>[],()=>function Target(){}];
for(let form=0;form<forms.length;form++)for(const configurable of [false,true])for(const writable of [false,true])for(const apply of [false,true]){
 const target=forms[form]();Object.defineProperty(target,'key',{value:7,writable,configurable});let trace='';
 const proxy=new Proxy(target,{defineProperty(object,key,descriptor){trace+='trap';if(apply)return Reflect.defineProperty(object,key,descriptor);return true}});
 let success=false,errorName='';try{success=Reflect.defineProperty(proxy,'key',{writable:false})}catch(error){errorName=error.name}
 const descriptor=Object.getOwnPropertyDescriptor(target,'key');console.log('transition',form,configurable,writable,apply,success,errorName,descriptor.writable,trace);
}
for(const descriptor of [{},{writable:true},{writable:false},{value:8},{configurable:true},{enumerable:true},{get(){return 7}}]){
 const target={};Object.defineProperty(target,'key',{value:7,writable:false,configurable:false});const proxy=new Proxy(target,{defineProperty(){return true}});let success=false,errorName='';try{success=Reflect.defineProperty(proxy,'key',descriptor)}catch(error){errorName=error.name}console.log('compatibility',Object.keys(descriptor).join(','),success,errorName);
}
let trace='';const target={};Object.defineProperty(target,'key',{value:7,writable:true,configurable:false});
const inner=new Proxy(target,{getOwnPropertyDescriptor(object,key){trace+='descriptor';return Reflect.getOwnPropertyDescriptor(object,key)},isExtensible(object){trace+='extensible';return Reflect.isExtensible(object)}});
const outer=new Proxy(inner,{defineProperty(){trace+='define';return true}});let rejected=false;try{Reflect.defineProperty(outer,'key',{writable:false})}catch(error){rejected=error instanceof TypeError}check(rejected&&trace==='definedescriptorextensible','nested-target-order');
let calls=0;const falseTarget=new Proxy({},{getOwnPropertyDescriptor(){throw 'unexpected-descriptor'},isExtensible(){throw 'unexpected-extensible'}});const falseProxy=new Proxy(falseTarget,{defineProperty(){calls++;return false}});check(Reflect.defineProperty(falseProxy,'key',{value:1})===false&&calls===1,'false-trap');
const abrupt={marker:true};const abruptTarget=new Proxy({},{getOwnPropertyDescriptor(){throw abrupt}});let abruptIdentity=false;try{Reflect.defineProperty(new Proxy(abruptTarget,{defineProperty(){return true}}),'key',{})}catch(error){abruptIdentity=error===abrupt}check(abruptIdentity,'descriptor-abrupt');
let chain=null;for(let index=0;index<4096;++index){const target={};Object.defineProperty(target,'key',{value:index,writable:true,configurable:false});const proxy=new Proxy(target,{defineProperty(){return true}});chain={target,proxy,index,next:chain}}
__COLLECT__
queueMicrotask(()=>{let visited=0;while(chain){let rejected=false;try{Reflect.defineProperty(chain.proxy,'key',{writable:false})}catch(error){rejected=error instanceof TypeError}check(rejected&&chain.target.key===chain.index,'retained-descriptor');chain=chain.next;visited++}check(visited===4096,'retained-graph');console.log('retained',visited)});
`.replace("__COLLECT__",collect?"$262.gc();":"")}

test('Proxy defineProperty validates one target descriptor and writable transitions',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-proxy-define-descriptor-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false));
  const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile&&!noGc));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'proxy-define-descriptor.ts#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
   if(observation)expect({noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({noGc,kind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

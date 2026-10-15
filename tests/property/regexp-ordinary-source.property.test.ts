import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(collect:boolean):string{return `'use strict';
function check(value,label){if(!value)throw label}
const intrinsic=RegExp,prototype=RegExp.prototype;
for(const construct of [()=>/a/dg,()=>new intrinsic('a','dg'),()=>intrinsic('a','dg')]){const owner=construct(),exec=owner.exec;check(Object.getPrototypeOf(owner)===prototype&&owner instanceof intrinsic,'ordinary-owner');const first=exec.call(owner,'aba');console.log('result',first.index,first[0],first.indices[0].join(','),owner.lastIndex,Object.prototype.toString.call(owner))}
const regexp=/a/g,alias=regexp;
Object.defineProperty(regexp,'source',{get(){return {marker:7}},configurable:true});check(alias.source.marker===7,'actual-getter');
Object.defineProperty(regexp,'lastIndex',{value:'2'});check(alias.lastIndex==='2','actual-index');
let trace='';const saved=prototype.exec;
prototype.exec=function(value){trace+='call:'+value+'|';return {marker:9}};
const stored=regexp.exec;check(stored.call(alias,'x').marker===9&&alias.exec('y').marker===9,'mutable-method');
delete prototype.exec;let missing=false;try{alias.exec('z')}catch(e){missing=e instanceof TypeError}check(missing,'deleted-method');prototype.exec=saved;
const globalConstructor=globalThis.RegExp;globalThis.RegExp=function(){return {replacement:11}};
const literal=/b/;check(Object.getPrototypeOf(literal)===prototype&&new RegExp('x').replacement===11,'literal-intrinsic');globalThis.RegExp=globalConstructor;
class Derived extends intrinsic{};const derived=new Derived('a','g');check(derived instanceof Derived&&derived instanceof intrinsic&&derived.test('a'),'derived-owner');
const proxy=new Proxy(/a/g,{});let rejected=false;try{saved.call(proxy,'a')}catch(e){rejected=e instanceof TypeError}check(rejected,'native-brand');
console.log('mutation',trace,missing,literal.source,derived.source);
let chain=null;for(let index=0;index<4096;index++){const regexp=/a/g;const owner={index,regexp};chain={owner,exec:regexp.exec,next:chain}}
__COLLECT__
queueMicrotask(()=>{let visited=0;while(chain){check(chain.exec.call(chain.owner.regexp,'a')[0]==='a','retained-method');chain=chain.next;visited++}check(visited===4096,'retained-graph');console.log('retained',visited)});
`.replace("__COLLECT__",collect?"$262.gc();":"")}

test('RegExp source values use ordinary owners through mutation and retained calls',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-regexp-ordinary-source-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false));
  const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile&&!noGc));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'regexp-ordinary-source.ts#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
   if(observation)expect({noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({noGc,kind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

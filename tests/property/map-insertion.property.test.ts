import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import ts from 'typescript';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';
import {generateE2eCaseSource} from '../e2e/generated-cases';

function subject(collect:boolean):string{return `
function check(value,label){if(!value)throw label;}
const insert=Map.prototype.getOrInsert,computed=Map.prototype.getOrInsertComputed;
for(const method of [insert,computed]){const descriptor=Object.getOwnPropertyDescriptor(Map.prototype,method.name);check(method.length===2&&!Object.hasOwn(method,'prototype')&&descriptor.writable&&!descriptor.enumerable&&descriptor.configurable,'method-metadata');for(const receiver of [undefined,null,1,{},new Set(),new Proxy(new Map(),{})]){try{Reflect.apply(method,receiver,['key',()=>17]);throw 'accepted'}catch(error){check(error instanceof TypeError,'map-brand')}}}
const objectKey={valueOf(){throw 'key conversion'},toString(){throw 'key conversion'}},marker={},symbol=Symbol('key');
for(const key of [undefined,null,true,false,0,-0,NaN,Infinity,17n,'key',symbol,objectKey]){
 const map=new Map();let calls=0;
 const first=Reflect.apply(insert,map,[key,marker]);check(first===marker&&map.get(key)===marker,'insert-identity');
 check(Reflect.apply(insert,map,[key,{}])===marker&&map.size===1,'existing-value');
 check(Reflect.apply(computed,map,[key,()=>{calls++;return {}}])===marker&&calls===0,'existing-callback-skipped');
 try{Reflect.apply(computed,map,[key,17]);throw 'accepted'}catch(error){check(error instanceof TypeError,'callback-validation-before-existing')}
 map.delete(key);let receiver,actual;
 const result=Reflect.apply(computed,map,[key,function(){'use strict';receiver=this;actual=arguments;${collect?'$262.gc();':''}return marker}]);
 check(result===marker&&map.get(key)===marker&&receiver===undefined&&actual.length===1,'computed-actuals');
 check(Object.is(actual[0],key===0?0:key),'canonical-key');
}
const map=new Map([['before',17]]);let calls=0;
const value=computed.call(map,'key',function(key){calls++;map.set(key,'intermediate');map.set('after',23);${collect?'$262.gc();':''}return marker});
check(value===marker&&map.get('key')===marker&&calls===1&&Array.from(map.keys()).join(',')==='before,key,after','callback-live-overwrite-order');
map.delete('key');const deleted=computed.call(map,'key',function(key){map.set(key,31);map.delete(key);return marker});check(deleted===marker&&map.get('key')===marker&&Array.from(map.keys()).join(',')==='before,after,key','callback-delete-and-append');
const abrupt={};try{computed.call(map,'abrupt',function(key){map.set(key,37);throw abrupt});throw 'accepted'}catch(error){check(error===abrupt&&map.get('abrupt')===37,'callback-abrupt-effects')}
const undefinedMap=new Map([['key',undefined]]);check(computed.call(undefinedMap,'key',()=>{throw 'unexpected'})===undefined,'undefined-present');
const initial=new Map([['initial',17]]);const retained=insert.call(initial,objectKey,marker);check(retained===marker&&initial.get(objectKey)===marker&&Array.from(initial.keys())[1]===objectKey,'mixed-native-storage');
let ignored=0;const ordinary=new Map();ordinary.getOrInsert=function(...args){check(this===ordinary,'override-receiver');return args.length};check(ordinary.getOrInsert(1,2,ignored++)===3&&ignored===1,'method-override');
let order='';Object.defineProperty(ordinary,'getOrInsertComputed',{get(){order+='G';return function(...args){order+='C';return args.length}}});const chosen=ordinary.getOrInsertComputed((order+='A',1),(order+='B',2),...(order+='S',[3]));check(chosen===3&&order==='GABSC','lookup-before-complete-actuals');
const bound=computed.bind(map,'bound');check(Reflect.apply(bound,null,[()=>marker])===marker&&map.get('bound')===marker,'bound-reflected');
const omitted=new Map();check(insert.call(omitted)===undefined&&omitted.has(undefined),'omitted-actuals');
${collect?`const foreign=$262.createRealm().global;const borrowed=foreign.Map.prototype.getOrInsertComputed;let borrowedError;try{borrowed.call(new Map(), 'key', 17)}catch(error){borrowedError=error}check(borrowedError instanceof foreign.TypeError,'borrowed-validation-realm');const borrowedMap=new Map();check(borrowed.call(borrowedMap,'key',()=>marker)===marker&&borrowedMap.get('key')===marker,'borrowed-map-owner');`:''}
console.log('map-insertion:',true);
`;}

test('Map insertion methods share live owner lookup and store with actual callback completions',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-map-insertion-'));
 try{for(const typed of [false,true])for(const noGc of [false,true])for(const profile of [false,true]){
  const stress=!typed&&!noGc&&!profile?generateE2eCaseSource('{"generator":"map-insertion-depth","depth":4096}','property/map_insertion_depth'):'';
  const source=subject(profile&&!noGc)+stress,program=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
  const directory=path.join(temporary,`${typed}-${noGc}-${profile}`);await fs.mkdir(directory);
  const oracle=path.join(directory,'oracle.mjs');await fs.writeFile(oracle,program.replaceAll('$262.gc();',''));
  const node=nodeReferenceSync(['node','-e','const fs=require("node:fs");globalThis.$262={createRealm(){return {global:require("node:vm").runInNewContext("globalThis")}}};console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];await fs.writeFile(entry,(typed?'// @ts-nocheck\n':'')+(typed?source:program));
  const built=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),...(profile?{moduleRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/map-insertion#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});expect({code:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({code:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  if(profile){const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString())}else expect(native.stdout.toString()).toBe(node.stdout.toString());
 }}finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

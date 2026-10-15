import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import ts from 'typescript';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';
import {generateE2eCaseSource} from '../e2e/generated-cases';

function subject(collect:boolean,realm:boolean):string{return `
function check(value,label){if(!value)throw label;}
const predicate=Error.isError,descriptor=Object.getOwnPropertyDescriptor(Error,'isError');
check(predicate.name==='isError'&&predicate.length===1&&!Object.hasOwn(predicate,'prototype')&&descriptor.writable&&!descriptor.enumerable&&descriptor.configurable,'predicate-metadata');
for(const value of [undefined,null,false,true,0,-0,NaN,Infinity,17n,'Error',Symbol('Error'),[],{},function(){},Error.prototype,Object.create(Error.prototype),{name:'Error',message:'fake'},{[Symbol.toStringTag]:'Error'}])check(!predicate(value),'non-error-domain');
for(const constructor of [Error,EvalError,RangeError,ReferenceError,SyntaxError,TypeError,URIError,AggregateError]){
 const error=constructor===AggregateError?new constructor([],'aggregate'):new constructor('message');
 check(predicate(error)&&!predicate(constructor)&&!predicate(constructor.prototype),'actual-error-slot');
 if(constructor!==Error)check(Object.getPrototypeOf(constructor)===Error&&constructor.isError===predicate,'constructor-inheritance');
 Object.setPrototypeOf(error,null);error.name='Fake';delete error.message;error[Symbol.toStringTag]='Object';check(predicate(error),'brand-independent-of-properties');
 let called=false;const proxy=new Proxy(error,{get(){called=true;throw 'get'},getPrototypeOf(){called=true;throw 'prototype'}});
 check(!predicate(proxy)&&!called,'proxy-not-unwrapped');
 const revocable=Proxy.revocable(error,{});revocable.revoke();check(!predicate(revocable.proxy),'revoked-proxy');
}
class Derived extends Error{}class Returned extends Error{constructor(){super();return {plain:true}}}
check(predicate(new Derived())&&!predicate(new Returned()),'subclass-return-owner');
const poison=new Proxy({},{get(){throw 'get'},getPrototypeOf(){throw 'prototype'}});check(!predicate(poison),'ordinary-proxy-no-hooks');
let caught;try{Reflect.get(null,'field')}catch(error){caught=error}check(predicate(caught),'native-thrown-error');
const bound=predicate.bind(poison);check(bound(new Error())&&Reflect.apply(predicate,poison,[new Error()]),'borrowed-bound-actuals');
try{Reflect.construct(predicate,[]);throw 'accepted'}catch(error){check(error instanceof TypeError,'nonconstructor')}
const old=Error.isError;let order='';Object.defineProperty(Error,'isError',{configurable:true,get(){order+='G';return function(...args){order+='C';return this===Error&&args.length===3}}});
check(Error.isError((order+='A',1),...(order+='S',[2,3]))&&order==='GASC','lookup-and-complete-actuals');Object.defineProperty(Error,'isError',{value:old,writable:true,configurable:true});
check(Error.isError()===false,'omitted-argument');let effects=0;check(Error.isError(new Error(),effects++,effects++)&&effects===2,'ignored-actuals');
const original=globalThis.Error;globalThis.Error={isError(){return 'changed'}};check(Error.isError()==='changed'&&predicate(new original()),'mutable-global-captured-predicate');globalThis.Error=original;
${realm?`const foreign=$262.createRealm().global;check(predicate(new foreign.Error())&&foreign.Error.isError(new Error()),'cross-realm-brand');check(foreign.TypeError.isError===foreign.Error.isError&&Object.getPrototypeOf(foreign.TypeError)===foreign.Error,'foreign-constructor-inheritance');const argument=new foreign.TypeError();${collect?'$262.gc();':''}check(predicate(argument)&&foreign.Error.isError(argument),'retained-foreign-error');`:''}
console.log('error-brand:',true);
`;}

test('Error.isError observes private ErrorData independently of prototypes, realms and Proxy traps',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-error-brand-'));
 try{for(const typed of [false,true])for(const noGc of [false,true])for(const profile of [false,true]){
  const stress=!typed&&!noGc&&!profile?generateE2eCaseSource('{"generator":"error-brand-depth","depth":4096}','property/error_brand_depth'):'';
  const source=subject(profile&&!noGc,profile)+stress,program=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
  const directory=path.join(temporary,`${typed}-${noGc}-${profile}`);await fs.mkdir(directory);const oracle=path.join(directory,'oracle.mjs');await fs.writeFile(oracle,program.replaceAll('$262.gc();',''));
  const node=nodeReferenceSync(['node','-e','const fs=require("node:fs");globalThis.$262={createRealm(){return {global:require("node:vm").runInNewContext("globalThis")}}};console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];await fs.writeFile(entry,(typed?'// @ts-nocheck\n':'')+(typed?source:program));
  const built=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),...(profile?{moduleRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/error-brand#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});expect({code:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({code:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  if(profile){const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString())}else expect(native.stdout.toString()).toBe(node.stdout.toString());
 }}finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

test('ErrorData predicates retain pure Boolean source facts through ordinary callable owners',()=>{
 for(const receiver of ["Error.isError({name:'Error'})","TypeError.isError({})","Error.isError(Symbol('arg'))","Error.isError.call(null,{})","Reflect.apply(Error.isError,null,[{}])"]){
  const proof=graph([{path:'main.js',source:"let body='17;';"+receiver+";eval(body);",goal:'script'}]);expect(proof.error).toBeNull();expect(proof.directEvalSources.some(entry=>entry.source==='17;')).toBe(true);
 }
 const unknown=graph([{path:'main.js',source:"const body={source:'17;'};Error.isError=opaque();Error.isError({});eval(body.source);",goal:'script'}]);expect(unknown.error).toContain('direct eval source is not a finite static string expression');
});

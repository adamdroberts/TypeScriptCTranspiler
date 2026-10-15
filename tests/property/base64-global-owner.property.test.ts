import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(profile:boolean,collect:boolean,stress:boolean):string{return `
import {encode,decode} from './owner.mjs';
const host=globalThis;function check(value,label){if(!value)throw label;${profile?'print':'console.log'}(label+':true')}
check(encode===btoa&&decode===atob&&host.btoa===encode&&host.atob===decode,'realm-function-identity');
for(const [name,fn] of [['btoa',encode],['atob',decode]]){const descriptor=Object.getOwnPropertyDescriptor(host,name);check(fn.name===name&&fn.length===1&&Object.hasOwn(fn,'prototype')&&descriptor.writable&&descriptor.configurable&&descriptor.enumerable,'function-metadata');const constructed=new fn(name==='btoa'?'abc':'YWJj');check(Object.getPrototypeOf(constructed)===fn.prototype&&fn.prototype.constructor===fn,'host-construction')}
const events=[];const input={[Symbol.toPrimitive](hint){events.push(hint);return 'abc'}};
check(encode(input,(events.push('extra'),17))==='YWJj'&&events.join(',')==='extra,string','coercion-after-arguments');
check(encode.call(null,'abc')==='YWJj'&&decode.apply({},['YWJj',17])==='abc'&&encode.bind({},'abc')()==='YWJj','ordinary-call-adapters');
let missing=false;try{encode()}catch(error){missing=error instanceof TypeError}check(missing&&encode(undefined)==='dW5kZWZpbmVk'&&encode(null)==='bnVsbA==','missing-and-explicit-values');
const captured=btoa;const pending=(async()=>captured(await Promise.resolve('abc')))();host.btoa=value=>'replacement:'+value;check(btoa('abc')==='replacement:abc','mutable-global-binding');
${collect?'host.$262.gc();':''}
check(await pending==='YWJj'&&encode('abc')==='YWJj','retained-before-suspension');host.btoa=captured;
function shadowed(){const btoa=value=>'local:'+value;return btoa('abc')}check(shadowed()==='local:abc','lexical-shadowing');
const actual=['abc',undefined,17];check(encode(...actual)==='YWJj'&&decode(...['YWJj',undefined])==='abc','actual-argument-list');
${stress?"let retained={fn:encode,peer:null};for(let depth=0;depth<4096;depth++)retained={fn:decode,peer:retained};host.$262.gc();for(let depth=0;depth<4096;depth++)retained=retained.peer;check(retained.fn('abc')==='YWJj','deep-retained-native-function-owner');":''}
`}

test('base64 host globals retain ordinary Realm function owners through suspension',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-base64-owner-'));
 try{
 const plans=['typed','javascript'].flatMap(mode=>[false,true].map(noGc=>({mode,noGc,profile:false,stress:false})));
 plans.push({mode:'javascript',noGc:false,profile:true,stress:true},{mode:'javascript',noGc:true,profile:true,stress:false});
 for(const {mode,noGc,profile,stress} of plans){
  const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
  await fs.writeFile(path.join(directory,'owner.mjs'),'export const encode=btoa,decode=atob;');
  const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile,profile&&!noGc,stress));
  const oracle=path.join(directory,'reference.mjs');await fs.writeFile(oracle,subject(false,false,false));
  const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  const output=path.join(directory,'program'),diagnostics:string[]=[];
  const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/base64-global-owner.mjs#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
  expect({mode,noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({mode,noGc,profile,exitCode:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
  expect({mode,noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({mode,noGc,profile,exitCode:0,stderr:''});
  const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation.kind).toBe('normal');
  const stdout=observation?observation.stdout:native.stdout.toString();
  expect(stdout).toBe(reference.stdout.toString()+(stress?'deep-retained-native-function-owner:true\n':''));
 }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},600_000);

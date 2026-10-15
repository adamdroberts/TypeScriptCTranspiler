import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import ts from 'typescript';
import {parseHostObservation} from '../test262/protocol';
import {compile} from '../../src/compile';
import {generateE2eCaseSource} from '../e2e/generated-cases';

function subject(collect:boolean):string{return `
function check(value,label){if(!value)throw label;}
const descriptorFields=['value','writable','get','set','enumerable','configurable'];
const getter=function(){return 23},setter=function(value){};
const ordinary={field:17};const accessor={};Object.defineProperty(accessor,'field',{get:getter,set:setter,configurable:true});
const dataShadow=Object.create(accessor);dataShadow.field=19;Object.defineProperty(dataShadow,'field',{value:19,configurable:true});
Object.prototype.get=getter;Object.prototype.set=setter;
check(Object.prototype.__lookupGetter__.call(ordinary,'field')===undefined,'data-getter-absence');
check(Object.prototype.__lookupSetter__.call(dataShadow,'field')===undefined,'data-setter-shadow');
check(Object.prototype.__lookupGetter__.call(accessor,'field')===getter,'actual-getter');
check(Object.prototype.__lookupSetter__.call(accessor,'field')===setter,'actual-setter');
delete Object.prototype.get;delete Object.prototype.set;
const targets=[ordinary,accessor,[29],'xy',function FunctionOwner(){},new Uint8Array([31])];
const keys=['field','field','0','0','prototype','0'];
const inputs=[{}, {value:ordinary},{writable:false},{enumerable:false,configurable:true},{get:getter},{set:setter},{get:undefined,set:setter}];
const records=inputs.map(input=>{const record=Object.create(null);for(const key of Object.keys(input))record[key]=input[key];return record});
const hookDefinitions=Object.create(null);let reads=0,writes=0;
const hookFields=descriptorFields.concat(['done']);
for(const field of hookFields)hookDefinitions[field]={configurable:true,get(){reads++;return undefined},set(value){writes++}};
Object.defineProperties(Object.prototype,hookDefinitions);
try{
 for(let index=0;index<targets.length;index++){
  const descriptor=Object.getOwnPropertyDescriptor(targets[index],keys[index]);
  ${collect?'$262.gc();':''}
  check(Object.getPrototypeOf(descriptor)===Object.prototype,'descriptor-prototype');
  const projected=Object.keys(descriptor);
  const expected=index===1?'get,set,enumerable,configurable':'value,writable,enumerable,configurable';
  check(projected.join(',')===expected,'descriptor-slot-order');
  for(const field of projected){const own=Object.getOwnPropertyDescriptor(descriptor,field);check(own.writable&&own.enumerable&&own.configurable,'descriptor-own-data-attributes')}
 }
 for(const input of records){
  let observed;const proxy=new Proxy({},{defineProperty(target,key,descriptor){observed=descriptor;return true}});
  check(Reflect.defineProperty(proxy,'field',input),'trap-result');
  ${collect?'$262.gc();':''}
  check(Object.keys(observed).join(',')===descriptorFields.filter(field=>Object.hasOwn(input,field)).join(','),'partial-slot-order');
  for(const field of descriptorFields)check(Object.hasOwn(observed,field)===Object.hasOwn(input,field),'partial-own-presence');
 }
 const iteratorResults=[[37].values().next(),'x'[Symbol.iterator]().next(),(function*(){yield 41})().next()];
 for(let index=0;index<iteratorResults.length;index++){const result=iteratorResults[index];check(Object.hasOwn(result,'value')&&Object.hasOwn(result,'done')&&!result.done,'iterator-own-fields');check(Object.keys(result).join(',')==='value,done','iterator-field-order')}
 const all=Object.getOwnPropertyDescriptors(ordinary);check(all.field.value===17,'aggregate-descriptors');
 check(Object.keys(ordinary).join(',')==='field'&&Object.values(ordinary)[0]===17&&Object.entries(ordinary)[0][1]===17,'ordinary-enumeration');
 check(Object.prototype.__lookupGetter__.call(ordinary,'field')===undefined,'hooked-data-absence');
 check(reads===0&&writes===0,'descriptor-prototype-hooks-not-invoked');
}finally{for(const field of hookFields)delete Object.prototype[field]}
console.log('descriptor-projection:',true);
const marker={},symbol=Symbol('field'),owner={};Object.defineProperty(owner,symbol,{get:getter});
check(Object.prototype.__lookupGetter__.call(owner,symbol)===getter,'symbol-lookup');
let trace='';const root=Object.create(null);Object.defineProperty(root,'field',{get:getter});
const chain=new Proxy({},{getOwnPropertyDescriptor(){trace+='D';return undefined},getPrototypeOf(){trace+='P';return root}});
check(Object.prototype.__lookupGetter__.call(chain,'field')===getter&&trace==='DP','lookup-order');
const abrupt=new Proxy({},{getOwnPropertyDescriptor(){throw marker}});
try{Object.prototype.__lookupGetter__.call(abrupt,'field');throw 'accepted'}catch(error){check(error===marker,'lookup-abrupt-identity')}
console.log('descriptor-lookup:',true);
`;}

test('descriptor slot projection bypasses prototype setters and lookup uses own record fields',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-descriptor-projection-'));
 try{for(const typed of [false,true])for(const noGc of [false,true])for(const profile of [false,true]){
  const stress=!typed&&!noGc&&!profile?generateE2eCaseSource('{"generator":"descriptor-projection-depth","depth":4096}','property/descriptor_projection_depth'):'';
  const source=subject(profile&&!noGc)+stress,program=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
  const directory=path.join(temporary,`${typed}-${noGc}-${profile}`);await fs.mkdir(directory);
  const oracle=path.join(directory,'oracle.mjs');await fs.writeFile(oracle,program.replaceAll('$262.gc();',''));
  const node=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];await fs.writeFile(entry,(typed?'// @ts-nocheck\n':'')+(typed?source:program));
  const built=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),...(profile?{moduleRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/descriptor-projection#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
  expect({code:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({code:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  if(profile){const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString())}else expect(native.stdout.toString()).toBe(node.stdout.toString());
 }}finally{await fs.rm(temporary,{recursive:true,force:true})}
},600_000);

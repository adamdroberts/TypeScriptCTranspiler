import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {parseHostObservation} from '../test262/protocol';

// These are the independently reviewed ToPropertyDescriptor semantic fields,
// not an inventory of fixture shapes or accepted arities.
const fields=['enumerable','configurable','value','writable','get','set'];
function callbackValue(field:string):string{return field==='get'?'function(){return 17}':field==='set'?'function(value){}':field==='value'?'19':'true'}
function program():string{
 const blocks=fields.flatMap((field,index)=>['Object.defineProperty(target,"x",descriptor)','Reflect.defineProperty(target,"x",descriptor)','Object.defineProperties(target,{x:descriptor})'].map((call,route)=>`{let body='23;';const target={},descriptor={get ${field}(){body='${29+index*6+route};';return ${callbackValue(field)}}};${call};console.log('field${index}-${route}:'+eval(body));}`));
 blocks.push(`{const events=[];const descriptor={get enumerable(){events.push('enumerable');return true},get configurable(){events.push('configurable');return true},get value(){events.push('value');return 17},get writable(){events.push('writable');return true},get get(){events.push('get');return undefined},get set(){events.push('set');return undefined}};try{Object.defineProperty({},'x',descriptor)}catch(error){console.log('mixed:'+error.name+':'+events.join('|'))}}`);
 blocks.push(`{let body='149;';const descriptor={get enumerable(){throw '151;'},get configurable(){body='157;';return true}};try{Object.defineProperty({},'x',descriptor)}catch(thrown){console.log('early:'+eval(thrown)+':'+eval(body))}}`);
 blocks.push(`{let body='163;';const descriptor={get get(){return 1},get set(){body='167;';return undefined}};try{Object.defineProperty({},'x',descriptor)}catch(error){console.log('validation:'+error.name+':'+eval(body))}}`);
 blocks.push(`{let body='173;';const inherited={get configurable(){body='179;';return true}};const descriptor=Object.create(inherited);descriptor.value=1;Object.defineProperty({},'x',descriptor);console.log('inherited:'+eval(body));}`);
 blocks.push(`{let body='179;';const target=Object.create(null,{body:{get enumerable(){body='180;';return true},value:'181;'}});console.log('create:'+eval(body)+':'+eval(target.body)+':'+String(Object.getPrototypeOf(target)));}`);
 blocks.push(`{let body='181;';const descriptor={enumerable:{valueOf(){body='191;';return 0}},value:1};Object.defineProperty({},'x',descriptor);console.log('boolean-no-coercion:'+eval(body));}`);
 blocks.push(`{const target={};Object.defineProperty(target,'x',{get:undefined});const descriptor=Object.getOwnPropertyDescriptor(target,'x');console.log('undefined-accessor:'+('get' in descriptor)+':'+('value' in descriptor)+':'+String(target.x));}`);
 const nested=Array.from({length:256},(_,index)=>`let value${index}={};Object.defineProperty(value${index},'item',{get enumerable(){return true},get configurable(){return true},get value(){return ${index?'value'+(index-1):"{body:'193;'}"}},get writable(){return true}});`).join('\n');
 blocks.push(`{${nested}COLLECT console.log('deep:'+eval(value255${'.item'.repeat(256)}.body));}`);
 return blocks.join('\n')+'\n';
}

test('source descriptor conversion retains ordered field effects and abrupt gates',()=>{
 for(const field of fields)for(const call of ['Object.defineProperty(target,"x",descriptor)','Reflect.defineProperty(target,"x",descriptor)','Object.defineProperties(target,{x:descriptor})']){
  const source=`let body='17;';const target={},descriptor={get ${field}(){body='19;';return ${callbackValue(field)}}};${call};eval(body);`,result=graph([{path:'main.js',source}]);expect({source,error:result.error}).toEqual({source,error:null});expect(result.directEvalSources.some(entry=>entry.source==='19;')).toBe(true);
  const opaque=source.replace("body='19;'","body=opaque()");expect(graph([{path:'main.js',source:opaque}]).error).toContain('direct eval source is not a finite static string expression');
 }
 for(const source of [
  'let body="23;";Object.defineProperty({},"x",new Proxy({value:1},{has(){body=opaque();return false}}));eval(body);',
  'let body="23;";const inherited=new Proxy({value:1},{get(){body=opaque();return 1}});Object.defineProperty({},"x",Object.create(inherited));eval(body);',
  'let body="29;";Object.defineProperty({},"x",{get enumerable(){throw "31;"},get configurable(){body=opaque();return true}});eval(body);',
 ]){const result=graph([{path:'main.js',source}]);if(source.includes('new Proxy'))expect(result.error).toContain('direct eval source is not a finite static string expression');else {expect(result.error).toBeNull();expect(result.directEvalSources.every(entry=>entry.source==='29;')).toBe(true);}}
 for(const source of ['Object.defineProperty({},"x",{get get(){return 1},get set(){opaque()}});eval("37;");','Object.defineProperty({},"x",{get:undefined,value:1});eval("41;");'])expect(graph([{path:'main.js',source}]).error).toBeNull();
 expect(graph([{path:'main.js',source:program().replaceAll('COLLECT','')}]).error).toBeNull();
});

test('descriptor conversion effects match Node through native source modes',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-descriptor-conversion-'));
 try{
  const referenceEntry=path.join(temporary,'reference.mjs');await fs.writeFile(referenceEntry,program().replaceAll('COLLECT',''));const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',referenceEntry],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}`);await fs.mkdir(directory);const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+program().replaceAll('COLLECT',noGc?'':'$262.gc();'));
   const output=path.join(directory,'program'),diagnostics:string[]=[];const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),test262Observation:{kind:'test262-native-observation',scenarioId:'descriptor-conversion-source#module',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({mode,noGc,code:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({mode,noGc,code:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});expect({mode,noGc,code:native.exitCode,stderr:native.stderr.toString()}).toEqual({mode,noGc,code:0,stderr:''});const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect({mode,noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({mode,noGc,kind:'normal'});expect(observation.stdout).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

test('descriptor operation records react to later formal and owner facts',()=>{
 const sources=[
  ...['Object.defineProperty(target,"read",descriptor)','Reflect.defineProperty(target,"read",descriptor)','Object.defineProperties(target,{read:descriptor})'].map(call=>'function define(target,descriptor){'+call+'}const left={},right={};define(left,{value:()=>"17;"});define(right,{get(){return ()=>"19;"}});eval(left.read());eval(right.read());'),
  ...['Object.getOwnPropertyDescriptor(target,"read")','Reflect.getOwnPropertyDescriptor(target,"read")','Object.getOwnPropertyDescriptors(target).read'].map(call=>'function read(target){return '+call+'}const left={read:()=>"17;"},right={read:()=>"19;"};eval(read(left).value());eval(read(right).value());'),
 ];
 const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");fs.writeSync(1,JSON.stringify(JSON.parse(process.argv[1]).map(source=>{const values=[];new vm.Script(source).runInNewContext({eval:value=>values.push(value)});return values;})));',JSON.stringify(sources)],{stdout:'pipe',stderr:'pipe',timeout:30_000});
 expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});const expected:string[][]=JSON.parse(reference.stdout.toString());
 expect(expected).toEqual(sources.map(()=>['17;','19;']));
 for(const [index,source]of sources.entries()){
  const result=graph([{path:'subject.js',source}]);expect(result.error).toBeNull();
  for(const value of expected[index]!)expect(result.directEvalSources.map(entry=>entry.source)).toContain(value);
 }
});

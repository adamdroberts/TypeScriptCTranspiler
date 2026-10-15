import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {parseHostObservation} from '../test262/protocol';

const values=['{}','[]','{x:1}','[1,"17;",true,null]','{x:{y:[1,"17;"]}}','{2:2,1:1,z:0,a:3}','{a:[,undefined,NaN,Infinity,Symbol.iterator,function(){}],b:"\\ud800"}','{a:JSON.rawJSON("17"),b:[JSON.rawJSON("true")]}'];
const options=['','undefined,2','undefined," "','["a","x","y",1,2,"z","b","a"]'];
const routes=['JSON.stringify(value OPTIONS)','Reflect.apply(JSON.stringify,null,[value OPTIONS])'];
function deepText():string{let text='17';for(let depth=0;depth<512;depth++)text=depth%2?'['+text+']':'{"child":'+text+'}';return text;}
function program():string{
 const blocks=values.flatMap((value,index)=>options.map((option,variant)=>`{const value=${value};const body=JSON.stringify(value${option?','+option:''});console.log('value${index}-${variant}:'+JSON.stringify(eval('('+body+')')));}`));
 blocks.push(`{let body='19;';JSON.stringify({nested:{get x(){body='23;';return 1}}});console.log('getter:'+eval(body));}`);
 blocks.push(`{let body='29;';JSON.stringify({nested:{toJSON(key){body='31;';return 1}}});console.log('hook:'+eval(body));}`);
 blocks.push(`{let body='37;';try{JSON.stringify({a:{toJSON(){throw '41;'}},get b(){body='43;';return 1}})}catch(source){console.log('early:'+eval(source)+':'+eval(body))}}`);
 blocks.push(`{const value={};Object.defineProperty(value,'hidden',{get(){throw '47;'}});console.log('hidden:'+JSON.stringify(eval('('+JSON.stringify(value)+')')));}`);
 blocks.push(`{const value={};Object.defineProperty(value,'hidden',{value:53});console.log('filtered:'+JSON.stringify(eval('('+JSON.stringify(value,['hidden'])+')')));}`);
 blocks.push(`{const value={x:{y:59}};const body=JSON.stringify(value,function(key,value){return value});console.log('replacer:'+JSON.stringify(eval('('+body+')')));}`);
 blocks.push(`{const value={};value.self=value;try{JSON.stringify(value)}catch(error){console.log('cycle:'+error.name)}}`);
 blocks.push(`{const value=JSON.parse(${JSON.stringify(deepText())});COLLECT const body=JSON.stringify(value);const restored=eval('JSON.parse('+JSON.stringify(body)+')');console.log('deep:'+String(JSON.stringify(restored)===body));}`);
 return blocks.join('\n')+'\n';
}

test('composite JSON source text follows ordered owner/property continuations',()=>{
 for(const value of values)for(const option of options)for(const route of routes){
  const call=route.replace(' OPTIONS',option?','+option:''),source=`const value=${value};eval('('+${call}+')');`,result=graph([{path:'main.js',source}]);expect({source,error:result.error}).toEqual({source,error:null});
  const oracle=nodeReferenceSync(['node','-e',`const value=${value};require('node:fs').writeSync(1,'('+JSON.stringify(value${option?','+option:''})+')');`],{stdout:'pipe',stderr:'pipe'});expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});expect(result.directEvalSources.some(entry=>entry.source===oracle.stdout.toString())).toBe(true);
 }
 for(const source of [
  'let body="61;";JSON.stringify({nested:{get x(){body=opaque();return 1}}});eval(body);',
  'let body="67;";JSON.stringify({nested:{toJSON(){body=opaque();return 1}}});eval(body);',
  'let body="71;";JSON.stringify({x:1},function(key,value){if(key==="x")body=opaque();return value});eval(body);',
  'eval("("+JSON.stringify(new Proxy({x:1},{ownKeys(){return opaque()}}))+")");',
 ])expect({source,error:graph([{path:'main.js',source}]).error}).toMatchObject({error:expect.stringContaining('direct eval source is not a finite static string expression')});
 const early=graph([{path:'main.js',source:'let body="73;";try{JSON.stringify({a:{toJSON(){throw "79;"}},get b(){body=opaque();return 1}})}catch(source){eval(source)}eval(body);'}]);expect(early.error).toBeNull();expect(early.directEvalSources.some(entry=>entry.source==='79;')).toBe(true);
 expect(graph([{path:'main.js',source:program().replaceAll('COLLECT','')}]).error).toBeNull();
});

test('composite serialization source closures agree with independent Node',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-json-composite-source-'));
 try{
  const entry=path.join(temporary,'reference.mjs');await fs.writeFile(entry,program().replaceAll('COLLECT',''));const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});
  for(const typed of [false,true])for(const noGc of [false,true]){
   const directory=path.join(temporary,`${typed}-${noGc}`);await fs.mkdir(directory);const input=path.join(directory,typed?'main.ts':'main.mjs');await fs.writeFile(input,(typed?'// @ts-nocheck\n':'')+program().replaceAll('COLLECT',noGc?'':'$262.gc();'));const output=path.join(directory,'program'),diagnostics:string[]=[];
   const compiled=await compile({entry:input,output,noGc,moduleRoots:[input],initializationEntries:[input],buildDir:path.join(directory,'build'),test262Observation:{kind:'test262-native-observation',scenarioId:'json-composite-source#module',setupEntries:[],testEntry:input,async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({typed,noGc,code:compiled.exitCode,diagnostics:diagnostics.join('')}).toEqual({typed,noGc,code:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});expect({typed,noGc,code:native.exitCode,stderr:native.stderr.toString()}).toEqual({typed,noGc,code:0,stderr:''});const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect({typed,noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({typed,noGc,kind:'normal'});expect(observation.stdout).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

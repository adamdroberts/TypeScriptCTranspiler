import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {parseHostObservation} from '../test262/protocol';

const values=['new Number(17)','new Number()','new Number(NaN)','new String("19;")','new String()','new Boolean(false)','new Boolean({})','Object(23)','Object("29;")','Object(Symbol("x"))'];
const spacings=['new Number(2)','new String(" ")','new Boolean(true)','Object(Symbol("gap"))','{}'];
function deepText():string{let text='17';for(let depth=0;depth<512;depth++)text=depth%2?'['+text+']':'{"child":'+text+'}';return text;}
function program():string{
 const blocks=values.map((value,index)=>`{const value=${value};console.log('value${index}:'+String(eval(JSON.stringify(value))));}`);
 blocks.push(...spacings.map((space,index)=>`{const space=${space},value={x:{y:1}};console.log('space${index}:'+JSON.stringify(eval('('+JSON.stringify(value,undefined,space)+')')));}`));
 blocks.push(`{const keys=[new String('y'),new Number(1),Object('x'),new String('x')];console.log('keys:'+JSON.stringify(eval('('+JSON.stringify({x:1,y:2},keys)+')')));}`);
 blocks.push(`{let body='31;';const box=new Number(1);box.valueOf=function(){body='37;';return 2};console.log('override:'+eval(JSON.stringify(box))+':'+eval(body));}`);
 blocks.push(`{const box=new Number(1);box.valueOf=function(){return 7n};try{JSON.stringify(box)}catch(error){console.log('bigint:'+error.name)}}`);
 blocks.push(`{let body='41;';const box=new Boolean(true);box.valueOf=function(){body='43;';return false};console.log('boolean:'+eval(JSON.stringify(box))+':'+eval(body));}`);
 blocks.push(`{const box=Reflect.construct(Number,[17],function Target(){});console.log('target:'+String(eval(JSON.stringify(box))));}`);
 blocks.push(`{try{Reflect.construct(Number,[17],()=>{})}catch(error){console.log('invalid-target:'+error.name)}}`);
 blocks.push(`{function args(size){let index=0;return {[Symbol.iterator](){return {next(){return {done:index++>=size,value:17}}}}}};console.log('omitted:'+eval(JSON.stringify(new Number(...args(0))))+':'+eval(JSON.stringify(new String(...args(0))))+':'+eval(JSON.stringify(new Number(...args(1)))));}`);
 blocks.push(`{const text=${JSON.stringify(deepText())},value=JSON.parse(text,function(key,value){return typeof value==='number'?Object(value):value});COLLECT const body=JSON.stringify(value);const restored=eval('JSON.parse('+JSON.stringify(body)+')');console.log('deep:'+String(JSON.stringify(restored)===text));}`);
 return blocks.join('\n')+'\n';
}

test('boxed JSON source facts use retained payloads and actual coercion methods',()=>{
 for(const value of values){const source=`const value=${value};eval(JSON.stringify(value));`,result=graph([{path:'main.js',source}]);expect({source,error:result.error}).toEqual({source,error:null});const oracle=Bun.spawnSync(['node','-e',`const value=${value};require('node:fs').writeSync(1,JSON.stringify(value));`],{stdout:'pipe',stderr:'pipe'});expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});expect(result.directEvalSources.some(entry=>entry.source===oracle.stdout.toString())).toBe(true);}
 for(const source of [
  'let body="47;";const box=new Number(1);box.valueOf=function(){body=opaque();return 2};JSON.stringify(box);eval(body);',
  'let body="53;";const space=new String(" ");space.toString=function(){body=opaque();return " "};JSON.stringify({x:1},undefined,space);eval(body);',
  'let body="59;";const key=new String("x");key.toString=function(){body=opaque();return "x"};JSON.stringify({x:1},[key]);eval(body);',
  'eval([...new String("17;")].join(""));',
  'eval(new Number(17).toFixed());',
 ])expect({source,error:graph([{path:'main.js',source}]).error}).toMatchObject({error:expect.stringContaining('direct eval source is not a finite static string expression')});
 const ignored=graph([{path:'main.js',source:'let body="61;";const box=new Boolean(true);box.valueOf=function(){body=opaque();return false};JSON.stringify(box);eval(body);'}]);expect(ignored.error).toBeNull();expect(ignored.directEvalSources.map(entry=>entry.source)).toEqual(['61;']);
 const target=graph([{path:'main.js',source:'const box=Reflect.construct(Number,[17],function Target(){});eval(JSON.stringify(box));'}]);expect(target.error).toBeNull();expect(target.directEvalSources.map(entry=>entry.source)).toEqual(['null']);
 const omitted=graph([{path:'main.js',source:'const size=0;let index=0;const args={[Symbol.iterator](){return {next(){return {done:index++>=size,value:17}}}}};eval(JSON.stringify(new Number(...args)));'}]);expect(omitted.error).toBeNull();expect(omitted.directEvalSources.some(entry=>entry.source==='0')).toBe(true);
 expect(graph([{path:'main.js',source:program().replaceAll('COLLECT','')}]).error).toBeNull();
},30_000);

test('boxed owners and JSON option coercions agree with independent Node',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-boxed-json-source-'));
 try{
  const entry=path.join(temporary,'reference.mjs');await fs.writeFile(entry,program().replaceAll('COLLECT',''));const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});
  for(const typed of [false,true])for(const noGc of [false,true]){
   const directory=path.join(temporary,`${typed}-${noGc}`);await fs.mkdir(directory);const input=path.join(directory,typed?'main.ts':'main.mjs');await fs.writeFile(input,(typed?'// @ts-nocheck\n':'')+program().replaceAll('COLLECT',noGc?'':'$262.gc();'));const output=path.join(directory,'program'),diagnostics:string[]=[];
   const compiled=await compile({entry:input,output,noGc,moduleRoots:[input],initializationEntries:[input],buildDir:path.join(directory,'build'),test262Observation:{kind:'test262-native-observation',scenarioId:'boxed-json-source#module',setupEntries:[],testEntry:input,async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({typed,noGc,code:compiled.exitCode,diagnostics:diagnostics.join('')}).toEqual({typed,noGc,code:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});expect({typed,noGc,code:native.exitCode,stderr:native.stderr.toString()}).toEqual({typed,noGc,code:0,stderr:''});const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect({typed,noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({typed,noGc,kind:'normal'});expect(observation.stdout).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

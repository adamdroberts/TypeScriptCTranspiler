import {nodeReferenceSync} from './node-reference';
import {expect,test} from "bun:test";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {compile} from "../../src/compile";
import {finiteEvalScriptSourceGraph as graph} from "../test262/native-host";
import {parseHostObservation} from "../test262/protocol";

const definitions=[
 'const owner={};owner.method=function(){return 17;};',
 'const owner={};owner["method"]=function(){return 19;};',
 'const owner={};Object.defineProperty(owner,"method",{value:function(){return 23;}});',
 'const owner={};Object.defineProperty(owner,"method",{get(){return function(){return 29;};}});',
 'const prototype={};prototype.method=function(){return 31;};const owner={__proto__:prototype};',
];
const opaque='function opaque(){return String(Math.random());}';
test("presence projections preserve ordered writes and conservative absence",()=>{
 for(const definition of definitions){
  const source=opaque+definition+'try{owner.method();}catch(error){eval(opaque());}';
  expect({source,error:graph([{path:"main.js",source}]).error}).toEqual({source,error:null});
 }
 for(const operation of [
  'const owner={};try{owner.method();}catch(error){eval(opaque());}owner.method=function(){return 1;};',
  'const owner={};if(flag)owner.method=function(){return 1;};try{owner.method();}catch(error){eval(opaque());}',
  'const owner={};flag&&(owner.method=function(){return 1;});try{owner.method();}catch(error){eval(opaque());}',
  'const owner={method(){return 1;}};delete owner.method;try{owner.method();}catch(error){eval(opaque());}',
  'const a={},b={};const alias=flag?a:b;alias.method=function(){return 1;};try{a.method();}catch(error){eval(opaque());}',
  'const owner={};try{if(flag)throw 0;owner.method=function(){return 1;};}catch(error){}try{owner.method();}catch(error){eval(opaque());}',
  'const owner={};owner.method=function(){return 1;};external(owner);try{owner.method();}catch(error){eval(opaque());}',
  'const owner={};function call(){try{owner.method();}catch(error){eval(opaque());}}call();owner.method=function(){return 1;};call();',
 ]){const source=opaque+operation;expect({source,error:graph([{path:"main.js",source}]).error}).toMatchObject({error:expect.stringContaining("direct eval source is not a finite static string expression")});}
 for(const operation of ['Object.defineProperty(undefined,"key",{get(){return 1;}})','Object.getOwnPropertyDescriptor(null,"key")','Reflect.getOwnPropertyDescriptor(undefined,"key")']){
  const source='let body="53;";try{'+operation+';}catch(error){}eval(body);';
  const result=graph([{path:"main.js",source}]);expect({source,error:result.error}).toEqual({source,error:null});expect(result.directEvalSources.map(entry=>entry.source)).toEqual(["53;"]);
 }
 const guarded=graph([{path:"main.js",source:opaque+'const owner={};if(flag){owner.method=function(){return 59;};try{owner.method();}catch(error){eval(opaque());}}'}]);expect(guarded.error).toBeNull();
 const across=graph([{path:"setup.js",source:'var owner={};owner.method=function(){return 37;};',goal:"script"},{path:"main.js",source:opaque+'try{owner.method();}catch(error){eval(opaque());}',goal:"script"}]);expect(across.error).toBeNull();
});
function subject(depth:number):string {
 return opaque+'\n'+definitions.map((definition,index)=>`{${definition}try{print("value${index}:"+owner.method());}catch(error){eval(opaque());}}`).join('\n')+
  '\n{const owner={};function call(){try{print("activation:"+owner.method());}catch(error){eval(opaque());}}owner.method=function(){return 41;};call();}'+
  '\n{const owner={};function call(){owner.method=function(){return 43;};try{print("local:"+owner.method());}catch(error){eval(opaque());}}call();}'+
  `\n{const p0={};p0.method=function(){return 47;};${Array.from({length:depth},(_,index)=>`const p${index+1}={__proto__:p${index}};`).join('\n')}try{print("deep:"+p${depth}.method());}catch(error){eval(opaque());}}`;
}
test("ordered property presence and one deep owner graph match Node through native closure",async()=>{
 const directory=await mkdtemp(join(tmpdir(),"tsc2c-property-presence-source-"));
 try{
  for(const typed of [false,true])for(const noGc of [false,true]){
   const source=subject(typed&&!noGc?256:1);expect(graph([{path:"main.js",source}]).error).toBeNull();
   const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});'],{stdin:Buffer.from(source),stdout:"pipe",stderr:"pipe",timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:""});
   const entry=join(directory,"main-"+typed+"-"+noGc+(typed?'.ts':'.js')),output=join(directory,"program-"+typed+"-"+noGc),diagnostics:string[]=[];await writeFile(entry,(typed?'// @ts-nocheck\n':'')+source);
   const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:"test262-native-observation",scenarioId:"property/property-presence-source#script",setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({code:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({code:0,diagnostics:""});
   const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:""});const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(node.stdout.toString());
  }
 }finally{await rm(directory,{recursive:true,force:true});}
},600000);

import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {parseHostObservation} from '../test262/protocol';
const calls=['JSON.parse(text,reviver)','JSON.parse.call(null,text,reviver)','JSON.parse.bind(null)(text,reviver)','Reflect.apply(JSON.parse,null,[text,reviver])'];
const texts=['"17;"',' 19e0 ','-0','true','null'];
test('JSON parse source facts retain scalar roots and actual reviver effects',()=>{
 for(const text of texts)for(const call of calls){
  const source=`const text=${JSON.stringify(text)},reviver=function(key,value,context){return context.source};eval(${call});`;
  const result=graph([{path:'main.js',source}]);expect({source,error:result.error}).toEqual({source,error:null});
  const oracle=Bun.spawnSync(['node','-e','require("node:fs").writeSync(1,JSON.parse(process.argv[1],(key,value,context)=>context.source));','--',text],{stdout:'pipe',stderr:'pipe'});
  expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});expect(result.directEvalSources.map(entry=>entry.source)).toEqual([oracle.stdout.toString()]);
 }
 for(const [source,expected] of [
  ['eval(JSON.parse("\\\"23;\\\""));','23;'],
  ['try{JSON.parse({toString(){throw "29;"}})}catch(body){eval(body)}','29;'],
  ['try{JSON.parse("1",function(){throw "31;"})}catch(body){eval(body)}','31;'],
  ['let body="37;";JSON.parse("1",function(){body="41;";return 1});eval(body);','41;'],
  ['let body="43;";JSON.parse({toString(){body="47;";return "1"}});eval(body);','47;'],
  ['eval(JSON.parse("[]",function(){return "53;"}));','53;'],
 ] as const){const result=graph([{path:'main.js',source}]);expect({source,error:result.error}).toEqual({source,error:null});expect(result.directEvalSources.some(entry=>entry.source===expected)).toBe(true);}
 for(const source of ['JSON.parse("[]",function(){throw "59;"});','eval(JSON.parse("invalid"));','eval(JSON.parse(Symbol()));','eval(JSON.parse("[]",function(key,value,context){return context.source}));']){const result=graph([{path:'main.js',source}]);expect(result.error).toBeNull();expect(result.directEvalSources).toEqual([]);}
 for(const source of [
  'eval(JSON.parse(opaque()));',
  'eval(JSON.parse("1",opaque()));',
  'const owner={body:"61;"};JSON.parse("{}",function(){opaque(owner);return 1});eval(owner.body);',
 ])expect({source,error:graph([{path:'main.js',source}]).error}).toMatchObject({error:expect.stringContaining('direct eval source is not a finite static string expression')});
});

test('finite JSON parse scalar closure runs through native CLI and observation paths',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-json-parse-source-'));
 try{
  const source=`console.log('plain:'+eval(JSON.parse('"67;"')));\nconsole.log('source:'+eval(JSON.parse(' 71e0 ',function(key,value,context){return context.source})));\ntry{JSON.parse('1',function(){throw '73;'})}catch(body){console.log('thrown:'+eval(body))}\n`;
  const referenceEntry=path.join(temporary,'reference.mjs');await fs.writeFile(referenceEntry,source);
  const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',referenceEntry],{stdout:'pipe',stderr:'pipe'});
  expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}`);await fs.mkdir(directory);const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+source);
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),test262Observation:{kind:'test262-native-observation',scenarioId:'json-parse-source#module',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({mode,noGc,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({mode,noGc,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},600_000);

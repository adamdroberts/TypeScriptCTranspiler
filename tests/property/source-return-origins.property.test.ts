import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {parseHostObservation} from '../test262/protocol';

const definitions='function forward(value){return value;}';
test('shared returns preserve earlier captures and retain unknown call partitions',()=>{
 for(const expression of ['Math.random()','eval("Math.random();")','(0,eval)("Math.random();")']){
  const source=definitions+`const saved=forward("17;");eval(saved);forward(${expression});`;
  expect({expression,error:finiteEvalScriptSourceGraph([{path:'main.js',source}]).error}).toEqual({expression,error:null});
 }
 for(const [index,body] of [
  'for(let i=0;i<2;i++){const saved=forward("17;");forward(opaque());eval(saved);}',
  'function run(){const saved=forward("17;");if(flag)run();forward(opaque());eval(saved);}run();',
  'async function run(){const saved=forward("17;");await 0;forward(opaque());eval(saved);}run();',
 ].entries()){
  const source=definitions+body,result=finiteEvalScriptSourceGraph([{path:'main.js',source}]);expect({body,error:result.error}).toEqual({body,error:expect.stringContaining('direct eval source is not a finite static string expression')});
  const setup='const flag=false;let calls=0;function opaque(){forward=()=>"19;";'+(index?'if(calls++===0)run();':'')+'return 0;}',code='const fs=require("node:fs"),vm=require("node:vm");new vm.Script('+JSON.stringify(setup+source.replaceAll('eval(saved)','print(eval(saved))'))+').runInNewContext({print:v=>fs.writeSync(1,String(v)+"\\n")});';
  const counter=nodeReferenceSync(['node','-e',code],{stdout:'pipe',stderr:'pipe',timeout:30000});expect({code:counter.exitCode,stderr:counter.stderr.toString(),stdout:counter.stdout.toString()}).toEqual({code:0,stderr:'',stdout:['17\n19\n','19\n17\n','17\n19\n'][index]});
  const privateControl='"use strict";{const forward=value=>value;'+body+'}',finite=finiteEvalScriptSourceGraph([{path:'main.js',source:privateControl}]);expect({body,error:finite.error}).toEqual({body,error:null});expect(finite.directEvalSources.some(entry=>entry.source==='17;')).toBe(true);
  const oracle=nodeReferenceSync(['node','-e','const flag=false;function opaque(){return 0}'+privateControl],{stdout:'pipe',stderr:'pipe',timeout:30000});expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 }
 for(const body of [
  'forward("17;");const source=forward(opaque());eval(source);',
  'const source=forward(forward(opaque()));eval(source);',
  'const source=forward(flag?"17;":opaque());eval(source);',
  'const source=new opaque();eval(source.code);',
 ])expect({body,error:finiteEvalScriptSourceGraph([{path:'main.js',source:definitions+body}]).error}).toMatchObject({error:expect.stringContaining('direct eval source is not a finite static string expression')});
});

test('return origins close through a deep forwarding graph and match Node in both memory modes',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-source-return-origins-'));
 try{
  for(const noGc of [false,true])for(const typed of [false,true]){
   const depth=typed&&!noGc?96:1;
   const forwarding=Array.from({length:depth},(_,index)=>`function f${index}(value){return ${index+1<depth?'f'+(index+1):'forward'}(value);}`).join('\n');
   const source=definitions+forwarding+'\nconst saved=f0("17;");print(eval(saved));f0((0,eval)("Math.random();"));';
   const entry=join(directory,'source-'+noGc+'-'+typed+(typed?'.ts':'.js')),output=join(directory,'program-'+noGc+'-'+typed),diagnostics:string[]=[];
   const node=nodeReferenceSync(['node','-e','const vm=require("node:vm"),fs=require("node:fs");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
   await writeFile(entry,(typed?'// @ts-nocheck\n':'')+source);
   const result=await compile({entry,output,noGc,buildDir:join(directory,'build-'+noGc+'-'+typed),isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/source-return-origins#script',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,typed,code:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,typed,code:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString());
  }
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

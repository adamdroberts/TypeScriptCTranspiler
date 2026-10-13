import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {parseHostObservation} from '../test262/protocol';
import {generateE2eCaseSource} from '../e2e/generated-cases';
const updates=['value++','value+=2','value=-value+3'];
const expressions=['JSON.stringify(value)','JSON.stringify([value])','JSON.stringify({value})','JSON.stringify({toJSON(){return value}})','JSON.stringify(0,function(){return value})','Reflect.apply(JSON.stringify,null,[value])'];
function block(update:string,expression:string):string{return `{const state={source:'17;'};let value=0;for(let index=0;index<7;index++){${update}}const text=${expression};console.log('scalar:',text,eval(state.source));}`}
test('closed scalar JSON domains retain pure effects and unresolved serialized text',()=>{
 for(const update of updates)for(const expression of expressions){const source=block(update,expression),proof=graph([{path:'main.js',source}]);expect({source,error:proof.error}).toEqual({source,error:null});expect(proof.directEvalSources.map(entry=>entry.source)).toEqual(['17;']);}
 for(const source of [
  "let value=0;for(let index=0;index<7;index++)value++;eval(JSON.stringify(value));",
  "const state={source:'17;'};JSON.stringify(opaque());eval(state.source);",
  "const state={source:'17;'};JSON.stringify({get value(){state.source=opaque();return 0}});eval(state.source);",
  "const state={source:'17;'};JSON.stringify({toJSON(){state.source=opaque();return 0}});eval(state.source);",
  "const state={source:'17;'};JSON.stringify(0,function(){state.source=opaque();return 0});eval(state.source);",
 ])expect(graph([{path:'main.js',source}]).error).toContain('direct eval source is not a finite static string expression');
 for(const value of ['17','true','null','"17;"']){const proof=graph([{path:'main.js',source:`eval(JSON.stringify(${value}));`}]);expect(proof.error).toBeNull();const node=Bun.spawnSync(['node','-e',`process.stdout.write(JSON.stringify(${value}));`],{stdout:'pipe',stderr:'pipe'});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});expect(proof.directEvalSources.map(entry=>entry.source)).toEqual([node.stdout.toString()]);}
});
test('scalar serialization preserves native evaluation through retained owner graphs',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-json-scalar-source-'));
 try{for(const typed of [false,true])for(const noGc of [false,true])for(const profile of [false,true]){
  const deep=!typed&&!noGc&&!profile?generateE2eCaseSource('{"generator":"json-scalar-source-depth","depth":512}','property/json_scalar_source_depth'):'';
  const source=updates.flatMap(update=>expressions.map(expression=>block(update,expression))).join('\n')+'\n'+deep;
  expect(graph([{path:'main.js',source}]).error).toBeNull();
  const node=Bun.spawnSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({console:{log:(...values)=>fs.writeSync(1,values.map(String).join(" ")+"\\n")}});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const directory=path.join(temporary,`${typed}-${noGc}-${profile}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':profile?'main.js':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];await fs.writeFile(entry,(typed?'// @ts-nocheck\n':'')+source);
  const built=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),...(profile?{isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/json-scalar-source#script',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});expect({code:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({code:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  if(profile){const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString())}else expect(native.stdout.toString()).toBe(node.stdout.toString());
 }}finally{await fs.rm(temporary,{recursive:true,force:true})}
},900000);

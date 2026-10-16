import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';
import {parseHostObservation} from '../test262/protocol';
const source=String.raw`
const read = Function("return globalThis.token;");
globalThis.token="17;";print(eval(read()));
const executeSource=eval;executeSource('globalThis.token="19;";');print(eval(read()));
print(eval(eval("globalThis.token")));
function local(globalThis){return eval(eval("globalThis.token"));}
print(local({token:"23;"}));
{const globalThis={token:"29;"};print(eval(eval("globalThis.token")));}
const savedGlobal=globalThis;
globalThis={token:"31;"};print(executeSource(executeSource("globalThis.token")));
savedGlobal.globalThis=savedGlobal;print(globalThis===savedGlobal);print("global-binding-complete");
`;
test('generated evaluations share the canonical Realm globalThis binding and retain lexical shadows',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-global-object-binding-'));
 try{
  const entry=join(directory,'source.js');await writeFile(entry,source);
  const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});
  expect({exitCode:node.exitCode,stderr:node.stderr.toString(),stdout:node.stdout.toString()}).toEqual({exitCode:0,stderr:'',stdout:'17\n19\n19\n23\n29\n31\ntrue\nglobal-binding-complete\n'});
  for(const noGc of [false,true]){
   const output=join(directory,'program-'+noGc),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/global-object-binding#script',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(node.stdout.toString());
  }
 }finally{await rm(directory,{recursive:true,force:true});}
},300000);

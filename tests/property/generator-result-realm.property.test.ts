import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';
import {generatorMethodOwnerInput} from '../e2e/generated-cases';

const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
const vmOracle=String.raw`const fs=require('node:fs'),vm=require('node:vm');const context=vm.createContext({print:value=>fs.writeSync(1,String(value)+'\n')});context.$262={createRealm(){const other=vm.createContext({});return{global:vm.runInContext('globalThis',other)}}};vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),context);`;

test('generator completion results restore the method Realm while yielded results retain identity',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-generator-result-realm-'));
 try{
  const partitions=await readFile(join(import.meta.dir,'fixtures/generator-result-realm.txt'),'utf8');
  for(const javascript of [false,true])for(const noGc of [false,true]){
   const source=partitions.replaceAll('COLLECT',String(!noGc)),entry=join(root,'main-'+javascript+'-'+noGc+(javascript?'.js':'.ts')),reference=entry+'.reference.js',output=entry+'-program';await writeFile(entry,javascript?erase(source):source);await writeFile(reference,erase(partitions.replaceAll('COLLECT','false')));
   const node=nodeReferenceSync(['node','-e',vmOracle,reference],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
   const diagnostics:string[]=[],result=await compile({entry,output,buildDir:output+'-build',noGc,isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/generator-result-realm#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({code:result.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString());
  }
  for(const noGc of [false,true]){
   const source=generatorMethodOwnerInput(noGc?3:8192),entry=join(root,'depth-'+noGc+'.mts'),output=entry+'-program';await writeFile(entry,source);const node=nodeReferenceSync(['node','--input-type=module','-e',erase(source)],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
   const diagnostics:string[]=[],result=await compile({entry,output,buildDir:output+'-build',noGc,diagnosticWriter:message=>diagnostics.push(message)});expect({code:result.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:node.stdout.toString()});
  }
 }finally{await rm(root,{recursive:true,force:true})}
},900000);

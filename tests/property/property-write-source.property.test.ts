import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {parseHostObservation} from '../test262/protocol';
import {nodeReferenceSync} from './node-reference';

const definitions=[
 'const owner={read:()=>"17;"};',
 'const owner={};owner.read=()=>"17;";',
 'const owner={};Object.defineProperty(owner,"read",{value:()=>"17;",writable:true,configurable:true});',
];
const captures=['owner.read','owner["read"]','Object.getOwnPropertyDescriptor(owner,"read").value','Object.getOwnPropertyDescriptors(owner).read.value','(()=>owner.read)()'];
const writes=['owner.read=()=>"19;";','Object.defineProperty(owner,"read",{value:()=>"19;",writable:true,configurable:true});'];
const deletes=['delete owner.read;','Reflect.deleteProperty(owner,"read");'];
const snapshots=definitions.flatMap(definition=>captures.flatMap(capture=>writes.map(write=>definition+'const saved='+capture+';'+write+'print(eval(saved()));')));
snapshots.push(...captures.flatMap(capture=>deletes.map(remove=>'const owner=Object.create({read:()=>"23;"});owner.read=()=>"17;";const saved='+capture+';'+remove+'print(eval(saved()));')));
snapshots.push('const owner={read:()=>"17;"};function capture(owner){return owner.read;}const saved=capture(owner);owner.read=()=>"19;";print(eval(saved()));');
snapshots.push('const owner={get read(){return ()=>"17;"}};const saved=Object.getOwnPropertyDescriptor(owner,"read").get;Object.defineProperty(owner,"read",{get(){return ()=>"19;"}});print(eval(saved.call(owner)()));');
function reference(source:string):string {
 const result=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(process.argv[1]).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});',source],{stdout:'pipe',stderr:'pipe',timeout:30_000});
 expect({code:result.exitCode,stderr:result.stderr.toString()}).toEqual({code:0,stderr:''});return result.stdout.toString();
}
test('known property writes retain completion provenance through aliases and descriptor snapshots',()=>{
 const combined=snapshots.map(source=>'{'+source+'}').join('\n');
 expect(reference(combined)).toBe(snapshots.map(()=> '17\n').join(''));
 for(const source of snapshots){
  const graph=finiteEvalScriptSourceGraph([{path:'subject.js',source}]);
  expect({source,error:graph.error,sources:graph.directEvalSources.map(entry=>entry.source).sort()}).toEqual({source,error:null,sources:['17;']});
 }
});
test('write completion filtering remains conservative for repeated and suspended activations',()=>{
 const sources=[
  'const owner={read:()=>"17;"};let saved;for(let index=0;index<2;index++){saved=owner.read;owner.read=()=>"19;";}print(eval(saved()));',
  'const owner={read:()=>"17;"};async function read(){await 0;print(eval(owner.read()));}read();owner.read=()=>"19;";',
  'const owner={read:()=>"17;"};function read(){print(eval(owner.read()));}read();owner.read=()=>"19;";read();',
 ];
 for(const source of sources){
  const expected=reference(source).trim().split('\n').map(value=>value+';'),graph=finiteEvalScriptSourceGraph([{path:'subject.js',source}]);
  expect({source,error:graph.error}).toEqual({source,error:null});
  for(const value of expected)expect(graph.directEvalSources.map(entry=>entry.source)).toContain(value);
 }
 for(const prefix of ['owner.read=external;','opaque(owner);']){
  const graph=finiteEvalScriptSourceGraph([{path:'unknown.js',source:'const owner={read:()=>"17;"};'+prefix+'const saved=owner.read;eval(saved());'}]);
  expect(graph.error).toContain('direct eval source is not a finite static string expression');
 }
});
test('delete visibility retains real repeated and suspended prototype alternatives',()=>{
 for(const source of [
  'const owner=Object.create({read:()=>"23;"});owner.read=()=>"17;";function read(){print(eval(owner.read()));}read();delete owner.read;read();',
  'const owner=Object.create({read:()=>"23;"});owner.read=()=>"17;";for(let index=0;index<2;index++){print(eval(owner.read()));delete owner.read;}',
  'const owner=Object.create({read:()=>"23;"});owner.read=()=>"17;";async function read(){await 0;print(eval(owner.read()));}read();delete owner.read;',
 ]){
  const expected=reference(source).trim().split('\n').map(value=>value+';'),graph=finiteEvalScriptSourceGraph([{path:'subject.js',source}]);
  expect(graph.error).toBeNull();for(const value of expected)expect(graph.directEvalSources.map(entry=>entry.source)).toContain(value);
 }
});
test('known write provenance follows declared Script initialization order',()=>{
 for(const prior of [false,true]){
  const scripts=['globalThis.owner={read:()=>"17;"};',...(prior?['globalThis.owner.read=()=>"19;";','const saved=globalThis.owner.read;eval(saved());']:['const saved=globalThis.owner.read;eval(saved());','globalThis.owner.read=()=>"19;";'])];
  const source=scripts.join('\n').replace('eval(saved());','print(eval(saved()));');
  const expected=reference(source).trim()+';',graph=finiteEvalScriptSourceGraph(scripts.map((source,index)=>({path:'script-'+index+'.js',source,goal:'script'})));
  expect(graph.error).toBeNull();expect(graph.directEvalSources.map(entry=>entry.source)).toContain(expected);
  if(!prior)expect(graph.directEvalSources.map(entry=>entry.source)).toEqual(['17;']);
 }
});
test('retained write snapshots match Node through one deep owner graph in both memory modes',async()=>{
 const depth=512,source=snapshots.map(source=>'{'+source+'}').join('\n')+'\n'+
  'const root={read:()=>"23;"};let graph=root;for(let depth=0;depth<'+depth+';depth++)graph={next:graph};let selected=graph;for(let depth=0;depth<'+depth+';depth++)selected=selected.next;const saved=selected.read;root.read=()=>"29;";if(NATIVE_GC)$262.gc();print(eval(saved()));';
 const expected=reference(source.replaceAll('NATIVE_GC','false'));expect(expected.endsWith('23\n')).toBe(true);
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-property-write-source-'));
 try{for(const noGc of [false,true]){
  const entry=path.join(directory,'source.js'),output=path.join(directory,'program-'+noGc),diagnostics:string[]=[];
  await fs.writeFile(entry,source.replaceAll('NATIVE_GC',String(!noGc)));
  const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build-'+noGc),isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/property-write-source.js#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(expected);
 }}finally{await fs.rm(directory,{recursive:true,force:true});}
},600_000);

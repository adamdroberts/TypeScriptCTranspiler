import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';
import {parseHostObservation} from '../test262/protocol';

const marker='SCOPE_UNUSED_BODY';
function nativeReference(source:string,extension:string):string {
 const javascript=extension==='.ts'?ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText:source;
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});'],{stdin:Buffer.from(javascript),stdout:'pipe',stderr:'pipe',timeout:30000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});return node.stdout.toString();
}
function typedSource():string {
 const depth=512;
 const declarations=Array.from({length:depth},(_,index)=>'function link'+index+'(): number { return '+(index?'link'+(index-1)+'()+1':'1')+'; }').reverse().join('\n');
 return `const output: (value:any)=>void = (globalThis as any).print;let effects = 0;
function run(): number {
 const scope_unused_local = (effects += 1);
 function drop(): void { output('${marker}'); }
 class Dropped { constructor() { output('${marker}'); } }
 ${declarations}
 return link${depth-1}();
}
function selected(value:number): number { 'use strict'; switch(value) {case 0: return later(); case 1: function later(): number { return 31; }} return 0; }
output(run());output(effects);output(selected(0));output('scope-complete');`;
}
const subjects=[
 {name:'typed',source:typedSource(),extension:'.ts',prune:true},
 {name:'source-text',source:`function run(){ function drop(){ print('${marker}'); } return 17; } print(run());print(run.toString());function tdz(){try{const result=value;let value=1;return false;}catch(error){return error instanceof ReferenceError;}}print(tdz());print('scope-complete');`,extension:'.js',prune:true},
 {name:'shared-bindings',source:"function merged(value){function value(){return 37;}return value();}function selected(){function value(){return 41;}function value(){return 43;}return value();}print(merged(null));print(selected());print('scope-complete');",extension:'.js',prune:true},
 {name:'dynamic',source:"function run(){function lookup(){return 19;}const captured=23;return eval('lookup()+captured');}print(run());print('scope-complete');",extension:'.js',prune:false},
];
test('scope allocation follows declaration reachability while preserving source text and dynamic lookup',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-scope-declarations-'));
 try{for(const subject of subjects){
  const expected=nativeReference(subject.source,subject.extension);expect(expected.endsWith('scope-complete\n')).toBe(true);
  for(const noGc of [false,true]){
   const entry=join(directory,subject.name+subject.extension),output=join(directory,subject.name+'-'+noGc),diagnostics:string[]=[];await writeFile(entry,subject.source);
   const result=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/scope-declarations#script',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({name:subject.name,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({name:subject.name,exitCode:0,diagnostics:''});
   if(subject.prune)expect(result.mainC).not.toContain('tsc_str_from_lit("'+marker+'",');
   if(subject.name==='typed')expect(result.mainC).not.toContain('_scope_lex_scope_unused_local');
   if(subject.name==='source-text')expect(result.mainC).toContain(marker);
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({name:subject.name,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({name:subject.name,exitCode:0,stderr:''});const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(expected);
  }
 }}finally{await rm(directory,{recursive:true,force:true});}
},600000);

test('unreferenced global declarations retain instantiation errors',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-scope-global-instantiation-'));
 try{
  const setup=join(directory,'setup.js'),entry=join(directory,'main.js');
  await writeFile(setup,'Object.defineProperty(globalThis,"unread",{value:17,configurable:false});');
  await writeFile(entry,'const unread=19;print("unreachable");');
  const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm"),context=vm.createContext({print:value=>fs.writeSync(1,String(value)+"\\n")});new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInContext(context);try{new vm.Script(fs.readFileSync(process.argv[2],"utf8")).runInContext(context);throw new Error("missing instantiation error");}catch(error){if(error.name!=="SyntaxError")throw error;fs.writeSync(1,"SyntaxError\\n");}',setup,entry],{stdout:'pipe',stderr:'pipe',timeout:30000});
  expect({exitCode:node.exitCode,stdout:node.stdout.toString(),stderr:node.stderr.toString()}).toEqual({exitCode:0,stdout:'SyntaxError\n',stderr:''});
  for(const noGc of [false,true]){
   const output=join(directory,'program-'+noGc),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,buildDir:output+'-build',additionalRoots:[setup],isolatedScriptRoots:[setup,entry],initializationEntries:[setup,entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/scope-instantiation#script',setupEntries:[setup],testEntry:entry,scriptEntries:[setup,entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed).toMatchObject({kind:'throw',errorConstructor:'SyntaxError'});expect(observed.stdout??'').toBe('');
  }
 }finally{await rm(directory,{recursive:true,force:true});}
},300000);

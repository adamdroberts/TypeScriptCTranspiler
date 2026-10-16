import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sourceConstructorFacts,sourceConstructorInvocations} from '../../src/source-value-flow';
import {finiteFunctionConstructorSources} from '../../src/function-constructor-source';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';
import {parseHostObservation} from '../test262/protocol';

function program(source:string){
 const options:ts.CompilerOptions={noLib:true,allowJs:true,noEmit:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);
 host.getSourceFile=file=>file==='/subject.js'?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;host.readFile=file=>file==='/subject.js'?source:undefined;host.fileExists=file=>file==='/subject.js';return ts.createProgram(['/subject.js'],options,host);
}
function reference(source:string):string{
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({flag:true,limit:0,external(){throw "unreachable external";},print:v=>fs.writeSync(1,String(v)+"\\n")});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});return node.stdout.toString();
}
const kinds=[['ordinary','Function'],['generator','(function*(){}).constructor'],['async','(async function(){}).constructor'],['async-generator','(async function*(){}).constructor']] as const;
test('constructor domains retain known arguments independently of an exhaustive source proof',()=>{
 for(const [kind,constructor]of kinds)for(const uncertain of ['parameter','body','both']){
  const source='const parameter='+(uncertain==='body'?'"value"':'flag?"value":external()')+';const body='+(uncertain==='parameter'?'"return value;"':'flag?"return value;":external()')+';const make='+constructor+';make(parameter,body);';
  const actual=JSON.parse(reference(source+'print(JSON.stringify([parameter,body]));'));expect(actual).toEqual(['value','return value;']);
  const model=program(source),entries={roots:['/subject.js']},facts=sourceConstructorFacts(model,entries).find(value=>value.kind===kind)!;
  expect(facts.complete).toBe(false);for(const [index,value]of actual.entries())expect(facts.arguments?.[index]).toContain(value);
  expect(sourceConstructorInvocations(model,entries).some(value=>value.kind===kind&&value.choices===null)).toBe(true);
  expect(finiteFunctionConstructorSources(model,[],entries)).toContainEqual({kind,parameters:'value',body:'return value;'});
 }
 for(const source of ['const make=Function;make(...external());','Function(external());']){
  const model=program(source),entries={roots:['/subject.js']};expect(sourceConstructorInvocations(model,entries).every(value=>value.choices===null)).toBe(true);expect(finiteFunctionConstructorSources(model,[],entries)).toEqual([]);
 }
 const cyclic='let body=flag?"return 31;":external();for(let index=0;index<limit;index++)body=body+" ";Function(body);';
 expect(reference(cyclic+'print(body);')).toBe('return 31;\n');const model=program(cyclic),entries={roots:['/subject.js']};expect(sourceConstructorInvocations(model,entries).some(value=>value.choices===null)).toBe(true);expect(sourceConstructorFacts(model,entries).some(value=>value.arguments?.[0]?.includes('return 31;'))).toBe(true);
});
function nativeSource():string{
 const parameters=Array.from({length:512},(_,index)=>JSON.stringify('value'+index));
 return 'const token=/.*/.exec("known")[0];const body=token==="known"?"return 37;":"return "+String(Math.random())+";";const owner0={body};'+Array.from({length:512},(_,index)=>'const owner'+(index+1)+'={previous:owner'+index+'};').join('\n')+
 '\nconst make=Function('+[...parameters,'owner512.previous'+'.previous'.repeat(511)+'.body'].join(',')+');COLLECT print(make());print(make.length);print("constructor-domain-complete");';
}
test('known constructor source through one retained input graph matches complete Node and native output',async()=>{
 const source=nativeSource(),expected=reference(source.replace('COLLECT',''));expect(expected).toBe('37\n512\nconstructor-domain-complete\n');
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-constructor-domain-native-'));
 try{for(const noGc of [false,true]){
  const entry=join(directory,'subject.js'),output=join(directory,'program-'+noGc),diagnostics:string[]=[];await writeFile(entry,source.replace('COLLECT',noGc?'':'$262.gc();'));
  const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/constructor-source-domain.js#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({exitCode:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(expected);
 }}finally{await rm(directory,{recursive:true,force:true});}
},900000);
test('retaining a known source does not authorize an unknown runtime source',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-constructor-domain-guard-'));
 try{for(const noGc of [false,true]){
  const source='const token=/.*/.exec("dynamic")[0];const body=token==="known"?"return 31;":"return "+String(Math.random())+";";Function(body)();';expect(reference(source.replace('Function(body)();','const value=Function(body)();print(typeof value==="number"&&value>=0&&value<1);'))).toBe('true\n');const entry=join(directory,'subject.js'),output=join(directory,'program-'+noGc),diagnostics:string[]=[];await writeFile(entry,source);
  const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/constructor-source-domain-guard.js#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({exitCode:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});expect(parseHostObservation(JSON.parse(native.stdout.toString()))).toMatchObject({kind:'throw',phase:'runtime',errorConstructor:'EvalError'});
 }}finally{await rm(directory,{recursive:true,force:true});}
},600000);

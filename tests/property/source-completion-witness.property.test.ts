import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';
import {parseHostObservation} from '../test262/protocol';
function reference(source:string):string{
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({require,console:{log:(...values)=>fs.writeSync(1,require("node:util").format(...values)+"\\n")},print:v=>fs.writeSync(1,String(v)+"\\n")});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});return node.stdout.toString();
}
test('completion witnesses preserve failed arguments, later normal alternatives and concrete source values',()=>{
 const none='function consume(value){return String(Math.random());}try{eval(consume(1n/0n));}catch(error){print(eval("17;"));}';
 expect(reference(none)).toBe('17\n');expect(graph([{path:'subject.js',source:none}]).error).toBeNull();
 const alternatives='function consume(value){print(eval("19;"));}function divide(value){return 1n/value;}for(const value of [0n,1n]){try{consume(divide(value));}catch(error){print("range");}}';
 expect(reference(alternatives)).toBe('range\n19\n');const result=graph([{path:'subject.js',source:alternatives}]);expect(result.error).toBeNull();expect(result.directEvalSources.map(value=>value.source)).toContain('19;');
 const effect='let body="17;";const value={valueOf(){body="19;";throw 0;}};try{+value;}catch(error){}print(eval(body));';
 expect(reference(effect)).toBe('19\n');const effects=graph([{path:'subject.js',source:effect}]);expect(effects.error).toBeNull();expect(effects.directEvalSources.map(value=>value.source)).toContain('19;');
 const concrete='const format=require("node:util").format;for(const value of [17,19])print(eval(format("%s;",value)));';
 expect(reference(concrete)).toBe('17\n19\n');const formatted=graph([{path:'subject.js',source:concrete}]);expect(formatted.error).toBeNull();expect(new Set(formatted.directEvalSources.map(value=>value.source))).toEqual(new Set(['17;','19;']));
 for(const source of [
  'function consume(value){return String(Math.random());}eval(consume(1n/1n));',
  'let body="17;";const value={toString(){body=String(Math.random());return "item";}};console.log(value);eval(body);',
 ])expect(graph([{path:'subject.js',source}]).error).toContain('direct eval source is not a finite static string expression');
});
function program():string{
 const arguments_=Array.from({length:512},(_,index)=>'select('+Boolean(index%2)+')').join(',');
 return 'function select(value){return value?"left":"right";}COLLECT console.log("completion-stress",'+arguments_+');print(eval("31;"));print("completion-complete");';
}
test('one wide normal-result graph matches complete independent Node and native output',async()=>{
 const source=program(),expected=reference(source.replace('COLLECT',''));expect(expected.startsWith('completion-stress ')).toBe(true);expect(expected.endsWith('31\ncompletion-complete\n')).toBe(true);
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-completion-witness-native-'));
 try{for(const noGc of [false,true]){
  const entry=join(directory,'subject.js'),output=join(directory,'program-'+noGc),diagnostics:string[]=[];await writeFile(entry,source.replace('COLLECT',noGc?'':'$262.gc();'));
  const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/source-completion-witness.js#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:m=>diagnostics.push(m)});
  expect({exitCode:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(expected);
 }}finally{await rm(directory,{recursive:true,force:true});}
},600000);

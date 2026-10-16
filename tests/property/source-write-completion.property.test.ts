import {expect,test} from 'bun:test';import ts from 'typescript';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';import {sourceEvaluationInvocations} from '../../src/source-value-flow';import {nodeReferenceSync} from './node-reference';
import {compile} from '../../src/compile';import {parseHostObservation} from '../test262/protocol';import {mkdtemp,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
const original='{let code="17;",saved="";code=(saved=code,String(Math.random())+";");print(eval(saved));print("rhs-complete");}';
function reference(sources:readonly string[],setup=''):string{
 const script='const fs=require("node:fs"),vm=require("node:vm"),context=vm.createContext({print:value=>{fs.writeSync(1,String(value)+"\\n");}});new vm.Script('+JSON.stringify(setup)+').runInContext(context);for(const source of JSON.parse(fs.readFileSync(0,"utf8")))new vm.Script(source).runInContext(context);';
 const node=nodeReferenceSync(['node','-e',script],{stdin:Buffer.from(JSON.stringify(sources)),stdout:'pipe',stderr:'pipe',timeout:30000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});return node.stdout.toString();
}
function evaluations(files:ReadonlyMap<string,string>,roots:readonly string[]){
 const options={allowJs:true,noLib:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);host.getSourceFile=file=>files.has(file)?ts.createSourceFile(file,files.get(file)!,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;host.readFile=file=>files.get(file);host.fileExists=file=>files.has(file);return sourceEvaluationInvocations(ts.createProgram([...files.keys()],options,host),{roots});
}
test('store completion preserves the original RHS value without suppressing earlier reference effects or repeated writes',()=>{
 expect(reference([original])).toBe('17\nrhs-complete\n');const result=graph([{path:'subject.js',source:original}]);expect(result.error).toBeNull();expect(result.directEvalSources.map(entry=>entry.source)).toContain('17;');
 const late=original.replace('code=(saved=code,String(Math.random())+";");','code=String(Math.random())+";";saved=code;');expect(reference([late],'Math.random=()=>19;')).toBe('19\nrhs-complete\n');expect(graph([{path:'subject.js',source:late}]).error).toContain('direct eval source is not a finite static string expression');
 const loop=original.replace('code=(saved=code,String(Math.random())+";");','for(let index=0;index<2;index++)code=(saved=code,String(Math.random())+";");');expect(reference([loop],'Math.random=()=>19;')).toBe('19\nrhs-complete\n');expect(graph([{path:'subject.js',source:loop}]).error).toContain('direct eval source is not a finite static string expression');
 const key='{let code="17;",saved="";const target={};function key(){code=String(Math.random())+";";return "slot";}target[key()]=(saved=code,0);print(eval(saved));print("reference-complete");}';expect(reference([key],'Math.random=()=>19;')).toBe('19\nreference-complete\n');expect(graph([{path:'subject.js',source:key}]).error).toContain('direct eval source is not a finite static string expression');
 const repeated='var code;if(code===undefined)code="17;";var saved;code=(saved=code,String(Math.random())+";");print(eval(saved));';expect(reference([repeated,repeated],'Math.random=()=>19;')).toBe('17\n19\n');expect(evaluations(new Map([['/subject.js',repeated]]),['/subject.js','/subject.js']).some(entry=>entry.choices===null)).toBe(true);
});
test('Script root ranges preserve effects before a read and exclude effects entirely after it',()=>{
 const writer='var code=String(Math.random())+";";',reader='print(eval(code));',seed='var code="17;";',files=new Map([['/writer.js',writer],['/reader.js',reader],['/seed.js',seed]]);
 expect(reference([writer,reader,writer],'Math.random=()=>19;')).toBe('19\n');expect(evaluations(files,['/writer.js','/reader.js','/writer.js']).some(entry=>entry.choices===null)).toBe(true);
 expect(reference([seed,reader,writer,writer],'Math.random=()=>19;')).toBe('17\n');expect(evaluations(files,['/seed.js','/reader.js','/writer.js','/writer.js']).filter(entry=>entry.operation==='eval').map(entry=>entry.choices)).toEqual([['17;']]);
});
function retained():string{let expression='String(Math.random())+";"';for(let index=0;index<512;index++)expression='code=('+expression+')';return '{let code="17;",saved="";code=(saved=code,'+expression+');COLLECT print(eval(saved));print("rhs-complete");}';}
test('the unchanged RHS counterexample and one assignment tree match complete Node in both memory modes',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-write-completion-'));
 try{for(const [index,source]of [original,retained()].entries()){const expected=reference([source.replace('COLLECT','')]);expect(expected).toBe('17\nrhs-complete\n');for(const noGc of [false,true]){
  const entry=join(directory,'subject-'+index+'.js'),output=join(directory,'program-'+index+'-'+noGc),diagnostics:string[]=[];await writeFile(entry,source.replace('COLLECT',noGc?'':'$262.gc();'));const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/write-completion#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(parseHostObservation(JSON.parse(native.stdout.toString()))).toMatchObject({kind:'normal',stdout:expected});
 }}}finally{await rm(directory,{recursive:true,force:true});}
},900000);

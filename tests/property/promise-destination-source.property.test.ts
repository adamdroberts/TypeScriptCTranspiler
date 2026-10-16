import {expect,test} from 'bun:test';
import ts from 'typescript';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const originals:readonly string[]=["{const state={body:\"17;\"};const attach=Promise.prototype.then;const capability=Promise.withResolvers();attach.call(capability.promise,undefined,()=>{print(eval(state.body));print(\"self-resolution-complete\");});Object.defineProperty(capability.promise,\"then\",{get(){state.body=String(Math.random())+\";\";return undefined;}});capability.resolve(capability.promise);}", "{const state={body:\"17;\"};const attach=Promise.prototype.then;let task;task=Promise.resolve(0).then(()=>task);Object.defineProperty(task,\"then\",{get(){state.body=String(Math.random())+\";\";return undefined;}});attach.call(task,undefined,()=>{print(eval(state.body));print(\"self-resolution-complete\");});}"];
const metadata='{const capability=Promise.withResolvers();Object.defineProperty(capability.resolve,"name",{value:"99;"});capability.resolve({then(resolve){print(eval(resolve.name+"17;"));print("resolver-metadata-complete");resolve(0);}});}';
function reference(source:string):string{
 const script='const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({print:value=>{fs.writeSync(1,String(value)+"\\n");}});';
 const node=nodeReferenceSync(['node','-e',script],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});
 expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});return node.stdout.toString();
}
test('self-resolution rejects before Get(then), with conservative repeated allocations and distinct resolver metadata',()=>{
 for(const source of originals){expect(reference(source)).toBe('17\nself-resolution-complete\n');const result=graph([{path:'subject.js',source}]);expect(result.error).toBeNull();expect(result.directEvalSources.map(entry=>entry.source)).toEqual(['17;']);}
 expect(reference(metadata)).toBe('17\nresolver-metadata-complete\n');const result=graph([{path:'subject.js',source:metadata}]);expect(result.error).toBeNull();expect(result.directEvalSources.map(entry=>entry.source)).toEqual(['17;']);
 // A shared factory allocation can denote distinct actual Promises. Its
 // target identity cannot suppress a genuine then getter effect.
 for(const factory of [false,true]){
  const source='{'+(factory?'function make(){return Promise.withResolvers();}const first=make(),second=make();':'const first=Promise.withResolvers(),second=Promise.withResolvers();')+'const state={body:"17;"};Object.defineProperty(second.promise,"then",{get(){state.body=String(Math.random())+";";return undefined;}});first.resolve(second.promise);Promise.prototype.then.call(first.promise,()=>{print(eval(state.body));print("different-promise-complete");});}';
  expect(reference('Math.random=()=>19;'+source)).toBe('19\ndifferent-promise-complete\n');expect(graph([{path:'subject.js',source}]).error).toContain('direct eval source is not a finite static string expression');
 }
});
test('repeated Script allocation retains the possible distinct-Promise resolution path',()=>{
 const source="var current=Promise.withResolvers();var previous;var state={body:\"17;\"};if(previous!==undefined){Object.defineProperty(current.promise,\"then\",{get(){state.body=String(Math.random())+\";\";return undefined;}});previous.resolve(current.promise);Promise.prototype.then.call(previous.promise,()=>{print(eval(state.body));print(\"repeated-promise-complete\");});}previous=current;";
 const script='const fs=require("node:fs"),vm=require("node:vm"),context=vm.createContext({print:value=>{fs.writeSync(1,String(value)+"\\n");}});new vm.Script("Math.random=()=>19;").runInContext(context);for(const source of JSON.parse(fs.readFileSync(0,"utf8")))new vm.Script(source).runInContext(context);';
 const node=nodeReferenceSync(['node','-e',script],{stdin:Buffer.from(JSON.stringify([source,source])),stdout:'pipe',stderr:'pipe',timeout:30000});expect({code:node.exitCode,stderr:node.stderr.toString(),stdout:node.stdout.toString()}).toEqual({code:0,stderr:'',stdout:'19\nrepeated-promise-complete\n'});
 const file='/subject.js',options={allowJs:true,noLib:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);host.getSourceFile=name=>name===file?ts.createSourceFile(name,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;host.readFile=name=>name===file?source:undefined;host.fileExists=name=>name===file;
 const entries=sourceEvaluationInvocations(ts.createProgram([file],options,host),{roots:[file,file]});expect(entries.filter(entry=>entry.operation==='eval').map(entry=>entry.choices)).toEqual([null]);
});
function retained():string{
 return '{const state={body:"17;"};const attach=Promise.prototype.then;const capability=Promise.withResolvers();attach.call(capability.promise,undefined,()=>{print(eval(state.body));print("self-resolution-complete");});Object.defineProperty(capability.promise,"then",{get(){state.body=String(Math.random())+";";return undefined;}});let value=capability.promise;for(let index=0;index<512;index++){const next=value;value={then(resolve){resolve(next);}};}COLLECT capability.resolve(value);}';
}
test('unchanged self-resolution counterexamples, resolver metadata and one retained thenable graph match complete Node in both memory modes',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-promise-destination-'));
 try{for(const [index,source]of [...originals,metadata,retained()].entries()){
  const expected=reference(source.replace('COLLECT',''));expect(expected).toBe(index===originals.length?'17\nresolver-metadata-complete\n':'17\nself-resolution-complete\n');
  for(const noGc of [false,true]){
   const entry=join(directory,'subject-'+index+'.js'),output=join(directory,'program-'+index+'-'+noGc),diagnostics:string[]=[];
   await writeFile(entry,source.replace('COLLECT',noGc?'':'$262.gc();'));
   const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/promise-destination#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});
   expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(parseHostObservation(JSON.parse(native.stdout.toString()))).toMatchObject({kind:'normal',stdout:expected});
  }
 }}finally{await rm(directory,{recursive:true,force:true});}
},900000);

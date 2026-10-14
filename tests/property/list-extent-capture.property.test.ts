import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {sourceConstructorInvocations} from '../../src/source-value-flow';
import {listExtentCaptureInput} from '../e2e/generated-cases';
import {parseHostObservation} from '../test262/protocol';

function facts(source:string){
 const options:ts.CompilerOptions={noLib:true,allowJs:true,noEmit:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);
 host.getSourceFile=file=>file==='/model.js'?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>file==='/model.js'?source:undefined;host.fileExists=file=>file==='/model.js';
 return sourceConstructorInvocations(ts.createProgram(['/model.js'],options,host),{roots:['/model.js']});
}

test('List extents and elements share caller captures and recursive timing remains opaque',()=>{
 for(const route of ['Function(...alternate)','Function.apply(null,[...alternate])']){
  const observed=facts(`const alternate=flag?['return 17;']:['return 19;'];${route};async function* later(){yield 1}later().next();`);
  expect(observed).toHaveLength(1);expect(observed[0]!.choices).toEqual([expect.arrayContaining(['return 17;','return 19;'])]);
 }
 expect(facts("function read(...tail){return Function(...tail)}read('return 17;');opaque();")).toEqual([{kind:'ordinary',choices:[['return 17;']]}]);
 for(const source of [
  "const alternate=flag?['return 17;']:['return 19;'];opaque(alternate);Function(...alternate);",
  "function read(){return Function(...list)}const list=['return 17;'];read();opaque(list);read();",
  "function read(){if(flag)read();return Function(...list)}const list=['return 17;'];read();opaque(list);",
  "function read(){return Function(...list)}const list=['return 17;'];function one(){if(flag)two();return read()}function two(){return one()}one();opaque(list);",
  "function read(){const list=['return 17;'];return Function(...list)}function one(){if(flag)two();return read()}function two(){return one()}opaque();one();",
  "async function read(){await 0;return Function(...list)}const list=['return 17;'];read();opaque(list);",
  "function* read(){yield 0;return Function(...list)}const list=['return 17;'];read();opaque(list);",
  "const list=['return 17;'];for(let index=0;index<2;index++){Function(...list);opaque(list)}",
 ])expect(facts(source).some(invocation=>invocation.choices===null)).toBe(true);
});

test('captured List sources match independent Node through ordinary native invocation',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-list-extent-capture-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const input=listExtentCaptureInput(typed&&!noGc?512:3),erased=ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}.js`),oracleOutput=oracle+'.stdout';await writeFile(oracle,erased);
  const node=Bun.spawnSync(['node',oracle],{stdout:Bun.file(oracleOutput),stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?input:erased);
  const result=await compile({entry,output,noGc,initializationEntries:[entry],buildDir:output+'-build',test262Observation:{kind:'test262-native-observation',scenarioId:'property/list-extent-capture.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(await readFile(oracleOutput,'utf8'));
 }}finally{await rm(root,{recursive:true,force:true})}
},900000);

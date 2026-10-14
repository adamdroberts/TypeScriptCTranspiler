import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {sourceConstructorInvocations} from '../../src/source-value-flow';
import {activationCaptureOwnerInput} from '../e2e/generated-cases';
import {parseHostObservation} from '../test262/protocol';

function facts(source:string){
 const options:ts.CompilerOptions={noLib:true,allowJs:true,noEmit:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);
 host.getSourceFile=file=>file==='/model.js'?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>file==='/model.js'?source:undefined;host.fileExists=file=>file==='/model.js';
 return sourceConstructorInvocations(ts.createProgram(['/model.js'],options,host),{roots:['/model.js']});
}

test('same activation capture composition preserves finite owners and uncertain timing',()=>{
 for(const prefix of ['function','async function']){
  const source=`${prefix} run(){const owner={body:'return 17;'};const saved={body:owner.body};${prefix.startsWith('async')?'await 0;':''}Function(saved.body)}run();`;
  expect(facts(source)).toEqual([{kind:'ordinary',choices:[['return 17;']]}]);
 }
 for(const source of [
  "async function run(){const owner={body:'return 17;'};const saved={body:owner.body};await 0;opaque(owner);Function(saved.body)}run();",
  "function* run(){const owner={body:'return 17;'};const saved={body:owner.body};yield 0;opaque(owner);Function(saved.body)}run().next();",
  "function run(){const owner={body:'return 17;'};const saved={body:owner.body};opaque(saved);Function(saved.body)}run();",
  "function run(){const owner={body:'return 17;'};for(let index=0;index<2;index++){const saved={body:owner.body};opaque(owner);Function(saved.body)}}run();",
  "function run(){const owner={body:'return 17;'};const saved={body:owner.body};if(flag)run();opaque(owner);Function(saved.body)}run();",
  "function read(){const owner={body:'return 17;'};const saved={body:owner.body};return Function(saved.body)}read();opaque();read();",
  "function read(){const owner={body:'return 17;'};const saved={body:owner.body};return Function(saved.body)}function one(){if(flag)two();return read()}function two(){return one()}one();opaque();",
 ])expect(facts(source).some(invocation=>invocation.choices===null)).toBe(true);
});

test('activation capture owner graph matches independent Node through native suspension',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-activation-capture-composition-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const input=activationCaptureOwnerInput(typed&&!noGc?512:3),erased=ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}.js`),oracleOutput=oracle+'.stdout';await writeFile(oracle,erased);
  const node=Bun.spawnSync(['node',oracle],{stdout:Bun.file(oracleOutput),stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?input:erased);
  const result=await compile({entry,output,noGc,initializationEntries:[entry],buildDir:output+'-build',test262Observation:{kind:'test262-native-observation',scenarioId:'property/activation-capture-composition.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(await readFile(oracleOutput,'utf8'));
 }}finally{await rm(root,{recursive:true,force:true})}
},900000);

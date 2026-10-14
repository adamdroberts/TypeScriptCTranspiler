import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {sourceConstructorInvocations} from '../../src/source-value-flow';
import {sourceAllocationInput} from '../e2e/generated-cases';
import {parseHostObservation} from '../test262/protocol';

function facts(source:string){
 const options:ts.CompilerOptions={noLib:true,allowJs:true,noEmit:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);
 host.getSourceFile=file=>file==='/model.js'?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>file==='/model.js'?source:undefined;host.fileExists=file=>file==='/model.js';
 return sourceConstructorInvocations(ts.createProgram(['/model.js'],options,host),{roots:['/model.js']});
}

test('owner creation excludes earlier effects and retains overlapping or unrepresented timing',()=>{
 for(const effect of ['opaque();','function prior(){opaque()}prior();'])for(const allocation of ["const owner={body:'return 17;'};constructor(owner.body);","const owner=['return 17;'];constructor(owner[0]);"]){
  expect(facts('const constructor=Function;'+effect+allocation)).toEqual([{kind:'ordinary',choices:[['return 17;']]}]);
 }
 expect(facts("const constructor=Function;opaque();function read(){const owner={body:'return 17;'};return constructor(owner.body)}read();")).toEqual([{kind:'ordinary',choices:[['return 17;']]}]);
 for(const source of [
  "const owner={body:'return 17;'};opaque(owner);constructor(owner.body);",
  "function prior(){opaque()}const owner={body:'return 17;',ignored:prior()};constructor(owner.body);",
  "function read(){const owner={body:'return 17;'};opaque(owner);return constructor(owner.body)}read();",
  "function read(){const owner={body:'return 17;'};return constructor(owner.body)}read();opaque();read();",
  "opaque();for(let index=0;index<2;index++){const owner={body:'return 17;'};constructor(owner.body)}",
  "opaque();async function read(){const owner={body:'return 17;'};return constructor(owner.body)}read();",
  "opaque();function* read(){const owner={body:'return 17;'};return constructor(owner.body)}read().next();",
  "function read(){const owner={body:'return 17;'};if(Math.random())read();return constructor(owner.body)}opaque();read();",
  "opaque();function owner(){}constructor(owner.body);",
 ])expect(facts('const constructor=Function;'+source).some(invocation=>invocation.choices===null)).toBe(true);
 // An earlier operation can replace an inherited callable even though it
 // cannot mutate an own element that has not yet been allocated.
 expect(facts("opaque();const owner=['return 17;'];Function.apply(null,owner);").some(invocation=>invocation.choices===null)).toBe(true);
});

test('fresh owner source values match independent Node through the native AOT graph',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-source-allocation-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const input=sourceAllocationInput(typed&&!noGc?512:3)+`\nconst constructor:any=Function;function prior():void{Math.random()}prior();const owner:any={body:'return 89;'};console.log('prior:',constructor(owner.body)());\nMath.random();function fresh():any{const local:any={body:'return 97;'};return constructor(local.body)}console.log('activation:',fresh()());\nconst mutable:any={value:0};let getterReads=0;Object.defineProperty(mutable,'value',{get(){getterReads++;return 101}});const unused=mutable.value;console.log('getter:',getterReads);const abruptOwner:any={value:0};Object.defineProperty(abruptOwner,'value',{get(){throw 'read'}});try{const ignored=abruptOwner.value}catch(error){console.log('abrupt:',error==='read')}\n`,erased=ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}.js`);await writeFile(oracle,erased);
  const oracleOutput=oracle+'.stdout',node=Bun.spawnSync(['node',oracle],{stdout:Bun.file(oracleOutput),stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?input:erased);
  const result=await compile({entry,output,noGc,initializationEntries:[entry],buildDir:output+'-build',test262Observation:{kind:'test262-native-observation',scenarioId:'property/source-allocation-origins.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(await readFile(oracleOutput,'utf8'));
 }}finally{await rm(root,{recursive:true,force:true})}
},900000);

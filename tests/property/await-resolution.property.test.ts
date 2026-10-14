import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {sourceConstructorInvocations} from '../../src/source-value-flow';
import {awaitResolutionInput} from '../e2e/generated-cases';
import {parseHostObservation} from '../test262/protocol';

function facts(source:string){
 const options:ts.CompilerOptions={noLib:true,allowJs:true,noEmit:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);
 host.getSourceFile=file=>file==='/model.js'?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>file==='/model.js'?source:undefined;host.fileExists=file=>file==='/model.js';
 return sourceConstructorInvocations(ts.createProgram(['/model.js'],options,host),{roots:['/model.js']});
}

test('await and intrinsic resolve share thenable resolution and constructor identity boundaries',()=>{
 for(const [source,body]of [
  ["async function f(){Function(await {then(resolve){resolve('return 149;')}})}f();",'return 149;'],
  ["async function f(){try{await {get then(){throw 'return 151;'}}}catch(body){Function(body)}}f();",'return 151;'],
  ["async function f(){try{await {then(){throw 'return 157;'}}}catch(body){Function(body)}}f();",'return 157;'],
  ["async function f(){try{await {then(resolve,reject){reject('return 163;')}}}catch(body){Function(body)}}f();",'return 163;'],
  ["const p=Promise.resolve('return 167;');p.then=function(resolve){resolve('return 173;')};async function f(){Function(await p)}f();",'return 167;'],
 ]as const)expect(facts(source)).toEqual([{kind:'ordinary',choices:[[body]]}]);
 for(const operation of ["Promise.resolve(p);","async function f(){await p}f();"])
  expect(facts("const list=['return 149;'];const p=Promise.resolve(0);p.then=function(){mutate(list)};"+operation+"Function(...list);")).toEqual([{kind:'ordinary',choices:[['return 149;']]}]);
 for(const operation of ["Promise.resolve(p);","async function f(){await p}f();"])
  expect(facts("const list=['return 149;'];const p=Promise.resolve(0);Object.defineProperty(p,'constructor',{get(){mutate(list);return Promise}});"+operation+"Function(...list);").some(value=>value.choices===null)).toBe(true);
 for(const source of ["const list=['return 149;'];async function f(){await {get then(){mutate(list);return undefined}};Function(...list)}f();","async function f(){Function(await runtimeInput)}f();","const list=['return 149;'];async function f(){await runtimeInput;Function(...list)}f();","const list=['return 149;'];Promise.resolve(runtimeInput);Function(...list);"])
  expect(facts(source).some(value=>value.choices===null)).toBe(true);
});

test('await resolution matches independent Node through native source invocation',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-await-resolution-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const input=awaitResolutionInput(typed&&!noGc?512:3)+`
async function verifyAwait():Promise<void>{
 const primitive:any='return 151;';console.log('primitive:',Function(await primitive)());
 const thenable:any={then(resolve:any){console.log('then receiver:',this===thenable);resolve('return 157;')}};console.log('thenable:',Function(await thenable)());
 const rejected:any[]=[{get then(){throw 'return 163;'}},{then(){throw 'return 167;'}},{then(resolve:any,reject:any){reject('return 173;')}}];for(const value of rejected){try{await value}catch(body:any){console.log('rejection:',Function(body)())}}
 const patched:any=Promise.resolve('return 179;');patched.then=function(){throw 'then poison'};console.log('identity:',Promise.resolve(patched)===patched);console.log('intrinsic await:',Function(await patched)());
 const converted:any=Promise.resolve(0);Object.defineProperty(converted,'constructor',{value:{}});converted.then=function(resolve:any){console.log('converted receiver:',this===converted);resolve('return 181;')};console.log('converted:',Function(await converted)());
 const getter:any=Promise.resolve('return 191;');Object.defineProperty(getter,'constructor',{get(){console.log('constructor getter');return Promise}});console.log('constructor:',Function(await getter)());
 const marker:any={then:0};console.log('noncallable then:',await marker===marker);
 const error:any={};const poisoned:any=Promise.resolve(0);Object.defineProperty(poisoned,'constructor',{get(){throw error}});try{await poisoned}catch(thrown){console.log('constructor throw:',thrown===error)}
}verifyAwait();
`,erased=ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}.js`),oracleOutput=oracle+'.stdout';await writeFile(oracle,erased);
  const node=Bun.spawnSync(['node',oracle],{stdout:Bun.file(oracleOutput),stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?input:erased);
  const result=await compile({entry,output,noGc,initializationEntries:[entry],buildDir:output+'-build',test262Observation:{kind:'test262-native-observation',scenarioId:'property/await-resolution.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(await readFile(oracleOutput,'utf8'));
 }}finally{await rm(root,{recursive:true,force:true})}
},900000);

import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {sourceConstructorInvocations} from '../../src/source-value-flow';
import {asyncReturnAdoptionInput} from '../e2e/generated-cases';
import {parseHostObservation} from '../test262/protocol';

function facts(source:string){
 const options:ts.CompilerOptions={noLib:true,allowJs:true,noEmit:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);
 host.getSourceFile=file=>file==='/model.js'?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>file==='/model.js'?source:undefined;host.fileExists=file=>file==='/model.js';
 return sourceConstructorInvocations(ts.createProgram(['/model.js'],options,host),{roots:['/model.js']});
}

test('async return adoption retains source values, rejection and observable then lookup',()=>{
 const cases=[
  ["async function f(){return Promise.resolve('return 101;')}f().then(body=>Function(body));",'return 101;'],
  ["async function f(value){return value}f('return 103;').then(body=>Function(body));",'return 103;'],
  ["async function f(){return {then(resolve){resolve('return 107;')}}}f().then(body=>Function(body));",'return 107;'],
  ["async function f(){return Promise.reject('return 109;')}f().catch(body=>Function(body));",'return 109;'],
  ["async function f(){throw 'return 113;'}f().catch(body=>Function(body));",'return 113;'],
  ["const p=Promise.resolve(0);p.then=function(resolve){resolve('return 127;')};async function f(){return p}f().then(body=>Function(body));",'return 127;'],
  ["const p=Promise.resolve(0);Object.defineProperty(p,'then',{get(){throw 'return 131;'}});async function f(){return p}f().catch(body=>Function(body));",'return 131;'],
  ["async function f(value){return value}const first=f('return 137;');f(0);first.then(body=>Function(body));",'return 137;'],
 ] as const;
 for(const [source,body]of cases)expect(facts(source)).toEqual([{kind:'ordinary',choices:[[body]]}]);
 for(const hook of ["p.then=function(){mutate(list)};","Object.defineProperty(p,'then',{get(){mutate(list);return undefined}});","Object.defineProperty(p,'constructor',{get(){mutate(list);return Promise}});","Object.defineProperty(p,'constructor',{value:{get [Symbol.species](){mutate(list);return Promise}}});"])
  expect(facts("const list=['return 101;'];const p=Promise.resolve(0);"+hook+"async function f(){return p}f();Function(...list);").some(value=>value.choices===null)).toBe(true);
 expect(facts("async function f(value){return value}f(runtimeInput).then(body=>Function(body));").some(value=>value.choices===null)).toBe(true);
 expect(facts("async function f(value){return value}const first=f('return 137;');f(runtimeInput);first.then(body=>Function(body));").some(value=>value.choices===null)).toBe(true);
});

test('async adoption source owners match independent Node and native invocation',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-async-return-adoption-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const input=asyncReturnAdoptionInput(typed&&!noGc?512:3)+`
async function returned(value:any):Promise<any>{return value}
returned('return 103;').then(body=>console.log('primitive:',Function(body)()));
returned({then(resolve:any){resolve('return 107;')}}).then(body=>console.log('thenable:',Function(body)()));
returned(Promise.reject('return 109;')).catch(body=>console.log('rejected:',Function(body)()));
async function thrown():Promise<any>{throw 'return 113;'}thrown().catch(body=>console.log('throw:',Function(body)()));
const customized:any=Promise.resolve(0);customized.then=function(resolve:any){console.log('custom receiver:',this===customized);resolve('return 127;')};
returned(customized).then(body=>console.log('custom:',Function(body)()));
const poisoned:any=Promise.resolve(0);Object.defineProperty(poisoned,'then',{get(){console.log('then getter');throw 'return 131;'}});
returned(poisoned).catch(body=>console.log('getter rejection:',Function(body)()));
const speciesPromise:any=Promise.resolve('return 137;');Object.defineProperty(speciesPromise,'constructor',{value:{get [Symbol.species](){console.log('species getter');return Promise}}});
returned(speciesPromise).then(body=>console.log('species:',Function(body)()));
`,erased=ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}.js`),oracleOutput=oracle+'.stdout';await writeFile(oracle,erased);
  const node=Bun.spawnSync(['node',oracle],{stdout:Bun.file(oracleOutput),stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?input:erased);
  const result=await compile({entry,output,noGc,initializationEntries:[entry],buildDir:output+'-build',test262Observation:{kind:'test262-native-observation',scenarioId:'property/async-return-adoption.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(await readFile(oracleOutput,'utf8'));
 }}finally{await rm(root,{recursive:true,force:true})}
},900000);

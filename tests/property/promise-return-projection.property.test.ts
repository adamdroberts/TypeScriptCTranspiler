import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {sourceConstructorInvocations} from '../../src/source-value-flow';
import {promiseReturnProjectionInput} from '../e2e/generated-cases';
import {parseHostObservation} from '../test262/protocol';

function facts(source:string){
 const options:ts.CompilerOptions={noLib:true,allowJs:true,noEmit:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);
 host.getSourceFile=file=>file==='/model.js'?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>file==='/model.js'?source:undefined;host.fileExists=file=>file==='/model.js';
 return sourceConstructorInvocations(ts.createProgram(['/model.js'],options,host),{roots:['/model.js']});
}

test('Promise return and await projections retain actual inputs and mutable allocation owners',()=>{
 for(const definition of ["function f(value){return Promise.resolve(value)}","async function f(value){return Promise.resolve(value)}","async function f(value){return await value}"])
  expect(facts(definition+"const first=f('return 229;');f('return 239;');first.then(body=>Function(body));")).toEqual([{kind:'ordinary',choices:[['return 229;']]}]);
 const changed=facts("async function f(value){const p=Promise.resolve(value);p.then=function(resolve){resolve('return 233;')};return p}f('return 229;').then(body=>Function(body));");
 expect(changed[0]!.choices?.[0]).toContain('return 233;');
 for(const source of ["function f(value){const p=Promise.resolve(value);opaque(p);return p}f('return 229;').then(body=>Function(body));","async function f(value){return await value}f(runtimeInput).then(body=>Function(body));"])
  expect(facts(source).some(value=>value.choices===null)).toBe(true);
 const cyclic="const thenable={then(resolve){resolve(flag?thenable:'return 241;')}};async function f(){Function(await thenable)}f();";
 expect(facts(cyclic)).toEqual([{kind:'ordinary',choices:[['return 241;']]}]);
 expect(facts("unknownCall(body=>Function(body));").some(value=>value.choices===null)).toBe(true);
 const counterexample=nodeReferenceSync(['node','-e',`const fs=require('node:fs');async function f(value){return value}const first=f('return 137;');const runtimeInput={get then(){Promise.prototype.then=function(callback){callback('return 139;')};return undefined}};f(runtimeInput);first.then(body=>fs.writeSync(1,String(Function(body)())+'\\n'));`],{stdout:'pipe',stderr:'pipe',timeout:10000});
 expect({code:counterexample.exitCode,stderr:counterexample.stderr.toString(),stdout:counterexample.stdout.toString()}).toEqual({code:0,stderr:'',stdout:'139\n'});

});

test('Promise input projections preserve native values and property effects against Node',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-promise-return-projection-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const input=promiseReturnProjectionInput(typed&&!noGc?512:3)+`
function ordinaryProjected(value:any):Promise<any>{return Promise.resolve(value)}
async function asyncProjected(value:any):Promise<any>{return Promise.resolve(value)}
async function awaitedProjected(value:any):Promise<any>{return await value}
const firstOrdinary=ordinaryProjected('return 251;');ordinaryProjected('return 257;');firstOrdinary.then(body=>console.log('ordinary:',Function(body)()));
const firstAsync=asyncProjected('return 263;');asyncProjected('return 269;');firstAsync.then(body=>console.log('async:',Function(body)()));
const firstAwaited=awaitedProjected('return 271;');awaitedProjected('return 277;');firstAwaited.then(body=>console.log('await:',Function(body)()));
async function changedProjected(value:any):Promise<any>{const promise:any=Promise.resolve(value);promise.then=function(resolve:any){console.log('mutable receiver:',this===promise);resolve('return 281;')};return promise}
changedProjected('return 283;').then(body=>console.log('mutable:',Function(body)()));
let count=0;const repeating:any={then(resolve:any){resolve(++count<9?repeating:'return 293;')}};awaitedProjected(repeating).then(body=>console.log('cycle:',Function(body)()));
`,erased=ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}.js`),oracleOutput=oracle+'.stdout';await writeFile(oracle,erased);
  const node=Bun.spawnSync(['node',oracle],{stdout:Bun.file(oracleOutput),stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?input:erased);
  const result=await compile({entry,output,noGc,initializationEntries:[entry],buildDir:output+'-build',test262Observation:{kind:'test262-native-observation',scenarioId:'property/promise-return-projection.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(await readFile(oracleOutput,'utf8'));
 }}finally{await rm(root,{recursive:true,force:true})}
},900000);

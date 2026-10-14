import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {sourceConstructorInvocations} from '../../src/source-value-flow';
import {jsonNumericSourceInput} from '../e2e/generated-cases';
import {parseHostObservation} from '../test262/protocol';

function facts(source:string){
 const options:ts.CompilerOptions={noLib:true,allowJs:true,noEmit:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);
 host.getSourceFile=file=>file==='/model.js'?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>file==='/model.js'?source:undefined;host.fileExists=file=>file==='/model.js';
 return sourceConstructorInvocations(ts.createProgram(['/model.js'],options,host),{roots:['/model.js']});
}

test('JSON numeric primitive domains retain BigInt hooks without opaque default effects',()=>{
 for(const value of ['1n','Atomics.load(new BigInt64Array(1),0)','Atomics.load(new Int32Array(1),0)','Math.abs(-1)']){
  expect(facts(`const list=['return 37;'];try{JSON.stringify(${value})}catch(error){}Function(...list);`)).toEqual([{kind:'ordinary',choices:[['return 37;']]}]);
 }
 for(const hook of ["BigInt.prototype.toJSON=function(){mutate(list);return 'hook'};","Object.defineProperty(BigInt.prototype,'toJSON',{get(){mutate(list);return undefined}});"])
  expect(facts(`const list=['return 37;'];${hook}JSON.stringify(Atomics.load(new BigInt64Array(1),0));Function(...list);`).some(value=>value.choices===null)).toBe(true);
 expect(facts("const list=['return 37;'];JSON.stringify(runtimeInput);Function(...list);").some(value=>value.choices===null)).toBe(true);
});
test('JSON primitive numeric source owners match independent Node through native invocation',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-json-numeric-source-'));
 try{for(const typed of [true,false])for(const noGc of [false,true])for(const partition of ['source','hooks'] as const){
  const input=partition==='source'?jsonNumericSourceInput(typed&&!noGc?512:3):`\nconst view:any=new BigInt64Array(1),prototype:any=BigInt.prototype;let seen=0;try{JSON.stringify(Atomics.load(view,0))}catch(error){console.log('abrupt:',error instanceof TypeError)}Object.defineProperty(prototype,'toJSON',{configurable:true,value:function(this:any){seen++;return 'hook'}});console.log('method:',JSON.stringify(Atomics.load(view,0)),seen);Object.defineProperty(prototype,'toJSON',{configurable:true,get(){seen++;return undefined}});try{JSON.stringify(1n)}catch(error){console.log('getter:',seen,error instanceof TypeError)}delete prototype.toJSON;console.log('number:',typeof JSON.stringify(Atomics.load(new Int32Array(1),0)));`,erased=ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}-${partition}.js`),oracleOutput=oracle+'.stdout';await writeFile(oracle,erased);
  const node=Bun.spawnSync(['node',oracle],{stdout:Bun.file(oracleOutput),stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}-${partition}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?input:erased);
  const result=await compile({entry,output,noGc,initializationEntries:[entry],buildDir:output+'-build',test262Observation:{kind:'test262-native-observation',scenarioId:'property/json-numeric-source.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect({typed,noGc,observation}).toMatchObject({observation:{kind:'normal'}});expect(observation.stdout).toBe(await readFile(oracleOutput,'utf8'));
 }}finally{await rm(root,{recursive:true,force:true})}
},900000);

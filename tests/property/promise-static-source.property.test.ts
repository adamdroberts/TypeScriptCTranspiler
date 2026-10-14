import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {sourceConstructorInvocations} from '../../src/source-value-flow';
import {promiseStaticSourceInput} from '../e2e/generated-cases';
import {parseHostObservation} from '../test262/protocol';

function facts(source:string){
 const options:ts.CompilerOptions={noLib:true,allowJs:true,noEmit:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);
 host.getSourceFile=file=>file==='/model.js'?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>file==='/model.js'?source:undefined;host.fileExists=file=>file==='/model.js';
 return sourceConstructorInvocations(ts.createProgram(['/model.js'],options,host),{roots:['/model.js']});
}

test('Promise static capabilities retain complete actual Lists and rejection owners',()=>{
 for(const [source,body]of [["Promise.try(()=> 'return 79;').then(body=>Function(body));",'return 79;'],["Promise.try((first,...rest)=>first+rest.join(''), 'return ',79,';').then(body=>Function(body));",'return 79;'],["Promise.try(()=>{throw 'return 83;'}).catch(body=>Function(body));",'return 83;'],["const c=Promise.withResolvers();c.resolve('return 89;');c.promise.then(body=>Function(body));",'return 89;'],["const c=Promise.withResolvers();c.reject('return 97;');c.promise.catch(body=>Function(body));",'return 97;']]as const)
  expect(facts(source)).toEqual([{kind:'ordinary',choices:[[body]]}]);
 expect(facts("const list=['return 79;'];Promise.try(17).catch(error=>console.log(error instanceof TypeError));Function(...list);")).toEqual([{kind:'ordinary',choices:[['return 79;']]}]);
 expect(facts("const list=['return 79;'];Object.defineProperty(TypeError,Symbol.hasInstance,{value(){mutate(list);return true}});Promise.try(17).catch(error=>console.log(error instanceof TypeError));Function(...list);").some(value=>value.choices===null)).toBe(true);
 expect(facts("const list=['return 79;'];Promise.withResolvers({valueOf(){mutate(list);return 1}});Function(...list);")).toEqual([{kind:'ordinary',choices:[['return 79;']]}]);
 for(const source of ["Promise.try.call(CustomConstructor,()=> 'return 79;').then(body=>Function(body));","const list=['return 79;'];Promise.try(()=>mutate(list));Function(...list);","const c=Promise.withResolvers();c.resolve(runtimeInput);c.promise.then(body=>Function(body));"])
  expect(facts(source).some(value=>value.choices===null)).toBe(true);
});
test('Promise static capability source owners match independent Node through native invocation',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-promise-static-source-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const input=promiseStaticSourceInput(typed&&!noGc?512:3)+`\nlet order='';Promise.try((first:any,...rest:any[])=>{order+='C';return first+rest.join('')},'return ',83,';').then(body=>console.log('actuals:',Function(body)()));console.log('sync:',order);Promise.try(()=>{throw 'return 89;'}).catch(body=>console.log('throw:',Function(body)()));const capability=Promise.withResolvers<string>();capability.promise.then(body=>console.log('capability:',Function(body)()));capability.resolve('return 97;');const ignored:any={valueOf(){throw 'poison'}};const withResolvers:any=Promise.withResolvers;console.log('ignored:',typeof withResolvers.call(Promise,ignored).resolve);Promise.try(17 as any).catch(error=>console.log('invalid:',error instanceof TypeError));`,erased=ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}.js`),oracleOutput=oracle+'.stdout';await writeFile(oracle,erased);
  const node=Bun.spawnSync(['node',oracle],{stdout:Bun.file(oracleOutput),stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?input:erased);
  const result=await compile({entry,output,noGc,initializationEntries:[entry],buildDir:output+'-build',test262Observation:{kind:'test262-native-observation',scenarioId:'property/promise-static-source.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect({typed,noGc,observation}).toMatchObject({observation:{kind:'normal'}});expect(observation.stdout).toBe(await readFile(oracleOutput,'utf8'));
 }}finally{await rm(root,{recursive:true,force:true})}
},900000);

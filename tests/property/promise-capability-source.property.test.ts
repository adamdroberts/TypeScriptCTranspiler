import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {sourceConstructorInvocations} from '../../src/source-value-flow';
import {promiseCapabilitySourceInput} from '../e2e/generated-cases';
import {parseHostObservation} from '../test262/protocol';

function facts(source:string){
 const options:ts.CompilerOptions={noLib:true,allowJs:true,noEmit:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);
 host.getSourceFile=file=>file==='/model.js'?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>file==='/model.js'?source:undefined;host.fileExists=file=>file==='/model.js';
 return sourceConstructorInvocations(ts.createProgram(['/model.js'],options,host),{roots:['/model.js']});
}

test('Promise construction capabilities share finite value and rejection source paths',()=>{
 for(const source of ["new Promise(resolve=>resolve('return 41;')).then(body=>Function(body));","Promise.resolve('return 41;').then(body=>Function(body));","new Promise(resolve=>resolve.call(null,'return 41;')).then(body=>Function(body));"])
  expect(facts(source)).toEqual([{kind:'ordinary',choices:[['return 41;']]}]);
 expect(facts("new Promise(()=>{throw 'return 43;'}).catch(body=>Function(body));")).toEqual([{kind:'ordinary',choices:[['return 43;']]}]);
 expect(facts("Promise.resolve({then(resolve){resolve('return 47;')}}).then(body=>Function(body));")).toEqual([{kind:'ordinary',choices:[['return 47;']]}]);
 const status=facts("Promise.resolve(Atomics.waitAsync(new Int32Array(new SharedArrayBuffer(4)),0,1,0).value).then(value=>Function('return '+JSON.stringify(value)+';')); ");
 expect(status[0]!.choices).toEqual([expect.arrayContaining(['return \"not-equal\";','return \"timed-out\";','return \"ok\";'])]);
 for(const source of ["Promise.resolve.call(CustomConstructor,'return 41;').then(body=>Function(body));","new Promise(resolve=>resolve(runtimeInput)).then(body=>Function(body));","const list=['return 41;'];Promise.resolve({get then(){mutate(list);return undefined}});Function(...list);","const list=['return 41;'];const p=Promise.resolve(0);Object.defineProperty(p,'constructor',{get(){mutate(list);return Promise}});Promise.resolve(p);Function(...list);"])
  expect(facts(source).some(value=>value.choices===null)).toBe(true);
});
test('Promise capability source owners match independent Node through native invocation',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-promise-capability-source-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const input=promiseCapabilitySourceInput(typed&&!noGc?512:3)+`\nnew Promise<any>((resolve,reject)=>{throw 'return 43;'}).catch(body=>console.log('rejected:',Function(body)()));Promise.resolve('return 47;').then(body=>console.log('resolved:',Function(body)()));const thenable:any={then(resolve:any){resolve('return 53;')}};Promise.resolve(thenable).then((body:any)=>console.log('thenable:',Function(body)()));const view=new Int32Array(new SharedArrayBuffer(4));Promise.resolve(Atomics.waitAsync(view,0,1,0).value).then(value=>console.log('status:',Function('return '+JSON.stringify(value)+';')()));`,erased=ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}.js`),oracleOutput=oracle+'.stdout';await writeFile(oracle,erased);
  const node=Bun.spawnSync(['node',oracle],{stdout:Bun.file(oracleOutput),stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?input:erased);
  const result=await compile({entry,output,noGc,initializationEntries:[entry],buildDir:output+'-build',test262Observation:{kind:'test262-native-observation',scenarioId:'property/promise-capability-source.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(await readFile(oracleOutput,'utf8'));
 }}finally{await rm(root,{recursive:true,force:true})}
},900000);

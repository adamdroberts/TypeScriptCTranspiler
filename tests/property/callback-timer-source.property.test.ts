import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {runtimeCallbackTimerDescriptors} from '../../src/global-bindings';
import {sourceConstructorInvocations} from '../../src/source-value-flow';
import {callbackTimerSourceInput} from '../e2e/generated-cases';
import {parseHostObservation} from '../test262/protocol';

function facts(source:string){
 const options:ts.CompilerOptions={noLib:true,allowJs:true,noEmit:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);
 host.getSourceFile=file=>file==='/model.js'?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>file==='/model.js'?source:undefined;host.fileExists=file=>file==='/model.js';
 return sourceConstructorInvocations(ts.createProgram(['/model.js'],options,host),{roots:['/model.js']});
}

test('callback timer source owners retain callback actuals and ordered registration effects',()=>{
 for(const [name,{action}]of runtimeCallbackTimerDescriptors){
  const call=action==='CLEAR'?`${name}(0)`:`${name}(()=>0,0)`;
  expect({name,facts:facts(`const list=['return 71;'];${call};Function(...list);`)}).toEqual({name,facts:[{kind:'ordinary',choices:[['return 71;']]}]});
 }
 expect(facts("setTimeout(body=>Function(body),0,'return 71;');")).toEqual([{kind:'ordinary',choices:[['return 71;']]}]);
 expect(facts("const list=['return 71;'];setTimeout(17,{valueOf(){mutate(list);return 1}});Function(...list);")).toEqual([{kind:'ordinary',choices:[['return 71;']]}]);
 for(const source of ["const list=['return 71;'];setTimeout(()=>mutate(list),1);Function(...list);","const list=['return 71;'];setTimeout(()=>0,{valueOf(){mutate(list);return 1}});Function(...list);","const list=['return 71;'];clearTimeout({valueOf(){mutate(list);return 1}});Function(...list);","async function run(){const list=['return 71;'];setTimeout(()=>mutate(list),0);await 0;Function(...list)}run();"])
  expect(facts(source).some(value=>value.choices===null)).toBe(true);
});
test('Callback timer source owners match independent Node through native invocation',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-callback-timer-source-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const input=callbackTimerSourceInput(typed&&!noGc?512:3)+[...runtimeCallbackTimerDescriptors].map(([name,{length}])=>`{const fn:any=${name};console.log('${name} metadata:',fn.name,fn.length===${length});}`).join('\n')+`\nlet seen=0;const timer:any=setTimeout;try{timer(17,{valueOf(){seen++;return 0}})}catch(error){console.log('validation:',seen,error instanceof TypeError)}const clear:any=clearTimeout;clear(0);console.log('clear:',seen);queueMicrotask(()=>console.log('microtask:',Function('return 73;')()));`,erased=ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}.js`),oracleOutput=oracle+'.stdout';await writeFile(oracle,erased);
  const node=Bun.spawnSync(['node',oracle],{stdout:Bun.file(oracleOutput),stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?input:erased);
  const result=await compile({entry,output,noGc,initializationEntries:[entry],buildDir:output+'-build',test262Observation:{kind:'test262-native-observation',scenarioId:'property/callback-timer-source.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect({typed,noGc,observation}).toMatchObject({observation:{kind:'normal'}});expect(observation.stdout).toBe(await readFile(oracleOutput,'utf8'));
 }}finally{await rm(root,{recursive:true,force:true})}
},900000);

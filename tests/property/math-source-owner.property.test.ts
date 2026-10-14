import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {runtimeMathMethods} from '../../src/global-bindings';
import {sourceConstructorInvocations} from '../../src/source-value-flow';
import {mathSourceOwnerInput} from '../e2e/generated-cases';
import {parseHostObservation} from '../test262/protocol';

function facts(source:string){
 const options:ts.CompilerOptions={noLib:true,allowJs:true,noEmit:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);
 host.getSourceFile=file=>file==='/model.js'?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>file==='/model.js'?source:undefined;host.fileExists=file=>file==='/model.js';
 return sourceConstructorInvocations(ts.createProgram(['/model.js'],options,host),{roots:['/model.js']});
}

test('Math source identities share native descriptors and preserve conversion effects',()=>{
 for(const [name,descriptor]of runtimeMathMethods){
  const values=descriptor.kind==='SUM_PRECISE'?'[1,2]':Array.from({length:descriptor.length},()=>'-1').join(',');
  expect({name,facts:facts(`const list=['return 17;'];Math[${JSON.stringify(name)}](${values});Function(...list);`)}).toEqual({name,facts:[{kind:'ordinary',choices:[['return 17;']]}]});
 }
 for(const source of [
  "const list=['return 17;'];Math.random({valueOf(){mutate(list)}});Function(...list);",
  "const list=['return 17;'];Math.pow({valueOf(){throw 'stop'}},{valueOf(){mutate(list);return 1}});Function(...list);",
  "const list=['return 17;'];const fn=Math.abs;fn(-1);Function(...list);",
 ])expect(facts(source)).toEqual([{kind:'ordinary',choices:[['return 17;']]}]);
 for(const source of [
  "const list=['return 17;'];Math.abs({valueOf(){mutate(list);return 1}});Function(...list);",
  "const list=['return 17;'];Math.random=()=>mutate(list);Math.random();Function(...list);",
  "const list=['return 17;'];Math.random(mutate(list));Function(...list);",
  "const list=['return 17;'];Math.sumPrecise({[Symbol.iterator](){mutate(list);return [1][Symbol.iterator]()}});Function(...list);",
 ])expect(facts(source).some(invocation=>invocation.choices===null)).toBe(true);
 expect(facts("const alternate=Math.random()<0.5?['return 19;']:['return 23;'];Function.apply(null,[...alternate]);async function* later(){yield 1}later().next();")[0]!.choices).toEqual([expect.arrayContaining(['return 19;','return 23;'])]);
});

test('Math conditional source owners match independent Node through native invocation',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-math-source-owner-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const input=mathSourceOwnerInput(typed&&!noGc?512:3)+`\nlet seen=0;const poison:any={valueOf(){seen++;throw 'poison'}};Math.random(poison);console.log('ignored:',seen);const left:any={valueOf(){seen++;throw 'stop'}},right:any={valueOf(){seen+=100;return 2}};try{Math.pow(left,right)}catch(error){console.log('ordered:',seen,error==='stop')}\n`,erased=ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}.js`),oracleOutput=oracle+'.stdout';await writeFile(oracle,erased);
  const node=Bun.spawnSync(['node',oracle],{stdout:Bun.file(oracleOutput),stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?input:erased);
  const result=await compile({entry,output,noGc,initializationEntries:[entry],buildDir:output+'-build',test262Observation:{kind:'test262-native-observation',scenarioId:'property/math-source-owner.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(await readFile(oracleOutput,'utf8'));
 }}finally{await rm(root,{recursive:true,force:true})}
},900000);

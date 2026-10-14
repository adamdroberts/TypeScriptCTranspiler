import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {sourceConstructorInvocations} from '../../src/source-value-flow';
import {strictTypeSourceInput} from '../e2e/generated-cases';
import {parseHostObservation} from '../test262/protocol';

function facts(source:string){
 const options:ts.CompilerOptions={noLib:true,allowJs:true,noEmit:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);
 host.getSourceFile=file=>file==='/model.js'?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>file==='/model.js'?source:undefined;host.fileExists=file=>file==='/model.js';
 return sourceConstructorInvocations(ts.createProgram(['/model.js'],options,host),{roots:['/model.js']});
}

test('strict equality proves disjoint type domains without user conversion',()=>{
 const groups=['undefined','null','false','Math.random()','1n',"'text'",'Symbol()', '{}', 'function(){}'];
 for(const [leftIndex,left]of groups.entries())for(const [rightIndex,right]of groups.entries()){
  if(leftIndex===rightIndex||leftIndex>=7&&rightIndex>=7)continue;
  const source=`const owner={body:'return 59;'};if((${left})===(${right}))mutate(owner);Function(owner.body);`;
  expect({left,right,facts:facts(source)}).toEqual({left,right,facts:[{kind:'ordinary',choices:[['return 59;']]}]});
 }
 expect(facts("const owner={body:'return 59;'};if(globalThis.setTimeout===undefined)mutate(owner);Function(owner.body);")).toEqual([{kind:'ordinary',choices:[['return 59;']]}]);
 for(const source of ["const owner={body:'return 59;'};if(runtimeInput===undefined)mutate(owner);Function(owner.body);","const owner={body:'return 59;'};const input={valueOf(){mutate(owner);return 1}};if(input==1){}Function(owner.body);"])
  expect(facts(source).some(value=>value.choices===null)).toBe(true);
});
test('Strict type source owners match independent Node through native invocation',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-strict-type-source-'));
 try{for(const typed of [true,false])for(const noGc of [false,true])for(const partition of ['source','conversion'] as const){
  const input=partition==='source'?strictTypeSourceInput(typed&&!noGc?512:3)+`\nconst values:any[]=[undefined,null,false,0,0n,'',Symbol(),{},function(){}];for(const left of values)for(const right of values)console.log('types:',typeof left,typeof right,left===right,left!==right);`:`let seen=0;const owner:any={valueOf(){seen++;return 1}};console.log('strict:',owner===1,seen);console.log('abstract:',owner==1,seen);`,erased=ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}-${partition}.js`),oracleOutput=oracle+'.stdout';await writeFile(oracle,erased);
  const node=Bun.spawnSync(['node',oracle],{stdout:Bun.file(oracleOutput),stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}-${partition}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?input:erased);
  const result=await compile({entry,output,noGc,initializationEntries:[entry],buildDir:output+'-build',test262Observation:{kind:'test262-native-observation',scenarioId:'property/strict-type-source.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect({typed,noGc,observation}).toMatchObject({observation:{kind:'normal'}});expect(observation.stdout).toBe(await readFile(oracleOutput,'utf8'));
 }}finally{await rm(root,{recursive:true,force:true})}
},900000);

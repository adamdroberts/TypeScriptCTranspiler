import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {sourceConstructorInvocations} from '../../src/source-value-flow';
import {parseHostObservation} from '../test262/protocol';
import {restSourceLocationInput} from '../e2e/generated-cases';

function facts(source:string){
 const options:ts.CompilerOptions={noLib:true,allowJs:true,noEmit:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);
 host.getSourceFile=file=>file==='model.js'?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;host.readFile=file=>file==='model.js'?source:undefined;host.fileExists=file=>file==='model.js';
 return sourceConstructorInvocations(ts.createProgram(['model.js'],options,host));
}
const source=`
{function forward1(...tail:any[]):any{return Function(...tail)}console.log('spread:',eval(forward1("return '17;' ")()));}
{function forward2(ignored:any,...tail:any[]):any{return Function.apply(null,tail)}console.log('offset:',eval(forward2(0,"return '19;' ")()));}
{function forward3(...tail:any[]):any{return Reflect.construct(Function,tail)}console.log('construct:',eval(forward3("return '23;' ")()));}
{function forward4(...tail:any[]):any{tail[0]="return '29;' ";return Function(...tail)}console.log('write:',eval(forward4("return '31;' ")()));}
{function forward5(...tail:any[]):any{return Function('value',...tail)}console.log('prefix:',eval(forward5('return value')('37;')));}
{function forward6(...tail:any[]):any{const own=0 in tail,missing=1 in tail;return String(own)+':'+String(missing)+':'+String(tail[1])}console.log('presence:',forward6('x'));}
{function forward7(...tail:any[]):any{return String((0 in tail))+':'+String(tail[0])+':'+String(tail.length)}console.log('empty:',forward7());}`;

test('rest element definitions retain own presence and exact finite source values',()=>{
 for(const route of ['Function(...tail)','Function.apply(null,tail)','Reflect.construct(Function,tail)']){
  const observed=facts(`function forward(ignored,...tail){return ${route}}forward(0,'return 41;');`);
  expect(observed).toEqual([{kind:'ordinary',choices:[['return 41;']]}]);
 }
 const omitted=facts('function forward(...tail){return Function(tail[0])}forward();');
 expect(omitted).toEqual([{kind:'ordinary',choices:[['undefined']]}]);
});

test('rest source locations match independent Node through the shared native graph',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-rest-source-location-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const input=source+'\n'+restSourceLocationInput(typed&&!noGc?512:3),erased=ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}.js`);await writeFile(oracle,erased);
  const node=Bun.spawnSync(['node',oracle],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?input:erased);
  const result=await compile({entry,output,noGc,initializationEntries:[entry],buildDir:output+'-build',test262Observation:{kind:'test262-native-observation',scenarioId:'property/rest-source-location.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString());
 }
 expect(facts("function forward(...tail){mutate(tail);return Function(...tail)}forward('return 43;');")).toEqual([{kind:'ordinary',choices:null}]);
 }finally{await rm(root,{recursive:true,force:true})}
},900000);

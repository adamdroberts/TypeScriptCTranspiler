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
 host.getSourceFile=file=>file==='/model.js'?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;host.readFile=file=>file==='/model.js'?source:undefined;host.fileExists=file=>file==='/model.js';
 return sourceConstructorInvocations(ts.createProgram(['/model.js'],options,host),{roots:['/model.js']});
}
const source=`
function direct(...tail:any[]):any{return Function(...tail)}
function reflected(ignored:any,...tail:any[]):any{return Function.apply(null,tail)}
function identity(value:any):any{return value}
const record:any={fn:function(){},get constructorValue(){return this.fn.constructor}};
const selected:any=identity(record.constructorValue);
function member(...tail:any[]):any{return selected(...tail)}
console.log('direct:',direct('return 17;')());
console.log('reflected:',reflected(0,'return 19;')());
console.log('member:',member('return 23;')());
async function* unrelated(){yield 1;return 2}
unrelated().next();`;

test('caller-origin captures exclude later effects and retain unresolved timing',()=>{
 const early="function read(...tail){return Function(...tail)}read('return 17;');async function* later(){yield 1}later().next();";
 expect(facts(early)).toEqual([{kind:'ordinary',choices:[['return 17;']]}]);
 for(const input of [
  "function read(...tail){opaque(tail);return Function(...tail)}read('return 17;');",
  "function read(...tail){return Function(...tail)}const list=['return 17;'];read((opaque(list),list[0]));",
  "function* read(...tail){yield 0;return Function(...tail)}read('return 17;');opaque();",
  "async function* prior(){yield 1}prior().next();function read(...tail){return Function(...tail)}read('return 17;');",
  "function read(){return Function(...list)}const list=['return 17;'];read();opaque(list);read();",
  "function read(){if(flag)read();return Function(...list)}const list=['return 17;'];read();opaque(list);",
  "async function read(){await 0;return Function(...list)}const list=['return 17;'];read();opaque(list);",
  "function read(){for(let i=0;i<2;i++){Function(...list);opaque(list)}}const list=['return 17;'];read();",
 ])expect(facts(input).some(invocation=>invocation.choices===null)).toBe(true);
});

test('caller-origin property captures match independent Node across later generator effects',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-activation-property-capture-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const input=restSourceLocationInput(typed&&!noGc?512:3)+'\n'+source,erased=ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}.js`);await writeFile(oracle,erased);
  const node=Bun.spawnSync(['node',oracle],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?input:erased);
  const result=await compile({entry,output,noGc,initializationEntries:[entry],buildDir:output+'-build',test262Observation:{kind:'test262-native-observation',scenarioId:'property/activation-property-capture.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString());
 }
 expect(facts("function forward(...tail){mutate(tail);return Function(...tail)}forward('return 43;');")).toEqual([{kind:'ordinary',choices:null}]);
 }finally{await rm(root,{recursive:true,force:true})}
},900000);

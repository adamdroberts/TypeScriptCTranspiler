import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {sourceConstructorInvocations,sourceEvaluationInvocations} from '../../src/source-value-flow';
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
  const node=nodeReferenceSync(['node',oracle],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?input:erased);
  const result=await compile({entry,output,noGc,initializationEntries:[entry],buildDir:output+'-build',test262Observation:{kind:'test262-native-observation',scenarioId:'property/rest-source-location.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString());
 }
 expect(facts("function forward(...tail){mutate(tail);return Function(...tail)}forward('return 43;');")).toEqual([{kind:'ordinary',choices:null}]);
 }finally{await rm(root,{recursive:true,force:true})}
},900000);

/* A call whose argument List has no fixed extent (a spread iterator) still
 * binds a rest parameter to a fresh Array (10.2.11 step 26): some length, and
 * as elements the List's values from the rest position on. Such an Array is
 * no unknown object, so a later eval of a literal global stays exact. The
 * partitions, sound against Node: its length and an element (exact or listed);
 * an element whose toString writes the global, and a pushed one joined
 * (listed); a plain pushed element joined (exact). The stress makes 128
 * such calls through one forwarding chain. */
const P=`eval("print('"+w+"')");`,G=`function*g(){yield 'k';yield 2}`;
const extents:Record<string,{source:string;exact:string[]|null}>={
 length:{source:`var w='1';${G}function f(...a){return a}var r=f(...g());var s=""+r.length+r[1];${P}`,exact:["print('1')"]},
 element:{source:`${G}function f(h,...a){return a}var w=f(0,...g())[0];${P}`,exact:null},
 writer:{source:`var w='1';function*g(){yield {toString(){w='2';return ''}}}function f(...a){""+a[0]}f(...g());${P}`,exact:null},
 pushPlain:{source:`var w='1';${G}function f(...a){a.push({toString(){return 'z'}});return a.join()}f(...g());${P}`,exact:["print('1')"]},
 pushWriter:{source:`var w='1';${G}function f(...a){a.push({toString(){w='2';return 'z'}});return a.join()}f(...g());${P}`,exact:null},
 stress:{source:`var w='1';${G}function f(...a){return a}function h(...a){return f(...a,...g())}${Array.from({length:128},()=>'h(...g()).join();').join('')}${P}`,exact:["print('1')"]},
};
test('a rest parameter of an unknown-extent argument List is a fresh Array, sound against Node',async()=>{
 const names=Object.keys(extents);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];vm.runInNewContext(source,{print:value=>seen.push("print(\x27"+value+"\x27)")});out.push(seen)}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>extents[name]!.source))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 expect(observed[names.indexOf('element')]).toEqual(["print('k')"]);
 for(const name of ['writer','pushWriter'])expect({name,observed:observed[names.indexOf(name)]}).toEqual({name,observed:["print('2')"]});
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-rest-extent-'));
 try{for(const [index,name] of names.entries()){
  const entry=join(directory,`${name}.js`);await writeFile(entry,extents[name]!.source+'\n');
  const choices=sourceEvaluationInvocations(ts.createProgram([entry],{allowJs:true,noLib:true}),{roots:[entry],host:'test262'})[0]?.choices??null;
  expect({name,choices:choices!==null}).toEqual({name,choices:true});
  expect({name,missing:observed[index]!.filter(value=>!choices!.includes(value))}).toEqual({name,missing:[]});
  const exact=extents[name]!.exact;if(exact)expect({name,choices}).toEqual({name,choices:exact});
 }}finally{await rm(directory,{recursive:true,force:true})}
},300_000);

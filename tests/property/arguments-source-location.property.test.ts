import {expect,test} from 'bun:test';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {parseHostObservation} from '../test262/protocol';
import {nodeReferenceSync} from './node-reference';

function facts(body:string){
 return finiteEvalScriptSourceGraph([{path:'subject.js',source:`{const evaluate=code=>{print(code);return eval(code);};${body}}`}]);
}
function reference(source:string,setup='function external(value){if(value)value[0]="19;";return "19;";}'){
 const command='const fs=require("node:fs"),vm=require("node:vm");new vm.Script('+JSON.stringify(setup)+'+fs.readFileSync(0,"utf8")).runInNewContext({print:v=>fs.writeSync(1,String(v)+"\\n")});';
 const node=nodeReferenceSync(['node','-e',command],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});
 expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
 expect(node.stdout.byteLength).toBeGreaterThan(0);return node.stdout.toString();
}

test('arguments source locations retain mapped writes and separate unmapped bindings',()=>{
 for(const form of ['function(body)','function(body="17;")','function(body,...tail)'])for(const strict of [false,true])for(const route of ['arguments[0]="19;"','const retained=arguments;retained[0]="19;"','Object.defineProperty(arguments,"0",{value:"19;"})']){
  const body=`const run=${form}{${strict?'"use strict";':''}${route};evaluate(body);};run("17;");`;
  // Strict directives are an early error with non-simple formals.
  if(strict&&form!=='function(body)')continue;
  const observed=reference(`{const evaluate=code=>{print(code);return eval(code);};${body}}`),result=facts(body);
  expect(result.error).toBeNull();expect(observed.trim()).toBe(strict||form!=='function(body)'?'17;':'19;');
  expect({body,sources:result.directEvalSources.map(record=>record.source)}).toMatchObject({sources:expect.arrayContaining([observed.trim()])});
 }
 for(const body of [
  'const run=function(body,body){arguments[0]="19;";evaluate(body);};run("13;","17;");',
  'const run=function(body,body){arguments[1]="19;";evaluate(body);};run("13;","17;");',
  'const run=function(body,body){arguments[0]="19;";evaluate(body===undefined?"23;":body);};run("13;");',
  'const run=function(body){arguments[0]="19;";evaluate(body===undefined?"23;":body);};run();',
  'const run=function(body){(()=>{arguments[0]="19;"})();evaluate(body);};run("17;");',
  'const run=function(body){body="19;";evaluate(arguments[0]);};run("17;");',
  'const run=function(body){body="19;";evaluate(Object.getOwnPropertyDescriptor(arguments,"0").value);};run("17;");',
  'const run=function(){evaluate(...arguments);};run("17;");',
  'const run=function(body){arguments[9]="19;";evaluate(arguments.length===1?body:"23;");};run("17;");',
  'const run=function(body){arguments.length=0;evaluate(arguments[0]);};run("17;");',
  'const run=function(body){evaluate(Object.prototype.toString.call(arguments)==="[object Arguments]"?body:"23;");};run("17;");',
  'const run=function(body){evaluate(JSON.stringify(arguments)==="{\\"0\\":\\"17;\\"}"?body:"23;");};run("17;");',
  'const run=function(body,arguments){arguments[0]="19;";evaluate(body);};run("17;",{});',
  'const run=function(body){let arguments={};arguments[0]="19;";evaluate(body);};run("17;");',
  'const run=function(body){delete arguments[0];arguments[0]="19;";evaluate(body);};run("17;");',
  'const run=function(body){Object.defineProperty(arguments,"0",{get(){return "23;"}});arguments[0]="19;";evaluate(body);};run("17;");',
 ]){
  const observed=reference(`{const evaluate=code=>{print(code);return eval(code);};${body}}`),result=facts(body);
  expect(result.error).toBeNull();expect({body,sources:result.directEvalSources.map(record=>record.source)}).toMatchObject({sources:expect.arrayContaining([observed.trim()])});
 }
});

test('opaque arguments writes cannot prove a finite mapped source',()=>{
 for(const body of [
  'const run=function(body){arguments[0]=external();evaluate(body);};run("17;");',
  'const run=function(body){external(arguments);evaluate(body);};run("17;");',
  'const run=function(body){(()=>{arguments[0]=external()})();evaluate(body);};run("17;");',
  'const run=function(body){Object.defineProperty(arguments,"0",{value:external()});evaluate(body);};run("17;");',
  'const run=function(body){arguments[external()==="19;"?0:1]=external();evaluate(body);};run("17;");',
  'const run=function(body,body){arguments[1]=external();evaluate(body);};run("13;","17;");',
  'const run=function(body){var arguments;arguments[0]=external();evaluate(body);};run("17;");',
  'const outer=function(arguments){const run=function(body){arguments[0]=external();evaluate(body);};run("17;");};outer({});',
  'let retained;const run=function(body){if(retained)retained[0]=external();else retained=arguments;return ()=>evaluate(body);};const read=run("17;");run("17;");read();',
  'const run=function(body){arguments[0]=external();return body;};evaluate(run("17;"));',
 ]){
  const observed=reference(`{const evaluate=code=>{print(code);return eval(code);};${body}}`);
  expect(observed).toContain('19;\n');expect(facts(body).error).toContain('source is not a finite static string expression');
 }
 for(const body of [
  'const run=function(body){"use strict";arguments[0]=external();evaluate(body);};run("17;");',
  'const run=function(body="17;"){arguments[0]=external();evaluate(body);};run("17;");',
  'const run=function(body,...tail){arguments[0]=external();evaluate(body);};run("17;");',
  'const run=function(body,body){arguments[0]=external();evaluate(body);};run("13;","17;");',
  'const run=function(body,arguments){arguments[0]=external();evaluate(body);};run("17;",{});',
 ]){
  expect(reference(`{const evaluate=code=>{print(code);return eval(code);};${body}}`)).toBe('17;\n');expect(facts(body).error).toBeNull();
 }
});

test('the public combined CLI input remains a valid Node program and a known source-admission gap',async()=>{
 const source=await readFile(new URL('../e2e/cases/source_arguments_public_callback_diagnostic/in.ts',import.meta.url),'utf8');
 expect(reference(source,'console={log:print};')).toBe('19\n23\n17\n47\narguments-source-complete\n');
 expect(finiteEvalScriptSourceGraph([{path:'subject.js',source}]).error).toContain('source is not a finite static string expression');
});

test('opaque owner traversal observes replacement callbacks through mapped properties',()=>{
 expect(reference(callbackOriginal)).toBe('47\nmapped-callback-complete\n');expect(finiteEvalScriptSourceGraph([{path:'subject.js',source:callbackOriginal}]).directEvalSources.map(record=>record.source)).toContain('47;');
 const setup='function external(){return "19;";}function opaque(args){if(typeof args[0]==="function")args[0]();}';
 for(const form of ['function(value)','function(value=undefined)'])for(const strict of [false,true])for(const expose of ['direct','getter']){
  if(strict&&form!=='function(value)')continue;
  // Source getters are an independent path to the same retained argument owner.
  const target=expose==='direct'?'arguments':'{get 0(){return retained[0];}}';
  const body=`let body="17;";const run=${form}{${strict?'"use strict";':''}${expose==='getter'?'const retained=arguments;':''}value=()=>{body=external();};opaque(${target});};run(null);print(body);eval(body);`;
  const source='{'+body+'}',mapped=!strict&&form==='function(value)';
  expect(reference(source,setup)).toBe(mapped?'19;\n':'17;\n');
  const result=finiteEvalScriptSourceGraph([{path:'subject.js',source}]);
  if(mapped)expect(result.error).toContain('source is not a finite static string expression');
  else expect({source,error:result.error,sources:result.directEvalSources.map(record=>record.source)}).toMatchObject({error:null,sources:['17;']});
 }
});

const callbackOriginal='{const run=function(value){let body="41;";value=()=>{body="47;";};Array.prototype.forEach.call(arguments,fn=>fn());print(eval(body));};run(null);print("mapped-callback-complete");}';
const original='{const evaluate=code=>{print(code);return eval(code);};const run=function(body){arguments[0]="19;";evaluate(body);};run("17;");print("mapped-arguments-complete");}';

test('arguments source closure executes the unchanged counterexample and retained actual-list graph',async()=>{
 const width=384,parameters=Array.from({length:width},(_,index)=>`value${index}`),actuals=parameters.map(()=> '"31;"');
 const stress=`{const evaluate=code=>{print(code);return eval(code);};const run=function(${parameters.join(',')}){const retained=arguments;retained[${width-1}]="37;";if(NATIVE_GC)$262.gc();print(retained.length);print(evaluate(value${width-1}));};run(${actuals.join(',')});const inspect=function(body){arguments[9]="43;";print(arguments.length);arguments.length=0;print(evaluate(arguments[0]));print(Object.prototype.toString.call(arguments));print(JSON.stringify(arguments));};inspect("41;");print("arguments-graph-complete");}`;
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-arguments-source-'));
 try{for(const [name,source]of [['original',original],['mapped-callback',callbackOriginal],['retained',stress]] as const){
  const expected=reference(source.replaceAll('NATIVE_GC','false'));expect(expected).toContain(name==='original'?'mapped-arguments-complete\n':name==='mapped-callback'?'mapped-callback-complete\n':'arguments-graph-complete\n');
  for(const noGc of [false,true]){
   const entry=join(directory,`${name}-${noGc}.js`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,source.replaceAll('NATIVE_GC',String(!noGc)));
   const result=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/arguments-source.js#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({name,noGc,code:result.exitCode,diagnostics}).toEqual({name,noGc,code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(expected);
  }
 }}finally{await rm(directory,{recursive:true,force:true});}
},900000);

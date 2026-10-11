import {expect,test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import ts from "typescript";
import {compile} from "../../src/compile";
import {sourceEvaluationInvocations} from "../../src/source-value-flow";
import {parseHostObservation} from "../test262/protocol";
function program(source:string):ts.Program {
 const name="source.js",options={allowJs:true,noLib:true,target:ts.ScriptTarget.ESNext};
 const host=ts.createCompilerHost(options);host.getSourceFile=file=>file===name?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>file===name?source:undefined;host.fileExists=file=>file===name;return ts.createProgram([name],options,host);
}
const definitions=[
 'var key={toString(){return "method";}};',
 'var key={toString(){return {};},valueOf(){return "method";}};',
 'var key={toString:null,valueOf(){return "method";}};',
 'var key={toString:0,valueOf(){return "method";}};',
 'var key={get toString(){return function(){return this.mark;};},mark:"method"};',
 'var key={__proto__:{toString(){return "method";}}};',
 'var method=function(){return this.mark;};var key={mark:"method",toString:method};',
 'var method=function(){return this.mark;};var key={toString:method.bind({mark:"method"})};',
 'class Key {static toString(){return "method";}}var key=Key;',
];
const consumers=[
 'var object={[key](){}};eval("\'"+object[key].name+"\'");',
 'var object={method:"401;"};eval(object[key]);',
 'var object={};object[key]="403;";eval(object.method);',
 'var object={};Object.defineProperty(object,key,{value:"407;"});eval(Object.getOwnPropertyDescriptor(object,key).value);',
 'class C {static [key](){}}eval("\'"+C[key].name+"\'");',
];
const subjects=definitions.flatMap(definition=>consumers.map(consumer=>definition+consumer));
for(const value of ['""','17','true','null','undefined','17n'])subjects.push(`var key={toString(){return ${value};}};var object={[key](){}};eval("'"+object[key].name+"'");`);
subjects.push('class C {}var key={toString(){C.toString=function(){return "409;";};return "method";}};var object={[key]:1};eval(C.toString());');
subjects.push('var key={toString(){throw "419;";}};try{var object={[key]:1};}catch(source){eval(source);}');
subjects.push('var key={get toString(){throw "421;";}};try{var object={[key]:1};}catch(source){eval(source);}');
const skippedFallbacks=[
 'class C {}var key={toString(){return "method";},valueOf(){C.toString=external;return "other";}};var object={[key]:1};eval(C.toString());',
 'class C {}var key={get toString(){return function(){return "method";};},valueOf(){C.toString=external;return "other";}};var object={[key]:1};eval(C.toString());',
];
test("property-key coercion follows live receiver, callable and fallback dependencies",()=>{
 for(const source of subjects){
  const reference=Bun.spawnSync(['node','-e','const values=[];require("node:vm").runInNewContext(process.argv[1],{eval:value=>values.push(value)});require("node:fs").writeSync(1,JSON.stringify(values))',source],{stdout:'pipe',stderr:'pipe'});expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});
  const expected:string[]=JSON.parse(reference.stdout.toString());expect({source,choices:sourceEvaluationInvocations(program(source)).at(-1)?.choices}).toEqual({source,choices:expect.arrayContaining(expected)});
 }
 for(const source of skippedFallbacks)expect({source,choices:sourceEvaluationInvocations(program(source)).at(-1)?.choices}).toEqual({source,choices:['class C {}']});
 for(const source of ['var key={toString(){return external;}};eval(({method:"431;"})[key]);','var key={toString(){return "method";},[Symbol.toPrimitive](){return external;}};eval(({method:"433;"})[key]);','var key=external;eval(({method:"439;"})[key]);'])expect(sourceEvaluationInvocations(program(source)).at(-1)?.choices).toBeNull();
});
test("property-key coercion and deep prototype lookup match Node in both memory modes",async()=>{
 const pieces=subjects.map((source,index)=>'{'+source.replace(/\bvar /g,'let ').replace(/eval\((.*)\);$/,`print("case${index}:"+String(eval($1)));`)+'}');
 pieces.push('{let key={toString(){return "method";},valueOf(){throw "unexpected fallback";}};let object={[key]:class {static observed=this.name;}};print("early-class-name:"+object[key].observed);}');
 pieces.push('{let events="";let key={toString(){events+="string,";return {};},valueOf(){events+="valueOf,";return "method";}};let object={[key]:(events+="value",17)};print("order:"+events+":"+object.method);}');
 pieces.push('var key0={toString(){return "deepName";}};');
 const depth=512;for(let index=1;index<depth;index++)pieces.push(`var key${index}={__proto__:key${index-1}};`);
 pieces.push(`var object={[key${depth-1}](){}};if(NATIVE_GC)$262.gc();print("deep:"+eval("'"+object[key${depth-1}].name+"'"));`);
 const source=pieces.join('\n'),directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-key-coercion-'));
 try{
  const entry=path.join(directory,'source.js');await fs.writeFile(entry,source.replaceAll('NATIVE_GC','false'));
  const node=Bun.spawnSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});',entry],{stdout:'pipe',stderr:'pipe'});expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const noGc of [false,true]){
   await fs.writeFile(entry,source.replaceAll('NATIVE_GC',String(!noGc)));const output=path.join(directory,'program-'+noGc),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build-'+noGc),isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/property-key-coercion-source.js#sloppy',setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString());
  }
 }finally{await fs.rm(directory,{recursive:true,force:true});}
},600_000);

test("unresolved coercion retains the stable eval admission diagnostic",async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-key-coercion-boundary-'));
 try{
  const entry=path.join(directory,'source.js'),messages:string[]=[];
  await fs.writeFile(entry,'var key={toString(){return external;}};eval(({method:"449;"})[key]);');
  const result=await compile({entry,output:path.join(directory,'rejected'),noGc:true,buildDir:path.join(directory,'build'),isolatedScriptRoots:[entry],initializationEntries:[entry],diagnosticWriter:message=>messages.push(message)});
  expect(result.exitCode).toBe(3);expect(messages.join('')).toContain('unknown eval() source requires --runtime-code-manifest allow-list or gated --unsafe-eval embedded Node bridge');
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});

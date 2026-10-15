import {nodeReferenceSync} from './node-reference';
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
const keys=['"source"','17','-0','true','false','null','undefined','1n','NaN','Infinity','"prefix"+17','`prefix${17}`'];
const subjects=keys.map(key=>`var key=${key};var object={source:"173;",17:"173;",0:"173;",true:"173;",false:"173;",null:"173;",undefined:"173;",1:"173;",NaN:"173;",Infinity:"173;",prefix17:"173;"};eval(object[key]);`);
subjects.push('var key="left";key="right";var object={left:"179;",right:"181;"};eval(object[key]);');
subjects.push('var key="left";[key]=["right"];var object={left:"179;",right:"181;"};eval(object[key]);');
subjects.push('var key="left";({key}={key:"right"});var object={left:"179;",right:"181;"};eval(object[key]);');
subjects.push('var holder={key:"left"};[holder.key]=["right"];var object={left:"179;",right:"181;"};eval(object[holder.key]);');
subjects.push('class C {}var key="source";var object={get source(){C.toString=function(){return "191;";};return "187;";}};object[key];eval(C.toString());');
subjects.push('var key="source";var object={};object[key]="197;";eval(object[key]);');
subjects.push('var key="source";var object={};Object.defineProperty(object,key,{value:"199;"});eval(Object.getOwnPropertyDescriptor(object,key).value);');
subjects.push('var key="source";var object={source:"211;"};eval(Reflect.getOwnPropertyDescriptor(object,key).value);');
subjects.push('var key="source";var object={source:"229;"};delete object[key];eval(String(object[key]));');
subjects.push('class C {}var object={get value(){C.toString=function(){return "251;";};return 1;}};object.value++;eval(C.toString());');
subjects.push('class C {}var object={get value(){return 1;},set value(next){C.toString=function(){return "257;";};}};object.value*=2;eval(C.toString());');
const pendingSource='class C {}C.toString=function(){return "\\\'source\\\'";};var key=eval(C.toString());var object={source:"277;"};eval(object[key]);';
test("known invalid eval alternatives are abrupt while pending sources stay deferred",()=>{
 const invalid='function () { [native code] }';
 const source=`var key=eval(${JSON.stringify(invalid)});var object={source:"281;"};eval(object[key]);`;
 const calls=sourceEvaluationInvocations(program(source),{evaluations:[{source:invalid,entry:null}]});
 expect(calls.find(call=>call.node.getText()==='eval(object[key])')?.choices).toEqual([]);
});
test("computed source keys follow one primitive projection and assignment target tree",()=>{
 for(const source of subjects){
  const reference=nodeReferenceSync(['node','-e','const values=[];require("node:vm").runInNewContext(process.argv[1],{eval:value=>values.push(value)});require("node:fs").writeSync(1,JSON.stringify(values))',source],{stdout:'pipe',stderr:'pipe'});expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});
  const expected:string[]=JSON.parse(reference.stdout.toString());
  expect({source,choices:sourceEvaluationInvocations(program(source)).at(-1)?.choices}).toEqual({source,choices:expect.arrayContaining(expected)});
 }
 expect(sourceEvaluationInvocations(program(pendingSource)).find(call=>call.node.getText()==='eval(C.toString())')?.choices).toContain("'source'");
 const mutations=['index++','++index','index--','--index','index+=1','index-=1','index*=2','index/=2','index%=2','index**=2','index<<=1','index>>=1','index>>>=1','index&=1','index|=1','index^=1'];
 for(const mutation of mutations){
  const source=`var index=0;${mutation};var object={0:"223;",1:"227;"};eval(object[index]);`;
  const reference=nodeReferenceSync(['node','-e','const values=[];require("node:vm").runInNewContext(process.argv[1],{eval:value=>values.push(value)});require("node:fs").writeSync(1,JSON.stringify(values))',source],{stdout:'pipe',stderr:'pipe'});
  expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});
  const invocation=sourceEvaluationInvocations(program(source)).at(-1);expect(invocation).toBeDefined();
  const choices=invocation!.choices;
  // Numeric domains may remain opaque; a finite proof must contain every
  // independently observed String source. Non-Strings enter eval unchanged.
  if(choices!==null)expect(choices).toEqual(expect.arrayContaining(JSON.parse(reference.stdout.toString()).filter((value:unknown)=>typeof value==="string")));
 }
 for(const source of ['var key=external;var object={source:"229;"};eval(object[key]);','var key="source";key=external;var object={source:"229;"};eval(object[key]);','var key="source";for(key of external){}var object={source:"229;"};eval(object[key]);','var key="source";for(key in external){}var object={source:"229;"};eval(object[key]);','class C {}var object={};object[external];eval(C.toString());'])expect(sourceEvaluationInvocations(program(source)).some(call=>call.choices===null)).toBe(true);
});
test("computed property sources and deep key forwarding match Node in both memory modes",async()=>{
 const pieces=subjects.map((source,index)=>'{'+source.replace(/\bvar /g,'let ').replace(/eval\((.*)\);$/,`print("case${index}:"+String(eval($1)));`)+'}');
 pieces.push('{class C {}let fn=function(first){};Object.defineProperty(fn,"length",{get(){C.toString=function(){return "107;";};return 3;}});fn.bind(null);print("effect:"+eval(C.toString()));}');
 pieces.push('{class C {}let fn=function(first){};Object.defineProperty(fn,"name",{get(){C.toString=function(){return "109;";};return "fn";}});fn.bind(null);print("name-effect:"+eval(C.toString()));}');
 pieces.push('{let fn=function(first){};Object.defineProperty(fn,"length",{get(){throw "103;";}});try{fn.bind(null);}catch(source){print("throw:"+eval(source));}}');
 pieces.push('{'+pendingSource.replace(/\bvar /g,'let ').replace('eval(object[key]);','print("pending:"+eval(object[key]));')+'}');
 pieces.push('var object={selected:"193;"};var key0="selected";');
 const depth=512;for(let index=1;index<depth;index++)pieces.push(`var key${index}=key${index-1};`);
 pieces.push(`if(NATIVE_GC)$262.gc();print("deep:"+eval(object[key${depth-1}]));`);
 const source=pieces.join('\n'),directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-computed-key-'));
 try{
  const entry=path.join(directory,'source.js');await fs.writeFile(entry,source.replaceAll('NATIVE_GC','false'));
  const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});',entry],{stdout:'pipe',stderr:'pipe'});expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const noGc of [false,true]){
   await fs.writeFile(entry,source.replaceAll('NATIVE_GC',String(!noGc)));const output=path.join(directory,'program-'+noGc),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build-'+noGc),isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/computed-property-source.js#sloppy',setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString());
  }
 }finally{await fs.rm(directory,{recursive:true,force:true});}
},600_000);

test("opaque mutated keys retain the stable eval admission diagnostic",async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-computed-key-boundary-'));
 try{
  const entry=path.join(directory,'source.js'),messages:string[]=[];
  await fs.writeFile(entry,'var index=0;index=opaque();var object={0:"263;",1:"269;"};eval(object[index]);');
  const result=await compile({entry,output:path.join(directory,'rejected'),noGc:true,buildDir:path.join(directory,'build'),isolatedScriptRoots:[entry],initializationEntries:[entry],diagnosticWriter:message=>messages.push(message)});
  expect(result.exitCode).toBe(3);expect(messages.join('')).toContain('unknown eval() source requires --runtime-code-manifest allow-list or gated --unsafe-eval embedded Node bridge');
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});

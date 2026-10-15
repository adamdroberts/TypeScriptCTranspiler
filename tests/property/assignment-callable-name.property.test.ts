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
const definitions=['function(){}','()=>0','function*(){}','async function(){}','async function*(){}','class {}','function explicit(){}','class Explicit {}','(true?function(){}:function other(){})','(0,function(){})'];
const contexts=[
 (value:string)=>`var fn;fn=${value};`,
 (value:string)=>`var fn;(fn)=${value};`,
 (value:string)=>`var fn;fn||=${value};`,
 (value:string)=>`var fn;(fn)||=${value};`,
 (value:string)=>`var fn=true;fn&&=${value};`,
 (value:string)=>`var fn=true;(fn)&&=${value};`,
 (value:string)=>`var fn=null;fn??=${value};`,
 (value:string)=>`var fn=null;(fn)??=${value};`,
 (value:string)=>`var {fn=${value}}={};`,
 (value:string)=>`var [fn=${value}]=[];`,
 (value:string)=>`function take(fn=${value}){return fn;}var fn=take();`,
 (value:string)=>`var object={};object.fn=${value};var fn=object.fn;`,
];
const subjects=definitions.flatMap(value=>contexts.map(context=>context(value)+`eval("'"+fn.name+"'");`));
for(const value of ['function(){}','function original(){}','()=>0','class {}'])subjects.push(`var existing=${value};var fn;fn=existing;eval("'"+fn.name+"'");`);
test("assignment names follow shared NamedEvaluation contexts",()=>{
 for(const source of subjects){
  const reference=nodeReferenceSync(['node','-e','require("node:fs").writeSync(1,JSON.stringify(require("node:vm").runInNewContext(process.argv[1])))',source],{stdout:'pipe',stderr:'pipe'});
  expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});
  const expected="'"+JSON.parse(reference.stdout.toString())+"'";
  expect({source,choices:sourceEvaluationInvocations(program(source)).at(-1)?.choices}).toEqual({source,choices:expect.arrayContaining([expected])});
 }
 for(const source of ['var fn;fn||=external;eval(fn.name);','var fn=function original(){};fn&&=external;eval(fn.name);','var fn=null;fn??=external;eval(fn.name);'])expect(sourceEvaluationInvocations(program(source)).some(call=>call.choices===null)).toBe(true);
});
test("assigned callable names and deep bound forwarding match Node in both memory modes",async()=>{
 const pieces=subjects.map((source,index)=>'{'+source.replace(/\bvar /g,'let ').replace(/eval\((.*)\);$/,`print("case${index}:"+String(eval($1)));`)+'}');
 pieces.push('{class C {}let fn=function(first){};Object.defineProperty(fn,"length",{get(){C.toString=function(){return "107;";};return 3;}});fn.bind(null);print("effect:"+eval(C.toString()));}');
 pieces.push('{class C {}let fn=function(first){};Object.defineProperty(fn,"name",{get(){C.toString=function(){return "109;";};return "fn";}});fn.bind(null);print("name-effect:"+eval(C.toString()));}');
 pieces.push('{let fn=function(first){};Object.defineProperty(fn,"length",{get(){throw "103;";}});try{fn.bind(null);}catch(source){print("throw:"+eval(source));}}');
 pieces.push('var target;target=function(first){};');
 const depth=512;for(let index=0;index<depth;index++)pieces.push(`var bound${index}=${index?'bound'+(index-1):'target'}.bind(null);`);
 pieces.push(`if(NATIVE_GC)$262.gc();print("deep:"+eval("\'"+bound${depth-1}.name+"\'"));`);
 const source=pieces.join('\n'),directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-assignment-callable-name-'));
 try{
  const entry=path.join(directory,'source.js');await fs.writeFile(entry,source.replaceAll('NATIVE_GC','false'));
  const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});',entry],{stdout:'pipe',stderr:'pipe'});expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const noGc of [false,true]){
   await fs.writeFile(entry,source.replaceAll('NATIVE_GC',String(!noGc)));const output=path.join(directory,'program-'+noGc),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build-'+noGc),isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/assignment-callable-name.js#sloppy',setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString());
  }
 }finally{await fs.rm(directory,{recursive:true,force:true});}
},600_000);

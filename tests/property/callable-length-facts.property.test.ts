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
const definitions=[
 'function(first,{second},[third],last=0,...rest){}',
 '(first,second=0,...rest)=>0',
 'function*(first,{second},...rest){yield 1;}',
 'async function(first,[second]=[]){return 1;}',
 'async function*(first,...rest){yield 1;}',
 '({method(first,{second},...rest){}}).method',
 'Object.getOwnPropertyDescriptor({get value(){return 1;}},"value").get',
 'Object.getOwnPropertyDescriptor({set value(input){}},"value").set',
 'class {constructor(first,[second],last=0){}}',
 'class extends class {constructor(first,second){}} {}',
];
const subjects=definitions.flatMap(definition=>[
 'var fn='+definition+';eval(String(fn.length));',
 'var fn='+definition+';var bound=fn.bind(null,...[1,2]);eval(String(bound.length));',
 'var fn='+definition+';eval(String(Object.getOwnPropertyDescriptor(fn,"length").value));',
]);
subjects.push(...['3.75','-2','NaN','Infinity','-Infinity','"9"','{}','1n'].map(value=>'var fn=function(){};Object.defineProperty(fn,"length",{value:'+value+'});var bound=fn.bind(null,1);eval(String(bound.length));'));
test("callable length facts follow the canonical parameter prefix and bound actual List",()=>{
 const oracle=nodeReferenceSync(["node","-e",'const vm=require("node:vm");require("node:fs").writeSync(1,JSON.stringify(JSON.parse(process.argv[1]).map(source=>{const values=[];new vm.Script(source).runInNewContext({eval:value=>values.push(value)});return values;})));',JSON.stringify(subjects)],{stdout:"pipe",stderr:"pipe"});
 expect({exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exitCode:0,stderr:""});const expected:string[][]=JSON.parse(oracle.stdout.toString());
 for(const[index,source]of subjects.entries())expect({source,complete:sourceEvaluationInvocations(program(source)).some(call=>call.choices!==null&&expected[index]!.every(value=>call.choices!.includes(value)))}).toEqual({source,complete:true});
 for(const source of ['var fn=function(first){};Object.defineProperty(fn,"length",{value:external});eval(String(fn.length));','var fn=function(first){};var bound=fn.bind(null);external(bound);eval(String(bound.length));'])expect(sourceEvaluationInvocations(program(source)).some(call=>call.choices===null)).toBe(true);
 const unknown='var fn=function(first){};Object.defineProperty(fn,"length",{value:external});var bound=fn.bind(null);eval(bound.length);';
 expect(sourceEvaluationInvocations(program(unknown)).map(call=>call.choices)).toEqual([[]]);
 const changed='var bound=(function(first,second){}).bind(null);Object.defineProperty(bound,"length",{value:"101;"});eval(bound.length);';
 expect(sourceEvaluationInvocations(program(changed)).find(call=>call.node.getText()==='eval(bound.length)')?.choices).toContain('101;');
 const effect='class C {}var fn=function(first){};Object.defineProperty(fn,"length",{get(){C.toString=external;return 3;}});fn.bind(null);eval(C.toString());';
 expect(sourceEvaluationInvocations(program(effect)).some(call=>call.choices===null)).toBe(true);
 const nameEffect='class C {}var fn=function(first){};Object.defineProperty(fn,"name",{get(){C.toString=external;return "fn";}});fn.bind(null);eval(C.toString());';
 expect(sourceEvaluationInvocations(program(nameEffect)).some(call=>call.choices===null)).toBe(true);
 const abrupt='var fn=function(first){};Object.defineProperty(fn,"length",{get(){throw "103;";}});try{fn.bind(null);}catch(source){eval(source);}';
 expect(sourceEvaluationInvocations(program(abrupt)).find(call=>call.node.getText()==='eval(source)')?.choices).toEqual(['103;']);
});
test("callable length and deep bound forwarding match Node in both memory modes",async()=>{
 const pieces=subjects.map((source,index)=>'{'+source.replace(/\bvar /g,'let ').replace(/eval\((.*)\);$/,`print("case${index}:"+String(eval($1)));`)+'}');
 pieces.push('{class C {}let fn=function(first){};Object.defineProperty(fn,"length",{get(){C.toString=function(){return "107;";};return 3;}});fn.bind(null);print("effect:"+eval(C.toString()));}');
 pieces.push('{class C {}let fn=function(first){};Object.defineProperty(fn,"name",{get(){C.toString=function(){return "109;";};return "fn";}});fn.bind(null);print("name-effect:"+eval(C.toString()));}');
 pieces.push('{let fn=function(first){};Object.defineProperty(fn,"length",{get(){throw "103;";}});try{fn.bind(null);}catch(source){print("throw:"+eval(source));}}');
 pieces.push('var target=function(first,{second},third=0,...rest){};');
 const depth=512;for(let index=0;index<depth;index++)pieces.push(`var bound${index}=${index?'bound'+(index-1):'target'}.bind(null);`);
 pieces.push(`if(NATIVE_GC)$262.gc();print("deep:"+eval(String(bound${depth-1}.length)));`);
 const source=pieces.join('\n'),directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-callable-length-'));
 try{
  const entry=path.join(directory,'source.js');await fs.writeFile(entry,source.replaceAll('NATIVE_GC','false'));
  const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});',entry],{stdout:'pipe',stderr:'pipe'});expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const noGc of [false,true]){
   await fs.writeFile(entry,source.replaceAll('NATIVE_GC',String(!noGc)));const output=path.join(directory,'program-'+noGc),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build-'+noGc),isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/callable-length-facts.js#sloppy',setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString());
  }
 }finally{await fs.rm(directory,{recursive:true,force:true});}
},600_000);

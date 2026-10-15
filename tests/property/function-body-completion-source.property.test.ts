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
const bodies=[
 '',
 'return;',
 'if(flag)return "527;";',
 'if(flag)return "529;";else return;',
 'throw "531;";',
 'if(flag)throw "533;";else throw "535;";',
 'try{return "537;";}finally{throw "539;";}',
 'try{throw "541;";}finally{return "543;";}',
 'try{throw "547;";}catch(source){return source;}',
 'try{throw "549;";}catch(source){throw source;}finally{}',
 'switch(flag){case true:return "551;";default:throw "553;";}',
 'switch(flag){case true:return "557;";}',
 'label:{if(flag)break label;return "559;";}',
 'while(true){if(flag)break;throw "563;";}',
 'do{if(flag)break;return "569;";}while(false);',
 'for(;;){if(flag)break;throw "571;";}',
 'outer:while(true){if(flag)break outer;throw "577;";}',
 'return later();function later(){return "579;";}',
];
const subjects=bodies.flatMap(body=>[false,true].map(flag=>`var flag=${flag};function run(){${body}}try{eval("'"+String(run())+"'");}catch(source){eval(source);}`));
const retainedSources=[
 'class C {}var first={toString(){throw "583;";}};var body={toString(){C.toString=external;return "return 1;";}};try{Function(first,body);}catch(source){eval(source);}eval(C.toString());',
 'class C {}var key={get toString(){throw "587;";},valueOf(){C.toString=external;return "other";}};try{String(key);}catch(source){eval(source);}eval(C.toString());',
 'class C {}function run(){throw "593;";C.toString=external;}try{run();}catch(source){eval(source);}eval(C.toString());',
 'class C {}function run(){return;C.toString=external;}run();eval(C.toString());',
 'class C {}function run(){if(false){C.toString=external;}while(false){C.toString=external;}}run();eval(C.toString());',
];
test("function completion records retain fall-through, bare returns and abrupt sources",()=>{
 for(const source of subjects){
  const oracle=nodeReferenceSync(['node','-e','const values=[];require("node:vm").runInNewContext(process.argv[1],{eval:value=>values.push(value)});require("node:fs").writeSync(1,JSON.stringify(values))',source],{stdout:'pipe',stderr:'pipe'});expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
  const expected:string[]=JSON.parse(oracle.stdout.toString()),calls=sourceEvaluationInvocations(program(source));
  expect({source,choices:calls.find(call=>call.node.getText().includes('String(run())'))?.choices}).toEqual({source,choices:expect.any(Array)});
  const admitted=calls.flatMap(call=>call.choices??[]);expect({source,missing:expected.filter(value=>!admitted.includes(value)),choices:calls.map(call=>call.choices)}).toEqual({source,missing:[],choices:expect.any(Array)});
 }
 for(const source of retainedSources){
  const calls=sourceEvaluationInvocations(program(source));expect({source,choices:calls.find(call=>call.node.getText()==='eval(C.toString())')?.choices}).toEqual({source,choices:['class C {}']});
 }
 for(const body of ['throw "621;";','if(flag)throw "623;";else throw "625;";','while(true){throw "627;";}','try{return "629;";}finally{throw "631;";}']){
  const source=`var flag=external;function run(){${body}}try{eval(String(run()));}catch(source){eval(source);}`;
  expect(sourceEvaluationInvocations(program(source)).find(call=>call.node.getText()==='eval(String(run()))')?.choices).toEqual([]);
 }
});
test("function completion and a deep statement tree match Node in both memory modes",async()=>{
 const pieces=subjects.map((source,index)=>'{function observe(source){print("case'+index+':"+String(eval(source)));}'+source.replace(/\bvar /g,'let ').replaceAll('eval(','observe(')+'}');
 pieces.push('{class C {}let first={toString(){throw "599;";}},body={toString(){C.toString=function(){return "unexpected mutation";};return "return 1;";}};try{Function(first,body);}catch(source){print("ordered-throw:"+eval(source));}print("retained:"+eval("("+C.toString()+").name"));}');
 const depth=512;pieces.push(`function deep(){${'{'.repeat(depth)}throw "601;";${'}'.repeat(depth)}return "unexpected return";}try{deep();}catch(source){print("deep:"+eval(source));}`);
 const source=pieces.join('\n'),directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-function-completion-'));
 try{
  const entry=path.join(directory,'source.js');await fs.writeFile(entry,source.replaceAll('NATIVE_GC','false'));
  const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});',entry],{stdout:'pipe',stderr:'pipe'});expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const noGc of [false,true]){
   await fs.writeFile(entry,source.replaceAll('NATIVE_GC',String(!noGc)));const output=path.join(directory,'program-'+noGc),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build-'+noGc),isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/function-body-completion-source.js#sloppy',setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString());
  }
 }finally{await fs.rm(directory,{recursive:true,force:true});}
},600_000);

import {expect,test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import ts from "typescript";
import {compile} from "../../src/compile";
import {sourceEvaluationInvocations} from "../../src/source-value-flow";
import {parseHostObservation} from "../test262/protocol";
import {runtimeObjectPrototypeMethods} from "../../src/global-bindings";
function program(source:string):ts.Program {
 const name="source.js",options={allowJs:true,noLib:true,target:ts.ScriptTarget.ESNext};
 const host=ts.createCompilerHost(options);host.getSourceFile=file=>file===name?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>file===name?source:undefined;host.fileExists=file=>file===name;return ts.createProgram([name],options,host);
}
const definitions=[
 'class C {method=function /* retained */(){return 41;};}',
 'class C {["method"]=()=>43;}',
 'class C {constructor(method){this.method=method;}}',
 'class Base {constructor(method){this.method=method;}}class C extends Base {}',
 'class Base {constructor(method){this.method=method;}}class C extends Base {constructor(...values){super(...values);}}',
 'class Base {constructor(method){this.seed=method;}}class C extends Base {method=this.seed;}',
 'class C {method=function*(){yield 47;};}',
 'class C {method=async()=>53;}',
 'class C {method=async function*(){yield 59;};}',
];
test("Object prototype descriptors share the runtime collection and source identities",()=>{
 const names=[...runtimeObjectPrototypeMethods.keys()];
 const descriptors=Object.getOwnPropertyDescriptors(Object.prototype);
 expect([...names].sort()).toEqual(Object.keys(descriptors).filter(name=>name!=="constructor"&&typeof descriptors[name]!.value==="function").sort());
 const oracle=Bun.spawnSync(["node","-e",'process.stdout.write(JSON.stringify(JSON.parse(process.argv[1]).map(name=>Function.prototype.toString.call(Object.prototype[name]))));',JSON.stringify(names)],{stdout:"pipe",stderr:"pipe"});
 expect({exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exitCode:0,stderr:""});
 const expected:string[]=JSON.parse(oracle.stdout.toString());
 for(const[index,name]of names.entries())expect(sourceEvaluationInvocations(program(`eval(Object.prototype[${JSON.stringify(name)}].toString());`)).map(call=>call.choices)).toEqual([[expected[index]!]]);
 expect(sourceEvaluationInvocations(program('class C {}eval(String(new C().missing));')).map(call=>call.choices)).toEqual([["undefined"]]);
 expect(sourceEvaluationInvocations(program('external();eval(Object.prototype.toString.toString());')).some(call=>call.choices===null)).toBe(true);
});
test("field declarations, constructor writes and delegation share owner cells",()=>{
 const sources=definitions.map(definition=>definition+'var item=new C(function(){return 61;});eval(item.method.toString());');
 const oracle=Bun.spawnSync(["node","-e",'const vm=require("node:vm");process.stdout.write(JSON.stringify(JSON.parse(process.argv[1]).map(source=>{const values=[];new vm.Script(source).runInNewContext({eval:value=>values.push(value)});return values;})));',JSON.stringify(sources)],{stdout:"pipe",stderr:"pipe"});expect({exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exitCode:0,stderr:""});
 const expected:string[][]=JSON.parse(oracle.stdout.toString());
 for(const[index,source]of sources.entries()){
  const calls=sourceEvaluationInvocations(program(source));
  expect({source,complete:calls.length>0&&calls.every(call=>call.choices!==null&&expected[index]!.every(value=>call.choices!.includes(value)))}).toEqual({source,complete:true});
 }
 for(const source of ['class C {method=external;}eval(new C().method.toString());','class C extends external {method=()=>67;}eval(new C().method.toString());','class C {#method=()=>71;read(){return this.#method;}}eval(new C().read().toString());','class C {method=()=>73;}external();eval(new C().method.toString());'])expect({source,incomplete:sourceEvaluationInvocations(program(source)).some(call=>call.choices===null)}).toEqual({source,incomplete:true});
 for(const source of ['class C {}eval(String(C()));','eval(String(Function.prototype.toString.call(undefined)));'])expect(sourceEvaluationInvocations(program(source)).map(call=>call.choices)).toEqual([[]]);
});
test("pending AOT source expansion cannot become a prototype effect or a completed source proof",()=>{
 const source='class C {read(){return 107;}}var Copy=eval("("+C.toString()+")");new Copy().read();eval(C.toString());eval(eval("1;"));';
 const calls=sourceEvaluationInvocations(program(source));
 expect(calls.find(call=>call.node.getText()==='eval(C.toString())')?.choices).toEqual(['class C {read(){return 107;}}']);
 expect(calls.find(call=>call.node.getText()==='eval(eval("1;"))')?.choices).toBeNull();
});
test("field source closes eval and deep constructor delegation matches Node",async()=>{
 const pieces=[
  'function check(name,value){print(name+":"+value);}',
  ...definitions.map((definition,index)=>'{'+definition+`var item=new C(function(){return 61;});check("text${index}",item.method.toString());}`),
  'class Holder {method=function(){return 79;};}var item=new Holder();check("eval",eval("("+item.method.toString()+")()"));',
  'class Base {constructor(method){this.method=method;}}',
  'class Explicit extends Base {constructor(...args){super(...args);}extra=()=>83;}var explicit=new Explicit(function(){return 89;});check("super",eval("("+explicit.method.toString()+")()"));',
  'check("primitive-throw",(function(){try{eval(String(Function.prototype.toString.call(undefined)));}catch(error){return error instanceof TypeError;}})());',
 ];
 for(let index=0;index<256;index++)pieces.push(`class Level${index} extends ${index?"Level"+(index-1):"Base"} {field${index}=()=>97;}`);
 pieces.push('var deep=new Level255(function(){return 101;});if(NATIVE_GC)$262.gc();check("deep",eval("("+deep.method.toString()+")()"));check("deep-field",eval("("+deep.field255.toString()+")()"));');
 const source=pieces.join("\n"),directory=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-instance-field-"));
 try {
  const entry=path.join(directory,"source.js");await fs.writeFile(entry,source.replaceAll("NATIVE_GC","false"));
  const node=Bun.spawnSync(["node","-e",'const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});',entry],{stdout:"pipe",stderr:"pipe"});expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:""});
  for(const noGc of [false,true]){
   await fs.writeFile(entry,source.replaceAll("NATIVE_GC",String(!noGc)));const output=path.join(directory,"program-"+noGc),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,"build-"+noGc),isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:"test262-native-observation",scenarioId:"property/instance-field-source.js#sloppy",setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
   const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe("normal");expect(observation.stdout).toBe(node.stdout.toString());
  }
 } finally {await fs.rm(directory,{recursive:true,force:true});}
},600_000);

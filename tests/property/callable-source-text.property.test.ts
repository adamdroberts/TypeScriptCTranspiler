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
 const name="source.js", options={allowJs:true,noLib:true,target:ts.ScriptTarget.ESNext};
 const host=ts.createCompilerHost(options);
 host.getSourceFile=file=>file===name?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>file===name?source:undefined;host.fileExists=file=>file===name;
 return ts.createProgram([name],options,host);
}
const definitions=[
 'function /* retained comment */ named(value = 41) { return value; }',
 '(value = 43) => value',
 'function* named(value = 47) { yield value; }',
 'async function named(value = 53) { return value; }',
 'async function* named(value = 59) { yield value; }',
 '({method(value = 61) { return value; }}).method',
 '({*method(value = 67) { yield value; }}).method',
 '({async method(value = 71) { return value; }}).method',
];
const adapters=["f.toString()","f.toString.call(f)","f.toString.apply(f,[])","Reflect.apply(f.toString,f,[])","f.toString.bind(f)()"];
function oracle(sources:string[]):string[][] {
 const result=nodeReferenceSync(["node","-e",'const vm=require("node:vm");require("node:fs").writeSync(1,JSON.stringify(JSON.parse(process.argv[1]).map(source=>{const values=[];new vm.Script(source).runInNewContext({eval:value=>values.push(value)});return values;})));',JSON.stringify(sources)],{stdout:"pipe",stderr:"pipe"});
 expect({exitCode:result.exitCode,stderr:result.stderr.toString()}).toEqual({exitCode:0,stderr:""});
 return JSON.parse(result.stdout.toString());
}
test("callable text follows retained definition spans and inherited method identity",()=>{
 const sources=definitions.flatMap(definition=>adapters.map(adapter=>`var f=${definition};eval(${adapter});`));
 sources.push('function factory(){return function(){return 73;};}eval(factory().toString());',
 'var f=function(){};f.toString=function(){return "79;";};eval(f.toString());',
 'var f=function(){};eval(f.bind(null).toString());',
 'eval(String.toString());',
 'var f=function(){return this.text;};eval(f.bind({text:"97;"})());');
 const expected=oracle(sources);
 for(const[index,source]of sources.entries()){
  const calls=sourceEvaluationInvocations(program(source));
  expect({source,complete:calls.length>0&&calls.every(call=>call.choices!==null&&expected[index]!.every(value=>call.choices!.includes(value)))}).toEqual({source,complete:true});
 }
 for(const source of ['var f=function(){};f.toString=external;eval(f.toString());','var f=flag?function(){}:external;eval(f.toString());','eval(external.toString());'])
  expect(sourceEvaluationInvocations(program(source)).some(call=>call.choices===null)).toBe(true);
});
test("inherited callable text closes eval sources and matches Node in both memory modes",async()=>{
 const depth=512, source=[
  'function check(name,value){print(name+":"+value);}',
  ...definitions.map((definition,index)=>`var f${index}=${definition};check("text${index}",f${index}.toString());`),
  'var f=function /* exact */(){return 83;};check("eval",eval("("+f.toString()+")()"));',
  'var convert=f.toString;check("method",eval("("+convert.call(f)+")()"));',
  'var dynamic=Function("value","return value+1;");check("dynamic",dynamic.toString());check("dynamic-eval",eval("("+dynamic.toString()+")(89)"));',
  'var bound=f.bind(null);check("bound",bound.toString());',
  'var capability=Promise.withResolvers();Object.defineProperty(capability.resolve,"name",{get(){throw "unexpected name read"}});check("resolver",eval(JSON.stringify(Function.prototype.toString.call(capability.resolve))));check("rejecter",eval(JSON.stringify(Function.prototype.toString.call(capability.reject))));',
  'check("prototype",eval(JSON.stringify(Function.prototype.toString.call(Function.prototype))));',
  'var graph='+ '{next:'.repeat(depth)+'{f:f}'+ '}'.repeat(depth)+';',
  'if(NATIVE_GC)$262.gc();check("deep",eval("("+graph'+'.next'.repeat(depth)+'.f.toString()+")()"));',
 ].join("\n");
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-callable-text-"));
 try {
  const entry=path.join(directory,"source.js");await fs.writeFile(entry,source.replaceAll("NATIVE_GC","false"));
  const node=nodeReferenceSync(["node","-e",'const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});',entry],{stdout:"pipe",stderr:"pipe"});
  expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:""});
  for(const noGc of [false,true]){
   await fs.writeFile(entry,source.replaceAll("NATIVE_GC",String(!noGc)));
   const output=path.join(directory,"program-"+noGc), diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,"build-"+noGc),isolatedScriptRoots:[entry],initializationEntries:[entry],
    test262Observation:{kind:"test262-native-observation",scenarioId:"property/callable-source-text.js#sloppy",setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
   const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000});
   expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe("normal");
   expect(observation.stdout).toBe(node.stdout.toString());
  }
 } finally {await fs.rm(directory,{recursive:true,force:true});}
},600_000);

test("non-callable function-text receivers retain abrupt completion before eval",()=>{
 const receivers=['undefined','null','false','17','19n','Symbol("receiver")','{}','[]'];
 const sources=receivers.map(receiver=>`var receiver=${receiver};try{eval(Function.prototype.toString.call(receiver));}catch(error){if(!(error instanceof TypeError))throw error;}`);
 expect(oracle(sources)).toEqual(sources.map(()=>[]));
 for(const source of sources){
  const calls=sourceEvaluationInvocations(program(source));
  expect({source,normalSources:calls.flatMap<string|null>(call=>call.choices??[null])}).toEqual({source,normalSources:[]});
 }
});

test("represented native callable owners retain anonymous text without reading mutable metadata",()=>{
 const sources=[
  'const capability=Promise.withResolvers();eval(Function.prototype.toString.call(capability.resolve));',
  'const capability=Promise.withResolvers();Object.defineProperty(capability.resolve,"name",{get(){throw "unexpected name read"}});eval(Function.prototype.toString.call(capability.resolve));',
  'const capability=Promise.withResolvers();eval(Function.prototype.toString.call(capability.reject));',
  'eval(Function.prototype.toString.call(Function.prototype));',
 ];
 const expected=oracle(sources);expect(expected).toEqual(sources.map(()=>['function () { [native code] }']));
 for(const source of sources)expect(sourceEvaluationInvocations(program(source)).map(call=>call.choices)).toEqual([['function () { [native code] }']]);
});

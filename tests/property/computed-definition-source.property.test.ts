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
const contexts=[
 (key:string)=>`var key=${key};var object={[key](){}};var fn=object[key];`,
 (key:string)=>`var key=${key};var object={*[key](){yield 1;}};var fn=object[key];`,
 (key:string)=>`var key=${key};var object={async [key](){return 1;}};var fn=object[key];`,
 (key:string)=>`var key=${key};var object={async *[key](){yield 1;}};var fn=object[key];`,
 (key:string)=>`var key=${key};var object={get [key](){return 1;}};var fn=Object.getOwnPropertyDescriptor(object,key).get;`,
 (key:string)=>`var key=${key};var object={set [key](value){}};var fn=Object.getOwnPropertyDescriptor(object,key).set;`,
 (key:string)=>`var key=${key};class C {[key](){}}var fn=new C()[key];`,
 (key:string)=>`var key=${key};class C {static [key](){}}var fn=C[key];`,
 (key:string)=>`var key=${key};class C {static get [key](){return 1;}}var fn=Object.getOwnPropertyDescriptor(C,key).get;`,
 (key:string)=>`var key=${key};class C {static set [key](value){}}var fn=Object.getOwnPropertyDescriptor(C,key).set;`,
 (key:string)=>`var key=${key};var object={[key]:function(){}};var fn=object[key];`,
 (key:string)=>`var key=${key};var object={[key]:function explicit(){}};var fn=object[key];`,
 (key:string)=>`var key=${key};var existing=function existing(){};var object={[key]:existing};var fn=object[key];`,
 (key:string)=>`var key=${key};class C {[key]=()=>0;}var fn=new C()[key];`,
 (key:string)=>`var key=${key};class C {static [key]=class {};}var fn=C[key];`,
];
const subjects=contexts.map(context=>context('"method"')+`eval("'"+fn.name+"'");`);
for(const key of ['17','-0','true','null','1n','"prefix"+17'])subjects.push(contexts[0]!(key)+`eval("'"+fn.name+"'");`);
subjects.push('var key="first";key="last";var object={[key](){}};eval("\'"+object[key].name+"\'");');
subjects.push('var key="source";var object={[key]:"283;"};eval(object[key]);');
subjects.push('class C {}var key="value";var object={get [key](){C.toString=function(){return "293;";};return 1;}};object[key];eval(C.toString());');
subjects.push('class C {}var key="value";var object={set [key](value){C.toString=function(){return "307;";};}};object[key]=1;eval(C.toString());');
for(const context of contexts)subjects.push(context('"first"').replace('var key="first";','var key="first";key="last";')+`eval("'"+fn.name+"'");`);
subjects.push('var key="first";var object={[key](){}};key="last";eval("\'"+object.first.name+"\'");');
test("computed definitions and names share one primitive key and syntax-input projection",()=>{
 for(const source of subjects){
  const reference=Bun.spawnSync(['node','-e','const values=[];require("node:vm").runInNewContext(process.argv[1],{eval:value=>values.push(value)});require("node:fs").writeSync(1,JSON.stringify(values))',source],{stdout:'pipe',stderr:'pipe'});expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});
  const expected:string[]=JSON.parse(reference.stdout.toString());expect({source,choices:sourceEvaluationInvocations(program(source)).at(-1)?.choices}).toEqual({source,choices:expect.arrayContaining(expected)});
 }
 for(const source of ['var key=external;var object={[key](){}};eval(object[key].name);','var key=external;class C {static [key](){}}eval(C[key].name);','class C {}var object={[external]:1};eval(C.toString());'])expect(sourceEvaluationInvocations(program(source)).some(call=>call.choices===null)).toBe(true);
});
test("computed definitions and deep key forwarding match Node in both memory modes",async()=>{
 const pieces=subjects.map((source,index)=>'{'+source.replace(/\bvar /g,'let ').replace(/eval\((.*)\);$/,`print("case${index}:"+String(eval($1)));`)+'}');
 pieces.push('{class C {}let fn=function(first){};Object.defineProperty(fn,"length",{get(){C.toString=function(){return "107;";};return 3;}});fn.bind(null);print("effect:"+eval(C.toString()));}');
 pieces.push('{class C {}let fn=function(first){};Object.defineProperty(fn,"name",{get(){C.toString=function(){return "109;";};return "fn";}});fn.bind(null);print("name-effect:"+eval(C.toString()));}');
 pieces.push('{let fn=function(first){};Object.defineProperty(fn,"length",{get(){throw "103;";}});try{fn.bind(null);}catch(source){print("throw:"+eval(source));}}');
 pieces.push('{let key="first";key="last";let object={[key]:class {static observed=this.name;}};print("early-class-name:"+object[key].observed);}');
 pieces.push('var key0="deepName";');
 const depth=512;for(let index=1;index<depth;index++)pieces.push(`var key${index}=key${index-1};`);
 pieces.push(`var object={[key${depth-1}](){}};if(NATIVE_GC)$262.gc();print("deep:"+eval("'"+object[key${depth-1}].name+"'"));`);
 const source=pieces.join('\n'),directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-computed-definition-'));
 try{
  const entry=path.join(directory,'source.js');await fs.writeFile(entry,source.replaceAll('NATIVE_GC','false'));
  const node=Bun.spawnSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});',entry],{stdout:'pipe',stderr:'pipe'});expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const noGc of [false,true]){
   await fs.writeFile(entry,source.replaceAll('NATIVE_GC',String(!noGc)));const output=path.join(directory,'program-'+noGc),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build-'+noGc),isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/computed-definition-source.js#sloppy',setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString());
  }
 }finally{await fs.rm(directory,{recursive:true,force:true});}
},600_000);

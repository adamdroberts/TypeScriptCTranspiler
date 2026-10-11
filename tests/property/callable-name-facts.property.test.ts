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
 'function explicit(){}', 'function(){}', '()=>0', 'function*(){}', 'async function(){}', 'async function*(){}',
 'class Named {}', 'class {}', '({method(){}}).method',
 'Object.getOwnPropertyDescriptor({get value(){return 1;}},"value").get',
 'Object.getOwnPropertyDescriptor({set value(input){}},"value").set',
 'Object.getOwnPropertyDescriptor(class C {static get value(){return 1;}},"value").get',
 '({["computed"](){}}).computed', '({field:function(){}}).field',
 '(true?function(){}:function other(){})', '(0,function(){})'
];
const subjects=definitions.flatMap(definition=>[
 `var fn=${definition};eval("'"+fn.name+"'");`,
 `var fn=${definition};var bound=fn.bind(null);eval("'"+bound.name+"'");`,
 `var fn=${definition};eval("'"+Object.getOwnPropertyDescriptor(fn,"name").value+"'");`
]);
for(const value of ['"changed"','17','null','{}'])subjects.push(`var fn=function original(){};Object.defineProperty(fn,"name",{value:${value}});var bound=fn.bind(null);eval("'"+bound.name+"'");`);
subjects.push('var fn=function original(){};Object.defineProperty(fn,"name",{get(){return "getter";}});var bound=fn.bind(null);eval("\'"+bound.name+"\'");');
test("shared callable names retain syntactic names and reactive bound metadata",()=>{
 for(const source of subjects){
  const reference=Bun.spawnSync(['node','-e','require("node:fs").writeSync(1,JSON.stringify(require("node:vm").runInNewContext(process.argv[1])))',source],{stdout:'pipe',stderr:'pipe'});
  expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});
  const expected="'"+JSON.parse(reference.stdout.toString())+"'";
  expect({source,choices:sourceEvaluationInvocations(program(source)).at(-1)?.choices}).toEqual({source,choices:expect.arrayContaining([expected])});
 }
 for(const source of ['var fn=function(){};Object.defineProperty(fn,"name",{value:"prefix"+external});var bound=fn.bind(null);eval(bound.name);','var fn=function(){};Object.defineProperty(fn,"name",{value:external});var bound=fn.bind(null);eval("\'"+bound.name+"\'");','var object={[external](){}};eval(object[external].name);'])expect(sourceEvaluationInvocations(program(source)).some(call=>call.choices===null)).toBe(true);
 const abrupt='var fn=function(){};Object.defineProperty(fn,"name",{get(){throw "113;";}});try{fn.bind(null);}catch(source){eval(source);}';
 expect(sourceEvaluationInvocations(program(abrupt)).find(call=>call.node.getText()==='eval(source)')?.choices).toEqual(['113;']);
});
test("callable names and deep bound forwarding match Node in both memory modes",async()=>{
 const pieces=subjects.map((source,index)=>'{'+source.replace(/\bvar /g,'let ').replace(/eval\((.*)\);$/,`print("case${index}:"+String(eval($1)));`)+'}');
 pieces.push('{class C {}let fn=function(first){};Object.defineProperty(fn,"length",{get(){C.toString=function(){return "107;";};return 3;}});fn.bind(null);print("effect:"+eval(C.toString()));}');
 pieces.push('{class C {}let fn=function(first){};Object.defineProperty(fn,"name",{get(){C.toString=function(){return "109;";};return "fn";}});fn.bind(null);print("name-effect:"+eval(C.toString()));}');
 pieces.push('{let fn=function(first){};Object.defineProperty(fn,"length",{get(){throw "103;";}});try{fn.bind(null);}catch(source){print("throw:"+eval(source));}}');
 pieces.push('var target=function targetName(first){};');
 const depth=512;for(let index=0;index<depth;index++)pieces.push(`var bound${index}=${index?'bound'+(index-1):'target'}.bind(null);`);
 pieces.push(`if(NATIVE_GC)$262.gc();print("deep:"+eval("\'"+bound${depth-1}.name+"\'"));`);
 const source=pieces.join('\n'),directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-callable-name-'));
 try{
  const entry=path.join(directory,'source.js');await fs.writeFile(entry,source.replaceAll('NATIVE_GC','false'));
  const node=Bun.spawnSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});',entry],{stdout:'pipe',stderr:'pipe'});expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const noGc of [false,true]){
   await fs.writeFile(entry,source.replaceAll('NATIVE_GC',String(!noGc)));const output=path.join(directory,'program-'+noGc),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build-'+noGc),isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/callable-name-facts.js#sloppy',setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString());
  }
 }finally{await fs.rm(directory,{recursive:true,force:true});}
},600_000);

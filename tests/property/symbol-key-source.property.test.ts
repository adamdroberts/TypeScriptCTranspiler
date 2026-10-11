import {expect,test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import ts from "typescript";
import {compile} from "../../src/compile";
import {sourceConstructorInvocations,sourceEvaluationInvocations} from "../../src/source-value-flow";
import {parseHostObservation} from "../test262/protocol";
function program(source:string):ts.Program {
 const name="source.js",options={allowJs:true,noLib:true,target:ts.ScriptTarget.ESNext};
 const host=ts.createCompilerHost(options);host.getSourceFile=file=>file===name?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>file===name?source:undefined;host.fileExists=file=>file===name;return ts.createProgram([name],options,host);
}
const keys=['Symbol.iterator','Symbol.for("source-key")','Symbol("source-key")','Symbol()'];
const consumers=[
 'var object={[key]:"701;"};eval(object[key]);',
 'var object={};object[key]="703;";var alias=key;eval(object[alias]);',
 'var object={};Object.defineProperty(object,key,{value:"707;"});eval(Object.getOwnPropertyDescriptor(object,key).value);',
 'var object={};Object.defineProperties(object,{[key]:{value:"709;"}});eval(Object.getOwnPropertyDescriptors(object)[key].value);',
 'var object={[key]:"719;"};var {[key]:source}=object;eval(source);',
 'var object={[key](){}};eval("\'"+object[key].name+"\'");',
 'class C {static [key](){return "727;";}}eval(C[key]());eval("\'"+C[key].name+"\'");',
 'var object={get [key](){return "733;";}};eval(object[key]);',
 'class C {}var object={set [key](value){C.toString=function(){return "739;";};}};object[key]=1;eval(C.toString());',
];
const hooks=[
 'var key={code:"743;",[Symbol.toPrimitive](hint){if(hint!=="string")throw "wrong hint";return this.code;}};',
 'var key={code:"743;",get [Symbol.toPrimitive](){return function(hint){return this.code;};}};',
 'var key={code:"743;",__proto__:{[Symbol.toPrimitive](){return this.code;}}};',
 'class Key {static [Symbol.toPrimitive](){return "743;";}}var key=Key;',
 'var method=function(){return this.code;};var key={[Symbol.toPrimitive]:method.bind({code:"743;"})};',
 'var key={[Symbol.toPrimitive]:null,toString(){return "743;";}};',
 'var key={[Symbol.toPrimitive]:undefined,toString(){return "743;";}};',
];
const subjects=keys.flatMap(expression=>consumers.map(consumer=>`var key=${expression};${consumer}`));
subjects.push(...hooks.map(definition=>definition+'eval(String(key));'));
subjects.push(
 'var first=Symbol("same"),second=Symbol("same");var object={[first]:"751;",[second]:"757;"};eval(object[first]);eval(object[second]);',
 'function make(){return Symbol("same");}var first=make(),second=make();var object={[first]:"761;"};eval("\'"+String(object[second])+"\'");',
 'var symbol=Symbol.for("hook-result");var key={[Symbol.toPrimitive](){return symbol;}};var object={[key]:"769;"};eval(object[symbol]);',
 `var key={[Symbol.toPrimitive](){return ${JSON.stringify("return '773;';")};}};var fn=Function(key);eval(fn());`,
 'var key=Symbol.for("source-key");eval("\'"+Symbol.keyFor(key)+"\'");eval("\'"+String(key)+"\'");',
 'var key=Symbol();eval("\'"+String(key)+"\'");',
);
const retained=[
 'class C {}var key={get [Symbol.toPrimitive](){throw "787;";},toString(){C.toString=external;return "bad";}};try{String(key);}catch(source){eval(source);}eval(C.toString());',
 'class C {}var key={[Symbol.toPrimitive](){throw "797;";},toString(){C.toString=external;return "bad";}};try{String(key);}catch(source){eval(source);}eval(C.toString());',
 'class C {}var key={[Symbol.toPrimitive]:0,toString(){C.toString=external;return "bad";}};try{String(key);}catch(error){}eval(C.toString());',
];
test("Symbol keys and exotic string-hint conversion share the property graph",()=>{
 for(const source of subjects){
  if(source.includes('var fn=Function(key)')){expect(sourceConstructorInvocations(program(source)).at(-1)?.choices).toEqual([["return '773;';"]]);continue;}
  const oracle=Bun.spawnSync(['node','-e','const values=[];require("node:vm").runInNewContext(process.argv[1],{eval:value=>values.push(value)});require("node:fs").writeSync(1,JSON.stringify(values))',source],{stdout:'pipe',stderr:'pipe'});
  expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
  const calls=sourceEvaluationInvocations(program(source)),admitted=calls.flatMap(call=>call.choices??[]);
  const expected=JSON.parse(oracle.stdout.toString());expect({source,missing:expected.filter((value:unknown)=>typeof value==='string'&&!admitted.includes(value)),unknown:calls.filter(call=>call.choices===null).map(call=>call.node.getText())}).toEqual({source,missing:[],unknown:[]});
 }
 for(const source of retained)expect(sourceEvaluationInvocations(program(source)).find(call=>call.node.getText()==='eval(C.toString())')?.choices).toEqual(['class C {}']);
 for(const expression of ['String({[Symbol.toPrimitive](){return Symbol.iterator;}})','new String(Symbol.iterator)','"prefix"+Symbol.iterator','`${Symbol.iterator}`'])
  expect(sourceEvaluationInvocations(program(`eval(${expression});`)).at(-1)?.choices).toEqual([]);
 for(const source of ['var key={[Symbol.toPrimitive](){return external;}};eval(String(key));','var key=Symbol.for(external);var object={[key]:"823;"};eval(object[key]);'])
  expect(sourceEvaluationInvocations(program(source)).at(-1)?.choices).toBeNull();
 expect(sourceEvaluationInvocations(program('eval(Symbol(external));')).at(-1)?.choices).toEqual([]);
});
test("Symbol source keys, hook effects and a deep prototype tree match Node in both memory modes",async()=>{
 const pieces=subjects.map((source,index)=>'{function observe(source){print("case'+index+':"+String(eval(source)));}'+source.replace(/\bvar /g,'let ').replaceAll('eval(','observe(')+'}');
 for(const hook of ['0','function(){return {};}','function(){return Symbol.iterator;}'])pieces.push(`{let key={[Symbol.toPrimitive]:${hook},toString(){throw "unexpected fallback";}};try{String(key);}catch(error){print("invalid:"+(error instanceof TypeError));}}`);
 for(const access of ['get [Symbol.toPrimitive](){throw "809;";}','[Symbol.toPrimitive](){throw "811;";}'])pieces.push(`{class C {}let key={${access},toString(){C.toString=function(){return "unexpected";};return "bad";}};try{String(key);}catch(source){print("hook-throw:"+eval(source));}print("retained:"+eval("("+C.toString()+").name"));}`);
 const depth=512;let parent='base';pieces.push('let base={[Symbol.toPrimitive](hint){if(hint!=="string")throw "wrong hint";return this.code;}};');
 for(let index=0;index<depth;index++){pieces.push(`let p${index}={__proto__:${parent},code:"821;"};`);parent='p'+index;}
 pieces.push(`print("deep:"+eval(String(${parent})));`);
 const source=pieces.join('\n'),directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-symbol-key-source-'));
 try{
  const entry=path.join(directory,'source.js');await fs.writeFile(entry,source);
  const node=Bun.spawnSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});',entry],{stdout:'pipe',stderr:'pipe'});expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const noGc of [false,true]){
   const output=path.join(directory,'program-'+noGc),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build-'+noGc),isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/symbol-key-source.js#sloppy',setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString());
  }
 }finally{await fs.rm(directory,{recursive:true,force:true});}
},600_000);
test("unknown exotic source conversion keeps the stable admission diagnostic",async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-symbol-source-boundary-'));
 try{
  const entry=path.join(directory,'source.js'),diagnostics:string[]=[];
  await fs.writeFile(entry,'var key={[Symbol.toPrimitive](){return external;}};eval(String(key));');
  const result=await compile({entry,output:path.join(directory,'rejected'),noGc:true,buildDir:path.join(directory,'build'),isolatedScriptRoots:[entry],initializationEntries:[entry],diagnosticWriter:message=>diagnostics.push(message)});
  expect(result.exitCode).toBe(3);expect(diagnostics.join('')).toContain('unknown eval() source requires --runtime-code-manifest allow-list or gated --unsafe-eval embedded Node bridge');
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});

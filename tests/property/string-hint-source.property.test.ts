import {expect,test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import ts from "typescript";
import {compile} from "../../src/compile";
import {sourceEvaluationInvocations,sourceConstructorInvocations} from "../../src/source-value-flow";
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
const expressions=['String(key)','String.call(null,key)','String.apply(null,[key])','Reflect.apply(String,null,[key])','String.bind(null,key)()'];
const subjects=definitions.flatMap(definition=>expressions.map(expression=>definition+`eval(${expression});`));
for(const value of ['""','17','true','null','undefined','17n'])subjects.push(`var key={toString(){return ${value};}};eval(String(key));`);
subjects.push('class C {}var value={toString(){C.toString=function(){return "461;";};return "method";}};new String(value);eval(C.toString());');
subjects.push('var key={toString(){throw "463;";}};try{String(key);}catch(source){eval(source);}');
subjects.push('var key={get toString(){throw "467;";}};try{String(key);}catch(source){eval(source);}');
const skippedFallbacks=[
 'class C {}var key={toString(){return "method";},valueOf(){C.toString=external;return "other";}};String(key);eval(C.toString());',
 'class C {}var key={get toString(){return function(){return "method";};},valueOf(){C.toString=external;return "other";}};String(key);eval(C.toString());',
];
const functionSubjects=['Function(first,body)','Function.call(null,first,body)','Function.apply(null,[first,body])','Reflect.apply(Function,null,[first,body])','Function.bind(null,first)(body)','new Function(first,body)'].map(expression=>`var trace="";var first={toString(){trace+="value|";return "value";}};var body={toString(){trace+="return value;|";return "return value;";}};var fn=${expression};`);
test("string-hint consumers retain receiver, callable and fallback dependencies",()=>{
 for(const source of subjects){
  const reference=Bun.spawnSync(['node','-e','const values=[];require("node:vm").runInNewContext(process.argv[1],{eval:value=>values.push(value)});require("node:fs").writeSync(1,JSON.stringify(values))',source],{stdout:'pipe',stderr:'pipe'});expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});
  const expected:string[]=JSON.parse(reference.stdout.toString());expect({source,choices:sourceEvaluationInvocations(program(source)).at(-1)?.choices}).toEqual({source,choices:expect.arrayContaining(expected)});
 }
 for(const source of skippedFallbacks)expect({source,choices:sourceEvaluationInvocations(program(source)).at(-1)?.choices}).toEqual({source,choices:['class C {}']});
 for(const source of ['eval(String(external));','var key={toString(){return "method";},[Symbol.toPrimitive](){return external;}};eval(String(key));'])expect(sourceEvaluationInvocations(program(source)).at(-1)?.choices).toBeNull();
});
test("dynamic source operations share string-hint conversion facts",()=>{
 for(const source of functionSubjects){
  const oracle=Bun.spawnSync(['node','-e','const vm=require("node:vm"),context={};new vm.Script(process.argv[1]).runInNewContext(context);require("node:fs").writeSync(1,JSON.stringify(context.trace.split("|").slice(0,-1)));',source],{stdout:'pipe',stderr:'pipe'});
  expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
  const expected:string[]=JSON.parse(oracle.stdout.toString());expect(sourceConstructorInvocations(program(source)).some(call=>call.choices!==null&&expected.every((value,index)=>call.choices![index]?.includes(value)))).toBe(true);
 }
 const host='var source={toString(){return "473;";}};$262.evalScript(source);';
 expect(sourceEvaluationInvocations(program(host)).map(call=>({operation:call.operation,choices:call.choices}))).toEqual([{operation:'eval-script',choices:['473;']}]);
 for(const source of ['Function({toString(){return external;}});','var source={toString(){return external;}};$262.evalScript(source);'])expect([...sourceConstructorInvocations(program(source)),...sourceEvaluationInvocations(program(source))].some(call=>call.choices===null)).toBe(true);
});
test("string-hint source admission and ordered argument conversion match Node in both memory modes",async()=>{
 const nativeSubjects=subjects.filter(source=>!source.includes('eval(String(key))')&&!expressions.some(expression=>source.includes(`eval(${expression})`)));
 for(const definition of definitions)nativeSubjects.push(definition+"eval(\"'\"+String(key)+\"'\");");
 for(const expression of functionSubjects)nativeSubjects.push(expression+"eval(\"'\"+fn(477)+\"'\");");
 const pieces=nativeSubjects.map((source,index)=>'{'+source.replace(/\bvar /g,'let ').replace(/eval\((.*)\);$/,`print("case${index}:"+String(eval($1)));`)+'}');
 pieces.push('{let trace="";let first={toString(){trace+="first|";return "value";}},body={toString(){trace+="body|";return "return 479;";}};let fn=Function(first,body);print("order:"+trace+":"+fn());}');
 pieces.push('{let first={toString(){throw "481;";}},body={toString(){throw "unexpected coercion";}};try{Function(first,body);}catch(source){print("abrupt-order:"+eval(source));}}');
 pieces.push("print(\"host:\"+$262.evalScript({toString(){return \"491;\";}}));");
 const depth=512;const inputs=Array.from({length:depth-1},(_,index)=>`{toString(){effects++;return "p${index}";}}`);inputs.push("{toString(){effects++;return \"return '487;';\";}}");
 pieces.push(`var effects=0;var inputs=[${inputs.join(',')}];var fn=Function(...inputs);if(NATIVE_GC)$262.gc();print("deep:"+eval(fn())+":"+fn.length+":"+effects);`);
 const source=pieces.join('\n'),directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-string-hint-'));
 try{
  const entry=path.join(directory,'source.js');await fs.writeFile(entry,source.replaceAll('NATIVE_GC','false'));
  const node=Bun.spawnSync(['node','-e',"const fs=require(\"node:fs\"),vm=require(\"node:vm\"),context={print:value=>fs.writeSync(1,String(value)+\"\\n\")};context.$262={evalScript:source=>new vm.Script(String(source)).runInNewContext(context)};new vm.Script(fs.readFileSync(process.argv[1],\"utf8\")).runInNewContext(context);",entry],{stdout:'pipe',stderr:'pipe'});expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const noGc of [false,true]){
   await fs.writeFile(entry,source.replaceAll('NATIVE_GC',String(!noGc)));const output=path.join(directory,'program-'+noGc),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build-'+noGc),isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/string-hint-source.js#sloppy',setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString());
  }
 }finally{await fs.rm(directory,{recursive:true,force:true});}
},600_000);

test("unknown string-hint source retains the stable admission diagnostic",async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-string-hint-boundary-'));
 try{
  const entry=path.join(directory,'source.js'),messages:string[]=[];
  await fs.writeFile(entry,'eval(String({toString(){return external;}}));');
  const result=await compile({entry,output:path.join(directory,'rejected'),noGc:true,buildDir:path.join(directory,'build'),isolatedScriptRoots:[entry],initializationEntries:[entry],diagnosticWriter:message=>messages.push(message)});
  expect(result.exitCode).toBe(3);expect(messages.join('')).toContain('unknown eval() source requires --runtime-code-manifest allow-list or gated --unsafe-eval embedded Node bridge');
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});

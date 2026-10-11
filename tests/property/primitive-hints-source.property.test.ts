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
 'var key={valueOf(){return "971";},toString(){throw "unexpected method";}};',
 'var key={valueOf(){return {};},toString(){return "971";}};',
 'var key={valueOf:null,toString(){return "971";}};',
 'var key={valueOf:0,toString(){return "971";}};',
 'var key={mark:"971",get valueOf(){return function(){return this.mark;};}};',
 'var key={mark:"971",__proto__:{valueOf(){return this.mark;}}};',
 'var method=function(){return this.mark;};var key={valueOf:method.bind({mark:"971"})};',
 'class Key {static valueOf(){return "971";}}var key=Key;',
 'var key={number:"971",default:"977;",string:"979;",[Symbol.toPrimitive](hint){return this[hint];}};',
 'var key={number:"971",default:"977;",get [Symbol.toPrimitive](){return function(hint){return this[hint];};}};',
];
const conversions=['Number(key)','BigInt(key)','+key','-key','~key'];
const subjects=definitions.flatMap(definition=>conversions.map(conversion=>definition+`eval("'"+String(${conversion})+"'");`));
subjects.push(...definitions.map(definition=>definition+'eval(key+"");'));
for(const primitive of ['undefined','null','false','true','-0','"17.5"','""','"invalid"','19n'])subjects.push(`eval("'"+String(Number(${primitive}))+"'");`);
subjects.push('eval("\'"+String(Number())+"\'");','eval("\'"+String(-19n)+"\'");','eval("\'"+String(~19n)+"\'");');
const retained=[
 'class C {}var key={get valueOf(){throw "983;";},toString(){C.toString=external;return "bad";}};try{Number(key);}catch(source){eval(source);}eval(C.toString());',
 'class C {}var key={valueOf(){throw "991;";},toString(){C.toString=external;return "bad";}};try{+key;}catch(source){eval(source);}eval(C.toString());',
 'class C {}var first={valueOf(){throw "997;";}},second={valueOf(){C.toString=external;return 1;}};try{first+second;}catch(source){eval(source);}eval(C.toString());',
 'class C {}var first={valueOf(){return Symbol.iterator;}},second={valueOf(){C.toString=external;return 1;}};try{first*second;}catch(error){}eval(C.toString());',
];
test("primitive hints retain method order, receiver and normal conversion facts",()=>{
 for(const source of subjects){
  const oracle=Bun.spawnSync(['node','-e','const values=[];require("node:vm").runInNewContext(process.argv[1],{eval:value=>values.push(value)});require("node:fs").writeSync(1,JSON.stringify(values))',source],{stdout:'pipe',stderr:'pipe'});expect({source,code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({source,code:0,stderr:''});
  const expected:string[]=JSON.parse(oracle.stdout.toString()),calls=sourceEvaluationInvocations(program(source)),admitted=calls.flatMap(call=>call.choices??[]);
  expect({source,missing:expected.filter(value=>!admitted.includes(value)),unknown:calls.filter(call=>call.choices===null).map(call=>call.node.getText())}).toEqual({source,missing:[],unknown:[]});
 }
 for(const source of retained)expect({source,choices:sourceEvaluationInvocations(program(source)).find(call=>call.node.getText()==='eval(C.toString())')?.choices}).toEqual({source,choices:['class C {}']});
 for(const expression of ['Number(Symbol.iterator)','BigInt(undefined)','+19n','+Symbol.iterator'])expect(sourceEvaluationInvocations(program(`eval(String(${expression}));`)).at(-1)?.choices).toEqual([]);
});
test("opaque primitive effects preserve earlier captures and close later or repeated reads",()=>{
 const key='var key={valueOf(){return external;},toString(){C.toString=function(){return "1051;";};return "1";}};';
 for(const conversion of ['Number(key)','BigInt(key)','+key','key+""']){
  const before=`class C {}${key}var captured=C.toString();${conversion};eval(captured);`;
  expect({before,choices:sourceEvaluationInvocations(program(before)).at(-1)?.choices}).toEqual({before,choices:['class C {}']});
  for(const body of [`${conversion};eval(C.toString());`,`while(flag){eval(C.toString());${conversion};}`,`function run(){eval(C.toString());${conversion};}run();`]){
   const source=`class C {}${key}${body}`;
   expect({source,choices:sourceEvaluationInvocations(program(source)).at(-1)?.choices}).toEqual({source,choices:null});
  }
 }
 for(const source of ['var convert=Number.bind(null,input);eval(convert());','eval(Number.apply(null,[input]));','eval(Reflect.apply(Number,null,[input]));'])
  expect({source,choices:sourceEvaluationInvocations(program(source)).at(-1)?.choices}).toEqual({source,choices:[]});
});
test("primitive hints and an ordered deep prototype tree match Node in both memory modes",async()=>{
 const pieces=subjects.map((source,index)=>'{function observe(source){print("case'+index+':"+String(eval(source)));}'+source.replace(/\bvar /g,'let ').replaceAll('eval(','observe(')+'}');
 for(const access of ['get valueOf(){throw "1009;";}','valueOf(){throw "1013;";}'])pieces.push(`{class C {}let key={${access},toString(){C.toString=function(){return "unexpected";};return "bad";}};try{Number(key);}catch(source){print("number-throw:"+eval(source));}print("retained:"+eval("("+C.toString()+").name"));}`);
 pieces.push('{class C {}let first={valueOf(){return Symbol.iterator;}},second={valueOf(){C.toString=function(){return "unexpected";};return 1;}};try{first*second;}catch(error){print("ordered:"+(error instanceof TypeError));}print("retained:"+eval("("+C.toString()+").name"));}');
 for(const expression of ['Number(Symbol.iterator)','BigInt(undefined)','+19n','+Symbol.iterator'])pieces.push(`try{${expression};}catch(error){print("invalid:"+(error instanceof TypeError));}`);
 const depth=512;let parent='base';pieces.push('let base={valueOf(){return this.mark;}};');
 for(let index=0;index<depth;index++){pieces.push(`let p${index}={__proto__:${parent},mark:"1019"};`);parent='p'+index;}
 pieces.push(`print("deep:"+eval(String(Number(${parent}))));`);
 const source=pieces.join('\n'),directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-primitive-hints-'));
 try{
  const entry=path.join(directory,'source.js');await fs.writeFile(entry,source);
  const node=Bun.spawnSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});',entry],{stdout:'pipe',stderr:'pipe'});expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const noGc of [false,true]){
   const output=path.join(directory,'program-'+noGc),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build-'+noGc),isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/primitive-hints-source.js#sloppy',setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString());
  }
 }finally{await fs.rm(directory,{recursive:true,force:true});}
},600_000);
test("unknown numeric source conversion retains the stable admission diagnostic",async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-number-source-boundary-'));
 try{
  const entry=path.join(directory,'source.js'),diagnostics:string[]=[];
  await fs.writeFile(entry,'var key={valueOf(){return external;}};eval(String(Number(key)));');
  const result=await compile({entry,output:path.join(directory,'rejected'),noGc:true,buildDir:path.join(directory,'build'),isolatedScriptRoots:[entry],initializationEntries:[entry],diagnosticWriter:message=>diagnostics.push(message)});
  expect(result.exitCode).toBe(3);expect(diagnostics.join('')).toContain('unknown eval() source requires --runtime-code-manifest allow-list or gated --unsafe-eval embedded Node bridge');
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});

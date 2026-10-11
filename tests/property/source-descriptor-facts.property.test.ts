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
const subjects=[
 'var reader={get mark(){return "41;";}};var getter=Object.getOwnPropertyDescriptor(reader,"mark").get;eval(getter.call(reader));',
 'class Reader {static get mark(){return "43;";}}var getter=Reflect.getOwnPropertyDescriptor(Reader,"mark").get;eval(getter.call(Reader));',
 'class Reader {get mark(){return this.code;}}var getter=Object.getOwnPropertyDescriptor(Reader.prototype,"mark").get;eval(getter.call({code:"47;"}));',
 'var reader={value(){return "53;";}};eval(Object.getOwnPropertyDescriptor(reader,"value").value());',
 'var reader={get mark(){return "59;";}};eval(Object.getOwnPropertyDescriptors(reader).mark.get.call(reader));',
 'var reader={};Object.defineProperty(reader,"mark",{get:function(){return "61;";}});var reflect=Reflect.getOwnPropertyDescriptor.bind(Reflect);eval(reflect(reader,"mark").get());',
 'var reader={get mark(){return "71;";}};var reflect=Object.getOwnPropertyDescriptor;eval(reflect.apply(null,[reader,"mark"]).get.call(reader));',
 'class Target {}var reader={set mark(value){Target.toString=value;}};var setter=Object.getOwnPropertyDescriptor(reader,"mark").set;setter.call(reader,function(){return "73;";});eval(Target.toString());',
 'var reader={"1":function(){return "79;";}};eval(Reflect.getOwnPropertyDescriptor(reader,1).value());',
 'var reader=[function(){return "83;";}];eval(Object.getOwnPropertyDescriptors(reader)[0].value());',
];
test("own descriptor projections retain callable cells without activating accessors",()=>{
 const oracle=Bun.spawnSync(["node","-e",'const vm=require("node:vm");process.stdout.write(JSON.stringify(JSON.parse(process.argv[1]).map(source=>{const values=[];new vm.Script(source).runInNewContext({eval:value=>values.push(value)});return values;})));',JSON.stringify(subjects)],{stdout:"pipe",stderr:"pipe"});
 expect({exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exitCode:0,stderr:""});const expected:string[][]=JSON.parse(oracle.stdout.toString());
 for(const[index,source]of subjects.entries())expect({source,complete:sourceEvaluationInvocations(program(source)).some(call=>call.choices!==null&&expected[index]!.every(value=>call.choices!.includes(value)))}).toEqual({source,complete:true});
 for(const source of ['class C {}var reader={get mark(){C.toString=external;return 1;}};Object.getOwnPropertyDescriptor(reader,"mark");eval(C.toString());','class C {}var reader={get mark(){C.toString=external;return 1;}};Object.getOwnPropertyDescriptors(reader);eval(C.toString());','class C {}var reader={__proto__:{get mark(){C.toString=external;return 1;}}};Object.getOwnPropertyDescriptor(reader,"mark");eval(C.toString());'])expect(sourceEvaluationInvocations(program(source)).find(call=>call.node.getText()==='eval(C.toString())')?.choices).toEqual(['class C {}']);
 for(const source of ['var reader={get mark(){return "41;";}};eval(Object.getOwnPropertyDescriptor(reader,external).get());','eval(Object.getOwnPropertyDescriptor(external,"mark").get());','var reader={value:external};eval(Object.getOwnPropertyDescriptor(reader,"value").value);','var reader={...external,value:()=>"41;"};eval(Object.getOwnPropertyDescriptor(reader,"value").value());','class Reader {static get mark(){return "41;";}}eval(Object.getOwnPropertyDescriptors(Reader).mark.get());'])expect(sourceEvaluationInvocations(program(source)).some(call=>call.choices===null)).toBe(true);
});
test("descriptor callable projection and one deep owner graph match Node in both memory modes",async()=>{
 const pieces=subjects.map((source,index)=>'{'+source.replace(/eval\((.*)\);$/,`print("case${index}:"+eval($1));`)+'}');
 pieces.push('var root={value:function(){return "89;";}};');
 const depth=512;for(let index=0;index<depth;index++)pieces.push(`var box${index}={next:${index?'box'+(index-1):'root'}};`);
 pieces.push(`if(NATIVE_GC)$262.gc();var selected0=box${depth-1};`);
 for(let index=1;index<=depth;index++)pieces.push(`var selected${index}=Reflect.getOwnPropertyDescriptor(selected${index-1},"next").value;`);
 pieces.push(`print("deep:"+eval(Object.getOwnPropertyDescriptor(selected${depth},"value").value()));`);
 const source=pieces.join('\n'),directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-source-descriptors-'));
 try{
  const entry=path.join(directory,'source.js');await fs.writeFile(entry,source.replaceAll('NATIVE_GC','false'));
  const node=Bun.spawnSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});',entry],{stdout:'pipe',stderr:'pipe'});expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const noGc of [false,true]){
   await fs.writeFile(entry,source.replaceAll('NATIVE_GC',String(!noGc)));const output=path.join(directory,'program-'+noGc),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build-'+noGc),isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/source-descriptor-facts.js#sloppy',setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString());
  }
 }finally{await fs.rm(directory,{recursive:true,force:true});}
},600_000);

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
const writers=[
 ['var reader={set mark(value){C.toString=value;}};', 'reader.mark=VALUE;'],
 ['class Reader {static set mark(value){C.toString=value;}}', 'Reader.mark=VALUE;'],
 ['class Reader {set mark(value){C.toString=value;}}var reader=new Reader();', 'reader.mark=VALUE;'],
 ['class Reader {static set mark(value){C.toString=value;}}class Child extends Reader {}', 'Child.mark=VALUE;'],
 ['class Reader {set mark(value){C.toString=value;}}class Child extends Reader {}var reader=new Child();', 'reader.mark=VALUE;'],
 ['var parent={set mark(value){C.toString=value;}};var reader={__proto__:parent};', 'reader.mark=VALUE;'],
 ['class Reader {static set ["mark"](value){C.toString=value;}}', 'Reader["mark"]=VALUE;'],
 ['var key="mark";class Reader {static set [key](value){C.toString=value;}}', 'Reader[key]=VALUE;'],
 ['var reader={};Object.defineProperty(reader,"mark",{set(value){C.toString=value;},configurable:true});', 'reader.mark=VALUE;'],
 ['var reader={};Object.defineProperties(reader,{mark:{set(value){C.toString=value;},configurable:true}});', 'reader.mark=VALUE;'],
 ['var reader={};Object.defineProperty(reader,"mark",{set:(function(prefix,value){C.toString=value;}).bind(null,"prefix")});', 'reader.mark=VALUE;'],
 ['var reader={};Object.defineProperty(reader,"mark",{get set(){return function(value){C.toString=value;};}});', 'reader.mark=VALUE;'],
 ['Object.defineProperty(globalThis,"mark",{set(value){C.toString=value;},configurable:true});', 'globalThis.mark=VALUE;'],
 ['Object.defineProperty(globalThis,"mark",{set(value){C.toString=value;},configurable:true});', 'mark=VALUE;'],
 ['var reader={set mark(value){C.toString=value;}};', 'Reflect.set(reader,"mark",VALUE);'],
];
function sources(value:string){return writers.map(([definition,write])=>'class C {}'+definition+write!.replace('VALUE',value)+'eval(C.toString());');}
test("accessor records invoke setters through the same receiver and actual List graph as calls",()=>{
 const subjects=sources('function(){return "41;";}');
 const oracle=nodeReferenceSync(["node","-e",'const vm=require("node:vm");require("node:fs").writeSync(1,JSON.stringify(JSON.parse(process.argv[1]).map(source=>{const values=[];new vm.Script(source).runInNewContext({eval:value=>values.push(value)});return values;})));',JSON.stringify(subjects)],{stdout:"pipe",stderr:"pipe"});
 expect({exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exitCode:0,stderr:""});const expected:string[][]=JSON.parse(oracle.stdout.toString());
 for(const[index,source]of subjects.entries())expect({source,complete:sourceEvaluationInvocations(program(source)).filter(call=>call.node.getText()==='eval(C.toString())').some(call=>call.choices!==null&&expected[index]!.every(value=>call.choices!.includes(value)))}).toEqual({source,complete:true});
 for(const source of sources('external'))expect({source,incomplete:sourceEvaluationInvocations(program(source)).some(call=>call.choices===null)}).toEqual({source,incomplete:true});
 for(const source of ['class C {static toString(){return "41;";}}external();eval(C.toString());','class C {static toString(){return "41;";}}class Reader {set #mark(value){C.toString=value;}write(value){this.#mark=value;}}new Reader().write(external);eval(C.toString());'])expect(sourceEvaluationInvocations(program(source)).some(call=>call.choices===null)).toBe(true);
 const receiver='class C {}var reader={set mark(value){C.toString=()=>this.code;}};Reflect.set(reader,"mark",1,{code:"43;"});eval(C.toString());';
 expect(sourceEvaluationInvocations(program(receiver)).find(call=>call.node.getText()==='eval(C.toString())')?.choices).toContain('43;');
 for(const source of ['class C {}var reader={set mark(value){C.toString=external;}};function unused(){reader.mark=1;}eval(C.toString());','class C {}var parent={set mark(value){C.toString=external;}};var reader={__proto__:parent,mark:0};reader.mark=1;eval(C.toString());','class C {}var reader={set mark(value){C.toString=external;}};Object.defineProperty(reader,"mark",{value:1});eval(C.toString());'])expect(sourceEvaluationInvocations(program(source)).find(call=>call.node.getText()==='eval(C.toString())')?.choices).toEqual(['class C {}']);
 const abrupt='var reader={set mark(value){throw value;}};try{reader.mark="53;";}catch(error){eval(error);}';
 expect(sourceEvaluationInvocations(program(abrupt)).find(call=>call.node.getText()==='eval(error)')?.choices).toEqual(['53;']);
 const indirect='var reader={};Object.defineProperty(reader,"mark",{set:eval});reader.mark="globalThis.answer=47;";';
 expect(sourceEvaluationInvocations(program(indirect)).map(call=>({direct:call.direct,choices:call.choices}))).toEqual([{direct:false,choices:['globalThis.answer=47;']}]);
});
test("setter source effects and deep activation propagation match Node in both memory modes",async()=>{
 const pieces=['function check(name,value){print(name+":"+value);}'];
 for(const[index,source]of sources('function(){return "41;";}').entries())pieces.push('{'+source.replace('eval(C.toString());',`check("effect${index}",eval(C.toString()));`)+'}');
 pieces.push('{class C {}var reader={set mark(value){C.toString=()=>this.code;}};Reflect.set(reader,"mark",1,{code:"43;"});check("receiver",eval(C.toString()));}');
 pieces.push('var thrown={set mark(value){throw value;}};try{thrown.mark="53;";}catch(error){check("throw",eval(error));}');
 pieces.push('var indirect={};Object.defineProperty(indirect,"mark",{set:eval});indirect.mark="globalThis.answer=47;";check("indirect",globalThis.answer);');
 pieces.push('class Target {}var owner={set mark(value){Target.toString=value;}};');
 for(let index=0;index<512;index++)pieces.push(`var holder${index}={set mark(value){${index?'holder'+(index-1):'owner'}.mark=value;}};`);
 pieces.push('if(NATIVE_GC)$262.gc();holder511.mark=function(){return "67;";};check("deep",eval(Target.toString()));');
 const source=pieces.join('\n'),directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-setter-effects-'));
 try{
  const entry=path.join(directory,'source.js');await fs.writeFile(entry,source.replaceAll('NATIVE_GC','false'));
  const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});',entry],{stdout:'pipe',stderr:'pipe'});expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const noGc of [false,true]){
   await fs.writeFile(entry,source.replaceAll('NATIVE_GC',String(!noGc)));const output=path.join(directory,'program-'+noGc),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build-'+noGc),isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/setter-source-effects.js#sloppy',setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString());
  }
 }finally{await fs.rm(directory,{recursive:true,force:true});}
},600_000);

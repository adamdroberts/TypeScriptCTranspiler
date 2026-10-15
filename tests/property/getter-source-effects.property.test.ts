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
const readers=[
 ['var reader={get touch(){EFFECT;return 1;}};', 'reader.touch;'],
 ['class Reader {static get touch(){EFFECT;return 1;}}', 'Reader.touch;'],
 ['class Reader {get touch(){EFFECT;return 1;}}var reader=new Reader();', 'reader.touch;'],
 ['class Reader {static get touch(){EFFECT;return 1;}}class Child extends Reader {}', 'Child.touch;'],
 ['class Reader {get touch(){EFFECT;return 1;}}class Child extends Reader {}var reader=new Child();', 'reader.touch;'],
 ['var reader={get touch(){EFFECT;return 1;}};', 'function read({touch}){}read(reader);'],
 ['var reader={get touch(){EFFECT;return 1;}};', 'function read(){return reader.touch;}read();'],
 ['var reader={get touch(){EFFECT;return 1;}};', 'class Holder {value=reader.touch;}new Holder();'],
];
function sources(effect:string){return readers.map(([definition,read])=>'class C {}'+definition!.replace('EFFECT',effect)+read+'eval(C.toString());');}
test("getter reads activate shared effects through owner and activation edges",()=>{
 const subjects=sources('C.toString=()=>"41;";');
 const oracle=nodeReferenceSync(["node","-e",'const vm=require("node:vm");require("node:fs").writeSync(1,JSON.stringify(JSON.parse(process.argv[1]).map(source=>{const values=[];new vm.Script(source).runInNewContext({eval:value=>values.push(value)});return values;})));',JSON.stringify(subjects)],{stdout:"pipe",stderr:"pipe"});
 expect({exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exitCode:0,stderr:""});const expected:string[][]=JSON.parse(oracle.stdout.toString());
 for(const[index,source]of subjects.entries())expect({source,complete:sourceEvaluationInvocations(program(source)).every(call=>call.choices!==null&&expected[index]!.every(value=>call.choices!.includes(value)))}).toEqual({source,complete:true});
 for(const source of sources('C.toString=external;'))expect({source,incomplete:sourceEvaluationInvocations(program(source)).some(call=>call.choices===null)}).toEqual({source,incomplete:true});
 const inactive='class C {}var reader={get touch(){C.toString=external;return 1;}};function unused(){return reader.touch;}eval(C.toString());';
 expect(sourceEvaluationInvocations(program(inactive)).map(call=>call.choices)).toEqual([['class C {}']]);
 const abrupt='var reader={get touch(){throw "53;";}};try{reader.touch;}catch(error){eval(error);}';
 expect(sourceEvaluationInvocations(program(abrupt)).map(call=>call.choices)).toEqual([['53;']]);
});
test("getter effects close native eval sources and deep activation propagation matches Node",async()=>{
 const pieces=['function check(name,value){print(name+":"+value);}'];
 for(const[index,source]of sources('C.toString=()=>"41;";').entries())pieces.push('{'+source.replace('eval(C.toString());',`check("effect${index}",eval(C.toString()));`)+'}');
 pieces.push('class Target {}var owner={get touch(){Target.toString=()=>"67;";return 1;}};');
 for(let index=0;index<512;index++)pieces.push(`var holder${index}={get touch(){return ${index?'holder'+(index-1):'owner'}.touch;}};`);
 pieces.push('if(NATIVE_GC)$262.gc();holder511.touch;check("deep",eval(Target.toString()));');
 const source=pieces.join('\n'),directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-getter-effects-'));
 try{
  const entry=path.join(directory,'source.js');await fs.writeFile(entry,source.replaceAll('NATIVE_GC','false'));
  const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});',entry],{stdout:'pipe',stderr:'pipe'});expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const noGc of [false,true]){
   await fs.writeFile(entry,source.replaceAll('NATIVE_GC',String(!noGc)));const output=path.join(directory,'program-'+noGc),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build-'+noGc),isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/getter-source-effects.js#sloppy',setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString());
  }
 }finally{await fs.rm(directory,{recursive:true,force:true});}
},600_000);

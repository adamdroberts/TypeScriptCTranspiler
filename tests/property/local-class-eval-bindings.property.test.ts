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
test("local class eval bindings preserve identity, TDZ, writes and escaped cells against Node",async()=>{
 const pieces=[
  'function check(name,value){print(name+":"+value);}',
  '{class Local {static value=41;}check("read",eval("Local.value"));check("identity",eval("Local")===Local);var saved=eval("(function(){return Local;})");eval("Local=class Replacement {static value=43;}");check("write",saved().value);}',
  'check("escaped",saved().value);',
  '{var early=false;try{eval("typeof Later");}catch(error){early=error instanceof ReferenceError;}class Later {}check("tdz",early&&eval("Later")===Later);}',
  'function make(value){class Local {static value=value;}return eval("(function(){return Local;})");}var first=make(47),second=make(53);check("activation",first()!==second()&&first().value===47&&second().value===53);',
  'var readers=[];for(let index=0;index<3;index++){class Iteration {static value=index;}readers.push(eval("(function(){return Iteration;})"));}if(NATIVE_GC)$262.gc();check("iteration",readers[0]().value===0&&readers[1]().value===1&&readers[2]().value===2&&readers[0]()!==readers[1]());',
  '{class Original {static self(){return eval("Original");}static immutable(){try{eval("Original=17;");}catch(error){return error instanceof TypeError;}return false;}}var original=Original;Original=class Changed {};check("inner",original.self()===original&&original.immutable());}',
  'function nested(){switch(1){case 1:class Local {static value=59;}return eval("Local.value");}}check("switch",nested());',
  'function deep(){',
 ];
 for(let index=0;index<512;index++)pieces.push(`class Local${index} {static value=${index};}`);
 pieces.push('return eval("(function(){return ['+Array.from({length:512},(_,index)=>'Local'+index).join(',')+'];})");}var retain=deep();if(NATIVE_GC)$262.gc();var values=retain(),valid=true;for(var index=0;index<values.length;index++)valid=valid&&values[index].value===index;check("deep",valid&&values.length===512);');
 const source=pieces.join('\n'),directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-local-class-eval-'));
 try{
  const entry=path.join(directory,'source.js');await fs.writeFile(entry,source.replaceAll('NATIVE_GC','false'));
  const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});',entry],{stdout:'pipe',stderr:'pipe'});expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const noGc of [false,true]){
   await fs.writeFile(entry,source.replaceAll('NATIVE_GC',String(!noGc)));const output=path.join(directory,'program-'+noGc),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build-'+noGc),isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/local-class-eval-bindings.js#sloppy',setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString());
  }
 }finally{await fs.rm(directory,{recursive:true,force:true});}
},600_000);

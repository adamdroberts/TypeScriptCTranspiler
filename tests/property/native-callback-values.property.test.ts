import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildProgram} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';
import {parseHostObservation} from '../test262/protocol';
const prelude='const executeSource=eval;function read(body="17;"){print(executeSource(body));}read();';
const paths=[
 {name:'native-data',body:'Array.prototype.callback=read;const callback=function(){return callback.callback("19;");};Object.setPrototypeOf(callback,Array.prototype);callback();'},
 {name:'native-getter',body:'Object.defineProperty(Array.prototype,"callback",{get(){return read;},configurable:true});const callback=function(){return callback.callback("19;");};Object.setPrototypeOf(callback,Array.prototype);callback();'},
 {name:'descriptor',body:'const descriptor=Object.getOwnPropertyDescriptor({callback:read},"callback");const receiver={};Object.setPrototypeOf(receiver,descriptor);receiver.value("19;");'},
 {name:'descriptors',body:'const descriptors=Object.getOwnPropertyDescriptors({callback:read});const receiver={};Object.setPrototypeOf(receiver,descriptors.callback);receiver.value("19;");'},
];
function reference(source:string):string {
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});return node.stdout.toString();
}
test('opaque arguments retain source writes and allocated descriptor values',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-native-callback-values-source-'));
 try{
  for(const path of paths){
   const source=prelude+path.body+'print("complete");';expect(reference(source)).toBe('17\n19\ncomplete\n');
   const entry=join(directory,path.name+'.js');await writeFile(entry,source);const built=buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]});
   expect({name:path.name,calls:sourceEvaluationInvocations(built.program,{roots:[entry]}).map(call=>call.choices)}).toEqual({name:path.name,calls:[null]});
   const diagnostics:string[]=[];const result=await compile({entry,output:join(directory,path.name),noGc:true,emitCOnly:true,buildDir:join(directory,path.name+'-build'),isolatedScriptRoots:[entry],initializationEntries:[entry],diagnosticWriter:message=>diagnostics.push(message)});
   expect(result.exitCode).toBe(3);expect(diagnostics.join('')).toContain('unknown eval() source requires --runtime-code-manifest allow-list');
  }
  const source=prelude+'Array.prototype.callback=read;const unrelated=function(){};Object.setPrototypeOf(unrelated,{});print("complete");';expect(reference(source)).toBe('17\ncomplete\n');
  const entry=join(directory,'disconnected.js');await writeFile(entry,source);const built=buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]});expect(sourceEvaluationInvocations(built.program,{roots:[entry]}).map(call=>call.choices)).toEqual([['17;']]);
 }finally{await rm(directory,{recursive:true,force:true});}
});
function retainedRecord():string {
 const depth=512,pieces=['const executeSource=eval;function read(){print(executeSource("17;"));}','const owner0={descriptor:Object.getOwnPropertyDescriptor({callback:read},"callback")};'];
 for(let index=0;index<depth;index++)pieces.push('const owner'+(index+1)+'={next:owner'+index+'};');
 pieces.push('let owner=owner'+depth+';while(owner.next)owner=owner.next;const receiver={};if(NATIVE_GC)$262.gc();Object.setPrototypeOf(receiver,owner.descriptor);receiver.value();print("complete");');return pieces.join('\n');
}
test('allocated callback records remain connected through a retained owner graph',async()=>{
 const source=retainedRecord(),expected=reference(source.replaceAll('NATIVE_GC','false'));expect(expected).toBe('17\ncomplete\n');
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-native-callback-values-native-'));
 try{for(const noGc of [false,true]){
  const entry=join(directory,'source.js'),output=join(directory,'program-'+noGc),diagnostics:string[]=[];await writeFile(entry,source.replaceAll('NATIVE_GC',String(!noGc)));
  const result=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/native-callback-values#script',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(expected);
 }}finally{await rm(directory,{recursive:true,force:true});}
},600000);

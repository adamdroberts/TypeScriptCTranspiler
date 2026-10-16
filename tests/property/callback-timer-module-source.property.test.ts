import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';import {tmpdir} from 'node:os';

const bindings=[
 'import {setImmediate as enqueue} from "node:timers";',
 'import timers from "timers";const enqueue=timers.setImmediate;',
 'import * as timers from "node:timers";const enqueue=timers.setImmediate;',
 'import {default as timers} from "node:timers";const enqueue=timers.setImmediate;',
 'import timers from "node:timers";const enqueue=timers.setImmediate.bind(null);',
 'import timers from "node:timers";const enqueue=callback=>Reflect.apply(timers.setImmediate,null,[callback]);',
 'const timers=require("node:timers");const enqueue=timers.setImmediate;',
 'const key="setImmediate";const {[key]:enqueue=()=>{throw "unreachable";},setImmediate:{name:label},...rest}=require("timers");if(label!=="setImmediate"||typeof rest.setTimeout!=="function")throw "module-pattern";',
];
function subject(binding:string,unknown=false,aliases=''):string {
 return binding+'\n{const owner0={body:"17;"};'+aliases+'enqueue(()=>{console.log(eval(owner0.body));console.log("module-timer-complete");});owner0.body='+(unknown?'external()':'"19;"')+';}';
}
const isolated='import timers,{setImmediate as enqueue} from "node:timers";import * as namespace from "node:timers";'+
 'const replacement=()=>console.log("replacement");timers.setImmediate=replacement;globalThis.setImmediate=replacement;'+
 '{const owner={body:"23;"};namespace.setImmediate(()=>{console.log(eval(owner.body));console.log(enqueue===namespace.setImmediate);console.log("module-timer-complete");});owner.body="29;";}';
async function reference(directory:string,source:string):Promise<string> {
 const entry=join(directory,'reference.mjs');await writeFile(entry,'import {createRequire} from "node:module";const require=createRequire(import.meta.url);function external(){return "31;";}\n'+source);
 const node=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:30000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});return node.stdout.toString();
}
test('callback timer imports and require project immutable exports independently of mutable module and global fields',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-callback-module-model-'));
 try{for(const binding of bindings){const source=subject(binding);expect(await reference(directory,source)).toBe('19\nmodule-timer-complete\n');const result=graph([{path:'subject.mjs',source,goal:'module'}]);expect({source,error:result.error}).toEqual({source,error:null});expect(result.directEvalSources.map(value=>value.source)).toContain('19;');
  const unknown=subject(binding,true);expect(await reference(directory,unknown)).toBe('31\nmodule-timer-complete\n');expect(graph([{path:'subject.mjs',source:unknown,goal:'module'}]).error).toContain('direct eval source is not a finite static string expression');}
 expect(await reference(directory,isolated)).toBe('29\ntrue\nmodule-timer-complete\n');const result=graph([{path:'subject.mjs',source:isolated,goal:'module'}]);expect(result.error).toBeNull();expect(result.directEvalSources.map(value=>value.source)).toContain('29;');
 }finally{await rm(directory,{recursive:true,force:true});}
});
function retained():string {
 const aliases=Array.from({length:512},(_,index)=>'const owner'+(index+1)+'=owner'+index+';').join('\n');
 return subject(bindings[0]!,false,aliases).replace('eval(owner0.body)','eval(owner512.body)').replace('enqueue(()=>{','enqueue(()=>{COLLECT');
}
test('imported timer source closure matches complete Node through native module execution in both memory modes',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-callback-module-native-'));
 try{for(const [index,source]of [...bindings.map(binding=>subject(binding)),isolated,retained()].entries()){
  const expected=await reference(directory,source.replace('COLLECT',''));expect(expected.endsWith('module-timer-complete\n')).toBe(true);
  for(const noGc of [false,true]){const entry=join(directory,'subject-'+index+'.mjs'),output=join(directory,'program-'+index+'-'+noGc),diagnostics:string[]=[];await writeFile(entry,source.replace('COLLECT',noGc?'':'$262.gc();'));
   const built=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:output+'-build',test262Observation:{kind:'test262-native-observation',scenarioId:'property/callback-module#module',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(parseHostObservation(JSON.parse(native.stdout.toString()))).toMatchObject({kind:'normal',stdout:expected});
  }
 }}finally{await rm(directory,{recursive:true,force:true});}
},900000);

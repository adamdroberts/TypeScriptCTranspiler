import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildProgram} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';
import {parseHostObservation} from '../test262/protocol';
const reference=(source:string)=>{
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({opaque(owner){owner.code="19;"},print:v=>fs.writeSync(1,String(v)+"\\n")});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});return node.stdout.toString();
};
async function choices(directory:string,source:string){
 const entry=join(directory,'subject.js');await writeFile(entry,source);
 const built=buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]});
 return sourceEvaluationInvocations(built.program,{roots:[entry]}).map(call=>call.choices);
}
test('captured aliases preserve write timing, derived operands and origin-only effects',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-capture-read-source-'));
 try{for(const derived of [false,true])for(const prior of [false,true]){
  const source='const owner={code:"17;"};const alias=owner;'+(derived?'function read(value){return value.code;}':'')+
   (prior?'opaque(alias);const saved=':'const saved=')+(derived?'read(owner);':'alias.code;')+(!prior?'opaque(alias);':'')+'print(eval(saved));';
  expect(reference(source)).toBe((prior?'19':'17')+'\n');const actual=await choices(directory,source);
  if(prior)expect(actual).toEqual([null]);else expect(actual).toEqual([['17;']]);
 }
 }finally{await rm(directory,{recursive:true,force:true});}
});
function subject():string{return 'let owner={code:"31;"};'+Array.from({length:512},()=> 'owner={next:owner};').join('\n')+
 '\nfunction identity(value){return value;}const kept=identity(owner);COLLECT for(let index=0;index<512;index++)owner=owner.next;print(eval(owner.code));print(kept!==owner);print("capture-read-complete");';}
test('one retained alias graph matches complete Node output in both memory modes',async()=>{
 const source=subject(),expected=reference(source.replace('COLLECT',''));expect(expected).toBe('31\ntrue\ncapture-read-complete\n');
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-capture-read-native-'));
 try{for(const noGc of [false,true]){
  const entry=join(directory,'subject.js'),output=join(directory,'program-'+noGc),diagnostics:string[]=[];await writeFile(entry,source.replace('COLLECT',noGc?'':'$262.gc();'));
  const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/capture-read-worklist.js#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({exitCode:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(expected);
 }}finally{await rm(directory,{recursive:true,force:true});}
},600000);

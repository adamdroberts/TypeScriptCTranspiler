import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildProgram} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';
import {parseHostObservation} from '../test262/protocol';
const producers=[
 {expression:'Reflect.ownKeys({})',key:'0'},
 {expression:'Object.getOwnPropertyNames({})',key:'0'},
 {expression:'Object.getOwnPropertySymbols({})',key:'0'},
 {expression:'Object(17)',key:'"code"'},
 {expression:'new Number(17)',key:'"code"'},
 {expression:'new String("text")',key:'"code"'},
 {expression:'Object({})',key:'"code"'},
 {expression:'Promise.resolve(17)',key:'"code"'},
];
const reference=(source:string)=>{
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({opaque(owner){owner.code="19;";owner[0]="19;"},print:v=>fs.writeSync(1,String(v)+"\\n")});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});return node.stdout.toString();
};
async function choices(directory:string,source:string){
 const entry=join(directory,'subject.js');await writeFile(entry,source);
 const built=buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]});
 return sourceEvaluationInvocations(built.program,{roots:[entry]}).map(call=>call.choices);
}
test('materialized allocations retain writes and aliases while return projections retain actual inputs',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-source-allocation-'));
 try{
  for(const producer of producers){
   const source='const owner='+producer.expression+',alias=owner;owner['+producer.key+']="17;";print(eval(alias['+producer.key+']));';
   expect(reference(source)).toBe('17\n');expect({producer,choices:await choices(directory,source)}).toEqual({producer,choices:[['17;']]});
   expect(await choices(directory,'const owner='+producer.expression+',alias=owner;owner['+producer.key+']="17;";opaque(owner);eval(alias['+producer.key+']);')).toEqual([null]);
  }
  const returned='function make(input){return Reflect.ownKeys(input);}const left=make({left:1}),right=make({right:1});left[0]="17;";right[0]="19;";print(eval(left[0]));print(eval(right[0]));';
  expect(reference(returned)).toBe('17\n19\n');const calls=await choices(directory,returned);expect(calls[0]).toContain('17;');expect(calls[1]).toContain('19;');
  const actuals='function make(input){return Reflect.ownKeys(input);}print(eval(make({"17;":1})[0]));print(eval(make({"19;":1})[0]));';
  expect(reference(actuals)).toBe('17\n19\n');const projected=await choices(directory,actuals);expect(projected[0]).toContain('17;');expect(projected[1]).toContain('19;');
  expect(await choices(directory,'const owner=Reflect.ownKeys({});owner[0]=String(Math.random());eval(owner[0]);')).toEqual([null]);
 }finally{await rm(directory,{recursive:true,force:true});}
});
function nativeSource():string{
 return producers.map(producer=>'{const owner='+producer.expression+',alias=owner;owner['+producer.key+']="17;";print(eval(alias['+producer.key+']));}').join('\n')+
 '\nconst value=Reflect.ownKeys({});const alias=value;alias[0]="31;";const owner0={value};'+Array.from({length:512},(_,index)=>'const owner'+(index+1)+'={next:owner'+index+'};').join('\n')+
 '\nCOLLECT let owner=owner512;while(owner.next)owner=owner.next;print(eval(owner.value[0]));print(owner.value===alias);print("allocation-complete");';
}
test('retained allocation identity matches complete Node execution in both memory modes',async()=>{
 const source=nativeSource(),expected=reference(source.replace('COLLECT',''));expect(expected.endsWith('31\ntrue\nallocation-complete\n')).toBe(true);
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-source-allocation-native-'));
 try{for(const noGc of [false,true]){
  const entry=join(directory,'subject.js'),output=join(directory,'program-'+noGc),diagnostics:string[]=[];await writeFile(entry,source.replace('COLLECT',noGc?'':'$262.gc();'));
  const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/materialized-source-allocation.js#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:m=>diagnostics.push(m)});
  expect({exitCode:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(expected);
 }}finally{await rm(directory,{recursive:true,force:true});}
},600000);

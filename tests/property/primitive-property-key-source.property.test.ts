import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildProgram} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {nodeReferenceSync} from './node-reference';
const keys=['String(Math.random())','Math.random()','Symbol.for(String(Math.random()))'];
const operations=['target[KEY];','target[KEY]=1;','delete target[KEY];','Object.defineProperty(target,KEY,{value:1});','Object.getOwnPropertyDescriptor(target,KEY);','KEY in target;'];
function reference(source:string):string {
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});return node.stdout.toString();
}
async function choices(directory:string,name:string,source:string){
 const entry=join(directory,name+'.js');await writeFile(entry,source);
 const built=buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]});
 return sourceEvaluationInvocations(built.program,{roots:[entry]}).map(call=>call.choices);
}
test('primitive key extent does not create opaque conversion effects',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-primitive-key-source-'));
 try{
  for(const [ki,key]of keys.entries())for(const [oi,operation]of operations.entries()){
   const source='const stable={toString(){return "17;";}};const target={__proto__:null};'+operation.replaceAll('KEY',key)+'print(eval(stable.toString()));';
   expect(reference(source)).toBe('17\n');expect({key,operation,choices:await choices(directory,ki+'-'+oi,source)}).toEqual({key,operation,choices:[['17;']]});
  }
  const effects='let source="17;";const target={__proto__:null};target[{[Symbol.toPrimitive](hint){print(hint);source="19;";return String(Math.random());}}];print(eval(source));';
  expect(reference(effects)).toBe('string\n19\n');const effectChoices=await choices(directory,'effects',effects);expect(effectChoices[0]).toContain('19;');
  const abrupt='const target={__proto__:null};try{target[{[Symbol.toPrimitive](){throw "23;";}}];}catch(error){print(eval(error));}';
  expect(reference(abrupt)).toBe('23\n');expect(await choices(directory,'abrupt',abrupt)).toEqual([['23;']]);
  const opaque='const stable={toString(){return "17;";}};const target={__proto__:null};target[{[Symbol.toPrimitive]:external}];print(eval(stable.toString()));';
  expect(await choices(directory,'opaque',opaque)).toContain(null);
 }finally{await rm(directory,{recursive:true,force:true});}
});

import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';
function nativeSource():string {
 const pieces=keys.flatMap(key=>operations.map(operation=>'{const stable={toString(){return "17;";}};const target={__proto__:null};'+operation.replaceAll('KEY',key)+'print(eval(stable.toString()));}'));
 pieces.push('{let source="17;";const target={__proto__:null};target[{[Symbol.toPrimitive](hint){print(hint);source="19;";return String(Math.random());}}];print(eval(source));}');
 pieces.push('{const target={__proto__:null};try{target[{[Symbol.toPrimitive](){throw "23;";}}];}catch(error){print(eval(error));}}');
 const depth=512;
 pieces.push('{const stable={toString(){return "29;";}};const keyP0={key:String(Math.random())};');
 for(let index=0;index<depth;index++)pieces.push('const keyP'+(index+1)+'=Object.create(keyP'+index+');');
 pieces.push('const target={__proto__:null};if(NATIVE_GC)$262.gc();target[keyP'+depth+'.key];print(eval(stable.toString()));}print("primitive-key-complete");');
 return pieces.join('\n');
}
test('primitive property keys preserve independent source owners in native execution',async()=>{
 const source=nativeSource(),expected=reference(source.replaceAll('NATIVE_GC','false'));
 expect(expected.endsWith('29\nprimitive-key-complete\n')).toBe(true);
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-primitive-key-native-'));
 try{for(const noGc of [false,true]){
  const entry=join(directory,'source.js'),output=join(directory,'program-'+noGc),diagnostics:string[]=[];
  await writeFile(entry,source.replaceAll('NATIVE_GC',String(!noGc)));
  const result=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/primitive-key-source#script',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(expected);
 }}finally{await rm(directory,{recursive:true,force:true});}
},600000);

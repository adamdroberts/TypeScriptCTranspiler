import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';import * as os from 'node:os';import * as path from 'node:path';
import ts from 'typescript';import {compile} from '../../src/compile';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';import {parseHostObservation} from '../test262/protocol';

const cases:[string,string][]=[
 ['try{throw "31;";}catch(source){OBSERVE(source);}','31'],
 ['function fail(value){throw value;}try{fail("37;");}catch(source){OBSERVE(source);}','37'],
 ['var holder={get value(){throw "41;";}};try{holder.value;}catch(source){OBSERVE(source);}','41'],
 ['function key(){throw "43;";}try{({[key()](){}});}catch(source){OBSERVE(source);}','43'],
 ['function fail(){throw "47;";}function invoke(value=fail()){}try{invoke();}catch(source){OBSERVE(source);}','47'],
 ['var holder={get value(){throw "53;";}};try{try{throw holder;}catch({value}){}}catch(source){OBSERVE(source);}','53'],
 ['try{try{throw "59;";}finally{}}catch(source){OBSERVE(source);}','59'],
 ['try{try{throw "61;";}catch(inner){throw inner;}}catch(source){OBSERVE(source);}','61'],
];
const asyncCase='async function fail(){throw "73;";}async function verify(){try{await fail();}catch(source){OBSERVE(source);}}verify();';
const bindingCases:[string,string][]=[
 ['try{throw {};}catch({value=31}){print(value);}','31'],
 ['try{try{throw {};}catch({value=value}){}}catch(error){print(error.name);}','ReferenceError'],
 ['function retain(){try{throw {};}catch({read=()=>value,value=41}){return read;}}var read=retain();if(NATIVE_GC)$262.gc();print(read());','41'],
 ['try{throw [31,37,41];}catch([first,...rest]){print(first+"|"+rest.join(","));}','31|37,41'],
 ['var trace=[];var iterator={next(){trace.push("next");return {value:47,done:false};},return(){trace.push("close");return {};}};var iterable={[Symbol.iterator](){return iterator;}};try{throw iterable;}catch([first]){print(first+"|"+trace.join(","));}','47|next,close'],
 ['function key(){throw "binding-key";}try{try{throw {};}catch({[key()]:value}){}}catch(error){print(error);}','binding-key'],
];
const keyCases:[string,string][]=[
 ['var trace=[];function key(){trace.push("key");}var object={[key()]: (trace.push("value"),31)};print(trace.join(",")+"|"+object.undefined);','key,value|31'],
 ['var trace=[];var key={toString(){trace.push("coerce");return "value";}};var object={[key]:(trace.push("value"),37)};print(trace.join(",")+"|"+object.value);','coerce,value|37'],
 ['var trace=[];function key(){trace.push("key");}var object={[key()](){return 41;},get [key()](){return 43;},set [key()](value){trace.push(value);}};object.undefined=47;print(trace.join(",")+"|"+object.undefined);','key,key,key,47|43'],
];

test('one exception-value graph routes protected throws, call/getter outcomes and async rejection',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-thrown-model-'));
 try{const entry=path.join(directory,'source.js');
  for(const [source,value] of [...cases,[asyncCase,'73'] as [string,string]]){
   await fs.writeFile(entry,source.replace('OBSERVE(source)','eval(source)'));
   expect(sourceEvaluationInvocations(ts.createProgram([entry],{allowJs:true,noLib:true})).map(call=>call.choices)).toEqual([[value+';']]);
  }
  for(const body of ['if(flag)throw "31;";external();','var object=flag?{get value(){throw "31;";}}:external;object.value;',
      'if(flag)throw "31;";var object={valueOf(){throw "37;";}};object-1;',
      'if(flag)throw "31;";var key={toString(){throw "37;";}};({[key]:0});']){
   await fs.writeFile(entry,`try{${body}}catch(source){eval(source);}`);
   expect(sourceEvaluationInvocations(ts.createProgram([entry],{allowJs:true,noLib:true})).map(call=>call.choices)).toEqual([null]);
  }
 }finally{await fs.rm(directory,{recursive:true,force:true});}
},30_000);

test('finite caught source values execute through the ordinary native registry in both memory modes',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-thrown-native-'));
 const pieces=cases.map(([source])=>`(function(){${source.replace('OBSERVE(source)','print(eval(source))')}})();`),expected=cases.map(([,value])=>value);
 for(const [source,value] of [...bindingCases,...keyCases]){pieces.push(`(function(){${source}})();`);expected.push(value);}
 // One deep call graph propagates the same exception cell without recursion in analysis.
 const depth=256;pieces.push('function fail0(){throw "79;";}');for(let index=1;index<depth;index++)pieces.push(`function fail${index}(){fail${index-1}();}`);
 pieces.push(`try{fail${depth-1}();}catch(source){if(NATIVE_GC)$262.gc();print(eval(source));}`);expected.push('79');
 pieces.push(asyncCase.replace('OBSERVE(source)','print(eval(source))'));expected.push('73');
 try{const entry=path.join(directory,'source.js');await fs.writeFile(entry,pieces.join('\n').replaceAll('NATIVE_GC','false'));
  const oracle=Bun.spawnSync(['node','-e','const vm=require("node:vm"),fs=require("node:fs");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:x=>fs.writeSync(1,String(x)+"\\n")});',entry],{stdout:'pipe',stderr:'pipe'});
  expect({exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exitCode:0,stderr:''});expect(oracle.stdout.toString().trimEnd().split('\n')).toEqual(expected);
  for(const noGc of [false,true]){await fs.writeFile(entry,pieces.join('\n').replaceAll('NATIVE_GC',String(!noGc)));
   const output=path.join(directory,'program-'+noGc),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build-'+noGc),isolatedScriptRoots:[entry],initializationEntries:[entry],
    test262Observation:{kind:'test262-native-observation',scenarioId:'property/source-thrown-values.js#sloppy',setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect((observation.stdout??'').trimEnd().split('\n')).toEqual(expected);
  }
 }finally{await fs.rm(directory,{recursive:true,force:true});}
},300_000);

import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';import * as os from 'node:os';import * as path from 'node:path';
import ts from 'typescript';import {compile} from '../../src/compile';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';import {parseHostObservation} from '../test262/protocol';

const nonTextResults=['Symbol(input)','Number(input)','BigInt(input)','Boolean(input)','parseInt(input)','parseFloat(input)','isFinite(input)','isNaN(input)','Object(input)','Array(input)'];
test('one Realm binding collection supplies normal call result categories without selecting by source spelling',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-intrinsic-model-'));
 try{const entry=path.join(directory,'source.js');
  for(const expression of nonTextResults){await fs.writeFile(entry,`eval(${expression});`);expect(sourceEvaluationInvocations(ts.createProgram([entry],{allowJs:true,noLib:true})).map(call=>call.choices)).toEqual([[]]);}
  for(const source of ['eval(String(input));','eval(Date());','var value=flag?Number(input):external;eval(value);','var convert=flag?Number:external;eval(convert(input));','try{if(flag)throw "31;";Number({valueOf(){throw external;}});}catch(source){eval(source);}',
    'eval(""+Number(input));','globalThis[input]=()=>"31;";eval(Number());',
    'Object.defineProperties(globalThis,external);eval(Number());',
    'Object.assign(globalThis,{Number:()=>"31;"});eval(Number());',
    'var holder={value:"31;"};external(holder);eval(holder.value);']){
   await fs.writeFile(entry,source);expect(sourceEvaluationInvocations(ts.createProgram([entry],{allowJs:true,noLib:true})).map(call=>call.choices)).toEqual([null]);
  }
  for(const source of ['var Number=function(){return "31;";};eval(Number());','globalThis.Number=function(){return "31;";};eval(Number());',
    'Object.defineProperty(globalThis,"Number",{get(){return ()=>"31;";}});eval(Number());',
    'Object.defineProperty(globalThis,"Number",{value:()=>"31;"});eval(Number());','Reflect.set(globalThis,"Number",()=>"31;");eval(Number());',
    'var prototype=Object.getPrototypeOf(function(){});Object.defineProperty(prototype,"source",{value:"31;"});eval(prototype.source);',
    'var Reflect={apply(){return "31;";}};eval(Reflect.apply());','Reflect.apply=function(){return "31;";};eval(Reflect.apply());',
    'var convert=Number.bind(null,input);eval(convert());','eval(Number.apply(null,[input]));','eval(Reflect.apply(Number,null,[input]));']){
   await fs.writeFile(entry,source);expect(sourceEvaluationInvocations(ts.createProgram([entry],{allowJs:true,noLib:true})).map(call=>call.choices)).toEqual([source.includes('"31;"')?['31;']:[]]);
  }
 }finally{await fs.rm(directory,{recursive:true,force:true});}
},30_000);

test('canonical intrinsic result facts preserve native values, reflected calls and overridden owners',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-intrinsic-native-'));
 const pieces=[
  'var marker=Symbol("marker");print(eval(marker)===marker);',
  'print(eval(Number("37")));print(eval(BigInt("41")));print(eval(Boolean(0)));',
  'print(eval(parseInt("43")));print(eval(parseFloat("47.5")));print(eval(isFinite(Infinity)));print(eval(isNaN(NaN)));',
  'var object=Object({value:53});var array=Array(2);print(eval(object)===object);print(eval(array)===array);',
  'var convert=Number;var bound=convert.bind(undefined,"59");print(eval(bound()));print(eval(convert.call(undefined,"61")));print(eval(Reflect.apply(convert,undefined,["67"])));',
  'var oldSymbol=Symbol;globalThis.Symbol=function(){return "71;";};print(eval(Symbol()));globalThis.Symbol=oldSymbol;',
  '(function(){var saved=Number;Object.defineProperty(globalThis,"Number",{value:function(){return "79;";},writable:true,configurable:true});print(eval(Number()));globalThis.Number=saved;})();',
  '(function(){var saved=Number;Reflect.set(globalThis,"Number",function(){return "83;";});print(eval(Number()));globalThis.Number=saved;})();',
  '(function(){var prototype=Object.getPrototypeOf(function(){});Object.defineProperty(prototype,"source",{value:"89;"});print(eval(prototype.source));})();',
 ];
 const expected=['true','37','41','false','43','47.5','false','true','true','true','59','61','67','71','79','83','89'];
 const depth=512;pieces.push('var alias0=Number;');for(let index=1;index<depth;index++)pieces.push(`var alias${index}=alias${index-1};`);
 pieces.push(`if(NATIVE_GC)$262.gc();print(eval(alias${depth-1}("73")));`);expected.push('73');
 try{const entry=path.join(directory,'source.js');await fs.writeFile(entry,pieces.join('\n').replaceAll('NATIVE_GC','false'));
  const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm"),fs=require("node:fs");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:x=>fs.writeSync(1,String(x)+"\\n")});',entry],{stdout:'pipe',stderr:'pipe'});
  expect({exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exitCode:0,stderr:''});expect(oracle.stdout.toString().trimEnd().split('\n')).toEqual(expected);
  for(const noGc of [false,true]){await fs.writeFile(entry,pieces.join('\n').replaceAll('NATIVE_GC',String(!noGc)));
   const output=path.join(directory,'program-'+noGc),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build-'+noGc),isolatedScriptRoots:[entry],initializationEntries:[entry],
    test262Observation:{kind:'test262-native-observation',scenarioId:'property/intrinsic-result-facts.js#sloppy',setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect((observation.stdout??'').trimEnd().split('\n')).toEqual(expected);
  }
 }finally{await fs.rm(directory,{recursive:true,force:true});}
},300_000);

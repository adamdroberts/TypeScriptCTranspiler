import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {parseHostObservation} from '../test262/protocol';

const plans:[string,string][]=[
 ['{"body":"17;"}','value.body'],
 ['["19;"]','value[0]'],
 ['{"rows":[{"body":"23;"}]}','value.rows[0].body'],
 ['[{"rows":["29;"]}]','value[0].rows[0]'],
 ['{"__proto__":{"body":"31;"}}','value.__proto__.body'],
 ['{"constructor":{"body":"37;"}}','value.constructor.body'],
 ['{"body":"discarded","body":"41;"}','value.body'],
 ['{"1":"43;","01":"47;"}','value[1]'],
 ['["53", ";"]','value.join("")'],
];
const calls=['JSON.parse(text)','JSON.parse.call(null,text)','JSON.parse.bind(null)(text)','Reflect.apply(JSON.parse,null,[text])'];
function program():string{
 const blocks=plans.flatMap(([text,selected],index)=>calls.map((call,route)=>`{const text=${JSON.stringify(text)},value=${call};console.log('owner${index}-${route}:'+eval(${selected}));}`));
 blocks.push(`{const value=JSON.parse('["59;","61;"]');for(const body of value)console.log('iteration:'+eval(body));}`);
 blocks.push(`{const value=JSON.parse('["67;"]');function run(body){return eval(body)}console.log('apply:'+Reflect.apply(run,null,value));}`);
 blocks.push(`{const value=JSON.parse('{"body":"71;"}');value.body='73;';console.log('mutation:'+eval(value.body));}`);
 blocks.push(`{const value=JSON.parse('{"body":"79;"}');Object.defineProperty(value,'body',{get(){return '83;'}});console.log('accessor:'+eval(value.body));}`);
 blocks.push(`{let body='181;';const iterable={[Symbol.iterator](){return {next(){return {done:false,value:1}},return(){body='191;';return {}}}}};for(const value of iterable){break}console.log('close:'+eval(body));}`);
 blocks.push(`{let body='229;';const iterable={[Symbol.iterator](){return {next(){return {done:false,value:1}},get return(){body='233;';return function(){return {}}}}}};for(const value of iterable){break}console.log('close-getter:'+eval(body));}`);
 blocks.push(`{const iterable={[Symbol.iterator](){return {next(){return {done:false,value:1}},return(){throw '239;'}}}};try{for(const value of iterable){break}}catch(body){console.log('close-throw:'+eval(body));}}`);
 let text='"89;"',selected='value';for(let depth=0;depth<512;depth++){if(depth%2){text='['+text+']';selected+='[0]'}else{text='{"child":'+text+'}';selected+='.child'}}
 // Reverse the path to match the outermost container while keeping one deep
 // generated mixed-container tree, independent of the runtime fixture inventory.
 selected='value'+Array.from({length:512},(_,i)=>(511-i)%2?'[0]':'.child').join('');
 blocks.push(`{const value=JSON.parse(${JSON.stringify(text)});COLLECT console.log('deep:'+eval(${selected}));}`);
 return blocks.join('\n')+'\n';
}

test('parsed JSON containers enter one ordinary field/prototype/List graph',()=>{
 for(const [text,selected]of plans)for(const call of calls){
  const source=`const text=${JSON.stringify(text)},value=${call};eval(${selected});`,result=graph([{path:'main.js',source}]);expect({source,error:result.error}).toEqual({source,error:null});
  const oracle=nodeReferenceSync(['node','-e','const value=JSON.parse(process.argv[1]);require("node:fs").writeSync(1,String(eval(process.argv[2])));','--',text,selected],{stdout:'pipe',stderr:'pipe'});
  expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});expect(result.directEvalSources.map(entry=>entry.source)).toEqual([oracle.stdout.toString()]);
 }
 expect(graph([{path:'main.js',source:program().replaceAll('COLLECT','')}]).error).toBeNull();
 for(const [source,expected]of [
  ['const value=JSON.parse("[\\\"97;\\\",\\\"101;\\\"]");for(const body of value)eval(body);',['97;','101;']],
  ['const value=JSON.parse("{\\\"body\\\":\\\"103;\\\"}");value.body="107;";eval(value.body);',['103;','107;']],
  ['const value=JSON.parse("{\\\"body\\\":\\\"109;\\\"}");Object.defineProperty(value,"body",{get(){return "113;"}});eval(value.body);',['113;']],
 ] as const){const result=graph([{path:'main.js',source}]);expect({source,error:result.error}).toEqual({source,error:null});for(const body of expected)expect(result.directEvalSources.some(entry=>entry.source===body)).toBe(true);}
 for(const source of [
  'const value=JSON.parse(opaque());eval(value.body);',
  'const value=JSON.parse("{\\\"body\\\":\\\"127;\\\"}");opaque(value);eval(value.body);',
  'const value=JSON.parse("[\\\"137;\\\"]");value[Symbol.iterator]=opaque();eval(value.join(""));',
  'const value=JSON.parse("{\\\"body\\\":\\\"139;\\\"}");Object.defineProperty(value,"body",{get(){return opaque()}});eval(value.body);',
 ])expect({source,error:graph([{path:'main.js',source}]).error}).toMatchObject({error:expect.stringContaining('direct eval source is not a finite static string expression')});
 for(const source of [
  'let body="179;";const iterable={[Symbol.iterator](){return {next(){return {done:false,value:1}},return(){body=opaque();return {}}}}};for(const value of iterable){break}eval(body);',
  'let body="197;";Iterator.prototype.return=function(){body=opaque();return {}};for(const value of JSON.parse("[1]")){break}eval(body);',
 ])expect({source,error:graph([{path:'main.js',source}]).error}).toMatchObject({error:expect.stringContaining('direct eval source is not a finite static string expression')});
 for(const [source,expected]of [
  ['let body="181;";const iterable={[Symbol.iterator](){return {next(){return {done:false,value:1}},return(){body="191;";return {}}}}};for(const value of iterable){break}eval(body);','191;'],
  ['let body="199;";Object.prototype.return=function(){body="211;";return {}};for(const value of JSON.parse("[1]")){break}eval(body);','211;'],
  ['let body="223;";Object.getPrototypeOf(JSON.parse("[1]")[Symbol.iterator]()).return=function(){body="227;";return {}};for(const value of JSON.parse("[1]")){break}eval(body);','227;'],
 ] as const){const result=graph([{path:'main.js',source}]);expect({source,error:result.error}).toEqual({source,error:null});expect(result.directEvalSources.some(entry=>entry.source===expected)).toBe(true);}
});

test('parsed owner source closure agrees with Node through retained native execution',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-json-parse-owner-'));
 try{
  const referenceEntry=path.join(temporary,'reference.mjs');await fs.writeFile(referenceEntry,program().replaceAll('COLLECT',''));
  const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',referenceEntry],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}`);await fs.mkdir(directory);const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+program().replaceAll('COLLECT',noGc?'':'$262.gc();'));
   const output=path.join(directory,'program'),diagnostics:string[]=[];const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),test262Observation:{kind:'test262-native-observation',scenarioId:'json-parse-owner#module',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({mode,noGc,code:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({mode,noGc,code:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});expect({mode,noGc,code:native.exitCode,stderr:native.stderr.toString()}).toEqual({mode,noGc,code:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect({mode,noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({mode,noGc,kind:'normal'});expect(observation.stdout).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

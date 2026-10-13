import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {parseHostObservation} from '../test262/protocol';

// Original-value identity, token spelling and decoded last definitions are
// independent semantic partitions of the retained parse-record tree.
const plans:[string,string][]=[
 ['{"body":"17;"}','value.body'],
 ['["19;"]','value[0]'],
 ['{"rows":[{"body":"23;"}]}','value.rows[0].body'],
 ['{"body":"discarded","body":"29;"}','value.body'],
 ['{"__proto__":{"body":"31;"}}','value.__proto__.body'],
 ['{"1":"37;","01":"41;"}','value[1]'],
];
const routes=['JSON.parse(text,reviver)','Reflect.apply(JSON.parse,null,[text,reviver])','JSON.parse.bind(null)(text,reviver)'];
function deep():{text:string;selected:string}{let text='"43;"';for(let depth=0;depth<512;depth++)text=depth%2?'['+text+']':'{"child":'+text+'}';return {text,selected:'value'+Array.from({length:512},(_,i)=>(511-i)%2?'[0]':'.child').join('')}}
function program():string{
 const blocks=plans.flatMap(([text,selected],index)=>routes.map((call,route)=>`{const text=${JSON.stringify(text)},reviver=function(key,value,context){return value};const value=${call};console.log('owner${index}-${route}:'+eval(${selected}));}`));
 blocks.push(`{let body='47;';JSON.parse('{"a":19e0,"b":"\\\\u0031"}',function(key,value,context){if(context.source!==undefined)body=context.source;return value});console.log('token:'+eval(body));}`);
 blocks.push(`{const value=JSON.parse('{"a":0,"b":"53;"}',function(key,value,context){if(key==='a')this.b='59;';return value});console.log('changed:'+eval(value.b));}`);
 blocks.push(`{let body='61;';JSON.parse('{"a":0,"b":19}',function(key,value,context){if(key==='a')this.b=+'19';if(key==='b')body=context.source;return value});console.log('same:'+eval(body));}`);
 blocks.push(`{try{JSON.parse('[1,2]',function(){throw '67;'})}catch(body){console.log('throw:'+eval(body))}}`);
 blocks.push(`{const value=JSON.parse('{"body":"71;"}',function(key,value){return '73;'});console.log('replacement:'+eval(value));}`);
 blocks.push(`{function forward(value){const local=value;return local}console.log('forward:'+eval(forward('79;'))+':'+eval(forward('83;')));}`);
 blocks.push(`{function modify(value){value='89;';return value}console.log('local:'+eval(modify('97;')));}`);
 blocks.push(`{const value=JSON.parse('[]',function(key,value,context){return context.source});console.log('absent:'+String(eval(value)));}`);
 const stress=deep();blocks.push(`{const value=JSON.parse(${JSON.stringify(stress.text)},function(key,value,context){return value});COLLECT console.log('deep:'+eval(${stress.selected}));}`);
 return blocks.join('\n')+'\n';
}

test('JSON reviver source records retain original identities and postorder effects',()=>{
 for(const [text,selected]of plans)for(const call of routes){const source=`const text=${JSON.stringify(text)},reviver=function(key,value,context){return value},value=${call};eval(${selected});`,result=graph([{path:'main.js',source}]);expect({source,error:result.error}).toEqual({source,error:null});
  const oracle=Bun.spawnSync(['node','-e','const value=JSON.parse(process.argv[1],(key,value)=>value);require("node:fs").writeSync(1,String(eval(process.argv[2])));','--',text,selected],{stdout:'pipe',stderr:'pipe'});expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});expect(result.directEvalSources.some(entry=>entry.source===oracle.stdout.toString())).toBe(true);
 }
 for(const source of [
  'let body="101;";JSON.parse("{\\\"x\\\":1}",function(key,value){body=opaque();return value});eval(body);',
  'const value=JSON.parse("{\\\"body\\\":\\\"103;\\\"}",function(key,value){if(key==="body")return opaque();return value});eval(value.body);',
  'function write(value){value=opaque();return value}eval(write("107;"));',
 ])expect({source,error:graph([{path:'main.js',source}]).error}).toMatchObject({error:expect.stringContaining('direct eval source is not a finite static string expression')});
 expect(graph([{path:'main.js',source:program().replaceAll('COLLECT','')}]).error).toBeNull();
});

test('retained source records and actual formal returns agree with Node natively',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-json-reviver-source-record-'));
 try{
  const referenceEntry=path.join(temporary,'reference.mjs');await fs.writeFile(referenceEntry,program().replaceAll('COLLECT',''));const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',referenceEntry],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});
  for(const typed of [false,true])for(const noGc of [false,true]){
   const directory=path.join(temporary,`${typed}-${noGc}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs');await fs.writeFile(entry,(typed?'// @ts-nocheck\n':'')+program().replaceAll('COLLECT',noGc?'':'$262.gc();'));const output=path.join(directory,'program'),diagnostics:string[]=[];
   const compiled=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),test262Observation:{kind:'test262-native-observation',scenarioId:'json-reviver-source-record#module',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({typed,noGc,code:compiled.exitCode,diagnostics:diagnostics.join('')}).toEqual({typed,noGc,code:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});expect({typed,noGc,code:native.exitCode,stderr:native.stderr.toString()}).toEqual({typed,noGc,code:0,stderr:''});const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect({typed,noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({typed,noGc,kind:'normal'});expect(observation.stdout).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

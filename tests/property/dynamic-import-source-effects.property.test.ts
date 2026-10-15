import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {parseHostObservation} from '../test262/protocol';

const plans=[
 {name:'with-getter',options:"{get with(){body='23;';return {type:'json'}}}",expected:23},
 {name:'inherited-with',options:"Object.create({get with(){body='29;';return {type:'json'}}})",expected:29},
 {name:'attribute-getter',options:"{with:{get type(){body='31;';return 'json'}}}",expected:31},
 {name:'non-enumerable',options:"{with:Object.defineProperty({type:'json'},'ignored',{get(){body=opaque()},enumerable:false})}",expected:17},
 {name:'symbol',options:"{with:{type:'json',get [Symbol.iterator](){body=opaque()}}}",expected:17},
 {name:'unsupported-after-collection',options:"{with:{type:'json',get extra(){body='37;';return 'unsupported'}}}",expected:37},
 {name:'invalid-after-collection',options:"{with:{first:1,get type(){body='41;';return 'json'}}}",expected:41},
 {name:'early-getter-throw',options:"{with:{get first(){throw '43;'},get type(){body=opaque();return 'json'}}}",expected:17},
 {name:'primitive-options',options:'17',expected:17},
 {name:'primitive-attributes',options:'{with:17}',expected:17},
 {name:'getter-rejects-promise',options:"{get with(){throw '47;'}}",expected:17},
 {name:'numeric-key-order',options:"{with:{get type(){body='59;';return 'json'},get 0(){body='53;';return 'value'}}}",expected:59},
];
function source(plan:typeof plans[number]):string{return `let body='17;';const options=${plan.options};let promise;try{promise=import('./data.json',options)}catch(error){body=opaque()}promise.catch(()=>{});console.log('${plan.name}:'+eval(body));`}

test('ImportCall immediate source effects follow option and own-key continuations',()=>{
 for(const plan of plans){const input=source(plan),result=graph([{path:'main.mjs',source:input,goal:'module'}]);expect({name:plan.name,error:result.error}).toEqual({name:plan.name,error:null});expect(result.directEvalSources.some(entry=>entry.source===plan.expected+';')).toBe(true)}
 for(const options of ["{get with(){body=opaque();return {type:'json'}}}","{with:{get type(){body=opaque();return 'json'}}}","{with:{first:1,get type(){body=opaque();return 'json'}}}","{with:new Proxy({type:'json'},{ownKeys(){body=opaque();return ['type']}})}","{with:new Proxy({type:'json'},{getOwnPropertyDescriptor(){body=opaque();return {enumerable:true,configurable:true}}})}","{with:new Proxy({type:'json'},{get(){body=opaque();return 'json'}})}"]){
  expect(graph([{path:'main.mjs',source:`let body='17;';const options=${options};import('./data.json',options);eval(body);`,goal:'module'}]).error).toContain('direct eval source is not a finite static string expression');
 }
 const symbol=`let body='17;';import(Symbol(),{get with(){body=opaque();return {type:'json'}}}).catch(()=>{});eval(body);`;
 expect(graph([{path:'main.mjs',source:symbol,goal:'module'}]).error).toBeNull();
});

test('dynamic import option effects match independent Node and native execution',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-import-source-effects-'));
 try{
  const expected=plans.map(plan=>plan.name+':'+plan.expected+'\n').join('')+'deep:61\n';
  for(const typed of [false,true])for(const noGc of [false,true]){
   const depth=!typed&&!noGc?512:3,chain=Array.from({length:depth},(_,index)=>`const owner${index}=Object.create(${index?'owner'+(index-1):"{get with(){body='61;';return {type:'json'}}}"});`).join('\n');
   const program="function opaque(){return /.*/.exec('67;')[0]}\n"+plans.map(plan=>'{'+source(plan)+'}').join('\n')+`\n{let body='17;';${chain}import('./data.json',owner${depth-1}).catch(()=>{});console.log('deep:'+eval(body));}`;
   const directory=path.join(temporary,`${typed}-${noGc}`);await fs.mkdir(directory);await fs.writeFile(path.join(directory,'data.json'),'262');
   const oracle=path.join(directory,'oracle.mjs');await fs.writeFile(oracle,program);
   const node=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=value=>fs.writeSync(1,String(value)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({code:node.exitCode,stderr:node.stderr.toString(),stdout:node.stdout.toString()}).toEqual({code:0,stderr:'',stdout:expected});
   const entry=path.join(directory,typed?'main.ts':'main.mjs');await fs.writeFile(entry,(typed?'// @ts-nocheck\n':'')+program);const output=path.join(directory,'program'),diagnostics:string[]=[];
   const built=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),moduleRoots:[entry,path.join(directory,'data.json')],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'dynamic-import-source-effects#module',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({typed,noGc,code:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({typed,noGc,code:0,diagnostics:''});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(parseHostObservation(JSON.parse(native.stdout.toString()))).toMatchObject({kind:'normal',stdout:expected});
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function sources(depth:number,cyclic:boolean,extension:string,profile:boolean,collect:boolean):Map<string,string>{
 const files=new Map<string,string>(),request=(name:string)=>JSON.stringify('./'+name+extension);
 files.set('data.json','{"token":17}');
 for(let index=0;index<depth;index++){
  const next=request(index+1<depth?'node-'+(index+1):'leaf');
  files.set('node-'+index+extension,`export * as next from ${next};import * as alias from ${next};export {alias};export const index=${index};`);
 }
 files.set('leaf'+extension,`export let value=17;export function increment(){value++}export {default as data} from './data.json' with {type:'json'};export * as json from './data.json' with {type:'json'};${cyclic?`export * as root from ${request('node-0')};`:''}`);
 files.set('main'+extension,`import * as root from ${request('node-0')};import * as again from ${request('node-0')};import * as leaf from ${request('leaf')};import data from './data.json' with {type:'json'};import * as json from './data.json' with {type:'json'};
 function check(value,label){if(!value)throw new Error(label)}
 check(root===again,'root identity');let current=root;
 for(let index=0;index<${depth};index++){check(current.index===index,'binding owner');check(current.next===current.alias,'shared factory');check(Object.keys(current).join('|')==='alias|index|next','complete export plan');current=current.next;}
 check(current===leaf,'leaf identity');${cyclic?"check(leaf.root===root,'cyclic factory');":''}
 check(leaf.data===data&&leaf.json===json&&json.default===data,'JSON reference identity');
 const retained=current;${collect?'$262.gc();':''}leaf.increment();check(retained.value===18,'live binding');
 async function resumed(){await 0;check(retained===leaf&&retained.value===18,'retained namespace');${profile?'print':'console.log'}('namespace-factory:true');}resumed();`);
 return files;
}

test('namespace factory worklists retain graph identity and complete export plans',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-module-namespace-factory-'));
 try{
  const partitions=[{depth:3,cyclic:false},{depth:7,cyclic:true}];
  const plans=partitions.flatMap(partition=>[false,true].flatMap(typed=>[false,true].map(noGc=>({...partition,typed,noGc,stress:false}))));
  plans.push(...[false,true].map(noGc=>({depth:512,cyclic:true,typed:false,noGc,stress:true})));
  for(const [index,plan]of plans.entries()){
   const directory=path.join(temporary,String(index));await fs.mkdir(directory);
   const oracleDirectory=path.join(directory,'oracle');await fs.mkdir(oracleDirectory);
   for(const [name,source]of sources(plan.depth,plan.cyclic,'.mjs',false,false))await fs.writeFile(path.join(oracleDirectory,name),source);
   const node=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=value=>fs.writeSync(1,String(value)+"\\n");import(process.argv[1]);',path.join(oracleDirectory,'main.mjs')],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({plan,code:node.exitCode,stderr:node.stderr.toString(),stdout:node.stdout.toString()}).toEqual({plan,code:0,stderr:'',stdout:'namespace-factory:true\n'});
   const extension=plan.typed?'.ts':'.mjs',entries:string[]=[];
   for(const [name,source]of sources(plan.depth,plan.cyclic,extension,true,!plan.noGc)){
    const filename=path.join(directory,name);await fs.writeFile(filename,(plan.typed&&name.endsWith('.ts')?'// @ts-nocheck\n':'')+source);entries.push(filename);
   }
   const entry=path.join(directory,'main'+extension),output=path.join(directory,'program'),diagnostics:string[]=[];
   const built=await compile({entry,output,noGc:plan.noGc,moduleRoots:entries,initializationEntries:[entry],buildDir:path.join(directory,'build'),test262Observation:{kind:'test262-native-observation',scenarioId:'namespace-factory#module',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({plan,code:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({plan,code:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({plan,code:native.exitCode,stderr:native.stderr.toString()}).toEqual({plan,code:0,stderr:''});
   expect(parseHostObservation(JSON.parse(native.stdout.toString()))).toMatchObject({kind:'normal',stdout:node.stdout.toString()});
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

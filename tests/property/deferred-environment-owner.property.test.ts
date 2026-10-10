import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(profile:boolean,noGc:boolean,stress:boolean,nativeSignals:boolean):string {
 return `// @ts-nocheck
 import {setTimeout as delay,setImmediate as immediate,scheduler} from 'node:timers/promises';
 const host=globalThis,collectHook=${profile&&!noGc?'host.$262.gc':'undefined'};
 function output(value:any):void{${profile?'host.print':'console.log'}(value);}
 function collect():void{${profile&&!noGc?'collectHook();':''}}
 function check(value:boolean,label:string):void{if(!value)throw label;output(label+':true');}
 function fresh(kind:number):any {
  if(kind===0)return 'fresh:'+String(9007199254740992);
  if(kind===1)return BigInt('9007199254740993');
  if(kind===2)return Symbol('fresh');
  if(kind===3)return{value:'object:'+String(7)};
  if(kind===4)return['array:'+String(7)];
  if(kind===5)return function(){return 'callable:'+String(7);};
  if(kind===6)return -0;
  if(kind===7)return NaN;
  return Promise.resolve('adopted:'+String(7));
 }
 function verify(value:any,kind:number,label:string):void{
  let valid:boolean;
  if(kind===0)valid=value==='fresh:9007199254740992';
  else if(kind===1)valid=value===9007199254740993n;
  else if(kind===2)valid=typeof value==='symbol'&&value.description==='fresh';
  else if(kind===3)valid=value.value==='object:7';
  else if(kind===4)valid=value[0]==='array:7';
  else if(kind===5)valid=value()==='callable:7';
  else if(kind===6)valid=Object.is(value,-0);
  else if(kind===7)valid=Number.isNaN(value);
  else valid=value==='adopted:7';
  check(valid,label);
 }
 function deferred(mode:number,kind:number):Promise<any>{
  if(mode===0)return delay(0,fresh(kind));
  if(mode===1)return delay(3,fresh(kind));
  if(mode===2)return immediate(fresh(kind));
  return delay(3,fresh(kind),{signal:${nativeSignals?'new AbortController().signal':'undefined'}});
 }
 function churn():void{for(let index=0;index<256;index++){const discarded={value:'churn:'+String(index)};collect();}}
 function retained():any {let node:any={value:'leaf:'+String(7)};for(let depth=0;depth<${stress?8192:8};depth++)node={previous:node};return node;}
 async function run():Promise<void>{
  for(let mode=0;mode<4;mode++)for(let kind=0;kind<9;kind++){const pending=deferred(mode,kind);churn();verify(await pending,kind,'deferred-owner-'+mode+'-'+kind);}
  const timeout=delay(0,retained()),next=immediate(retained());churn();
  for(const pending of [timeout,next]){let node:any=await pending;for(let depth=0;depth<${stress?8192:8};depth++)node=node.previous;check(node.value==='leaf:7','retained-deep-deferred-owner-graph');}
  const absent=delay(0,undefined,{signal:${nativeSignals?'new AbortController().signal':'undefined'}}),absentImmediate=immediate(undefined,{signal:${nativeSignals?'new AbortController().signal':'undefined'}});churn();check((await absent)===undefined&&(await absentImmediate)===undefined,'deferred-undefined-with-owned-signal');
  const wait=scheduler.wait(0,{signal:${nativeSignals?'new AbortController().signal':'undefined'}});churn();check((await wait)===undefined,'scheduler-owned-signal');
  const yielding=scheduler.yield();churn();check((await yielding)===undefined,'scheduler-empty-environment');
 }
 run().catch((error:any)=>{output('UNEXPECTED:'+String(error));});
 `;
}

test('Deferred environment field Lists retain actual heap owners through callback execution',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-deferred-environment-owner-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try{
  const plans=[true,false].flatMap(typed=>[false,true].filter(profile=>typed||!profile).flatMap(profile=>[false,true].map(noGc=>({typed,profile,noGc,stress:false}))));plans.push({typed:true,profile:true,noGc:false,stress:true});
  const expected=new Map<string,string[]>();
  for(const key of new Set(plans.map(plan=>`${plan.profile}-${plan.stress}-${plan.typed}`))){
   const [profile,stress,nativeSignals]=key.split('-').map(value=>value==='true');
   const entry=path.join(temporary,`reference-${key}.mjs`);await fs.writeFile(entry,erase(subject(profile!,true,stress!,nativeSignals!)));
   const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");globalThis.print=console.log;import(process.argv[1]);',entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const lines=reference.stdout.toString().trimEnd().split('\n');expect(lines.at(-1)).toBe('scheduler-empty-environment:true');expected.set(key,lines);
  }
  for(const {typed,profile,noGc,stress} of plans){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}-${stress}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(profile,noGc,stress,typed);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/deferred-environment-owner.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,stress,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({typed,profile,noGc,stress,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:'normal',scenarioId:'property/deferred-environment-owner.js#module'});
   expect({typed,profile,noGc,stress,lines:(observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')}).toEqual({typed,profile,noGc,stress,lines:expected.get(`${profile}-${stress}-${typed}`)!});
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

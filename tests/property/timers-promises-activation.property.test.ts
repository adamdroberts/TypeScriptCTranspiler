import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(profile:boolean,noGc:boolean,stress:boolean,nativeSignals:boolean):string {
 return `// @ts-nocheck
 import {setTimeout as delay,setImmediate as immediate,setInterval as interval,scheduler} from 'node:timers/promises';
 const host=globalThis,collectHook=${profile&&!noGc?'host.$262.gc':'undefined'};
 function output(value:any):void{${profile?'host.print':'console.log'}(value);}
 function collect():void{${profile&&!noGc?'collectHook();':''}}
 function check(value:boolean,label:string):void{if(!value)throw label;output(label+':true');}
 const trace:string[]=[];
 function note(label:string,value:any):any{trace.push(label);return value;}
 function invoke(mode:number,args:any[]):any{
  if(mode===0)return delay(...args);
  if(mode===1)return immediate(...args);
  if(mode===2)return scheduler.wait(...args);
  return scheduler.yield(...args);
 }
 function actuals(mode:number,value:any,options:any,delayValue:any=0):any[]{
  if(mode===0)return[delayValue,value,options];
  if(mode===1)return[value,options];
  if(mode===2)return[delayValue,options];
  return[options];
 }
 async function run():Promise<void>{
  const noSignal=undefined,refEnabled=true;
  const earlierOptions={signal:noSignal,ref:refEnabled};
  for(let mode=0;mode<4;mode++){
   const options={get signal(){trace.push('signal');return undefined;},get ref(){trace.push('ref');collect();return true;},get unrelated(){throw 'unused option';}};
   const args=actuals(mode,'payload',note('argument-options',options));args.push(note('ignored-argument',17));
   const pending=invoke(mode,args);trace.push('after-invocation');collect();const value=await pending;
   check(mode<2?value==='payload':value===undefined,'ordinary-options-'+mode);output(trace.join('|'));trace.length=0;
   const aliased=await invoke(mode,actuals(mode,'alias',earlierOptions));check(mode<2?aliased==='alias':aliased===undefined,'earlier-boxed-options-'+mode);
   const keeper=delay(4);const unreferenced=await invoke(mode,actuals(mode,'unref',{ref:false}));check(mode<2?unreferenced==='unref':unreferenced===undefined,'unreferenced-with-keeper-'+mode);await keeper;
   for(const invalid of [null,false,3,'bad',[],function(){}]){
    let rejected=false,synchronous=false,pending:any;
    try{pending=invoke(mode,actuals(mode,'ignored',invalid));}catch(error){synchronous=true;}
    try{await pending;}catch(error){rejected=error instanceof TypeError;}
    check(!synchronous&&rejected===(mode!==3),'options-validation-'+mode);
   }
   for(const invalid of [{ref:null},{ref:0},{signal:null},{signal:false},{signal:{}}]){
    let rejected=false;try{await invoke(mode,actuals(mode,'ignored',invalid));}catch(error){rejected=error instanceof TypeError;}
    check(rejected===(mode!==3),'option-field-validation-'+mode);
   }
   const marker={value:'marker'};let synchronous=false,abruptPending:any,rejected=false;
   try{abruptPending=invoke(mode,actuals(mode,'ignored',{get signal(){throw marker;}}));}catch(error){synchronous=true;}
   try{await abruptPending;}catch(error){rejected=error===marker;}
   check(!synchronous&&rejected===(mode!==3),'validation-getter-abrupt-'+mode);
   let reads=0,projectionThrown=false,projection:any;
   try{projection=invoke(mode,actuals(mode,'ignored',{get ref(){reads++;if(reads===3)throw marker;return true;}}));}catch(error){projectionThrown=error===marker;}
   if(mode===3)await projection;
   check(projectionThrown===(mode!==3),'projection-getter-abrupt-'+mode);
  }
  for(const invalid of [null,false,'0',1n,{}]){
   let rejected=false;try{await delay(invalid,'ignored');}catch(error){rejected=error instanceof TypeError;}
   check(rejected,'actual-delay-domain');
  }
  const values:string[]=['first','second'];const delivered=await delay(0,values,earlierOptions);check(delivered[0]==='first'&&delivered[1]==='second','native-array-result-codec');
  const mutated={signal:undefined,ref:false};mutated.ref=true;check((await delay(0,'mutable',mutated))==='mutable','actual-mutated-options');
  const getterOwners={get signal(){return ${nativeSignals?'new AbortController().signal':'undefined'};},get ref(){collect();return true;}};
  const retained=delay(0,'owned',getterOwners);collect();check((await retained)==='owned','projected-option-owner');
  const iterator=interval(0,'tick',{get signal(){trace.push('interval-signal');return undefined;},get ref(){trace.push('interval-ref');return true;}});
  trace.push('after-create');collect();const item=await iterator.next();check(item.value==='tick'&&!item.done,'lazy-interval-activation');await iterator.return();output(trace.join('|'));trace.length=0;
  const invalidIterator=interval(0,'ignored',null);let intervalRejected=false;try{await invalidIterator.next();}catch(error){intervalRejected=error instanceof TypeError;}check(intervalRejected&&(await invalidIterator.next()).done,'deferred-interval-validation');
  const intervalMarker={value:'interval-marker'};let intervalReads=0,intervalSynchronous=false,intervalPending:any;
  const projectionIterator=interval(0,'ignored',{get ref(){intervalReads++;if(intervalReads===3)throw intervalMarker;return true;}});
  try{intervalPending=projectionIterator.next();}catch(error){intervalSynchronous=true;}
  let intervalProjectionRejected=false;try{await intervalPending;}catch(error){intervalProjectionRejected=error===intervalMarker;}
  check(!intervalSynchronous&&intervalProjectionRejected,'deferred-interval-projection-abrupt');
  const depth=${stress?8192:8},argumentsList:any[]=[0,'retained:'+String(7),earlierOptions];for(let index=0;index<depth;index++)argumentsList.push({value:'argument:'+String(index)});
  const expanded=delay(...argumentsList);collect();check((await expanded)==='retained:7','retained-expanded-actual-list');
 }
 run().catch((error:any)=>{output('UNEXPECTED:'+String(error));});
 `;
}

test('Timer Promise activations consume ordinary options and retained actual Lists',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-timers-promises-activation-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try{
  const plans=[true,false].flatMap(typed=>[false,true].filter(profile=>typed||!profile).flatMap(profile=>[false,true].map(noGc=>({typed,profile,noGc,stress:false}))));plans.push({typed:true,profile:true,noGc:false,stress:true});
  const expected=new Map<string,string[]>();
  for(const key of new Set(plans.map(plan=>`${plan.profile}-${plan.stress}-${plan.typed}`))){
   const [profile,stress,nativeSignals]=key.split('-').map(value=>value==='true');
   const entry=path.join(temporary,`reference-${key}.mjs`);await fs.writeFile(entry,erase(subject(profile!,true,stress!,nativeSignals!)));
   const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");globalThis.print=console.log;import(process.argv[1]);',entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const lines=reference.stdout.toString().trimEnd().split('\n');expect(lines.at(-1)).toBe('retained-expanded-actual-list:true');expected.set(key,lines);
  }
  for(const {typed,profile,noGc,stress} of plans){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}-${stress}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(profile,noGc,stress,typed);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/timers-promises-activation.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,stress,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({typed,profile,noGc,stress,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:'normal',scenarioId:'property/timers-promises-activation.js#module'});
   expect({typed,profile,noGc,stress,lines:(observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')}).toEqual({typed,profile,noGc,stress,lines:expected.get(`${profile}-${stress}-${typed}`)!});
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

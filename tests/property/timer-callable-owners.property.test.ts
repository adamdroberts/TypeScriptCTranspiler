import { expect, test } from 'bun:test';
import ts from 'typescript';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compile } from '../../src/compile';
import { parseHostObservation } from '../test262/protocol';
function source(noGc:boolean):string{return `
import callbackDefault,{setTimeout as timeout,setInterval as interval,setImmediate as immediate,clearTimeout as clear,clearImmediate} from 'node:timers';
import * as callbacks from 'node:timers';
import promiseDefault,{setTimeout as delay,setImmediate as later,setInterval as sequence,scheduler} from 'node:timers/promises';
import * as promises from 'node:timers/promises';
const host:any=globalThis;function output(value:any):void{host.print(value);}function collect():void{${noGc?'':'host.$262.gc();'}}
function check(value:boolean,label:string):void{if(!value)throw label;output(label+':true');}
async function run():Promise<void>{
 const callbackNames=['setTimeout','setInterval','setImmediate','clearTimeout','clearInterval','clearImmediate'];
 const promiseNames=['setTimeout','setImmediate','setInterval'];
 for(const name of callbackNames){const fn=(callbacks as any)[name];check(fn===(callbackDefault as any)[name]&&fn===(globalThis as any)[name],'callback-identity:'+name);check(fn.name===name&&fn.length===(name==='setTimeout'||name==='setInterval'?2:1),'callback-metadata:'+name);}
 for(const name of promiseNames){const fn=(promises as any)[name];check(fn===(promiseDefault as any)[name],'promise-identity:'+name);check(fn.name===name&&fn.length===(name==='setImmediate'?1:2),'promise-metadata:'+name);}
 check(Object.getPrototypeOf(promises)===null&&Object.prototype.toString.call(promises)==='[object Module]','module-namespace');
 const marker:any={marker:7};
 function tail(value:any):Promise<any>{return delay(1,value);}
 check(await tail(marker)===marker,'ambient-tail-value');
 for(const call of [(value:any)=>Reflect.apply(delay,null,[1,value]),(value:any)=>delay.bind(null,1)(value),(value:any)=>((promises.setTimeout))(1,value)])check(await call(marker)===marker,'reflected-promise-call');
 const original=promiseDefault.setTimeout;let trace='';const replacement:any=()=>Promise.resolve('replacement');
 function argument():any{trace+='argument|';promiseDefault.setTimeout=replacement;return marker;}
 check(await promiseDefault.setTimeout(1,argument())===marker&&trace==='argument|','lookup-before-arguments');
 check(promises.setTimeout===original&&delay===original&&await promiseDefault.setTimeout(0,marker)==='replacement','immutable-import-cell');promiseDefault.setTimeout=original;
 for(const name of ['wait','yield']){const fn=(scheduler as any)[name],descriptor=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(scheduler),name)!;check(fn.name===name&&fn.length===(name==='wait'?2:0)&&descriptor.writable&&!descriptor.enumerable&&descriptor.configurable,'scheduler-metadata:'+name);let thrown=false;try{Reflect.apply(fn,{},[]);}catch(error){thrown=error instanceof TypeError&&(error as any).code==='ERR_INVALID_THIS';}check(thrown,'scheduler-receiver:'+name);}
 await scheduler.wait(1);await scheduler.yield();check(true,'scheduler-live');
 const stream:any=sequence(1,marker);check((await stream.next()).value===marker,'interval-actual-value');await stream.return();
 await new Promise<void>((resolve:any)=>{immediate(function(...actuals:any[]){collect();check(actuals[0]===marker&&actuals[1]===7n&&actuals[2]===Symbol.iterator,'callback-actual-types');resolve();},marker,7n,Symbol.iterator);});
 await new Promise<void>((resolve:any)=>{const enqueue=queueMicrotask;Reflect.apply(enqueue,null,[()=>{collect();check(true,'microtask-callable-owner');resolve();}]);});
 let cancelled=false;const id=timeout(()=>{cancelled=true;},1);clear(id);const immediateId=immediate(()=>{cancelled=true;});clearImmediate(immediateId);await delay(2);check(!cancelled,'callback-cancellation');
 const values:number[]=[];for(let index=0;index<512;index++)values.push(index);
 await new Promise<void>((resolve:any)=>{timeout(function(...actuals:any[]){collect();check(actuals.length===values.length&&actuals.every((value:any,index:number)=>value===index),'retained-actual-list');resolve();},1,...values);});
}
run().catch((error:any)=>{output('failure:'+String(error));throw error;});
`}
test('timer native owners preserve actual calls, identities, mutation, receivers and retained Lists',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-timer-callable-owners-'));
 try{
  const text=source(true),erased=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText,reference=join(directory,'reference.mjs');await writeFile(reference,erased);
  const oracle=Bun.spawnSync(['node','-e','const fs=require("node:fs");globalThis.print=value=>fs.writeSync(1,String(value)+"\\n");import(process.argv[1]);',reference],{stdout:'pipe',stderr:'pipe',timeout:60_000});expect({exit:oracle.exitCode,err:oracle.stderr.toString()}).toEqual({exit:0,err:''});
  for(const noGc of [false,true])for(const erasedInput of [false,true]){
   const entry=join(directory,erasedInput?'main.js':'main.ts'),variant=String(noGc)+'-'+String(erasedInput),output=join(directory,'program-'+variant),diagnostics:string[]=[];const input=source(noGc);await writeFile(entry,erasedInput?ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText:input);const result=await compile({entry,output,noGc,buildDir:join(directory,'build-'+variant),moduleRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/timer-callable-owners#module',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exit:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exit:0,diagnostics:''});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exit:native.exitCode,err:native.stderr.toString()}).toEqual({exit:0,err:''});const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation).toEqual(expect.objectContaining({kind:'normal'}));expect(observation.stdout).toBe(oracle.stdout.toString());
  }
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

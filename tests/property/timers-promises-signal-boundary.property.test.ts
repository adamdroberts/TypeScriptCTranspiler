import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';

// Foreign signal protocol is outside the native backend's current contract.
// In particular, an ordinary class context must never be cast to Abort state.
const source=`// @ts-nocheck
 import {setTimeout as delay} from 'node:timers/promises';
 class ForeignSignal {aborted=false;addEventListener():void{}removeEventListener():void{}}
 const owners:any[]=[{aborted:false,addEventListener(){},removeEventListener(){}},new ForeignSignal()];
 async function run():Promise<void>{
  for(const signal of owners){
   let closed=false;
   try{await delay(0,'ignored',{signal});}catch(error){closed=error instanceof TypeError&&error.message==='timers/promises requires a native AbortSignal';}
   if(!closed)throw 'foreign signal crossed its native boundary';
  }
  console.log('foreign-signal-boundary:true');
 }
 run().catch((error:any)=>{console.log('UNEXPECTED:'+String(error));});
`;

test('Foreign signal owners fail closed before native private-state access',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-timers-promises-signal-boundary-'));
 try{
  for(const noGc of [false,true]){
   const directory=path.join(temporary,String(noGc));await fs.mkdir(directory);const entry=path.join(directory,'main.ts'),output=path.join(directory,'program'),diagnostics:string[]=[];await fs.writeFile(entry,source);
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:10_000});expect({noGc,exitCode:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({noGc,exitCode:0,stderr:'',stdout:'foreign-signal-boundary:true\n'});
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},60_000);

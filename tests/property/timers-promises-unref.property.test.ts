import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(profile:boolean):string{return `// @ts-nocheck
 import {setTimeout as delay,setImmediate as immediate,scheduler} from 'node:timers/promises';
 const host=globalThis;
 function output(value:any):void{${profile?'host.print':'console.log'}(value);}
 output('synchronous:true');
 delay(2000,'late',{ref:false}).then(()=>{output('UNEXPECTED:timeout');});
 immediate('late',{ref:false}).then(()=>{output('UNEXPECTED:immediate');});
 scheduler.wait(2000,{ref:false}).then(()=>{output('UNEXPECTED:wait');});
 Promise.resolve().then(()=>{output('microtask:true');});
 `;}

test('Unreferenced timer Promise jobs preserve microtasks without keeping the process alive',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-timers-promises-unref-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try{
  const expected=new Map<boolean,string>();
  for(const profile of [false,true]){
   const entry=path.join(temporary,`reference-${profile}.mjs`);await fs.writeFile(entry,erase(subject(profile)));
   const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");globalThis.print=console.log;import(process.argv[1]);',entry],{stdout:'pipe',stderr:'pipe',timeout:10_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});expect(reference.stdout.toString()).toBe('synchronous:true\nmicrotask:true\n');expected.set(profile,reference.stdout.toString());
  }
  for(const typed of [true,false])for(const profile of [false,true].filter(profile=>typed||!profile))for(const noGc of [false,true]){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(profile);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/timers-promises-unref.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:10_000});expect({typed,profile,noGc,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({typed,profile,noGc,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:'normal',scenarioId:'property/timers-promises-unref.js#module'});
   expect(observation?observation.stdout??'':native.stdout.toString()).toBe(expected.get(profile)!);
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},120_000);

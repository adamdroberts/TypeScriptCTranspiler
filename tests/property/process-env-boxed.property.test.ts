import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(javascript=false):string{const body=`
function check(value,label){if(!value)throw label}
for(const suffix of ['', 'x'.repeat(700)]){
 const key='TSC2C_ENV_BOXED_'+suffix;delete env[key];check(env[key]===undefined,'initial');
 for(const value of ['', 'alpha', 'omega']){env[key]=value;check(alias[key]===value&&process.env[key]===value,'value');delete alias[key];check(env[key]===undefined&&process.env[key]===undefined,'deleted');console.log('transition',suffix.length,value,env[key]??'missing')}
}
env.TSC2C_ENV_BOXED_NARROW='value';delete alias.TSC2C_ENV_BOXED_NARROW;check(env.TSC2C_ENV_BOXED_NARROW===undefined,'static-narrowing');
`;return javascript?body.replace(/(?<![.\w])(env|alias)(?=[.\[])/g,"process.env"):"import {env,env as alias} from 'node:process';\n"+body}


test('Environment reads preserve runtime absence across static narrowing and complete keys',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-process-env-boxed-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false));
  const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  const missingOwnerEntry=path.join(temporary,'missing-owner.mjs');await fs.writeFile(missingOwnerEntry,"import {env} from 'node:process'; console.log(env.TSC2C_ENV_BOXED_NARROW);\n");
  const missingOwnerDiagnostics:string[]=[];const missingOwner=await compile({entry:missingOwnerEntry,output:path.join(temporary,'missing-owner'),emitCOnly:true,moduleRoots:[missingOwnerEntry],initializationEntries:[missingOwnerEntry],buildDir:path.join(temporary,'missing-owner-build'),test262Observation:{kind:'test262-native-observation',scenarioId:'process-env-import.mjs#module',setupEntries:[],testEntry:missingOwnerEntry,async:false},diagnosticWriter:message=>missingOwnerDiagnostics.push(message)});
  expect(missingOwner.exitCode).toBe(3);expect(missingOwnerDiagnostics.join('')).toContain('Module binding requires a canonical retained cell');
  const globalOwnerEntry=path.join(temporary,'missing-global-owner.mjs');await fs.writeFile(globalOwnerEntry,subject(true));
  const globalOwnerDiagnostics:string[]=[];const globalOwner=await compile({entry:globalOwnerEntry,output:path.join(temporary,'missing-global-owner'),emitCOnly:true,moduleRoots:[globalOwnerEntry],initializationEntries:[globalOwnerEntry],buildDir:path.join(temporary,'missing-global-owner-build'),diagnosticWriter:message=>globalOwnerDiagnostics.push(message)});
  expect(globalOwner.exitCode).toBe(3);expect(globalOwnerDiagnostics.join('')).toContain('ambient host value requires an ordinary runtime owner');
  for(const mode of ['typed'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(mode==='javascript'));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'process-env-boxed.ts#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
   if(observation)expect({noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({noGc,kind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

import {expect,test}from 'bun:test';
import {mkdtemp,writeFile,readFile,rm}from 'node:fs/promises';
import {tmpdir}from 'node:os';import {join}from 'node:path';
import {compile}from '../../src/compile';import {parseHostObservation}from '../test262/protocol';
import {moduleRejectionOriginInput}from '../e2e/generated-cases';

test('retained Module rejection observes its actual source after job draining',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-module-rejection-origin-'));
 try{for(const typed of [true,false])for(const noGc of [false,true])for(const role of ['entry','dependency','job']as const){
  const directory=join(root,`${typed}-${noGc}-${role}`);await Bun.write(directory+'/.keep','');
  const deep=moduleRejectionOriginInput(typed&&!noGc&&role==='dependency'?512:1),sources:Record<string,string>=role==='dependency'?{'main.ts':deep.source,...deep.files}:role==='entry'?{'main.ts':"await Promise.resolve().then(()=>Promise.reject(new RangeError()));\n"}:{'main.ts':"queueMicrotask(()=>{throw new RangeError()});export {};\n"};
  const setup=join(directory,'setup.js');await writeFile(setup,'');
  for(const[name,source]of Object.entries(sources))await writeFile(join(directory,name==='main.ts'&&!typed?'main.mjs':name),source);
  const oracle=join(directory,'oracle.mjs'),oracleOutput=oracle+'.stdout';await writeFile(oracle,sources['main.ts']!);const code=role==='job'?"process.on('uncaughtException',error=>{require('node:fs').writeSync(1,error.name+'\\n');process.exit(0)});import(process.argv[1]);":"import(process.argv[1]).then(()=>process.exitCode=1,error=>require('node:fs').writeSync(1,error.name+'\\n'));";
  const entry=join(directory,typed?'main.ts':'main.mjs');const node=Bun.spawnSync(['node','-e',code,oracle],{stdout:Bun.file(oracleOutput),stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});expect(await readFile(oracleOutput,'utf8')).toBe('RangeError\n');
  const output=join(directory,'native'),diagnostics:string[]=[];const result=await compile({entry,output,noGc,moduleRoots:[entry],additionalRoots:[setup],isolatedScriptRoots:[setup],initializationEntries:[setup,entry],buildDir:output+'-build',test262Observation:{kind:'test262-native-observation',scenarioId:'property/module-rejection-origin.js#module',setupEntries:[setup],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,role,code:result.exitCode,diagnostics}).toEqual({typed,noGc,role,code:0,diagnostics:[]});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect({typed,noGc,role,observation}).toMatchObject({observation:{kind:'throw',phase:'runtime',origin:role==='entry'?'test-source':role==='dependency'?'module-graph':'async-completion',errorConstructor:'RangeError'}});
 }}finally{await rm(root,{recursive:true,force:true})}
},900000);

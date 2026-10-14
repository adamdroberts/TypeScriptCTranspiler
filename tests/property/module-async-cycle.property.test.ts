import {expect,test}from'bun:test';
import{mkdtemp,mkdir,writeFile,rm}from'node:fs/promises';
import{tmpdir}from'node:os';
import{join}from'node:path';
import{compile}from'../../src/compile';
import{moduleAsyncCycleInput}from'../e2e/generated-cases';

test('one retained asynchronous Module cycle waits for its root before external consumers',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-module-async-cycle-'));
 try{for(const noGc of [false,true]){
  const folder=join(root,String(noGc));await mkdir(folder);const {source,files}=moduleAsyncCycleInput(noGc?3:512);
  for(const[name,text]of Object.entries(files))await writeFile(join(folder,name),text);
  const entry=join(folder,'main.mjs'),output=join(folder,'program');await writeFile(entry,source);
  const node=Bun.spawnSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString(),stdout:node.stdout.toString()}).toEqual({code:0,stderr:'',stdout:'module async cycle: true\n'});
  const diagnostics:string[]=[],r=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:m=>diagnostics.push(m)});expect({code:r.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:node.stdout.toString()});
 }}finally{await rm(root,{recursive:true,force:true})}
},900000);

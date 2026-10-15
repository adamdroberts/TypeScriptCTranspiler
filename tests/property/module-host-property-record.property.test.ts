import {expect,test} from 'bun:test';
import {exportedModuleNames,resolveModuleExport,type ModuleExportRecord} from '../../src/module-export-resolution';
import {compile} from '../../src/compile';
import ts from 'typescript';
import {mkdtemp,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('host property records compose with the canonical Module binding worklist',()=>{
 const records=new Map<string,ModuleExportRecord<string>>();
 const make=(path:string):ModuleExportRecord<string>=>({path,localExports:new Map(),indirectExports:new Map(),starExports:[]});
 const host={...make('host'),hostPropertyExports:true};records.set('host',host);
 const local={...make('local'),localExports:new Map([['present','cell']])};records.set('local',local);
 let target='host';
 for(let index=0;index<4096;index++){
  const name='bridge-'+index,record={...make(name),indirectExports:new Map([['value',{moduleRequest:target,importName:index?'value':'actual-property'}]])};records.set(name,record);target=name;
 }
 const imported=(_record:ModuleExportRecord<string>,request:string)=>records.get(request)??null;
 expect(resolveModuleExport(records.get(target)!,'value',imported)).toEqual({modulePath:'host',bindingName:'actual-property'});
 for(const name of ['default','name','symbol text','not-declared'])expect(resolveModuleExport(host,name,imported)).toEqual({modulePath:'host',bindingName:name});
 expect(resolveModuleExport(local,'missing',imported)).toBeNull();expect(resolveModuleExport(local,'present',imported)).toEqual({modulePath:'local',bindingName:'cell'});
 expect(()=>exportedModuleNames(host,imported)).toThrow('Host property exports require a finite export-name record');
});

test('CommonJS owner import profile survives preflight against explicit TypeScript CommonJS erasure in Node',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-module-host-properties-'));
 try{
  const fixture=join(process.cwd(),'tests/e2e/cases/commonjs_module_owner');
  for(const name of ['owner.cjs','local.cjs'])await copyFile(join(fixture,name),join(root,name));
  const source=await readFile(join(fixture,'in.ts'),'utf8'),expected=await readFile(join(fixture,'expected.stdout'),'utf8');
  // This is the existing native CommonJS import profile, not Node's ESM
  // namespace/default interop. The adapter is explicit and independently run.
  const erased=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.CommonJS,esModuleInterop:false}}).outputText;
  const reference=join(root,'reference.cjs');await writeFile(reference,erased);
  const oracle=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.map(String).join(" ")+"\\n");require(process.argv[1]);',reference],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({code:oracle.exitCode,stderr:oracle.stderr.toString(),stdout:oracle.stdout.toString()}).toEqual({code:0,stderr:'',stdout:expected});
  for(const noGc of [false,true]){
   const entry=join(root,'main.ts'),output=join(root,'program-'+noGc),diagnostics:string[]=[];await writeFile(entry,source);
   const result=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:m=>diagnostics.push(m)});
   expect({noGc,code:result.exitCode,diagnostics}).toEqual({noGc,code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});
   expect({noGc,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({noGc,code:0,stderr:'',stdout:oracle.stdout.toString()});
  }
 }finally{await rm(root,{recursive:true,force:true})}
},600000);

test('indirect host property References keep live reads through a Module namespace',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-indirect-host-property-'));
 try{
  const host="let value=7;Object.defineProperty(exports,'count',{enumerable:true,get(){return value}});exports.set=function(next){value=next};";
  const bridge="export {count as selected} from './host.cjs';";
  const source="// @ts-nocheck\nimport {selected} from './bridge.mjs';import * as namespace from './bridge.mjs';const host=require('./host.cjs');console.log(selected,namespace.selected);host.set(13);console.log(selected,namespace.selected);";
  await writeFile(join(root,'host.cjs'),host);await writeFile(join(root,'bridge.mjs'),bridge);
  const erase=(text:string)=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.CommonJS,esModuleInterop:false}}).outputText;
  // Resource suffix mapping belongs to the explicit CommonJS reference
  // adapter; the native input retains the actual Module bridge source.
  await writeFile(join(root,'bridge.cjs'),erase(bridge));
  const reference=join(root,'reference.cjs');await writeFile(reference,erase(source.replaceAll('./bridge.mjs','./bridge.cjs')));
  const node=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(...v)=>fs.writeSync(1,v.map(String).join(" ")+"\\n");require(process.argv[1]);',reference],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({code:node.exitCode,stderr:node.stderr.toString(),stdout:node.stdout.toString()}).toEqual({code:0,stderr:'',stdout:'7 7\n13 13\n'});
  for(const noGc of [false,true]){
   const entry=join(root,'main.ts'),output=join(root,'program-'+noGc),diagnostics:string[]=[];await writeFile(entry,source);
   const result=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:m=>diagnostics.push(m)});
   expect({noGc,code:result.exitCode,diagnostics}).toEqual({noGc,code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});
   expect({noGc,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({noGc,code:0,stderr:'',stdout:node.stdout.toString()});
  }
 }finally{await rm(root,{recursive:true,force:true})}
},600000);

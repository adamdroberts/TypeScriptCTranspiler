import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {buildProgram,resolvePackageRoot} from '../../src/program';
import {buildModuleGraph} from '../../src/resolve';
import {emitProgram} from '../../src/emit';
import {moduleRequestKey} from '../../src/module-request';
import {invokeCc} from '../../src/link/cc';

const oracle=`const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');const files=JSON.parse(fs.readFileSync(0,'utf8')),context=vm.createContext({console:{log:(...values)=>fs.writeSync(1,values.join(' ')+'\\n')}}),cache=new Map();function get(name){if(cache.has(name))return cache.get(name);const record=new vm.SourceTextModule(files[name],{identifier:name,context});cache.set(name,record);return record}(async()=>{try{const root=get('main.mjs');await root.link((specifier,parent,extra)=>get(specifier==='./leaf.mjs'&&extra.attributes.type==='javascript'?'other.mjs':path.posix.normalize(path.posix.join(path.posix.dirname(parent.identifier),specifier))));await root.evaluate()}catch(error){fs.writeSync(2,error.stack);process.exitCode=1}})();`;

function sources(depth:number):Map<string,string>{
 const files=new Map<string,string>();
 for(const [name,value]of [['leaf',17],['other',23]]as const)files.set(name+'.mjs',`export let value=${value};export function increment(){value++}export default function marker(){return value}`);
 files.set('bridge.mjs',`export {value as plain} from './leaf.mjs';export {value as attributed} from './leaf.mjs' with {type:'javascript'};export * as plainNamespace from './leaf.mjs';export * as attributedNamespace from './leaf.mjs' with {type:'javascript'};import * as local from './leaf.mjs' with {type:'javascript'};export {local as localNamespace};`);
 for(let index=0;index<depth;index++)files.set('edge-'+index+'.mjs',`export * from './${index+1<depth?'edge-'+(index+1):'bridge'}.mjs';`);
 files.set('main.mjs',`import plainDefault,{value as plainValue} from './leaf.mjs';import attributedDefault,{value as attributedValue,increment} from './leaf.mjs' with {type:'javascript'};import * as plain from './leaf.mjs';import * as attributed from './leaf.mjs' with {type:'javascript'};import * as retained from './other.mjs';import * as bridge from './edge-0.mjs';
 console.log('direct',plain.value,attributed.value,plainValue,attributedValue,plainDefault(),attributedDefault());
 console.log('forwarded',bridge.plain,bridge.attributed,bridge.plainNamespace===plain,bridge.attributedNamespace===attributed,bridge.localNamespace===attributed,attributed===retained);
 increment();console.log('live',plain.value,attributed.value,plainValue,attributedValue,attributedDefault());`);
 return files;
}

test('emitter References retain the host-resolved ModuleRequest attribute identity',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-request-emitter-'));
 try{
  for(const typed of [false,true])for(const noGc of [false,true]){
   const directory=path.join(temporary,`${typed}-${noGc}`);await fs.mkdir(directory);
   const graphSources=sources(!typed&&!noGc?512:3),entries:string[]=[];
   const node=Bun.spawnSync(['node','--experimental-vm-modules','--no-warnings','-e',oracle],{stdin:Buffer.from(JSON.stringify(Object.fromEntries(graphSources))),stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({code:node.exitCode,stderr:node.stderr.toString(),stdout:node.stdout.toString()}).toEqual({code:0,stderr:'',stdout:'direct 17 23 17 23 17 23\nforwarded 17 23 true true true true\nlive 17 24 17 24 24\n'});
   for(const [name,source]of graphSources){const filename=path.join(directory,typed&&name==='main.mjs'?'main.ts':name);await fs.writeFile(filename,(typed&&name==='main.mjs'?'// @ts-nocheck\n':'')+source);entries.push(filename)}
   const entry=path.join(directory,typed?'main.ts':'main.mjs'),buildDir=path.join(directory,'build'),output=path.join(directory,'program'),diagnostics:string[]=[];
   // Package the normal runtime once; only the authoritative host resolution
   // table changes before the public emitter emits the actual native program.
   const packaged=await compile({entry,output,noGc,emitCOnly:true,buildDir,moduleRoots:entries,initializationEntries:[entry],diagnosticWriter:message=>diagnostics.push(message)});
   expect({code:packaged.exitCode,diagnostics:diagnostics.join('')}).toEqual({code:0,diagnostics:''});
   const built=buildProgram({entry,packageRoot:resolvePackageRoot(),moduleRoots:entries,initializationEntries:[entry]}),graph=buildModuleGraph(built.program,built.libCoreDts,built.entrySourceFile.fileName),other=[...graph.modules.values()].find(record=>record.sf.text===graphSources.get('other.mjs'))!;
   for(const record of graph.modules.values())for(const request of record.moduleRequests){
    if(request.specifier==='./leaf.mjs'&&request.attributes.some(attribute=>attribute.key==='type'&&attribute.value==='javascript'))record.resolvedModuleRequests.set(moduleRequestKey(request),other.moduleId);
   }
   const emitted=emitProgram(graph,built.checker);expect(emitted.diagnostics).toEqual([]);await fs.writeFile(path.join(buildDir,'main.c'),emitted.mainC);
   const runtime=(await fs.readdir(buildDir)).filter(name=>name.endsWith('.c')).map(name=>path.join(buildDir,name));
   const linked=await invokeCc({sources:runtime,output,includeDirs:[buildDir],libs:[...(!noGc?['gc']:[]),'m','resolv','ssl','crypto','icui18n','icuuc','icudata','gmp'],extraFlags:noGc?['-DTSC_NO_GC']:[],stderrWriter:message=>diagnostics.push(message)});
   expect({code:linked.exitCode,diagnostics:diagnostics.join('')}).toEqual({code:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:node.stdout.toString()});
   const root=graph.modules.get(graph.entryModuleId)!;
   root.resolvedModuleRequests.delete(moduleRequestKey({specifier:'./leaf.mjs',attributes:[{key:'type',value:'javascript'}]}));
   expect(()=>emitProgram(graph,built.checker)).toThrow('Module request requires a retained resolution');
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

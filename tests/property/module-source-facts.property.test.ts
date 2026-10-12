import { expect, test } from "bun:test";
import ts from "typescript";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

function sources(depth:number,collect:boolean):Record<string,string>{
 const files:Record<string,string>={
  'source.json':'"7 + 11"',
  'payload.json':'{"code":"13+17","body":"return 31","parts":["5+7"],"__proto__":{"code":"19+23"}}',
  'bridge.mjs':`export {default as source} from './source.json' with {type:'json'};export * as space from './source.json' with {type:'json'};`,
  'value.mjs':`export default '43+47';export const code='47+53';`,
  'mutable.mjs':`export let code='1+2';export function read(){return '3+4';}export function change(){code='5+6';read=()=> '7+8';}`,
  'cycle-a.mjs':`export * as other from './cycle-b.mjs';export {default as source} from './source.json' with {type:'json'};`,
  'cycle-b.mjs':`export * as other from './cycle-a.mjs';`,
 };
 for(let index=0;index<depth;index++)files['chain-'+index+'.mjs']=index+1<depth?`export * as next from './chain-${index+1}.mjs';`:`export * as leaf from './source.json' with {type:'json'};`;
 const deep='chain'+'.next'.repeat(depth-1)+'.leaf.default';
 files['main.ts']=`import source from './source.json' with {type:'json'};
import payload from './payload.json' with {type:'json'};
import * as space from './source.json' with {type:'json'};
import {source as forwarded,space as forwardedSpace} from './bridge.mjs';
import defaultSource from './value.mjs';import * as value from './value.mjs';
import * as mutable from './mutable.mjs';import * as cycle from './cycle-a.mjs';import * as chain from './chain-0.mjs';
const host:any=globalThis;const namespace:any=space,forwardedNamespace:any=forwardedSpace,values:any=value,mutations:any=mutable,cyclic:any=cycle,graph:any=chain;
function output(label:string,value:any):void{host.print(label+':'+String(value));}
output('json-default',eval(source));output('json-namespace',eval(namespace.default));output('json-reexport',eval(forwarded));output('namespace-reexport',eval(forwardedNamespace.default));
output('json-property',eval(payload.code));output('json-array',eval(payload.parts[0]));output('json-proto-data',eval(payload.__proto__.code));
output('function-body',Function(payload.body)());output('esm-default',eval(defaultSource));output('esm-namespace',eval(values.code));
output('namespace-cycle',eval(cyclic.other.other.source));output('mutable-before',eval(mutations.code));output('callable-before',eval(mutations.read()));mutations.change();output('mutable-after',eval(mutations.code));output('callable-after',eval(mutations.read()));
${collect?'host.$262.gc();':''}
output('retained-namespace-path',eval(${deep.replace('chain','graph')}));
`;
 return files;
}
test('module source facts project JSON data, namespace graphs and live export cells into finite AOT source closure',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-module-source-facts-'));
 try{
  for(const typed of [false,true])for(const noGc of [false,true]){
   const depth=typed&&!noGc?128:3,variant=String(typed)+'-'+String(noGc),directory=join(root,variant),reference=join(directory,'reference');await mkdir(reference,{recursive:true});
   const files=sources(depth,!noGc),oracle=sources(depth,false);
   for(const[name,source]of Object.entries(files))await writeFile(join(directory,name==='main.ts'&&!typed?'main.mjs':name),name==='main.ts'&&!typed?ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText:source);
   for(const[name,source]of Object.entries(oracle))await writeFile(join(reference,name==='main.ts'?'main.mjs':name),name==='main.ts'?ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText:source);
   const node=Bun.spawnSync(['node','-e','const fs=require("node:fs");globalThis.print=value=>fs.writeSync(1,String(value)+"\\n");import(process.argv[1]);',join(reference,'main.mjs')],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exit:node.exitCode,stderr:node.stderr.toString()}).toEqual({exit:0,stderr:''});
   const entry=join(directory,typed?'main.ts':'main.mjs'),output=join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:join(directory,'build'),test262Observation:{kind:'test262-native-observation',scenarioId:'property/module-source-facts#module',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exit:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exit:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exit:native.exitCode,stderr:native.stderr.toString()}).toEqual({exit:0,stderr:''});
   const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed).toMatchObject({kind:'normal'});expect(observed.stdout).toBe(node.stdout.toString());
  }
 }finally{await rm(root,{recursive:true,force:true});}
},900_000);

test('unknown namespace source values retain the ordinary finite-source diagnostic',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-module-source-unknown-'));
 try{
  await writeFile(join(directory,'owner.mjs'),'export const source=process.env.RUNTIME_SOURCE;\n');
  const entry=join(directory,'main.mjs');await writeFile(entry,"import * as owner from './owner.mjs';eval(owner.source);\n");
  const diagnostics:string[]=[];const result=await compile({entry,output:join(directory,'program'),emitCOnly:true,buildDir:join(directory,'build'),diagnosticWriter:message=>diagnostics.push(message)});
  expect(result.exitCode).toBe(3);expect(diagnostics.join('')).toContain('unknown eval() source requires --runtime-code-manifest');
 }finally{await rm(directory,{recursive:true,force:true});}
});

import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';
import {nodeReferenceSync} from './node-reference';

// A module's function declaration binding is mutable; every ImportBinding of
// it (default, named, renamed, `default as`, namespace member, re-exported) is
// an indirect binding that observes a later write in the exporting module. Each
// exporter shape is one partition, written from inside the function or from a
// sibling export, and read through each import form before and after the
// write. A 64-module re-export chain is the depth stress.
const exporters:Record<string,string>={
 selfDefault:'export default function fn() { fn = 2; return 1; } export function write() { if (typeof fn === "function") fn(); }',
 named:'export function fn() { return 1; } export function write() { fn = 2; }',
 renamed:'function fn() { return 1; } export { fn as alias }; export function write() { fn = 2; }',
 namedDefault:'export default function fn() { return 1; } export function write() { fn = 2; }',
};
const reads:Record<string,{imports:string;read:string}>={
 selfDefault:{imports:'import d_selfDefault, { default as n_selfDefault, write as w_selfDefault } from "./selfDefault.mjs"; import * as ns_selfDefault from "./selfDefault.mjs";',read:'d_selfDefault n_selfDefault ns_selfDefault.default'},
 named:{imports:'import { fn as n_named, write as w_named } from "./named.mjs"; import * as ns_named from "./named.mjs";',read:'n_named ns_named.fn'},
 renamed:{imports:'import { alias as n_renamed, write as w_renamed } from "./renamed.mjs"; import * as ns_renamed from "./renamed.mjs";',read:'n_renamed ns_renamed.alias'},
 namedDefault:{imports:'import d_namedDefault, { default as n_namedDefault, write as w_namedDefault } from "./namedDefault.mjs"; import * as ns_namedDefault from "./namedDefault.mjs";',read:'d_namedDefault n_namedDefault ns_namedDefault.default'},
};
test('an imported module function binding observes writes in its module',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-module-function-live-'));
 try{
  const lines:string[]=['var out = [];','function show(label, value) { out.push(label + "=" + (typeof value === "function" ? "function:" + value.name : String(value))); }'];
  const imports:string[]=[];
  for(const [name,source] of Object.entries(exporters)){
   await writeFile(join(directory,`${name}.mjs`),source+'\n');
   imports.push(reads[name]!.imports);
   const expressions=reads[name]!.read.split(' ');
   for(const expression of expressions)lines.push(`show(${JSON.stringify(name+'.before.'+expression)}, ${expression});`);
   lines.push(`w_${name}();`);
   for(const expression of expressions)lines.push(`show(${JSON.stringify(name+'.after.'+expression)}, ${expression});`);
  }
  // One stress: a 64-module chain re-exporting one function binding.
  const depth=64;
  for(let index=0;index<depth;index++)await writeFile(join(directory,`chain${index}.mjs`),index===depth-1?'export function link() { return "first"; } export function relink() { link = "second"; }\n':`export { link, relink } from "./chain${index+1}.mjs";\n`);
  imports.push('import { link, relink } from "./chain0.mjs";');
  lines.push('show("chain.before", link);','relink();','show("chain.after", link);','print(out.join("\\n"));');
  const program=imports.join('\n')+'\n'+lines.join('\n')+'\n';
  const entry=join(directory,'main.mjs'),output=join(directory,'program'),diagnostics:string[]=[];
  await writeFile(entry,program);
  const node=nodeReferenceSync(['node','--import','data:text/javascript,globalThis.print=t=>console.log(t)',entry],{stdout:'pipe',stderr:'pipe',timeout:30_000});
  expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  const built=await compile({entry,output,buildDir:join(directory,'build'),moduleRoots:[entry],initializationEntries:[entry],diagnosticWriter:message=>diagnostics.push(message),
   test262Observation:{kind:'test262-native-observation',scenarioId:'property/module-function-live-binding.js#module',setupEntries:[],testEntry:entry,async:false,scriptEntries:[]}});
  expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  const observed=parseHostObservation(JSON.parse(native.stdout.toString()));
  expect(observed.kind).toBe('normal');
  expect(observed.stdout.split('\n')).toEqual(node.stdout.toString().split('\n'));
 }finally{await rm(directory,{recursive:true,force:true});}
},300_000);

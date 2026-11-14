import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

// In an ECMAScript module `default` is an ExportEntry name like any other: a
// default import, `{ default as x }` and `namespace.default` all read the
// binding it names, live. Only a CommonJS module without an __esModule marker
// supplies its whole exports object as `default`. Each export shape is one
// partition, read through each import form; a self-import and a 64-module
// re-export chain cover cycles and depth.
const shapes:Record<string,string>={
 expression:'export default 7 * 6;',
 functionDecl:'export default function named() { return "fn"; }',
 anonymousClass:'export default class { static tag = "class"; }',
 localAlias:'var v = "alias"; export { v as default };',
 liveAlias:'export var v = "before"; export function bump() { v = "after"; } export { v as default };',
 reexport:'export { default } from "./s_localAlias.mjs";',
 renamedReexport:'export { v as default } from "./s_liveAlias.mjs";',
 namespaceDefault:'export * as default from "./s_localAlias.mjs";',
 selfImport:'var w = "self"; export { w as default }; import { default as again } from "./s_selfImport.mjs"; export function read() { return again; }',
};
const commonJs:Record<string,string>={
 exportsObject:'module.exports = { a: 1, default: 9 };',
 exportsProperty:'exports.a = 1;',
};
function show(name:string,expression:string):string{
 return `out.push(${JSON.stringify(name)} + "=" + (typeof ${expression} === "function" ? (${expression}.tag ?? ${expression}()) : typeof ${expression} === "object" ? JSON.stringify(${expression}) : String(${expression})));`;
}
test('a default import reads the module record entry named default',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-esm-default-'));
 try{
  const lines:string[]=['var out = [];'];
  const modules=[...Object.entries(shapes).map(([name,source])=>({name,source,extension:'mjs'})),...Object.entries(commonJs).map(([name,source])=>({name,source,extension:'cjs'}))];
  for(const {name,source,extension} of modules){
   const file=`s_${name}.${extension}`;
   await writeFile(join(directory,file),source+'\n');
   lines.unshift(`import d_${name} from "./${file}";`,`import { default as n_${name} } from "./${file}";`,`import * as ns_${name} from "./${file}";`);
   lines.push(show(`${name}.import`,`d_${name}`),show(`${name}.named`,`n_${name}`),show(`${name}.namespace`,`ns_${name}.default`));
  }
  // The live binding: every form observes the exporting module's write.
  lines.unshift('import { bump } from "./s_liveAlias.mjs";','import { read } from "./s_selfImport.mjs";');
  lines.push('bump();',show('liveAlias.after.import','d_liveAlias'),show('liveAlias.after.named','n_liveAlias'),show('liveAlias.after.namespace','ns_liveAlias.default'),show('renamedReexport.after','d_renamedReexport'),show('selfImport.read','read'));
  // One stress: a 64-module chain re-exporting one default.
  const depth=64;
  for(let index=0;index<depth;index++)await writeFile(join(directory,`chain${index}.mjs`),index===depth-1?'var end = "chain"; export { end as default };\n':`export { default } from "./chain${index+1}.mjs";\n`);
  lines.unshift('import chained from "./chain0.mjs";');lines.push(show('chain','chained'));
  lines.push('console.log(out.join("\\n"));');
  const entry=join(directory,'main.mjs'),output=join(directory,'program'),diagnostics:string[]=[];
  await writeFile(entry,lines.join('\n')+'\n');
  const reference=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:30_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  const built=await compile({entry,output,buildDir:join(directory,'build'),diagnosticWriter:message=>diagnostics.push(message)});
  expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString().split('\n')}).toEqual({code:0,stderr:'',stdout:reference.stdout.toString().split('\n')});
 }finally{await rm(directory,{recursive:true,force:true});}
},300_000);

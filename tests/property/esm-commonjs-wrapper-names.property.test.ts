import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

// An ECMAScript module does not bind the CommonJS wrapper names (exports,
// require, module, __filename, __dirname). The checker knows them from the
// ambient host declarations, but at runtime an unbound name resolves through
// the global environment: `typeof` gives "undefined" (or the type of a global
// property the program created) and a read or call throws ReferenceError.
// JavaScript modules follow Node 26 for all five names; TypeScript modules keep
// Bun's host `require`, `__filename` and `__dirname` (developer decision
// 2026-11-16), so they are compared with Bun. Partitions: each name, each form
// (typeof, read, call, read after defining the global property), each module
// kind (.mjs, .js with module syntax; .ts with module syntax against Bun), and
// a .cjs module that binds the names as the control. A TypeScript module that
// reads a global created only by a JavaScript `globalThis.name = v` assignment
// resolves it at runtime too. One 128-deep nesting of arrows and blocks around
// the reads is the stress.
const names=['exports','require','module','__filename','__dirname'];
function observations(label:string,names:readonly string[],catchBinding='e',unread:readonly string[]=[]):string{
 const lines:string[]=[];
 for(const name of names){
  lines.push(`out.push(${JSON.stringify(label+' typeof '+name)} + " " + typeof ${name});`);
  if(!unread.includes(name))lines.push(`try { String(${name}); out.push(${JSON.stringify(label+' read '+name)} + " bound"); } catch (${catchBinding}) { out.push(${JSON.stringify(label+' read '+name)} + " " + e.constructor.name + " " + e.message); }`);
 }
 return lines.join('\n');
}
async function run(entry:string,directory:string,oracle:Bun.SyncSubprocess<'pipe','pipe'>):Promise<void>{
 expect({entry,exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({entry,exitCode:0,stderr:''});
 const output=entry+'.out',diagnostics:string[]=[];
 const built=await compile({entry,output,buildDir:entry+'.build',diagnosticWriter:message=>diagnostics.push(message)});
 expect({entry,code:built.exitCode,diagnostics}).toEqual({entry,code:0,diagnostics:[]});
 const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({entry,code:native.exitCode,stderr:native.stderr.toString()}).toEqual({entry,code:0,stderr:''});
 expect(native.stdout.toString().replaceAll(directory,'<dir>').split('\n')).toEqual(oracle.stdout.toString().replaceAll(directory,'<dir>').split('\n'));
}

test('CommonJS wrapper names are unbound in JavaScript modules and Bun hosts in TypeScript modules',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-esm-wrapper-names-'));
 try{
  await writeFile(join(directory,'out.mjs'),'export const out = [];\n');
  await writeFile(join(directory,'js.js'),`import { out } from "./out.mjs";\nexport const marker = 1;\n${observations('js',names)}\ntry { require("./out.cjs"); } catch (e) { out.push("js call require " + e.constructor.name); }\n`);
  await writeFile(join(directory,'control.cjs'),`const { out } = require("./out.cjs");\nfor (const [name, value] of [["exports", typeof exports], ["require", typeof require], ["module", typeof module], ["__filename", typeof __filename], ["__dirname", typeof __dirname]]) out.push("cjs typeof " + name + " " + value);\n`);
  await writeFile(join(directory,'out.cjs'),'exports.out = [];\n');
  let nested=`out.push("nested " + typeof module + " " + typeof require);`;
  for(let depth=0;depth<128;depth++)nested=depth%2?`{ ${nested} }`:`(() => { ${nested} })();`;
  const entry=join(directory,'main.mjs');
  await writeFile(entry,[
   'import { out } from "./out.mjs";','import "./js.js";','import "./control.cjs";','import cjs from "./out.cjs";',
   observations('mjs',names),
   ...names.map(name=>`globalThis.${name} = ${JSON.stringify(name+'-global')};`),
   ...names.map(name=>`out.push("defined " + typeof ${name} + " " + ${name});`),
   ...names.map(name=>`delete globalThis.${name};`),
   nested,
   'console.log(out.concat(cjs.out).join("\\n"));',
  ].join('\n')+'\n');
  await run(entry,directory,nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:30_000}));
  // TypeScript modules: Bun is the oracle. `exports` has no host declaration
  // in the checker's library, so the TypeScript partition omits it; a global
  // created by a JavaScript module's globalThis assignment is read instead.
  await writeFile(join(directory,'globals.mjs'),'globalThis.created = "created-global";\nexport {};\n');
  const typed=join(directory,'typed.ts');
  await writeFile(typed,[
   'import "./globals.mjs";','export const marker: number = 1;','const out: string[] = [];',
   // Only calls of the host require are supported there; its value fails closed.
   observations('ts',names.filter(name=>name!=='exports'),'e: any',['require']),
   'out.push("ts file " + __filename.endsWith("typed.ts") + " " + (__dirname.length > 0));',
   'out.push("ts created " + typeof created + " " + created);',
   nested,
   'console.log(out.join("\\n"));',
  ].join('\n')+'\n');
  await run(typed,directory,Bun.spawnSync([process.execPath,typed],{stdout:'pipe',stderr:'pipe',timeout:30_000}));
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

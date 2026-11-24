import {expect,test} from 'bun:test';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

// An ECMAScript module does not bind the CommonJS wrapper names (exports,
// require, module, __filename, __dirname). The checker knows them from the
// ambient host declarations, but at runtime an unbound name resolves through
// the global environment: `typeof` gives "undefined" (or the type of a global
// property the program created) and a read or call throws ReferenceError.
// That holds for every JavaScript module and for a TypeScript file TypeScript
// emits as an ECMAScript module (.mts, or .ts in a "type": "module" package
// scope); their expected lines come from an .mjs twin run by Node, whose
// unbound-name behaviour is the spec's. A TypeScript file TypeScript emits as
// CommonJS (a .ts file in any other package scope) lowers its imports to
// `require` inside the CommonJS wrapper, so `require`, `__filename` and
// `__dirname` are bound there, while `module` and `exports` stay unbound; its
// lines are derived from those rules. Partitions: each name, each form
// (typeof, read, call, read after defining the global property), each module
// kind (.mjs, .js with module syntax, .mts, .ts in a module scope, .ts in a
// CommonJS scope), and a .cjs module that binds the names as the control. A
// TypeScript module that reads a global created only by a JavaScript
// `globalThis.name = v` assignment resolves it at runtime too. One 128-deep
// nesting of arrows and blocks around the reads is the stress.
const names=['exports','require','module','__filename','__dirname'];
function observations(label:string,names:readonly string[],catchBinding='e',unread:readonly string[]=[]):string{
 const lines:string[]=[];
 for(const name of names){
  lines.push(`out.push(${JSON.stringify(label+' typeof '+name)} + " " + typeof ${name});`);
  if(!unread.includes(name))lines.push(`try { String(${name}); out.push(${JSON.stringify(label+' read '+name)} + " bound"); } catch (${catchBinding}) { out.push(${JSON.stringify(label+' read '+name)} + " " + e.constructor.name + " " + e.message); }`);
 }
 return lines.join('\n');
}
async function run(entry:string,directory:string,oracle:Bun.SyncSubprocess<'pipe','pipe'>|string):Promise<void>{
 if(typeof oracle!=='string')expect({entry,exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({entry,exitCode:0,stderr:''});
 const expected=typeof oracle==='string'?oracle:oracle.stdout.toString();
 const output=entry+'.out',diagnostics:string[]=[];
 const built=await compile({entry,output,buildDir:entry+'.build',diagnosticWriter:message=>diagnostics.push(message)});
 expect({entry,code:built.exitCode,diagnostics}).toEqual({entry,code:0,diagnostics:[]});
 const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({entry,code:native.exitCode,stderr:native.stderr.toString()}).toEqual({entry,code:0,stderr:''});
 expect(native.stdout.toString().replaceAll(directory,'<dir>').split('\n')).toEqual(expected.replaceAll(directory,'<dir>').split('\n'));
}

test('CommonJS wrapper names are unbound in ECMAScript modules and bound in TypeScript CommonJS files',async()=>{
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
  // TypeScript. `exports` has no host declaration in the checker's library,
  // so the TypeScript partitions omit it; a global created by a JavaScript
  // module's globalThis assignment is read instead.
  await writeFile(join(directory,'globals.mjs'),'globalThis.created = "created-global";\nexport {};\n');
  const typedNames=names.filter(name=>name!=='exports');
  const typedBody=(label:string,bound:boolean)=>[
   'export const marker: number = 1;','const out: string[] = [];',
   observations(label,typedNames,'e: any',bound?['require']:[]),
   ...(bound?['out.push("'+label+' file " + __filename.endsWith(".ts") + " " + (__dirname.length > 0));']:[]),
   'out.push("'+label+' created " + typeof (globalThis as any).created + " " + (globalThis as any).created);',
   nested,
   'console.log(out.join("\\n"));',
  ];
  // ECMAScript-module TypeScript: .mts, and .ts in a "type": "module" scope.
  await mkdir(join(directory,'esm'));await writeFile(join(directory,'esm','package.json'),'{"type":"module"}\n');
  await writeFile(join(directory,'esm','globals.mjs'),'globalThis.created = "created-global";\nexport {};\n');
  for(const [file,label] of [['esm/typed.ts','tsm'],['typed.mts','mts']] as const){
   const typed=join(directory,file),twin=typed.replace(/\.m?ts$/,'.twin.mjs');
   const body=typedBody(label,false);
   await writeFile(typed,['import "./globals.mjs";',...body].join('\n')+'\n');
   await writeFile(twin,['import "./globals.mjs";',...body.map(line=>line.replace(': number','').replace(': string[]','').replaceAll('(globalThis as any)','globalThis').replaceAll('e: any','e'))].join('\n')+'\n');
   await run(typed,directory,nodeReferenceSync(['node',twin],{stdout:'pipe',stderr:'pipe',timeout:30_000}));
  }
  // CommonJS-format TypeScript (.ts outside a module scope): require,
  // __filename and __dirname are bound; module is unbound, with the same
  // ReferenceError line an ECMAScript module gives.
  const typed=join(directory,'typed.ts');
  await writeFile(typed,['import "./globals.mjs";',...typedBody('ts',true)].join('\n')+'\n');
  const moduleTwin=join(directory,'module-twin.mjs');
  await writeFile(moduleTwin,'const out=[];\n'+observations('ts',['module'])+'\nconsole.log(out.join("\\n"));\n');
  const moduleLines=nodeReferenceSync(['node',moduleTwin],{stdout:'pipe',stderr:'pipe',timeout:30_000}).stdout.toString().trimEnd().split('\n');
  const nestedLines=Array.from({length:1},()=>'nested undefined function');
  const expectedTyped=['ts typeof require function',...moduleLines,'ts typeof __filename string','ts read __filename bound','ts typeof __dirname string','ts read __dirname bound',
   'ts file true true','ts created string created-global',...nestedLines].join('\n')+'\n';
  await run(typed,directory,expectedTyped);
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

const NODE=process.env.TSC2C_NODE_REFERENCE??'node';

/* A TypeScript namespace with runtime content is an object, as TypeScript
 * emits it: `var N; (function (N) { ... })(N || (N = {}))`. An exported
 * variable is the property `N.x` (assigned by its initializer, read and
 * written as `N.x` from every block of the namespace); an exported function
 * or class is its block's own binding there and `N.f` elsewhere, published by
 * `N.f = f;` at its position; a nested or dotted namespace is `Inner = N.Inner
 * || (N.Inner = {})`; `export import a = X.y` is `N.a = X.y`; `import a =
 * X.y` is the snapshot `var a = X.y` (elided when used only as a type). The
 * partitions: every member kind with reads, writes (++, +=, destructuring)
 * and calls from the declaring block, another block and a nested namespace;
 * value uses (Object.keys, JSON, an alias written through, typeof, a
 * replaced method called from another block, `this` of `N.f()`, a subclass of
 * `N.K`); type-only namespaces (no object); import aliases; in a Script (the
 * namespace a global var) and in a module. Across modules: an exported
 * namespace imported by name and through a namespace import, and one in a
 * module with top-level await. The reference is TypeScript's own emit. The
 * stress is a 64-segment dotted namespace and 64 merged blocks sharing one
 * exported counter. */

const dotted=Array.from({length:64},(_,k)=>`D${k}`).join('.');
const merged='namespace Many { export let total = 0; }\n'+Array.from({length:64},(_,k)=>`namespace Many { total += ${k}; }`).join('\n');
const body=`namespace N {
  export let x = 1; export let u: number; export var v: number; export const c = 2;
  x++; x += c; [x] = [x + 1];
  export function f(this: unknown): string { return String(x) + g() + (this === N ? "N" : typeof this); }
  function g() { return "g"; }
  export class K { m() { return Inner.y + f(); } }
  export namespace Inner { export let y = x; export function h() { return y + x; } }
  namespace Local { export let z = 1; }
  export import alias = Inner.y;
  import local = Local.z;
  import T = Inner;
  export enum E { A }
  export const same = f();
  export const fromAlias = local + T.h();
  export function counter() { return ++x; }
  export interface I { q: number }
  export type Ty = number;
}
namespace N { export function second() { return x + Inner.y + f() + E.A; } export const fromOther = f(); }
namespace A.B.C { export const deep = 1; export function up() { return deep + 1; } }
namespace OnlyTypes { export interface J {} }
import top = N.x;
import typeOnly = N.Inner;
let typed: typeof typeOnly.y = 3;
const M: any = N;
M.x = 40;
console.log(Object.keys(N).join(), N.x, N.f(), N.same, N.fromOther, N.fromAlias, N.second(), N.counter(), N.x, top, typed);
console.log(new N.K().m(), N.Inner.h(), N.alias, typeof N.u, "v" in N, A.B.C.deep, A.B.C.up(), JSON.stringify(A));
M.f = function () { return "replaced"; };
console.log(N.second(), typeof N, typeof N.Inner, typeof (globalThis as any).N, typeof (globalThis as any).OnlyTypes);
class Sub extends N.K { m() { return "sub" + super.m(); } }
console.log(new Sub().m(), new N.K() instanceof N.K);
namespace ${dotted} { export const leaf = "leaf"; }
${merged}
console.log(${dotted}.leaf, Object.keys(D0).join(), Many.total);
`;

const modules:Record<string,string>={
 'lib.ts':`export namespace Util { export let count = 0; export function bump() { return ++count; } export namespace Deep { export const v = "deep"; } }
export namespace Types { export interface X { a: number } }
`,
 'late.ts':`await Promise.resolve();
export namespace Late { export let ready = true; export function f() { return ready ? "ready" : "no"; } import a = Late.ready; export const snapshot = a; }
`,
 'main.ts':`import { Util } from "./lib";
import * as lib from "./lib";
import { Late } from "./late";
Util.bump(); lib.Util.bump();
const alias: any = Util; alias.count += 10;
console.log(Util.count, lib.Util.Deep.v, Object.keys(lib).sort().join(), Object.keys(Util).join(), Late.f(), JSON.stringify(Late));
`,
};

async function run(root:string,entry:string,reference:{exitCode:number|null;stdout:Buffer;stderr:Buffer},label:string){
 expect({label,code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({label,code:0,stderr:''});
 const diagnostics:string[]=[],output=entry+'.out';
 const built=await compile({entry,output,buildDir:entry+'.build',diagnosticWriter:message=>diagnostics.push(message)});
 expect({label,code:built.exitCode,diagnostics}).toEqual({label,code:0,diagnostics:[]});
 const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({label,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()})
  .toEqual({label,code:0,stderr:'',stdout:reference.stdout.toString()});
}

test('TypeScript namespaces are runtime objects, as TypeScript emits them',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-namespace-objects-'));
 try{
  const scripts=join(root,'scripts');
  await Bun.write(join(scripts,'package.json'),'{"type":"commonjs"}\n');
  for(const [goal,text] of [['script',body],['module',body+'export {};\n']] as const){
   const entry=join(scripts,`${goal}.ts`);
   await writeFile(entry,text);
   const emitted=ts.transpileModule(text,{compilerOptions:{module:goal==='script'?ts.ModuleKind.CommonJS:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
   const emittedFile=join(scripts,goal==='script'?'script.js':'module.mjs');
   await writeFile(emittedFile,emitted);
   const reference=goal==='script'
    ?nodeReferenceSync([NODE,'-e','require("node:vm").runInThisContext(require("node:fs").readFileSync(process.argv[1],"utf8"))',emittedFile],{stdout:'pipe',stderr:'pipe',timeout:60_000})
    :nodeReferenceSync([NODE,emittedFile],{stdout:'pipe',stderr:'pipe',timeout:60_000});
   await run(scripts,entry,reference,goal);
  }
  const project=join(root,'project');
  await Bun.write(join(project,'package.json'),'{"type":"module"}\n');
  for(const [file,source] of Object.entries(modules)){
   await writeFile(join(project,file),source);
   const emitted=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
    .replaceAll('"./lib"','"./lib.mjs"').replaceAll('"./late"','"./late.mjs"');
   await writeFile(join(project,file.replace(/\.ts$/,'.mjs')),emitted);
  }
  const reference=nodeReferenceSync([NODE,join(project,'main.mjs')],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  await run(project,join(project,'main.ts'),reference,'modules');
 }finally{await rm(root,{recursive:true,force:true});}
},600_000);

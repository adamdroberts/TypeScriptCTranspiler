import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

const NODE=process.env.TSC2C_NODE_REFERENCE??'node';

/* TypeScript emits each namespace block as its own function: an exported
 * member is a property of the one namespace object every block of that
 * namespace shares, while a member that is not exported is a binding of its
 * own block's function, invisible to the namespace's other blocks. A
 * namespace body's enum (not `const enum`) is `let E; (function (E) { ...
 * })(E = N.E || (N.E = {}))` when exported, `(E || (E = {}))` when not: a
 * runtime object, merged across blocks only when exported. The partitions,
 * each in a Script and in a module: same-named local let, const, function
 * and enum members in two blocks of one namespace; a nested `A.B` namespace;
 * an exported enum merged across blocks; enum value uses (JSON, reverse
 * lookup, an alias, an argument). The reference is TypeScript's own emit run
 * as a Script (vm.runInThisContext) or as a module. The stress is 64 blocks
 * of one namespace, each with its own local binding and local enum. */

const blocks=Array.from({length:64},(_,k)=>`namespace S { let y = ${k}; enum L { V = ${k} } export function f${k}() { return y + L.V + L[${k}]; } }`).join('\n');
const source=`namespace N { export let x = 1; let y = 2; const c = "c1"; function h() { return "h1"; } export enum K { A = 1, B } enum P { Q = "q" }
  export function first() { return [x + y, c, h(), JSON.stringify(P)].join(); } }
namespace N { let y = 5; const c = "c2"; function h() { return "h2"; } export enum K { C = 5 } enum P { R = 2 }
  export function second() { return [y, c, h(), JSON.stringify(P), K[5], K.A].join(); } }
namespace A.B { let y = 9; export enum E { X } export function k() { return y + Object.keys(E).join(); } }
const alias = N.K;
function size(e: any): number { return Object.keys(e).length; }
console.log(N.first(), N.second(), JSON.stringify(N.K), N.K[2], alias === N.K, size(N.K), A.B.k(), size(A.B.E));
${blocks}
console.log([${Array.from({length:64},(_,k)=>`S.f${k}()`).join(', ')}].join());
`;

test('namespace blocks keep their own local members and enums, as TypeScript emits them',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-namespace-blocks-'));
 try{
  await writeFile(join(root,'package.json'),'{"type":"commonjs"}\n');
  for(const [goal,text] of [['script',source],['module',source+'export {};\n']] as const){
   const entry=join(root,`${goal}.ts`);
   await writeFile(entry,text);
   const emitted=ts.transpileModule(text,{compilerOptions:{module:goal==='script'?ts.ModuleKind.CommonJS:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
   const emittedFile=join(root,goal==='script'?'script.js':'module.mjs');
   await writeFile(emittedFile,emitted);
   const reference=goal==='script'
    ?nodeReferenceSync([NODE,'-e','require("node:vm").runInThisContext(require("node:fs").readFileSync(process.argv[1],"utf8"))',emittedFile],{stdout:'pipe',stderr:'pipe',timeout:60_000})
    :nodeReferenceSync([NODE,emittedFile],{stdout:'pipe',stderr:'pipe',timeout:60_000});
   expect({goal,code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({goal,code:0,stderr:''});
   const diagnostics:string[]=[],output=join(root,`${goal}.out`);
   const built=await compile({entry,output,buildDir:join(root,`${goal}-build`),diagnosticWriter:message=>diagnostics.push(message)});
   expect({goal,code:built.exitCode,diagnostics}).toEqual({goal,code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:60_000});
   expect({goal,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()})
    .toEqual({goal,code:0,stderr:'',stdout:reference.stdout.toString()});
  }
 }finally{await rm(root,{recursive:true,force:true});}
},600_000);

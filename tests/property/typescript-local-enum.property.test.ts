import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

const NODE=process.env.TSC2C_NODE_REFERENCE??'node';

/* An enum declared in a Block or CaseBlock (a function body, a loop body, a
 * case clause) is TypeScript's `let E;` and `(function (E) { ... })(E || (E =
 * {}))`: one lexical binding of that scope, in its TDZ until the first
 * declaration runs, shared by the scope's merged declarations, and a fresh
 * binding per loop iteration. The partitions: merged declarations in a
 * function body; a loop body whose closures each keep their iteration's
 * object; a case clause; a read before the declaration (ReferenceError); an
 * async function, a generator and an async generator with merged
 * declarations across suspensions; an arrow body (a new object per call); a
 * direct eval reading the binding; each in a Script and in a module. The
 * reference is TypeScript's own emit. The stress nests 64 blocks, each with
 * its own enum captured by a closure. */

let stress='';
for(let depth=63;depth>=0;depth--)stress=`{ enum D { V = ${depth}, Name = "d${depth}" } out.push(() => JSON.stringify(D)); ${stress} }`;
const source=`let n = 0;
function next(): number { return ++n; }
function merged(): string { enum L { A, B = "b" } enum L { C = 3 } return JSON.stringify(L) + L[3]; }
function loop(): Array<() => string> {
  const out: Array<() => string> = [];
  for (let i = 0; i < 3; i++) { enum E { X = next(), Y = X * 10 } out.push(() => JSON.stringify(E)); }
  return out;
}
function clause(k: number): string { switch (k) { case 1: enum S { P = 1 } return JSON.stringify(S); default: return "d"; } }
function tdz(): string { try { return String(g()); } catch (e) { return (e as any).constructor.name; } function g() { return Object.keys(T).length; } enum T { Q } }
async function suspended(): Promise<string> { enum A { One = 1 } await null; enum A { Two = next() } return JSON.stringify(A); }
function* generator(): Generator<string> { enum G { M = 1 } yield JSON.stringify(G); enum G { N = 2 } yield JSON.stringify(G); }
async function* asyncGenerator(): AsyncGenerator<string> { enum Q { K = 4 } await null; yield JSON.stringify(Q); enum Q { J = 5 } yield JSON.stringify(Q); }
function direct(): string { enum V { A, B = "b" } return <string>eval("JSON.stringify(V) + typeof V"); }
const arrow = () => { enum R { Z = "z" } return R; };
function nested(): string { const out: Array<() => string> = []; ${stress} return out.map(f => f()).join(""); }
console.log(merged(), loop().map(c => c()).join(" "), clause(1), clause(2), tdz(), [...generator()].join(" "), JSON.stringify(arrow()), arrow() === arrow(), direct());
console.log(nested());
(async () => { const out: string[] = [await suspended()]; for await (const v of asyncGenerator()) out.push(v); console.log(out.join(" ")); })();
`;

test('Block and CaseBlock enums are lexical bindings, as TypeScript emits them',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-local-enum-'));
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

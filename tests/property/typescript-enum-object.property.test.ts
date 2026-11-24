import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

const NODE=process.env.TSC2C_NODE_REFERENCE??'node';

/* A module-level TypeScript enum (not `const enum`) is a runtime object, as
 * TypeScript emits it: `var E; (function (E) { E[E["A"] = 0] = "A"; ...
 * })(E || (E = {}))`, member values in source order with a reverse mapping
 * for each numeric member, every merged declaration storing into the same
 * object. The expected output is TypeScript's own emit
 * (ts.transpileModule) run as JavaScript, whose only semantics here are the
 * ECMAScript object operations. The partitions: auto-increment, explicit,
 * negative and fractional numeric members, string and mixed members,
 * constant expressions over earlier members, merged declarations, an enum
 * exported to another module, members whose values are not compile-time
 * constants (TypeScript's `E[E["C"] = expr] = "C"`, evaluated once in order,
 * a bare member name read from the object), enums in a module with top-level
 * await and in its namespace body, value uses (Object.keys, entries, JSON,
 * reverse lookup, typeof, an argument), a write through an alias, and a
 * const enum (inlined, no object). In a Script (a TypeScript file without
 * module syntax) the enum is a global var binding: a property of the global
 * object, the same object in a function, merged declarations sharing it; the
 * reference is TypeScript's emit run as a Script. The stress is a 300-member
 * enum in each. A member read in a closure inside a member initializer
 * still fails closed with a diagnostic (Block enums:
 * typescript-local-enum). */

const generated=Array.from({length:300},(_,k)=>k%3===0?`M${k} = "s${k}"`:`M${k} = ${k*7-500}`).join(', ');
const modules:Record<string,string>={
 'colors.ts':`export enum Color { Red, Green = 5, Blue, Down = -2, Half = 0.5, After }\nexport enum Label { Yes = "yes", No = "no" }\n`,
 'late.ts':`export const order: string[] = [];
function note(value: number): number { order.push(String(value)); return value; }
await Promise.resolve();
export enum Sized { Base = 2, Len = "abcd".length, Twice = Len * Base, Call = note(Math.max(Base, 7)), Text = String(note(1)) as any, Again = Sized.Call + Twice }
namespace Inner { export enum K { X = note(Sized.Again * 2) } }
export const inner = Inner.K;
`,
 'main.ts':`import { Color, Label } from "./colors";
import { Sized, inner, order } from "./late";
enum Mixed { A = 1, B = "bee", C = 2 }
enum Flags { None = 0, Read = 1 << 0, Write = 1 << 1, Both = Read | Write, Name = "a" + "b" }
enum Merged { First = 1 }
enum Merged { Second = First + 1 }
const enum Inline { One = 1, Two = One * 2 }
enum Big { ${generated} }
function names(e: any): string { return Object.keys(e).join(","); }
function read(e: any, key: string): string { return String(e[key]); }
const out: string[] = [];
out.push(names(Color), Color[5], String(Color.Blue), Color[Color.Red], read(Color, "-2"), read(Color, "0.5"), String(Color.After));
out.push(JSON.stringify(Label), Object.entries(Label).map(([k, v]) => k + "=" + v).join(";"));
out.push(names(Mixed), JSON.stringify(Mixed), JSON.stringify(Flags));
out.push(names(Merged), String(Merged.First + Merged.Second));
out.push(String(Inline.One + Inline.Two));
const alias: any = Color; alias.Extra = 9; out.push(String((Color as any).Extra), typeof Color, typeof Label);
out.push(JSON.stringify(Sized), JSON.stringify(inner), order.join());
out.push(String(Object.keys(Big).length), String(Big.M299), (Big as any)[1593], read(Big, "M3"));
console.log(out.join("\\n"));
`,
};

const scriptSource=`enum Kind { First = 1, Second, Name = "n", Size = "abc".length + First }
enum Kind { Third = Second * 3 }
const enum Inline { One = 1 }
enum Big { ${generated} }
const g: any = globalThis;
function later(): string { return Object.keys(Kind).join("|") + Kind[2]; }
const before = Object.getOwnPropertyDescriptor(g, "Kind");
console.log(Kind[1], Kind.Third, Object.keys(Kind).join(), JSON.stringify(Kind), typeof g.Kind, g.Kind === Kind, later());
console.log(String(before?.configurable), String(before?.writable), String(Inline.One), String(Object.keys(g.Big).length), (Big as any)[1593]);
g.Kind.Extra = 9; console.log(String((Kind as any).Extra));
`;

test('module-level TypeScript enums are runtime objects, as TypeScript emits them',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-enum-object-'));
 try{
  await writeFile(join(root,'package.json'),'{"type":"module"}\n');
  for(const [file,source] of Object.entries(modules)){
   await writeFile(join(root,file),source);
   const emitted=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replaceAll('"./colors"','"./colors.mjs"').replaceAll('"./late"','"./late.mjs"');
   await writeFile(join(root,file.replace(/\.ts$/,'.mjs')),emitted);
  }
  const reference=nodeReferenceSync([NODE,join(root,'main.mjs')],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});
  const diagnostics:string[]=[],output=join(root,'program');
  const built=await compile({entry:join(root,'main.ts'),output,buildDir:join(root,'build'),diagnosticWriter:message=>diagnostics.push(message)});
  expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  expect(native.stdout.toString()).toBe(reference.stdout.toString());
  // A Script's enum is a global var binding.
  const scriptRoot=join(root,'script');
  await Bun.write(join(scriptRoot,'package.json'),'{"type":"commonjs"}\n');
  const script=join(scriptRoot,'main.ts');
  await writeFile(script,scriptSource);
  const scriptEmit=join(scriptRoot,'main.js');
  await writeFile(scriptEmit,ts.transpileModule(scriptSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
  const scriptReference=nodeReferenceSync([NODE,'-e','require("node:vm").runInThisContext(require("node:fs").readFileSync(process.argv[1],"utf8"))',scriptEmit],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  expect({code:scriptReference.exitCode,stderr:scriptReference.stderr.toString()}).toEqual({code:0,stderr:''});
  const scriptDiagnostics:string[]=[];
  const scriptBuilt=await compile({entry:script,output:join(scriptRoot,'program'),buildDir:join(scriptRoot,'build'),diagnosticWriter:message=>scriptDiagnostics.push(message)});
  expect({code:scriptBuilt.exitCode,diagnostics:scriptDiagnostics}).toEqual({code:0,diagnostics:[]});
  const scriptNative=Bun.spawnSync([join(scriptRoot,'program')],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  expect({code:scriptNative.exitCode,stderr:scriptNative.stderr.toString()}).toEqual({code:0,stderr:''});
  expect(scriptNative.stdout.toString()).toBe(scriptReference.stdout.toString());
  // Still fails closed: a member read in a closure inside an initializer.
  for(const [name,source,message] of [
   ['closure',`export {};\nenum E { A = 1, C = ((): number => A)() }\nconsole.log(Object.keys(E).join());\n`,'enum member read in a function'],
  ] as const){
   const entry=join(root,name+'.ts'),failed:string[]=[];
   await writeFile(entry,source);
   const result=await compile({entry,output:entry+'.out',buildDir:entry+'.build',diagnosticWriter:message=>failed.push(message)});
   expect({name,failedClosed:result.exitCode!==0&&failed.join('').includes(message)}).toEqual({name,failedClosed:true});
  }
 }finally{await rm(root,{recursive:true,force:true});}
},600_000);

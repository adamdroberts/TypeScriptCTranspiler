import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';

// The ModuleItem early error (import/export only at the top level of a module)
// is an ECMAScript rule. A TypeScript namespace body is not ECMAScript code:
// its `export` members and `import x = N.y` aliases are TypeScript namespace
// members, so the early-error walk must admit them. Partitions: each exported
// member kind (const, let, function, class, enum, nested namespace), an import
// alias and an exported import alias, in a script-goal and a module-goal file;
// an export inside an ordinary block of a module stays a SyntaxError. Node's
// type stripping refuses namespaces with runtime code, so Bun is the oracle.
// Enum members read through a namespace are folded; an enum used as a value
// fails closed. One 64-deep namespace nesting is the stress.
const members=`
    export const constant = "const";
    export let mutable = "let";
    export function fn() { return "function " + constant; }
    export class Klass { value() { return "class"; } }
    export enum Kind { First = 1, Second }
    export namespace Inner { export const inner = "inner"; }
    import alias = Inner.inner;
    export import exported = Inner.inner;
    export function setMutable(value: string) { mutable = value; }
    export const viaAlias = alias;
`;
const reads='[Outer.constant, Outer.mutable, Outer.fn(), new Outer.Klass().value(), Outer.Kind.Second, Outer.Inner.inner, Outer.exported, Outer.viaAlias]';
function nested(depth:number):string{
 let text='export const leaf = "leaf";';
 for(let index=depth-1;index>=0;index--)text=`export namespace N${index} { ${text} }`;
 return `namespace Deep { ${text} }`;
}
function deepRead(depth:number):string{
 return 'Deep.'+Array.from({length:depth},(_,index)=>`N${index}`).join('.')+'.leaf';
}

test('TypeScript namespace members and type exports link and run',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-namespace-exports-'));
 try{
  const depth=64;
  const body=`namespace Outer {${members}}\nconst before = ${reads}.join(",");\nOuter.setMutable("changed");\nconsole.log(before);\nconsole.log(${reads}.join(","));\n${nested(depth)}\nconsole.log(${deepRead(depth)});\n`;
  for(const [name,source] of [['script',body],['module',body+'export {};\n']] as const){
   const entry=join(directory,`${name}.ts`),output=join(directory,`${name}.out`),diagnostics:string[]=[];
   await writeFile(entry,source);
   const bun=Bun.spawnSync([process.execPath,entry],{stdout:'pipe',stderr:'pipe',timeout:30_000});
   expect({name,code:bun.exitCode,stderr:bun.stderr.toString()}).toEqual({name,code:0,stderr:''});
   const built=await compile({entry,output,buildDir:join(directory,`${name}-build`),diagnosticWriter:message=>diagnostics.push(message)});
   expect({name,code:built.exitCode,diagnostics}).toEqual({name,code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:60_000});
   expect({name,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({name,code:0,stderr:'',stdout:bun.stdout.toString()});
  }
  // Imports of TypeScript type exports are elided (no `import type` needed),
  // as in Bun: interfaces, type aliases, type-only namespaces and a local
  // `export { Local }` of an interface satisfy linking directly and through
  // `export *`, while a namespace with values and a class merged with an
  // interface stay bindings; a module namespace object has no keys for types.
  // (A module namespace object of a module that exports a value namespace
  // fails closed: namespaces have no runtime object yet.)
  // A named re-export `export { Type } from` of a type is a link error in Bun
  // and Node, and fails to compile here.
  await writeFile(join(directory,'types.ts'),'export interface Shape { size: number }\nexport type Label = string;\n'+
   'export namespace OnlyTypes { export interface Inner { x: number } }\n'+
   'export interface Merged { kind: string }\nexport class Merged { kind = "merged"; }\ninterface Local { y: number }\nexport { Local };\n');
  await writeFile(join(directory,'values.ts'),'export namespace Values { export const v = "values"; }\n');
  await writeFile(join(directory,'reexport.ts'),'export { Values } from "./values";\nexport * from "./types";\n');
  await writeFile(join(directory,'reexport-types.ts'),'export * from "./types";\n');
  const typesEntry=join(directory,'types-main.ts');
  await writeFile(typesEntry,'import { Shape, Label, OnlyTypes, Merged, Local } from "./types";\nimport { Values } from "./values";\nimport { Shape as S2, Label as Renamed, Values as V2 } from "./reexport";\n'+
   'import * as all from "./types";\nimport * as again from "./reexport-types";\n'+
   'const shape: Shape = { size: 1 }, label: Label = "l", inner: OnlyTypes.Inner = { x: 2 }, local: Local = { y: 3 }, s2: S2 = { size: 4 }, renamed: Renamed = "r";\n'+
   'console.log(shape.size, label, inner.x, local.y, s2.size, renamed, Values.v, V2.v, new Merged().kind);\n'+
   'console.log(Object.keys(all).sort().join(","), Object.keys(again).sort().join(","));\n');
  const typesBun=Bun.spawnSync([process.execPath,typesEntry],{stdout:'pipe',stderr:'pipe',timeout:30_000});
  expect({code:typesBun.exitCode,stderr:typesBun.stderr.toString()}).toEqual({code:0,stderr:''});
  const typesDiagnostics:string[]=[],typesOutput=join(directory,'types.out');
  const typesBuilt=await compile({entry:typesEntry,output:typesOutput,buildDir:join(directory,'types-build'),diagnosticWriter:message=>typesDiagnostics.push(message)});
  expect({code:typesBuilt.exitCode,diagnostics:typesDiagnostics}).toEqual({code:0,diagnostics:[]});
  const typesNative=Bun.spawnSync([typesOutput],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  expect({code:typesNative.exitCode,stderr:typesNative.stderr.toString(),stdout:typesNative.stdout.toString()}).toEqual({code:0,stderr:'',stdout:typesBun.stdout.toString()});
  await writeFile(join(directory,'named-type-reexport.ts'),'export { Shape } from "./types";\n');
  const namedEntry=join(directory,'named-main.ts'),namedDiagnostics:string[]=[];
  await writeFile(namedEntry,'import "./named-type-reexport";\nconsole.log(1);\n');
  const named=await compile({entry:namedEntry,output:join(directory,'named.out'),buildDir:join(directory,'named-build'),diagnosticWriter:message=>namedDiagnostics.push(message)});
  expect({code:named.exitCode,diagnostic:namedDiagnostics.join('\n').includes('cannot resolve indirect export "Shape"')}).toEqual({code:named.exitCode||1,diagnostic:true});
  expect(named.exitCode).not.toBe(0);
  // The ECMAScript rule still applies outside a namespace body.
  const invalid=join(directory,'invalid.mjs'),diagnostics:string[]=[];
  await writeFile(invalid,'{ export const x = 1; }\n');
  const rejected=await compile({entry:invalid,output:join(directory,'invalid.out'),buildDir:join(directory,'invalid-build'),diagnosticWriter:message=>diagnostics.push(message)});
  expect(rejected.exitCode).not.toBe(0);
  expect(diagnostics.join('\n')).toContain('only permitted at the top level of a module');
  // An enum has no runtime object yet: constant member reads (also through a
  // namespace) are folded, and every other value use fails closed with one
  // stable diagnostic instead of naming an undeclared C variable.
  for(const [name,source] of [['reverse','enum Kind { First = 1 }\nconsole.log(Kind[1]);\n'],
   ['alias','namespace Outer { export enum Kind { First = 1 } }\nconst K = Outer.Kind;\nconsole.log(K.First);\n']] as const){
   const entry=join(directory,`enum-${name}.ts`),messages:string[]=[];
   await writeFile(entry,source);
   const built=await compile({entry,output:join(directory,`enum-${name}.out`),buildDir:join(directory,`enum-${name}-build`),diagnosticWriter:message=>messages.push(message)});
   expect({name,code:built.exitCode,diagnostic:messages.join('\n').includes('requires a runtime enum object')}).toEqual({name,code:3,diagnostic:true});
  }
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

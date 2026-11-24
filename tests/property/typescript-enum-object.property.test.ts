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
 * exported to another module, value uses (Object.keys, entries, JSON,
 * reverse lookup, typeof, an argument), a write through an alias, and a
 * const enum (inlined, no object). The stress is a 300-member enum. A member
 * whose value is not a compile-time constant, and a function-local enum used
 * as a value, still fail closed with a diagnostic. */

const generated=Array.from({length:300},(_,k)=>k%3===0?`M${k} = "s${k}"`:`M${k} = ${k*7-500}`).join(', ');
const modules:Record<string,string>={
 'colors.ts':`export enum Color { Red, Green = 5, Blue, Down = -2, Half = 0.5, After }\nexport enum Label { Yes = "yes", No = "no" }\n`,
 'main.ts':`import { Color, Label } from "./colors";
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
out.push(String(Object.keys(Big).length), String(Big.M299), (Big as any)[1593], read(Big, "M3"));
console.log(out.join("\\n"));
`,
};

test('module-level TypeScript enums are runtime objects, as TypeScript emits them',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-enum-object-'));
 try{
  await writeFile(join(root,'package.json'),'{"type":"module"}\n');
  for(const [file,source] of Object.entries(modules)){
   await writeFile(join(root,file),source);
   const emitted=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replaceAll('"./colors"','"./colors.mjs"');
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
  // Still fail closed: a non-constant member, a function-local enum value.
  for(const [name,source,message] of [
   ['computed',`export {};\nenum E { A = "abc".length }\nconsole.log(Object.keys(E).join());\n`,'compile-time constant'],
   ['local',`export {};\nfunction f(): string { enum L { A } return Object.keys(L).join(); }\nconsole.log(f());\n`,'enum'],
  ] as const){
   const entry=join(root,name+'.ts'),failed:string[]=[];
   await writeFile(entry,source);
   const result=await compile({entry,output:entry+'.out',buildDir:entry+'.build',diagnosticWriter:message=>failed.push(message)});
   expect({name,failedClosed:result.exitCode!==0&&failed.join('').includes(message)}).toEqual({name,failedClosed:true});
  }
 }finally{await rm(root,{recursive:true,force:true});}
},600_000);

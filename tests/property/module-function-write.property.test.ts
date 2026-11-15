import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

// In an ordinary compile (no Test262 host, no eval environment) a module
// function declaration that its module writes gets a mutable binding cell;
// unwritten declarations keep their direct callee. Partitions: the write form
// (each AssignmentTargetType position, plus TypeScript assertion wrappers), the
// declaration kind (ordinary, async, generator, async generator; the source
// analysis cost grows superlinearly with module count, so kinds pair with one
// write form rather than all of them) and where the
// write runs (a later call, module evaluation, or a call that precedes the
// declaration). Importers read the live binding before and after the write.
// One module of 256 written functions is the stress.
const writes:Record<string,string>={
 assign:'fn = 2;',
 compound:'fn += "!";',
 increment:'fn++;',
 logical:'fn &&= 7;',
 arrayPattern:'[fn] = [3];',
 objectPattern:'({ fn } = { fn: 4 });',
 forOf:'for (fn of [5]);',
 function:'fn = function other() { return 6; };',
};
const kinds:Record<string,string>={
 ordinary:'function fn() { return 1; }',
 async:'async function fn() { return 1; }',
 generator:'function* fn() { yield 1; }',
 asyncGenerator:'async function* fn() { yield 1; }',
};
const sites=['call','evaluation','hoisted'] as const;
const describe='function describe(v) { if (typeof v === "function") return "function:" + v.name + (v.name === "other" ? ":" + v() : ""); if (typeof v === "string") return "string:" + v.length + ":" + v.slice(-14); return typeof v + ":" + String(v); }';

test('module function declarations that their module writes have a live mutable binding',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-module-function-write-'));
 try{
  await writeFile(join(directory,'describe.mjs'),`export ${describe}\n`);
  const imports:string[]=['import { describe } from "./describe.mjs";'],lines:string[]=['const out = [];'];
  let index=0;
  // Write forms cross sites on an ordinary declaration; declaration kinds
  // cross sites on a plain assignment.
  const partitions=[...Object.keys(writes).map(writeName=>[writeName,'ordinary']),...Object.keys(kinds).filter(kind=>kind!=='ordinary').map(kindName=>['assign',kindName])];
  for(const [writeName,kindName] of partitions)for(const site of sites){
   const write=writes[writeName]!,kind=kinds[kindName!]!;
   const module=`m${index++}`,label=`${writeName}.${kindName}.${site}`;
   const body=site==='call'?`export ${kind}\nexport function write() { ${write} }\nexport function own() { return describe(fn); }\n`:
    site==='evaluation'?`export ${kind}\n${write}\nexport function write() {}\nexport function own() { return describe(fn); }\n`:
    `write();\nexport function write() { ${write} }\nexport ${kind}\nexport function own() { return describe(fn); }\n`;
   await writeFile(join(directory,`${module}.mjs`),`import { describe } from "./describe.mjs";\n${body}`);
   imports.push(`import { fn as ${module}, write as ${module}w, own as ${module}o } from "./${module}.mjs";`);
   lines.push(`out.push(${JSON.stringify(label)} + " before " + describe(${module}));`,`${module}w();`,
    `out.push(${JSON.stringify(label)} + " after " + describe(${module}) + " own " + ${module}o());`);
  }
  // TypeScript assertion wrappers around the target keep the write.
  await writeFile(join(directory,'typed.ts'),'export function fn(): number { return 1; }\nexport function unwritten(): number { return 8; }\n'+
   'export function write(): void { (fn as any) = 2; (fn! as any)++; }\n');
  imports.push('import { fn as typed, write as typedWrite, unwritten } from "./typed.ts";');
  lines.push('out.push("typed before " + describe(typed) + " " + unwritten());','typedWrite();','out.push("typed after " + describe(typed));');
  // Stress: 256 written functions, each relinked to its successor.
  const count=256,stress:string[]=[];
  for(let k=0;k<count;k++)stress.push(`export function f${k}() { return ${k}; }`);
  stress.push('export function relink() {');
  for(let k=count-2;k>=0;k--)stress.push(`  f${k} = f${k+1};`);
  stress.push('}');
  await writeFile(join(directory,'stress.mjs'),stress.join('\n')+'\n');
  imports.push('import { f0, f128, relink } from "./stress.mjs";');
  lines.push('out.push("stress before " + f0.name + " " + f0() + " " + f128());','relink();',`out.push("stress after " + f0.name + " " + f0() + " " + f128());`,
   'console.log(out.join("\\n"));');
  const entry=join(directory,'main.mjs'),output=join(directory,'program'),diagnostics:string[]=[];
  await writeFile(entry,imports.join('\n')+'\n'+lines.join('\n')+'\n');
  const node=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:30_000});
  expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  const built=await compile({entry,output,buildDir:join(directory,'build'),diagnosticWriter:message=>diagnostics.push(message)});
  expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  expect(native.stdout.toString().split('\n')).toEqual(node.stdout.toString().split('\n'));
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

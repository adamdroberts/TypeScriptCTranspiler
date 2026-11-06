import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* An ImportCall compiles at every site (a hoisted function declaration,
 * nested functions, async functions and generators whose specifier or
 * options argument contains `await` or `yield`, methods, arrows, loop
 * bodies) with the specifier the analysis proves (a constant, an awaited
 * constant, a yielded value, an object with a toString). A specifier the
 * analysis cannot prove (a promise's ToString) and a missing module both
 * reject. One generated program places sites in many nested shapes and is
 * compared with Node; a chain of nested async functions is the stress. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const sites=[
 (i:number)=>`function f${i}() { return import('./m.mjs'); }`,
 (i:number)=>`function f${i}() { function inner() { return import('./m.mjs'); } return inner(); }`,
 (i:number)=>`async function f${i}() { return import(await spec); }`,
 (i:number)=>`async function f${i}() { return import('./m.mjs', await undefined); }`,
 (i:number)=>`function f${i}() { function* g() { return import(yield); } const it = g(); it.next(); return it.next(spec).value; }`,
 (i:number)=>`function f${i}() { function* g() { return import(yield 1); } const it = g(); it.next(); return it.next('./m.mjs').value; }`,
 (i:number)=>`const f${i} = () => import(obj);`,
 (i:number)=>`class C${i} { m() { return import('./m.mjs'); } } const f${i} = () => new C${i}().m();`,
 (i:number)=>`function f${i}() { let p; for (let k = 0; k < 2; k++) { p = import('./m.mjs'); } return p; }`,
 (i:number)=>`function f${i}() { return import(Promise.resolve('./m.mjs')); }`,
 (i:number)=>`function f${i}() { return import('./missing.mjs'); }`,
 (i:number)=>`async function f${i}() { const inner = async () => import(await spec); return inner(); }`,
];
function program(random:()=>number,count:number,depth:number):string{
 let source=`const spec = './m.mjs';\nconst obj = { toString() { return './m.mjs'; } };\n`;
 const names:string[]=[];
 for(let index=0;index<count;index++){source+=sites[Math.floor(random()*sites.length)]!(index)+'\n';names.push(`f${index}`);}
 let chain='import(await spec)';
 for(let level=0;level<depth;level++)chain=`(async () => ${chain})()`;
 source+=`async function deep() { return ${chain}; }\n`;names.push('deep');
 // Each site reports on its own line: the analysis keeps every value a known
 // primitive, so no conversion of an unbounded collection widens the proof.
 source+=`(async () => {\n  for (const [name, f] of [${names.map(name=>`['${name}', ${name}]`).join(', ')}]) {\n    try { const ns = await f(); console.log(name + ':' + (ns.x + ns.default)); } catch (e) { console.log(name + ':rejected'); }\n  }\n})();\n`;
 return source;
}

test('dynamic import compiles at every site with the proven specifier and rejects otherwise like Node',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-dynamic-import-sites-'));
 try{
  await writeFile(join(root,'m.mjs'),'export const x = 1;\nexport default 41;\n');
  const source=program(rng(0xd1e0),40,200);
  const entry=join(root,'main.mjs');await writeFile(entry,source);
  const node=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  expect(node.stdout.toString()).toContain(':42');
  expect(node.stdout.toString()).toContain(':rejected');
  const diagnostics:string[]=[],output=join(root,'program');
  const built=await compile({entry,output,buildDir:join(root,'build'),diagnosticWriter:x=>diagnostics.push(x)});
  expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:node.stdout.toString()});
 }finally{await rm(root,{recursive:true,force:true});}
},600000);

import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* TypeScript 5.9.3 exhausts its stack on `obj = { *[yield]() {} }` inside a
 * generator when `obj` is an auto-typed outer variable (the contextual type
 * of the yield and the assignment's target type depend on each other). The
 * resilient checker (src/resilient-checker.ts) answers such a query with the
 * unknown type and reports one warning, so the program compiles through the
 * dynamic paths and runs like Node. Generated literals vary the key
 * expression, member kinds, the variable's declaration and the nesting; one
 * program of many such sites is the stress input. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const keys=['yield','yield 1','(yield)','(yield, "fixed")','yield + "k"'];
function site(random:()=>number,index:number):string{
 const key=keys[Math.floor(random()*keys.length)]!;
 const declaration=['var o = null;','var o;','let o = null;','var o = {};'][Math.floor(random()*4)]!;
 const extra=random()<0.5?', x: 1':'';
 const member=random()<0.5?`*[${key}]() { return 7; }`:`*[${key}]() { yield 7; }${extra}, get [${key}]() { return 8; }`;
 const assign=random()<0.5?`o = { ${member}${extra} };`:`if (true) { o = { ${member}${extra} }; }`;
 return `{ ${declaration} var it = (function* () { ${assign} })(); it.next(); out.push(${index} + ':' + String(o)); it.next('k${index}'); it.next('g${index}'); out.push(Object.getOwnPropertyNames(o).join(',')); }\n`;
}
function program(random:()=>number,count:number):string{
 let text='var out = [];\n';
 for(let index=0;index<count;index++)text+=site(random,index);
 return text+'console.log(out.join("\\n"));\n';
}

async function compare(name:string,source:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-checker-overflow-'));
 try{
  const entry=join(root,'main.cjs');await writeFile(entry,source);
  const node=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({name,code:node.exitCode,stderr:node.stderr.toString()}).toEqual({name,code:0,stderr:''});
  const diagnostics:string[]=[],output=join(root,'program');
  const built=await compile({entry,output,buildDir:join(root,'build'),diagnosticWriter:x=>diagnostics.push(x)});
  expect({name,code:built.exitCode,diagnostics:diagnostics.map(line=>line.replace(/ at [^;]+/u,' at <file>'))}).toEqual({name,code:0,diagnostics:['tsc2c: warning: the TypeScript checker exhausted its stack at <file>; the query answers with the unknown type\n']});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({name,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({name,code:0,stderr:'',stdout:node.stdout.toString()});
 }finally{await rm(root,{recursive:true,force:true});}
}

test('generator methods keyed by a yield expression compile and run like Node despite the checker overflow',async()=>{
 await compare('generated',program(rng(0x0f10),12));
},600000);

test('one program of many overflowing sites',async()=>{
 await compare('stress',program(rng(0x57e5),60));
},600000);

import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* A NaN-boxed value held only in a register or stack slot is not a pointer
 * the conservative collector recognises. Under the collector stress profile
 * (TSC2C_GC_STRESS=1: a full collection before every allocation) a value a
 * call produced must survive every later allocation in every position that
 * stores it: each heap value kind (function, object, string, array, BigInt)
 * kept in each container position (literal property, computed key, array
 * element, spread, call argument, assignment, Map entry, class field, getter
 * capture), read back only after the whole list is built. One generated
 * program covers the partition; a 2048-node list of call-produced functions
 * is the depth stress. Both must print what Node prints. */

const kinds={
 fn:['function mkfn(i) { return function () { return i; }; }','mkfn(i)','v()'],
 obj:['function mkobj(i) { return { v: i * 2 }; }','mkobj(i)','v.v'],
 str:['function mkstr(i) { return "s" + i; }','mkstr(i)','v.length'],
 arr:['function mkarr(i) { return [i, i + 1]; }','mkarr(i)','v[1]'],
 big:['function mkbig(i) { return BigInt(i) * 3n; }','mkbig(i)','Number(v)'],
} as const;
const positions:Record<string,[(value:string)=>string,string]>={
 literal:[value=>`{ k: ${value}, pad: mkstr(i) }`,'c.k'],
 computed:[value=>`{ [mkstr(0)]: ${value}, pad: mkstr(i) }`,'c.s0'],
 array:[value=>`[${value}, mkstr(i)]`,'c[0]'],
 spread:[value=>`[...[${value}], mkstr(i)]`,'c[0]'],
 argument:[value=>`pair(${value}, mkstr(i))`,'c[0]'],
 assign:[value=>`((o) => (o.k = ${value}, o.p = mkstr(i), o))({})`,'c.k'],
 map:[value=>`new Map([[mkstr(0), ${value}]])`,'c.get("s0")'],
 field:[value=>`new Holder(${value}, mkstr(i))`,'c.k'],
 accessor:[value=>`((v) => ({ get k() { return v; }, pad: mkstr(i) }))(${value})`,'c.k'],
};
function matrix(depth:number):string{
 const lines=[...Object.values(kinds).map(kind=>kind[0]),
  'function pair(a, b) { const r = []; r.push(a); r.push(b); return r; }',
  'class Holder { k; p; constructor(k, p) { this.k = k; this.p = p; } }','const checks = [];'];
 for(const [position,[wrap,read]] of Object.entries(positions))for(const [kind,[,make,use]] of Object.entries(kinds)){
  lines.push(`{ let list = null; for (let i = 0; i < ${depth}; i++) list = { c: ${wrap(make)}, next: list };`);
  lines.push(`  let total = 0; for (let node = list; node !== null; node = node.next) { const c = node.c, v = ${read}; total += ${use}; } checks.push("${position}-${kind}:" + total); }`);
 }
 lines.push('console.log(checks.join("\\n"));');
 return lines.join('\n')+'\n';
}
const deep=`function make(i) { return function () { return i; }; }
function box(i) { return { v: i * 2 }; }
let graph = null;
for (let i = 0; i < 2048; i++) graph = { owner: make(i), box: box(i), next: graph };
let count = 0, sum = 0;
for (let node = graph; node !== null; node = node.next) { sum += node.owner() + node.box.v; count++; }
console.log(count + ":" + sum);
`;

test('call-produced values survive a collection before every allocation in every storing position',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-gc-stress-'));
 const previous=process.env.TSC2C_GC_STRESS;
 try{
  for(const [name,source,interval] of [['matrix',matrix(12),'1'],['deep',deep,'3']] as const){
   const entry=join(root,`${name}.js`);await writeFile(entry,source);
   const node=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({name,code:node.exitCode,stderr:node.stderr.toString()}).toEqual({name,code:0,stderr:''});
   process.env.TSC2C_GC_STRESS=interval;
   const output=join(root,`${name}-program`),diagnostics:string[]=[];
   const built=await compile({entry,output,buildDir:join(root,`${name}-build`),diagnosticWriter:message=>diagnostics.push(message)});
   if(previous===undefined)delete process.env.TSC2C_GC_STRESS;else process.env.TSC2C_GC_STRESS=previous;
   expect({name,code:built.exitCode,diagnostics}).toEqual({name,code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:600_000});
   expect({name,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({name,code:0,stderr:'',stdout:node.stdout.toString()});
  }
  // A malformed request fails closed instead of building an unstressed binary.
  process.env.TSC2C_GC_STRESS='0';
  const entry=join(root,'deep.js'),diagnostics:string[]=[];
  const refused=await compile({entry,output:join(root,'refused'),buildDir:join(root,'refused-build'),diagnosticWriter:message=>diagnostics.push(message)});
  expect({code:refused.exitCode,stress:diagnostics.join('').includes('TSC2C_GC_STRESS')}).toEqual({code:1,stress:true});
 }finally{
  if(previous===undefined)delete process.env.TSC2C_GC_STRESS;else process.env.TSC2C_GC_STRESS=previous;
  await rm(root,{recursive:true,force:true});
 }
},900_000);

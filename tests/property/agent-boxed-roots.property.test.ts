import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';
import {nodeReferenceSync} from './node-reference';

/* A thread that runs program code parks (Atomics.wait, receiveBroadcast,
 * agent.start, agent.sleep, report polling) while another thread allocates
 * and collects. Values the parked thread holds only as NaN-boxed words in its
 * frames must survive those collections, as the collecting thread's own do.
 * Under the collector stress profile (TSC2C_GC_STRESS=1: a full collection
 * before every allocation) each heap value kind (function, object, string,
 * array, BigInt) is held by a worker across a blocking wait, captured by a
 * callback a worker holds while it waits for a broadcast, and held by the
 * main thread while a worker allocates; each is read back after the wait.
 * One generated program covers the partition; a worker holding a 2048-node
 * list of call-produced functions across a wait is the depth stress. Both
 * must print what Node prints. */

const kinds={
 fn:['function mkfn(i) { return function () { return i; }; }','mkfn(7)','v()'],
 obj:['function mkobj(i) { return { v: i * 2 }; }','mkobj(7)','v.v'],
 str:['function mkstr(i) { return "s" + i; }','mkstr(7)','v.length'],
 arr:['function mkarr(i) { return [i, i + 1]; }','mkarr(7)','v[1]'],
 big:['function mkbig(i) { return BigInt(i) * 3n; }','mkbig(7)','Number(v)'],
} as const;
const definitions=Object.values(kinds).map(kind=>kind[0]).join('\n');
const report='function report() { let value = null; while (value === null) { value = $262.agent.getReport(); if (value === null) $262.agent.sleep(1); } return value; }';
const allocate=(count:number,tag:string)=>`{ let junk = null; for (let i = 0; i < ${count}; i++) junk = { i, s: "${tag}" + i, next: junk }; }`;

function parkedWorker(name:string,hold:string,use:string):string {
 const source=`${definitions}
$262.agent.receiveBroadcast(function (sab) { const a = new Int32Array(sab); ${hold} Atomics.store(a, 1, 1); while (Atomics.load(a, 2) === 0) Atomics.wait(a, 0, 0); $262.agent.report("${name}:" + (${use})); $262.agent.leaving(); });`;
 return `{ const sab = new SharedArrayBuffer(12), a = new Int32Array(sab); $262.agent.start(${JSON.stringify(source)}); $262.agent.broadcast(sab);
  while (Atomics.load(a, 1) !== 1) $262.agent.sleep(1);
  while (Atomics.notify(a, 0, 1) === 0) $262.agent.sleep(1);
  ${allocate(24,'m')}
  Atomics.store(a, 2, 1); Atomics.notify(a, 0, 1); console.log(report()); }`;
}
function subject():string {
 const lines=[definitions,report];
 for(const [kind,[,make,use]] of Object.entries(kinds)){
  lines.push(parkedWorker(`wait-${kind}`,`const v = ${make};`,use));
  const receiving=`${definitions}
const v = ${make}; $262.agent.receiveBroadcast(function (sab) { $262.agent.report("receive-${kind}:" + (${use})); $262.agent.leaving(); });`;
  lines.push(`{ $262.agent.start(${JSON.stringify(receiving)}); ${allocate(24,'r')} $262.agent.broadcast(new SharedArrayBuffer(4)); console.log(report()); }`);
  const allocating=`$262.agent.receiveBroadcast(function (sab) { ${allocate(24,'w')} $262.agent.report("ready"); $262.agent.leaving(); });`;
  lines.push(`{ const v = ${make}; $262.agent.start(${JSON.stringify(allocating)}); $262.agent.broadcast(new SharedArrayBuffer(4)); console.log("main-${kind}:" + report() + ":" + (${use})); }`);
 }
 return lines.join('\n')+'\n';
}
const deep=[report,parkedWorker('deep','function make(i) { return function () { return i; }; } let list = null; for (let i = 0; i < 2048; i++) list = { f: make(i), next: list };',
 '(() => { let sum = 0, count = 0; for (let node = list; node !== null; node = node.next) { sum += node.f(); count++; } return count + "/" + sum; })()')].join('\n')+'\n';

async function nativeMatchesNode(name:string,source:string):Promise<void> {
 const root=await mkdtemp(join(tmpdir(),'tsc2c-agent-boxed-'));
 const previous=process.env.TSC2C_GC_STRESS;
 try{
  const entry=join(root,'main.js'),output=join(root,'program');await writeFile(entry,source);
  const node=nodeReferenceSync(['node',resolve('tests/property/helpers/test262-agent-node.cjs'),entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({name,code:node.exitCode,stderr:node.stderr.toString()}).toEqual({name,code:0,stderr:''});
  process.env.TSC2C_GC_STRESS='1';
  const diagnostics:string[]=[];
  const built=await compile({entry,output,buildDir:join(root,'build'),isolatedScriptRoots:[entry],initializationEntries:[entry],
   test262Observation:{kind:'test262-native-observation',scenarioId:name+'#script',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({name,code:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({name,code:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:240_000});
  expect({name,code:native.exitCode,stderr:native.stderr.toString()}).toEqual({name,code:0,stderr:''});
  const observation=parseHostObservation(JSON.parse(native.stdout.toString()));
  expect(observation.kind).toBe('normal');
  if(observation.kind==='normal')expect(observation.stdout).toBe(node.stdout.toString());
 }finally{
  if(previous===undefined)delete process.env.TSC2C_GC_STRESS;else process.env.TSC2C_GC_STRESS=previous;
  await rm(root,{recursive:true,force:true});
 }
}

test('values a parked thread holds survive collections by another thread',async()=>{
 await nativeMatchesNode('agent-boxed-matrix',subject());
},900_000);

test('a worker holding a 2048-node list across a wait keeps it',async()=>{
 await nativeMatchesNode('agent-boxed-deep',deep);
},900_000);

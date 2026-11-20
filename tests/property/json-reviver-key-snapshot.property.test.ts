import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';

/* InternalizeJSONProperty takes an object's keys (EnumerableOwnProperties)
 * when its walk reaches it, so a key the reviver adds to a later sibling
 * object, or a later index of a sibling Array, is visited. The source
 * analysis read the key list once and ignored keys that reached it later
 * (a guarded write propagates after the list is first read), so the
 * reviver's calls for them were missing from the eval sources; and it gave
 * every subset of keys that may be absent its own chain of visits, which is
 * exponential in those keys. Now a grown key list gets its own chain, and
 * one chain visits every key in order, a key that may be skipped letting its
 * successor run with or without its visit. Partitions: how the key arrives
 * (unconditional, guarded, an Array index written under a guard, a key
 * deleted under a guard, a key defined non-enumerable under a guard), and
 * the consumer (the key, the value). Node runs each program with
 * Math.random returning 0.25 and 0.75, so both outcomes of every guard are
 * observed; the analysis must list every source either run evaluates. The
 * stress adds 256 guarded keys to one sibling. */
const stress=256;
const R=(text:string,body:string,consumer='k')=>`JSON.parse(${JSON.stringify(text)},function(k,v){${body}eval("print('"+${consumer}+"')");return v;});`;
const shapes:Record<string,string>={
 unconditional:R('{"a":0,"b":{}}','if(k==="a")this.b.x={y:1};'),
 guarded:R('{"a":0,"b":{}}','if(k==="a"){if(Math.random()>0.5)this.b.x=1;if(Math.random()>0.5)this.b.z=2;}'),
 guardedValue:R('{"a":0,"b":{}}','if(k==="a"&&Math.random()>0.5)this.b.x="w";','(typeof v==="string"?v:k)'),
 arrayIndex:R('{"a":0,"b":[1]}','if(k==="a"&&Math.random()>0.5)this.b[1]=7;','(k+"="+v)'),
 guardedDelete:R('{"a":0,"b":{"x":1,"z":2}}','if(k==="a"&&Math.random()>0.5)delete this.b.x;'),
 guardedHidden:R('{"a":0,"b":{}}','if(k==="a"){this.b.x=1;if(Math.random()>0.5)Object.defineProperty(this.b,"x",{enumerable:false});}'),
 stress:R('{"a":0,"b":{}}',`if(k==="a"){${Array.from({length:stress},(_,i)=>`if(Math.random()>0.5)this.b.x${i}=${i};`).join('')}}`),
};

test('a reviver walk visits keys added before it reaches an object, linearly in the keys that may be absent',async()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=new Set();for(const r of [0.25,0.75]){const math=Object.create(Math);math.random=()=>r;vm.runInNewContext(source,{print:value=>seen.add("print(\x27"+value+"\x27)"),Math:math})}out.push([...seen])}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>shapes[name]!))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-reviver-keys-'));
 try{
  const results=[];
  for(const [index,name] of names.entries()){
   const entry=join(directory,`${name}.js`);
   await writeFile(entry,shapes[name]!+'\n');
   const program=ts.createProgram([entry],{allowJs:true,noLib:true});
   const sites=sourceEvaluationInvocations(program,{roots:[entry],host:'test262'}).filter(invocation=>invocation.operation==='eval');
   const choices=sites.some(site=>site.choices===null)?null:sites.flatMap(site=>site.choices!);
   results.push({name,choices,node:observed[index]!});
  }
  // Precise and sound: every shape stays finite and lists what Node evaluates.
  expect(results.filter(result=>result.choices===null).map(result=>result.name)).toEqual([]);
  expect(results.filter(result=>!result.node.every(value=>result.choices!.includes(value))).map(result=>result.name)).toEqual([]);
  // Every guarded key of the stress is visited.
  expect(results.find(result=>result.name==='stress')!.node.length).toBe(stress+3);
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

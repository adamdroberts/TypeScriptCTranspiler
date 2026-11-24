import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {nodeReferenceSync} from './node-reference';

/* Array.prototype.join (and toString through it), toLocaleString and the
 * %TypedArray% forms have no cycle check (ES2026 23.1.3.18, 23.1.3.32): a
 * receiver an element reaches is joined again, and the recursion ends in the
 * stack-exhaustion RangeError, an implementation limit (Node and Bun give the
 * empty String instead, which the spec does not allow). The runtime
 * partitions are the cycle's path (the element itself, a nested Array, an
 * object's toString, an array-like receiver, an own join override), the
 * operation (join with and without a separator, toLocaleString, a typed
 * array's toLocaleString through Number.prototype.toLocaleString), a Proxy of
 * the receiver, a cycle made after a throw, and two non-cyclic re-entries (a
 * sibling join, an empty join), whose values are exact; the stress is a
 * 2048-deep chain of nested Arrays whose innermost element is the outermost. The source analysis gives one join
 * text per receiver object at a site, so a cyclic receiver closes a cycle in
 * the text graph (an unproven text) instead of unrolling a join per level: a
 * non-cyclic join stays exact, and the listed texts include what Node prints
 * (its empty String for the cycle, a superset of the spec run, which throws
 * before the eval). */

const N=(name:string,body:string)=>`t(${JSON.stringify(name)},()=>{${body}});`;
const runtimeShapes=[
 N('self','const a=[1,2];a[0]=a;return String(a)'),
 N('nested','const b=[1,[3,4]];b[1][0]=b;return b.join("-")'),
 N('viaObject','const a=[];const o={toString(){return "<"+a.join("+")+">"}};a.push(o,2);return String(a)'),
 N('arrayLike','const o={length:2,0:1};o[1]={toString(){return Array.prototype.join.call(o,"|")}};return Array.prototype.join.call(o,"|")'),
 N('locale','const a=[1,2];a[0]=a;return a.toLocaleString()'),
 N('mixed','const a=[1,2];a[0]=a;const b=[a];a[1]=b;return [a.toLocaleString(),a.join(),String(b)]'),
 N('throwCleanup','const a=[1];const bad={toString(){throw new Error("x")}};a.push(bad);try{a.join()}catch{};a.pop();a.push(a);return a.join()'),
 N('sibling','const a=[1];const o={toString(){return a.join("/")}};const b=[o,o];return [b.join(),String(a)]'),
 N('ownJoin','const a=[1,2];a.join=function(){return "J"+Array.prototype.join.call(this)};a[0]=a;return String(a)'),
 N('order','const log=[];const o={get length(){log.push("len");return 2},0:1};o[1]={toString(){return "["+Array.prototype.join.call(o,{toString(){log.push("sep");return "|"}})+"]"}};return [Array.prototype.join.call(o,{toString(){log.push("sep0");return ";"}}),log]'),
 N('typedLocale','const ta=new Uint8Array([1,2]);const save=Number.prototype.toLocaleString;Number.prototype.toLocaleString=function(){return "<"+ta.toLocaleString()+">"};try{return ta.toLocaleString()}finally{Number.prototype.toLocaleString=save}'),
 N('proxy','const a=[1,2];const p=new Proxy(a,{});a[0]=p;return [String(p),String(a)]'),
 N('empty','const a=[];const o={toString(){return "x"+a.join()}};return String([o])'),
 N('stress','let a=[0];for(let i=0;i<2048;i++)a=[a,i];let x=a;for(let i=0;i<2048;i++)x=x[0];x[0]=a;const s=String(a);return [s.length,s.slice(0,24),s.slice(-16)]'),
];
const runtimeProgram=`const out=[];const t=(n,f)=>{try{out.push(n+"="+JSON.stringify(f()))}catch(e){out.push(n+"!"+e.constructor.name)}};
${runtimeShapes.join('\n')}
console.log(out.join("\\n"));
`;

// Expected per ES2026: each cyclic join throws the stack-exhaustion RangeError.
const expectedRuntime=['self!RangeError','nested!RangeError','viaObject!RangeError','arrayLike!RangeError','locale!RangeError','mixed!RangeError',
 'throwCleanup!RangeError','sibling=["1,1","1"]','ownJoin!RangeError','order!RangeError','typedLocale!RangeError','proxy!RangeError','empty="x"','stress!RangeError'].join('\n')+'\n';

test('a cyclic join recurses to the stack-exhaustion RangeError, per the spec',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-join-cycle-'));
 try{
  const entry=join(root,'main.js'),output=join(root,'program');await writeFile(entry,runtimeProgram);
  const diagnostics:string[]=[];
  const built=await compile({entry,output,buildDir:join(root,'build'),diagnosticWriter:message=>diagnostics.push(message)});
  expect({code:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({code:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  expect(native.stdout.toString()).toBe(expectedRuntime);
 }finally{await rm(root,{recursive:true,force:true});}
},600_000);

// Each evaluated source prints one string literal, so the text Node records
// from the printed value is the evaluated source text.
const P=(value:string)=>`eval("print('"+${value}+"')")`;
const depth=256;
const analysisShapes:Record<string,{source:string;exact?:string[]}>={
 self:{source:`const a=[1,2];a[0]=a;${P('String(a)')}`},
 maybeSelf:{source:`const a=[1,2];if(print.length>=0)a[0]=a;${P('a')}`},
 nestedSeparator:{source:`const b=[1,[3,4]];b[1][0]=b;${P('b.join("-")')}`},
 viaObject:{source:`const a=[];const o={toString(){return "<"+a.join("+")+">"}};a.push(o,2);${P('String(a)')}`},
 sameSite:{source:`function mk(x,inner){return [x,inner]}const p=mk(1,null),q=mk(2,p);${P('String(q)')}`},
 exact:{source:`const a=[1,[2,[3,4]]];${P('a.join("-")+"|"+String(a)+"|"+[5,6].join()')}`,exact:["print('1-2,3,4|1,2,3,4|5,6')"]},
 stress:{source:`let a=[0];${Array.from({length:depth},(_,i)=>`a=[a,${i}];`).join('')}let x=a;${'x=x[0];'.repeat(depth)}x[0]=a;${P('String(a).length')}`},
};

test('a cyclic join receiver keeps the source analysis finite and sound against Node',async()=>{
 const names=Object.keys(analysisShapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=new Set();vm.runInNewContext(source,{print:value=>seen.add("print(\x27"+value+"\x27)")});out.push([...seen])}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>analysisShapes[name]!.source))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-join-cycle-source-'));
 try{
  const results=[];
  for(const [index,name] of names.entries()){
   const entry=join(directory,`${name}.js`);
   await writeFile(entry,analysisShapes[name]!.source+'\n');
   const program=ts.createProgram([entry],{allowJs:true,noLib:true});
   const started=performance.now();
   const sites=sourceEvaluationInvocations(program,{roots:[entry],host:'test262'}).filter(invocation=>invocation.operation==='eval');
   const seconds=(performance.now()-started)/1000;
   const choices=sites.some(site=>site.choices===null)?null:sites.flatMap(site=>site.choices!);
   results.push({name,choices,node:observed[index]!,seconds});
  }
  // Sound: a listed choice set contains every source Node evaluates.
  expect(results.filter(result=>result.choices!==null&&!result.node.every(value=>result.choices!.includes(value))).map(result=>result.name)).toEqual([]);
  // A non-cyclic join stays exact.
  for(const [name,shape] of Object.entries(analysisShapes))if(shape.exact)expect({name,choices:results.find(result=>result.name===name)!.choices}).toEqual({name,choices:shape.exact});
  // Every cyclic shape is settled well inside the analysis bounds (each
  // unrolled join level used to add cells until the memory bound stopped it).
  expect(results.filter(result=>result.seconds>30).map(result=>result.name)).toEqual([]);
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

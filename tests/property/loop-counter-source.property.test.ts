import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';

/* A `for (...; i REL bound; i++)` update runs only after its condition read
 * `i` and found it true. When no write to `i`'s location can run between the
 * condition and the update, the source analysis stores v±1 only for values
 * that pass the condition, so a bounded counter is a finite Number set and
 * eval sources built from it stay finite.
 * Partitions: counter kind (Script var, constant-bound var, let, function
 * var, generator let across yield, sequential loops sharing one var),
 * operator (<, <=, >, >=, !==, != against Number and String bounds),
 * update form (prefix/postfix, ++/--) x every way the location may change
 * between condition and update (body assignment, nested loop reset, callee
 * or closure write, global object property, mapped arguments alias, a
 * condition that never stops the steps), each of which must stay sound.
 * The stress is one counter with 512 values. */
const stress=512;
// Each evaluated source prints one string literal, so the text Node records
// from the printed value is the evaluated source text.
const P=(value:string)=>`eval("print('"+${value}+"')")`;
const shapes:Record<string,{source:string;finite:boolean}>={
 scriptVar:{source:`for(var i=0;i<4;i++){${P('i')}}`,finite:true},
 constantBound:{source:`var N=3;for(var i=0;i<N;i++){${P('i')}}`,finite:true},
 letCounter:{source:`for(let i=0;i<4;++i){${P('i')}}`,finite:true},
 functionDecrement:{source:`function f(){for(var i=3;i>0;i--){${P('i')}}}f()`,finite:true},
 inclusive:{source:`for(var i=5;i>=2;--i){${P('i')}}`,finite:true},
 lessEqual:{source:`for(var i=0;i<=2;i++){${P('i')}}`,finite:true},
 strictInequality:{source:`for(var i=0;i!==3;i++){${P('i')}}`,finite:true},
 looseInequalityString:{source:`for(var i=0;i!="2";i++){${P('i')}}`,finite:true},
 stringBound:{source:`for(var i=0;i<"3";i++){${P('i')}}`,finite:true},
 sequentialLoops:{source:`for(var i=0;i<3;i++){}for(var i=0;i<2;i++){${P('i')}}`,finite:true},
 generatorYield:{source:`function* f(){for(let i=0;i<3;i++){yield;${P('i')}}}for(var x of f());`,finite:true},
 independentCounters:{source:`for(var i=0;i<2;i++)for(var j=0;j<3;j++){${P('i+"-"+j')}}`,finite:true},
 bodyAssignment:{source:`for(var i=0;i<4;i++){if(i===1)i=10;${P('i')}}`,finite:false},
 nestedReset:{source:`var n=0;for(var i=0;i<4;i++){if(++n>9)break;for(i=0;i<2;i++){}${P('i')}}`,finite:false},
 calleeWrite:{source:`function g(){i=7}for(var i=0;i<4;i++){g();${P('i')}}`,finite:false},
 closureWrite:{source:`function f(){for(var i=0;i<4;i++){var g=function(){i=8};g();${P('i')}}}f()`,finite:false},
 globalProperty:{source:`for(var i=0;i<4;i++){if(i===2)this["i"]=9;${P('i')}}`,finite:false},
 argumentsAlias:{source:`function f(i){for(;i<4;i++){if(i===1)arguments[0]=9;${P('i')}}}f(0)`,finite:false},
 neverStops:{source:`for(var i=0;i!==0.5;i++){if(i>=2000)break;${P('i')}}`,finite:false},
 stress:{source:`for(var i=0;i<${stress};i++){${P('i')}}`,finite:true},
};

test('bounded loop counters keep eval sources finite and sound against Node',async()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=new Set();vm.runInNewContext(source,{print:value=>seen.add("print(\x27"+value+"\x27)")});out.push([...seen])}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>shapes[name]!.source))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-loop-counter-'));
 try{
  const results=[];
  for(const [index,name] of names.entries()){
   const entry=join(directory,`${name}.js`);
   await writeFile(entry,shapes[name]!.source+'\n');
   const program=ts.createProgram([entry],{allowJs:true,noLib:true});
   const sites=sourceEvaluationInvocations(program,{roots:[entry],host:'test262'}).filter(invocation=>invocation.operation==='eval');
   const choices=sites.some(site=>site.choices===null)?null:sites.flatMap(site=>site.choices!);
   results.push({name,choices,node:observed[index]!});
  }
  // Sound: a finite choice list contains every source Node evaluates.
  expect(results.filter(result=>result.choices!==null&&!result.node.every(value=>result.choices!.includes(value))).map(result=>result.name)).toEqual([]);
  // Precise: the shapes listed finite stay finite.
  expect(results.filter(result=>shapes[result.name]!.finite&&result.choices===null).map(result=>result.name)).toEqual([]);
  expect(results.find(result=>result.name==='stress')!.node.length).toBe(stress);
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

test('compiled loops evaluating counter-built sources match Node',async()=>{
 const program=`
const out=[];
for (var i = 0; i < 4; i++) out.push(eval("'a" + i + "'"));
let total = 0;
for (let j = 3; j > 0; --j) total += eval(String(j));
function doubled(n) { var r = 0; for (var k = 0; k < n; k++) r += eval("(" + k + ") * 2"); return r; }
var seen = [];
for (var m = 0; m !== 3; ++m) seen.push(eval("m + '" + m + "'"));
console.log(out.join(','), total, doubled(3), seen.join(','), i, m);
`;
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-loop-counter-run-'));
 try{
  const entry=join(directory,'main.js'),output=join(directory,'program'),diagnostics:string[]=[];
  await writeFile(entry,program);
  const reference=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});
  const built=await compile({entry,output,buildDir:join(directory,'build'),diagnosticWriter:message=>diagnostics.push(message)});
  expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  expect(native.stdout.toString()).toBe(reference.stdout.toString());
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

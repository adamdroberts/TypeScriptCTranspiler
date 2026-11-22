import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sourceEvaluationInvocations,sourceConstructorInvocations} from '../../src/source-value-flow';
import {nodeReferenceSync} from './node-reference';

/* A counter that only constant writes and one update (`++i`, `i++`) change
 * takes at most E steps from a written value when the update runs at most E
 * times in the whole program. E is the activation bound of the update's
 * function: over the nodes that invoke it, the calls each makes per run (a
 * direct call or Function.prototype.call once; the Function constructors and
 * the converting binary operators once per argument or operand and
 * ToPrimitive key holding the function) times the runs of
 * that node (once at the top level of a Script, the activation bound of its
 * own function otherwise). Recursion, loops, native callbacks (forEach),
 * apply (which reads an array-like), escapes and a second update of the same
 * location are unbounded, so the counter stays unknown there (fails closed).
 * The partitions print the counter through eval after the calls: exact for
 * the bounded ones and sound against Node; unproven for the unbounded ones;
 * plus the Test262 shape, a Function constructor whose arguments' toString
 * advances the counter. The stress calls through a 256-deep chain. */

const P=`eval("print('"+i+"')");`;
const next='var i=0;function next(){return ++i}';
const chain=Array.from({length:256},(_,k)=>k===255?`function c${k}(){++i}`:`function c${k}(){c${k+1}()}`).join('');
const shapes:Record<string,{source:string;exact:string[]|null}>={
 direct:{source:`${next}next();next();${P}`,exact:['0','1','2']},
 call:{source:`${next}next.call(null);next.call(null);${P}`,exact:['0','1','2']},
 nested:{source:`${next}function twice(){next();next()}twice();twice();${P}`,exact:['0','1','2','3','4']},
 reset:{source:`${next}next();i=10;next();${P}`,exact:['1','2','10','11','12']},
 postfix:{source:`var i=0;function next(){return i++}next();next();${P}`,exact:['0','1','2']},
 loop:{source:`${next}for(var k=0;k<3;k++)next();${P}`,exact:null},
 forEach:{source:`${next}[1,2,3].forEach(next);${P}`,exact:null},
 apply:{source:`${next}next.apply(null,[]);${P}`,exact:null},
 recursion:{source:`var i=0;function r(n){++i;if(n)r(n-1)}r(3);${P}`,exact:null},
 twoUpdates:{source:`var i=0;function a(){++i}function b(){i++}a();b();${P}`,exact:null},
 plus:{source:`var i=0;var p={toString:function(){return "x"+(++i)}};var s=p+","+p;${P}`,exact:['0','1','2']},
 template:{source:`var i=0;var p={toString:function(){return "x"+(++i)}};var s=\`\${p}\`;${P}`,exact:null},
 stress:{source:`var i=0;${chain}c0();${P}`,exact:['0','1']},
};
const print=(values:string[])=>values.map(value=>`print('${value}')`).sort();

test('an activation-bounded counter takes finitely many values, sound against Node',async()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];vm.runInNewContext(source,{print:value=>seen.push("print(\x27"+value+"\x27)")});out.push(seen)}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>shapes[name]!.source))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-activation-counter-'));
 try{
  for(const [index,name] of names.entries()){
   const entry=join(directory,`${name}.js`);
   await writeFile(entry,shapes[name]!.source+'\n');
   const started=performance.now();
   const sites=sourceEvaluationInvocations(ts.createProgram([entry],{allowJs:true,noLib:true}),{roots:[entry],host:'test262'}).map(site=>site.choices);
   expect({name,fast:(performance.now()-started)/1000<30}).toEqual({name,fast:true});
   const choices=sites[0]??null,exact=shapes[name]!.exact;
   // Sound: whatever Node printed is listed (or the site is unproven).
   expect({name,missing:choices===null?[]:observed[index]!.filter(value=>!choices.includes(value))}).toEqual({name,missing:[]});
   expect({name,choices:choices===null?null:[...choices].sort()}).toEqual({name,choices:exact===null?null:print(exact)});
  }
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

// Test262 built-ins/Function S15.3.2.1_A2_T4: CreateDynamicFunction converts
// each argument once, in order, so toString runs three times and the
// parameter list is exactly "arg1,arg2,arg3"; each position lists the three
// values the bounded counter allows.
test('a Function constructor whose arguments advance a counter has finite parameter sources',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-activation-function-'));
 try{
  const entry=join(directory,'function.js');
  await writeFile(entry,'var i=0;var p={toString:function(){return "arg"+(++i);}};var f=Function(p,p,p,"return arg1+arg2+arg3;");\n');
  const facts=sourceConstructorInvocations(ts.createProgram([entry],{allowJs:true,noLib:true}),{roots:[entry],host:'test262'});
  expect(facts.map(fact=>fact.choices?.map(position=>[...position].sort()))).toEqual([[['arg1','arg2','arg3'],['arg1','arg2','arg3'],['arg1','arg2','arg3'],['return arg1+arg2+arg3;']]]);
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

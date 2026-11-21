import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {nodeReferenceSync} from './node-reference';

/* A sloppy write to an undeclared name sets a property of the realm's global
 * object. The binding write re-runs whenever its activation or guards change,
 * and each run used to build a fresh cell holding the global object as the
 * write's base: the property write was then never a duplicate, so each rerun
 * added a write rule whose shape mutation woke the guards again, and the
 * analysis ran out of its step budget (every eval site unproven). The
 * partitions: the Test262 assert.sameValue shape (a converted catch throw
 * followed by a guarded `actualName = thrown.constructor.name`), a guarded
 * global write in a loop, and a global first declared by indirect eval and
 * then rewritten by a guarded write. The stress is the assert.sameValue shape
 * with 256 guarded global writes, each in its own catch. */

const P=(value:string)=>`eval("print('"+${value}+"')")`;
const guarded=(call:string,name:string,value="'caught'")=>`try{${call}}catch(thrown){if(typeof thrown!=='object'||thrown===null){}else if(thrown.constructor!==RangeError){${name}=${value}}}`;
const depth=256;
const harness=(writes:string)=>`function assert(){}assert._isSameValue=function(a,b){if(a===b){return a!==0||1/a===1/b}};`+
 `assert.sameValue=function(actual,expected,message){try{if(assert._isSameValue(actual,expected)){return}}catch(error){throw new Error(message+' threw '+error)}${writes}};`+
 `assert.sameValue(Int8Array.prototype,Int8Array.prototype);assert.sameValue(1,2);`;
const shapes:Record<string,{source:string;exact?:string[]}>={
 harness:{source:`${harness(guarded('missing()','actualName','thrown.constructor.name'))}${P('typeof actualName')}`},
 loop:{source:`for(var i=0;i<3;i++){${guarded("if(i>0)throw new TypeError('x')",'seen')}}${P('seen')}`,exact:["print('caught')"]},
 evalDeclared:{source:`(0,eval)("var g=1");${guarded('missing()','g')}${P('g')}`},
 stress:{source:`${harness(Array.from({length:depth},(_,k)=>guarded(`missing${k}()`,`w${k}`)).join(''))}${P('w'+(depth-1))}`,exact:["print('caught')"]},
};

test('a guarded sloppy global write converges in the source analysis, sound against Node',async()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=new Set();vm.runInNewContext(source,{print:value=>seen.add("print(\x27"+value+"\x27)"),Int8Array,RangeError,TypeError,Error});out.push([...seen])}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>shapes[name]!.source))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-global-write-receiver-'));
 try{
  const results=[];
  for(const [index,name] of names.entries()){
   const entry=join(directory,`${name}.js`);
   await writeFile(entry,shapes[name]!.source+'\n');
   const program=ts.createProgram([entry],{allowJs:true,noLib:true});
   const started=performance.now();
   const sites=sourceEvaluationInvocations(program,{roots:[entry],host:'test262'});
   const seconds=(performance.now()-started)/1000;
   const choices=sites.some(site=>site.choices===null)?null:sites.flatMap(site=>site.choices!).sort();
   results.push({name,choices,node:observed[index]!,seconds});
  }
  // Sound: a listed choice set contains every source Node evaluates.
  expect(results.filter(result=>result.choices!==null&&!result.node.every(value=>result.choices!.includes(value))).map(result=>result.name)).toEqual([]);
  // Converged: no eval site is left unproven by an exhausted budget.
  expect(results.filter(result=>result.choices===null).map(result=>result.name)).toEqual([]);
  for(const [name,shape] of Object.entries(shapes))if(shape.exact)expect({name,choices:results.find(result=>result.name===name)!.choices}).toEqual({name,choices:shape.exact});
  expect(results.filter(result=>result.seconds>30).map(result=>result.name)).toEqual([]);
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

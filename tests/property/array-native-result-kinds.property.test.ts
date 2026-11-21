import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {nodeReferenceSync} from './node-reference';

/* An opaque Array.prototype native's result used to be an arbitrary native
 * value. The spec fixes some of them (ES2026 23.1.3): indexOf, lastIndexOf
 * and unshift return a Number, includes a Boolean, toLocaleString a String,
 * and at(index) one of the receiver's elements or undefined. The partitions:
 * the Test262 harness cascade (ToNumber of an arbitrary value may run unknown
 * code, whose throw is caught and converted, which then reaches %eval%
 * through `this instanceof`), one per method; the result kind as typeof sees
 * it, exact; at() over arrays, getters, array-likes, inherited elements and
 * String receivers, sound against Node with the index unknown to the
 * analysis. The stress reads one element of a 256-element array at an
 * unknown index: every element is a choice, and so is undefined (the index
 * may be out of range), nothing else. */

const methods=['indexOf(1)','lastIndexOf(1)','includes(1)','unshift(1)','toLocaleString()','at(1)'];
const cascade=(call:string)=>`var e=eval;function Err(m){if(!(this instanceof Err))return new Err(m)}function same(a,b){return 1/a===1/b}var v=[0,1].${call};try{same(v,1)}catch(error){throw new Err('threw '+error)}`;
// Each evaluated source prints one string literal, so the text Node records
// from the printed value is the evaluated source text.
const P=(value:string)=>`eval("print('"+${value}+"')")`;
const pick='var i=Math.random()<0.5?0:1;';
const depth=256;
const shapes:Record<string,{source:string;exact?:string[]}>={
 ...Object.fromEntries(methods.map(call=>[`cascade:${call}`,{source:cascade(call),exact:[]}])),
 kindNumber:{source:P('typeof [1,2].indexOf(2)+typeof [1].lastIndexOf(3)+typeof [].unshift(4)'),exact:["print('numbernumbernumber')"]},
 kindBoolean:{source:P('typeof [1].includes(1)'),exact:["print('boolean')"]},
 kindString:{source:P('typeof [1,2].toLocaleString()'),exact:["print('string')"]},
 atArray:{source:`${pick}var a=["x","y"];${P('a.at(i)')}`},
 atNegative:{source:`${pick}var a=["x","y","z"];${P('a.at(-1-i)')}`},
 atGetter:{source:`${pick}var a=["x","y"];Object.defineProperty(a,0,{get:function(){return "g"}});${P('a.at(i)')}`},
 atArrayLike:{source:`${pick}var o={length:2,0:"p",1:"q"};${P('Array.prototype.at.call(o,i)')}`},
 atInherited:{source:`${pick}var o=Object.create({1:"r"});o.length=2;o[0]="s";${P('Array.prototype.at.call(o,i)')}`},
 atString:{source:`${pick}${P('Array.prototype.at.call("uv",i)')}`},
 stress:{source:`var i=Math.floor(Math.random()*${depth});var a=[${Array.from({length:depth},(_,k)=>`"e${k}"`).join(',')}];${P('a.at(i)')}`,
  // An index outside the array gives undefined, which the analysis cannot
  // rule out for an unknown index.
  exact:[...Array.from({length:depth},(_,k)=>`print('e${k}')`),"print('undefined')"].sort()},
};

test('an opaque Array.prototype native has its spec result kind in the source analysis, sound against Node',async()=>{
 const names=Object.keys(shapes);
 // Two runs per shape, with Math.random fixed below and above one half.
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=new Set();for(const r of [0.25,0.75]){const math=Object.create(Math);math.random=()=>r;vm.runInNewContext(source,{print:value=>seen.add("print(\x27"+value+"\x27)"),Math:math})}out.push([...seen])}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>shapes[name]!.source))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-array-result-kinds-'));
 try{
  const results=[];
  for(const [index,name] of names.entries()){
   const entry=join(directory,`${name.replace(/[^a-z0-9]/gi,'_')}.js`);
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
  // Precise: no eval site is left unknown, and the exact shapes list
  // exactly their sources (a cascade shape evaluates nothing).
  expect(results.filter(result=>result.choices===null).map(result=>result.name)).toEqual([]);
  for(const [name,shape] of Object.entries(shapes))if(shape.exact)expect({name,choices:results.find(result=>result.name===name)!.choices}).toEqual({name,choices:shape.exact});
  expect(results.filter(result=>result.seconds>30).map(result=>result.name)).toEqual([]);
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

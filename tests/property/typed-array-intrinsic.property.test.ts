import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {nodeReferenceSync} from './node-reference';

/* %TypedArray% and %TypedArray%.prototype (ES2026 23.2) used to be one
 * unknown native value in the source analysis: every lookup that reached
 * them (ToPrimitive of a TypedArray prototype, an absent key on a concrete
 * constructor, a method call) gave an arbitrary value, and a call of it threw
 * an arbitrary value, so a catch that converted the error could run unknown
 * code and every later global became unknown. They are now owners whose own
 * keys are exactly the runtime's, and a TypedArray native's own throw is a native
 * error. The partitions: the intrinsic structure (prototype links, identity
 * of shared members, absent keys, @@species and its this value); the
 * abstract constructor's Call, Construct and super() TypeError; a converted
 * catch after each kind of native abrupt completion (ToPrimitive reaching
 * join, a method, a getter, a static factory, a Uint8Array codec member, the
 * abstract call), which leaves a later literal global exact; and user code a
 * native runs (callback, comparator, argument getter, valueOf, species
 * constructor, from's mapper and iterator, of's conversion, an element's
 * toLocaleString), whose throw still reaches the catch. A constructor a
 * native calls (a species constructor, from's and of's this value) is an
 * escaped call of the builtin with unknown arguments, whose coercions keep an
 * unknown exception: those shapes are checked for soundness only. The stress
 * converts 256 such catches in sequence. */

const P=(value:string)=>`eval("print('"+${value}+"')")`;
const TA='var TA=Object.getPrototypeOf(Int8Array);';
const abrupt=['1/Int8Array.prototype','Int8Array.prototype.join()','Int8Array.prototype.length','Uint8Array.prototype.toHex.call({})','Int8Array.from.call({},[])','TA()'];
const converted=(expression:string,index:number)=>`try{${expression}}catch(error){m${index}='threw '+error}`;
const thrown=(statement:string)=>`var r='none';try{${statement}}catch(e){r=e.k}${P('r')}`;
const depth=256;
const shapes:Record<string,{source:string;exact?:string[];soundOnly?:true}>={
 structure:{source:`${TA}${P(`[typeof TA,TA.name,TA.length,Object.getPrototypeOf(Int8Array.prototype)===TA.prototype,Object.getPrototypeOf(TA.prototype)===Object.prototype,Object.getPrototypeOf(TA)===Function.prototype,Int8Array.prototype.toString===Array.prototype.toString,Int8Array.from===Uint8Array.from,Int8Array.x,TA.prototype.x,TA.prototype[Symbol.iterator]===TA.prototype.values].join()`)}`},
 species:{source:`${TA}class X extends Int8Array{}var f={};${P(`[X[Symbol.species]===X,Int8Array[Symbol.species]===Int8Array,Object.getOwnPropertyDescriptor(TA,Symbol.species).get.call(f)===f].join()`)}`},
 abstractCall:{source:`${TA}var r='none';try{TA()}catch(e){r=e instanceof TypeError}${P('r')}`},
 abstractConstruct:{source:`${TA}var r='none';try{new TA()}catch(e){r=e instanceof TypeError}${P('r')}`},
 abstractSuper:{source:`${TA}class Y extends TA{}var r='none';try{new Y()}catch(e){r=e instanceof TypeError}${P('r')}`},
 ...Object.fromEntries(abrupt.map((expression,index)=>[`converted${index}`,{source:`${TA}${converted(expression,index)}w='done';${P('w')}`,exact:["print('done')"]}])),
 callback:{source:thrown(`new Int8Array(2).forEach(function(){throw {k:'cb'}})`)},
 comparator:{source:thrown(`new Int8Array(2).sort(function(){throw {k:'so'}})`)},
 argumentGetter:{source:thrown(`new Int8Array(2).set({length:1,get 0(){throw {k:'g'}}})`)},
 valueOf:{source:thrown(`new Int8Array(1).fill({valueOf:function(){throw {k:'f'}}})`)},
 speciesConstructor:{source:thrown(`class S extends Int8Array{static get [Symbol.species](){return function(){throw {k:'sp'}}}}new S(1).map(function(x){return x})`),soundOnly:true},
 fromMapper:{source:thrown(`Int8Array.from([1],function(){throw {k:'fm'}})`),soundOnly:true},
 fromIterator:{source:thrown(`var source={};source[Symbol.iterator]=function(){throw {k:'it'}};Int8Array.from(source)`),soundOnly:true},
 ofConversion:{source:thrown(`Int8Array.of({valueOf:function(){throw {k:'of'}}})`),soundOnly:true},
 elementLocale:{source:thrown(`Number.prototype.toLocaleString=function(){throw {k:'n'}};new Int8Array(1).toLocaleString()`)},
 stress:{source:`${TA}${Array.from({length:depth},(_,k)=>converted(abrupt[k%abrupt.length]!,k)).join('')}w='done';${P('w')}`,exact:["print('done')"]},
};

test('%TypedArray% and its prototype are modelled owners in the source analysis, sound against Node',async()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=new Set();vm.runInNewContext(source,{print:value=>seen.add("print(\x27"+value+"\x27)")});out.push([...seen])}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>shapes[name]!.source))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-typed-array-intrinsic-'));
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
  // Precise: no eval site is left unknown, and the exact shapes list
  // exactly their sources.
  expect(results.filter(result=>result.choices===null&&!shapes[result.name]!.soundOnly).map(result=>result.name)).toEqual([]);
  for(const [name,shape] of Object.entries(shapes))if(shape.exact)expect({name,choices:results.find(result=>result.name===name)!.choices}).toEqual({name,choices:shape.exact});
  expect(results.filter(result=>result.seconds>30).map(result=>result.name)).toEqual([]);
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

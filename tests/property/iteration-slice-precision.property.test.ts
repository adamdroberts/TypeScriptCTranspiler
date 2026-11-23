import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {nodeReferenceSync} from './node-reference';

/* Precision repairs and their soundness partitions, against Node:
 * - %StringIteratorPrototype%.next on a String Iterator yields the code
 *   points of its [[IteratedString]] (for-of, spread), not unknown code's
 *   value; a replaced @@iterator or next keeps its own effects;
 * - Array.prototype.slice (ArraySpeciesCreate), toReversed and toSorted
 *   return a fresh array of the receiver's elements; an index getter and a
 *   user @@species keep theirs;
 * - a callback a native invokes keeps its precision with Number elements
 *   (map over String.fromCodePoint) and its effect with an object whose
 *   valueOf writes;
 * - an Array index no definition names reads through the prototype without
 *   a field (a parameter holding arrays of different lengths), and a later
 *   write at that index is still read.
 * Each partition is followed by an eval of a literal built from the value;
 * Node's printed text must be listed (or the site unproven), and the
 * precision partitions must be finite. The stress iterates and slices 400
 * strings. */

const P=(value:string)=>`eval("print('"+${value}+"')");`;
const shapes:Record<string,{source:string;finite:boolean}>={
 forOfString:{source:`var r='';for(const c of 'ab')r=c;${P('r')}`,finite:true},
 spreadString:{source:`var s=[...'ab'];${P('s[0]')}`,finite:true},
 spreadAstral:{source:`var s=[...'a\\u{1F600}'];${P('s[1].length')}`,finite:true},
 replacedIterator:{source:`String.prototype[Symbol.iterator]=function*(){yield 'z'};var s=[...'ab'];${P('s[0]')}`,finite:false},
 replacedNext:{source:`var w='1';Object.getPrototypeOf(''[Symbol.iterator]()).next=function(){w='2';return {done:true,value:undefined}};var s=[...'ab'];${P('w')}`,finite:false},
 slice:{source:`var s=['a','b'].slice(1);${P('s[0]')}`,finite:true},
 toReversed:{source:`var s=['a','b'].toReversed();${P('s[0]')}`,finite:true},
 sliceSpecies:{source:`var w='1';var a=['a'];a.constructor={[Symbol.species]:function(){w='2';return {}}};a.slice(0);${P('w')}`,finite:false},
 sliceGetter:{source:`var w='1';var a=['a'];Object.defineProperty(a,0,{get(){w='2';return 'g'}});a.slice(0);${P('w')}`,finite:false},
 mapNumbers:{source:`var w='1';function f(xs){return xs.map(c=>String.fromCodePoint(c)).join('')}f([${Array.from({length:40},(_,k)=>65+k%26).join(',')}]);f([67]);${P('w')}`,finite:true},
 mapValueOf:{source:`var w='1';function f(xs){return xs.map(c=>String.fromCodePoint(c)).join('')}f([65,66]);f([{valueOf(){w='2';return 67}}]);${P('w')}`,finite:false},
 absentIndex:{source:`function g(xs){return xs[5]}var a=[1,2],b=[1,2,3,4,5,'six'];g(b);a[5]='x';${P('g(a)')}`,finite:true},
 stress:{source:`var r='';function h(xs){for(const t of xs){const u=[...t].slice(0,-1);for(const c of u)r=c;}}h([${Array.from({length:400},(_,k)=>`'${String.fromCharCode(97+k%26)}${String.fromCharCode(97+(k*7)%26)}'`).join(',')}]);${P('r')}`,finite:true},
};

test('string iteration, slice results and absent indices are precise and sound against Node',async()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];vm.runInNewContext(source,{print:value=>seen.push("print(\x27"+value+"\x27)")});out.push(seen)}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>shapes[name]!.source))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-iteration-slice-'));
 try{
  for(const [index,name] of names.entries()){
   const entry=join(directory,`${name}.js`);
   await writeFile(entry,shapes[name]!.source+'\n');
   const started=performance.now();
   const choices=sourceEvaluationInvocations(ts.createProgram([entry],{allowJs:true,noLib:true}),{roots:[entry],host:'test262'})[0]?.choices??null;
   expect({name,fast:(performance.now()-started)/1000<60}).toEqual({name,fast:true});
   expect({name,missing:choices===null?[]:observed[index]!.filter(value=>!choices.includes(value))}).toEqual({name,missing:[]});
   if(shapes[name]!.finite)expect({name,finite:choices!==null}).toEqual({name,finite:true});
  }
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

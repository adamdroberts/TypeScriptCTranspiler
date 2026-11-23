import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {nodeReferenceSync} from './node-reference';

/* A Buffer static (from, alloc, concat, byteLength, compare, ...) writes no
 * ordinary property of its arguments and runs only what they reach: an
 * array-like's getters, an object's valueOf or @@toPrimitive. Its call is
 * the escape of its arguments, not unknown code writing every global, so a
 * later eval of a literal global stays exact. The partitions, sound against
 * Node: alloc and from on primitives (exact); an array-like whose index
 * getter writes the global, an object whose valueOf writes it, one whose
 * @@toPrimitive writes it, and a concat list whose getter writes it (each
 * listed or the site unproven). The stress makes 256 Buffer calls. */

const P=`eval("print('"+w+"')");`;
const shapes:Record<string,{source:string;exact:string[]|null}>={
 alloc:{source:`var w='1';Buffer.alloc(0);Buffer.from('ab','hex');${P}`,exact:["print('1')"]},
 byteLength:{source:`var w='1';Buffer.byteLength('abc');Buffer.isEncoding('hex');${P}`,exact:["print('1')"]},
 getter:{source:`var w='1';Buffer.from({length:1,get 0(){w='2';return 1}});${P}`,exact:null},
 valueOf:{source:`var w='1';Buffer.from({valueOf(){w='2';return 'x'}});${P}`,exact:null},
 toPrimitive:{source:`var w='1';Buffer.from({[Symbol.toPrimitive](){w='2';return 'x'}});${P}`,exact:null},
 concat:{source:`var w='1';var list=[];Object.defineProperty(list,'0',{get(){w='2';return Buffer.from('a')}});list.length=1;Buffer.concat(list);${P}`,exact:null},
 stress:{source:`var w='1';${Array.from({length:256},(_,k)=>['Buffer.alloc(1);','Buffer.from("ab");','Buffer.byteLength("x");','Buffer.concat([]);'][k%4]).join('')}${P}`,exact:["print('1')"]},
};

test('Buffer statics run only what their arguments reach, sound against Node',async()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];vm.runInNewContext(source,{print:value=>seen.push("print(\x27"+value+"\x27)"),Buffer});out.push(seen)}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>shapes[name]!.source))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 // The writing partitions do write in Node.
 for(const name of ['getter','valueOf','toPrimitive','concat'])expect({name,observed:observed[names.indexOf(name)]}).toEqual({name,observed:["print('2')"]});
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-buffer-static-effects-'));
 try{
  for(const [index,name] of names.entries()){
   const entry=join(directory,`${name}.js`);
   await writeFile(entry,shapes[name]!.source+'\n');
   const started=performance.now();
   const choices=sourceEvaluationInvocations(ts.createProgram([entry],{allowJs:true,noLib:true}),{roots:[entry]})[0]?.choices??null;
   expect({name,fast:(performance.now()-started)/1000<30}).toEqual({name,fast:true});
   expect({name,missing:choices===null?[]:observed[index]!.filter(value=>!choices.includes(value))}).toEqual({name,missing:[]});
   const exact=shapes[name]!.exact;
   if(exact)expect({name,choices}).toEqual({name,choices:exact});
  }
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

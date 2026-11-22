import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {nodeReferenceSync} from './node-reference';

/* A builtin construction's exotic [[OwnPropertyKeys]] (a String wrapper's
 * index keys, a TypedArray's integer indices) is native and runs no code;
 * only a Proxy's ownKeys trap does. The own-key collection marked every
 * object whose property algorithm the model does not represent as running
 * unknown code, so Reflect.ownKeys(new String(...)) after `String` had been
 * replaced made every global unknown and tests/property/
 * primitive-constructor-owner's program exhausted the 3 GB analysis bound.
 * The partitions: Reflect.ownKeys, Object.keys and Object.getOwnPropertyNames
 * of TypedArrays and of a String wrapper whose constructor binding was
 * replaced, each followed by an exact literal global; and a Proxy whose
 * ownKeys trap writes that global, sound against Node. The stress
 * enumerates 256 TypedArrays. */

const P=`eval("print('"+w+"')");`;
const shapes:Record<string,{source:string;exact:string[]|null}>={
 typedArray:{source:`var w='1';Reflect.ownKeys(new Int8Array(2));${P}`,exact:["print('1')"]},
 keys:{source:`var w='1';Object.keys(new Uint8Array(3));${P}`,exact:["print('1')"]},
 names:{source:`var w='1';Object.getOwnPropertyNames(new Float64Array(1));${P}`,exact:["print('1')"]},
 stringWrapper:{source:`var w='1';var original=String;String=function(value){return value};String=original;Reflect.ownKeys(new String('ab'));${P}`,exact:["print('1')"]},
 proxy:{source:`var w='1';var p=new Proxy({},{ownKeys:function(){w='2';return []}});Reflect.ownKeys(p);${P}`,exact:null},
 stress:{source:`var w='1';${Array.from({length:256},(_,k)=>`Reflect.ownKeys(new Int8Array(${k%7+1}));`).join('')}${P}`,exact:["print('1')"]},
};

test('native exotic own keys run no code, sound against Node',async()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];vm.runInNewContext(source,{print:value=>seen.push("print(\x27"+value+"\x27)")});out.push(seen)}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>shapes[name]!.source))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-native-exotic-own-keys-'));
 try{
  for(const [index,name] of names.entries()){
   const entry=join(directory,`${name}.js`);
   await writeFile(entry,shapes[name]!.source+'\n');
   const started=performance.now();
   const choices=sourceEvaluationInvocations(ts.createProgram([entry],{allowJs:true,noLib:true}),{roots:[entry],host:'test262'})[0]?.choices??null;
   expect({name,fast:(performance.now()-started)/1000<30}).toEqual({name,fast:true});
   // Sound: what Node printed is listed (or the site is unproven).
   expect({name,missing:choices===null?[]:observed[index]!.filter(value=>!choices.includes(value))}).toEqual({name,missing:[]});
   const exact=shapes[name]!.exact;
   if(exact)expect({name,choices}).toEqual({name,choices:exact});
  }
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

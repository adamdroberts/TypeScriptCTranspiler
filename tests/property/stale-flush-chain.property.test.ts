import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {nodeReferenceSync} from './node-reference';

/* The primitive change flush stops at a stale cell: one whose cache it has
 * already cleared and whose users are all still queued, with every cell above
 * it stale too. A rule's run and a stored cache entry observe a cell, and
 * clear the marks below it, so a value that reaches the bottom of a chain
 * after the chain's top was read must still reach the eval site. Generated
 * chains of each edge kind (a copy, a return, a concatenation, a closure
 * capture, a property read) carry a second value written after the chain
 * was built; each eval site stays finite and lists what Node printed. The
 * stress is a 400-deep chain of each kind. */

const P=(value:string)=>`eval("print('"+${value}+"')");`;
const chain:Record<string,(depth:number)=>string>={
 copy:depth=>`var v='1';var x0=v;${Array.from({length:depth},(_,k)=>`var x${k+1}=x${k};`).join('')}function late(){v='2';x0=v;}${P(`x${depth}`)}late();${Array.from({length:depth},(_,k)=>`x${k+1}=x${k};`).join('')}${P(`x${depth}`)}`,
 ret:depth=>`var v='1';function f0(){return v}${Array.from({length:depth},(_,k)=>`function f${k+1}(){return f${k}()}`).join('')}${P(`f${depth}()`)}v='2';${P(`f${depth}()`)}`,
 concat:depth=>`var v='1';function g(){var t0=v;${Array.from({length:depth},(_,k)=>`var t${k+1}=t${k}+'a';`).join('')}return t${depth}}${P('g()')}v='2';${P('g()')}`,
 capture:depth=>`var v='1';${Array.from({length:depth},(_,k)=>`function c${k}(){return ${k===0?'v':`c${k-1}()`}}`).join('')}var h=function(){return c${depth-1}()};${P('h()')}v='2';${P('h()')}`,
 property:depth=>`var v='1';var o0={p:v};${Array.from({length:depth},(_,k)=>`var o${k+1}={p:o${k}.p};`).join('')}function r(){o0.p=v;${Array.from({length:depth},(_,k)=>`o${k+1}.p=o${k}.p;`).join('')}return o${depth}.p}${P('r()')}v='2';${P('r()')}`,
};
const shapes:{name:string;source:string;stress:boolean}[]=[];
for(const [kind,make] of Object.entries(chain)){
 for(const depth of [1,3,8])shapes.push({name:`${kind}-${depth}`,source:make(depth),stress:false});
 shapes.push({name:`${kind}-stress`,source:make(400),stress:true});
}

test('late values reach the eval site through deep chains, sound against Node',async()=>{
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];vm.runInNewContext(source,{print:value=>seen.push("print(\x27"+value+"\x27)")});out.push(seen)}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(shapes.map(shape=>shape.source))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-stale-flush-chain-'));
 try{
  for(const [index,shape] of shapes.entries()){
   const entry=join(directory,`${shape.name}.js`);
   await writeFile(entry,shape.source+'\n');
   const started=performance.now();
   const sites=sourceEvaluationInvocations(ts.createProgram([entry],{allowJs:true,noLib:true}),{roots:[entry],host:'test262'});
   if(shape.stress)expect({name:shape.name,fast:(performance.now()-started)/1000<60}).toEqual({name:shape.name,fast:true});
   const choices=[...new Set(sites.flatMap(site=>site.choices??['<unknown>']))].sort();
   const name=shape.name;
   // Finite, and every printed text is listed.
   expect({name,unknown:choices.includes('<unknown>')}).toEqual({name,unknown:false});
   expect({name,missing:[...new Set(observed[index]!)].filter(value=>!choices.includes(value))}).toEqual({name,missing:[]});
  }
 }finally{await rm(directory,{recursive:true,force:true});}
},1_200_000);

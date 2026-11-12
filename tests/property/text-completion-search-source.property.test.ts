import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

/* Whether an operand can complete normally (a call's argument, a property
 * key) depends on every combination of its text operations' operand values,
 * and a chain of two-way choices doubles them at each level. A complete value
 * proof combines each operand's values once; where the proof is incomplete (a
 * chain past its combination bound) a search walks the combinations, once per
 * path, and past the analysis bound answers that one may complete normally,
 * which keeps the call's effects. Each shape builds a chain over a Symbol, a
 * string, or either, uses its end (or the end plus a Symbol) as a call's
 * argument or a property key, and evaluates `s`; the graph must fail closed or
 * contain every source Node evaluates, and every shape must stay finite. Two
 * 64-level chains are the depth stress: one over a Symbol, which the proof
 * shows never completes, and one over a string whose end is added to a
 * Symbol, which only the bounded search reaches. */

const chain=(base:string,depth:number)=>{
 let text=`var x0=${base};`;
 for(let index=1;index<=depth;index++)text+=`var x${index}=Math.random()<2?x${index-1}+"a":x${index-1}+"b";`;
 return text;
};
const bases={symbol:'Symbol("s")',string:'"ok"',either:'Math.random()<2?"ok":Symbol("s")'};
const uses={
 call:(last:string)=>`s=JSON.stringify(String(${last}))+";";`,
 key:(last:string)=>`s=Object.hasOwn({ok:1},${last})?"2;":"3;";`,
 tail:(last:string)=>`s=JSON.stringify(String(${last}+Symbol("s")))+";";`,
};

test('an operand whose completions the analysis cannot enumerate may complete normally',()=>{
 const cases=Object.entries(bases).flatMap(([baseName,base])=>Object.entries(uses).map(([useName,use])=>({name:baseName+'-'+useName,
  source:`var s="1;";try{${chain(base,4)}${use('x4')}}catch(error){}OUT(s);`})));
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];vm.runInNewContext(source,{observe:value=>seen.push(value)});out.push(seen)}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(cases.map(entry=>entry.source.replaceAll('OUT(','observe(')))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const results=cases.map((entry,index)=>{
  const graph=finiteEvalScriptSourceGraph([{path:'main.js',source:entry.source.replaceAll('OUT(','eval(')}]);
  return {name:entry.name,error:graph.error,sources:graph.directEvalSources.map(record=>record.source).sort(),node:observed[index]!};
 });
 // Sound: a finite graph contains every source Node evaluates.
 expect(results.filter(result=>result.error===null&&!result.node.every(value=>result.sources.includes(value))).map(({name,sources,node})=>({name,sources,node}))).toEqual([]);
 // Precise: every shape stays finite.
 expect(results.filter(result=>result.error!==null).map(({name,error})=>({name,error}))).toEqual([]);
},300_000);

test('64-level chains of two-way choices keep the operand search bounded',()=>{
 // Node throws before either eval, so neither lists a source; the Symbol
 // chain's call is proved to throw, and the string chain past the
 // combination bound fails closed.
 const symbol=finiteEvalScriptSourceGraph([{path:'symbol.js',source:`var s="1;";${chain(bases.symbol,64)}${uses.call('x64')}eval(s);`}]);
 expect({error:symbol.error,sources:symbol.directEvalSources.map(record=>record.source)}).toEqual({error:null,sources:[]});
 const tail=finiteEvalScriptSourceGraph([{path:'tail.js',source:`var s="1;";${chain(bases.string,64)}${uses.tail('x64')}eval(s);`}]);
 expect(tail.directEvalSources.map(record=>record.source)).toEqual([]);
},300_000);

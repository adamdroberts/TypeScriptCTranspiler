import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

/* An undeclared name read inside a function is the global binding unless a
 * direct eval in that function declares it. Under the open host model that
 * global binding is a value the embedding host provides; under the Test262
 * model the reference is unresolvable and its read throws ReferenceError
 * (typeof answers "undefined"). The read must resolve like a top-level read,
 * so the rest of the function evaluates: a conditional, comma, `if`, logical,
 * typeof, arrow, method, nested function or try/catch around it keeps its
 * literal results. Each generated program evaluates what its function
 * returned; Node runs it with the host providing several values (open) and
 * without the name (Test262). The graph must fail closed or contain every
 * source Node evaluates, and every shape must be finite. A function returning
 * a 256-deep conditional on the name is the depth stress (a deep call chain
 * is not: call chains cost far more than linear time in the analysis; see
 * docs/todo.md). */

const shapes:Record<string,string>={
 conditional:'function g(){return flag?"1;":"2;"}observe(g());',
 comma:'function g(){return (flag,"3;")}observe(g());',
 ifStatement:'function g(){if(flag)return "4;";return "5;"}observe(g());',
 logical:'function g(){return !flag&&"6;"||"7;"}observe(g());',
 typeofRead:'function g(){return typeof flag==="undefined"?"8;":"9;"}observe(g());',
 arrow:'const g=()=>flag?"10;":"11;";observe(g());',
 method:'const o={m(){return flag?"12;":"13;"}};observe(o.m());',
 nested:'function outer(){function inner(){return flag?"14;":"15;"}return inner()}observe(outer());',
 tryCatch:'function g(){try{return flag?"16;":"17;"}catch(e){return "18;"}}observe(g());',
 directEvalDeclared:'function g(){eval("var flag=1");return flag?"19;":"20;"}observe(g());',
};

function oracle(sources:readonly string[],values:readonly unknown[]|null):string[][] {
 // values null: the name is absent (Test262); otherwise one run per value.
 const result=nodeReferenceSync(['node','-e',`const vm=require("node:vm");const values=${values===null?'null':JSON.stringify(values)};const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];for(const value of values??[undefined]){const context={observe:item=>seen.push(item)};if(values)context.flag=value;try{vm.runInNewContext(source,context)}catch(error){seen.push("throw:"+error.name)}}out.push(seen)}process.stdout.write(JSON.stringify(out))`,
  JSON.stringify(sources)],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:result.exitCode,stderr:result.stderr.toString()}).toEqual({code:0,stderr:''});
 return JSON.parse(result.stdout.toString());
}

test('function reads of an undeclared name resolve like top-level reads under both host models',()=>{
 const names=Object.keys(shapes),sources=names.map(name=>shapes[name]!);
 for(const [host,values] of [['open',[true,false,'x',0]],['test262',null]] as const){
  const observed=oracle(sources,values);
  const results=names.map((name,index)=>{
   const graph=finiteEvalScriptSourceGraph([{path:'main.js',source:shapes[name]!.replaceAll('observe(','eval(')}],[],host);
   return {name,error:graph.error,sources:graph.directEvalSources.map(record=>record.source),node:observed[index]!.filter(value=>!value.startsWith('throw:'))};
  });
  // Sound: a finite graph contains every source Node evaluates.
  expect({host,unsound:results.filter(result=>result.error===null&&!result.node.every(value=>result.sources.includes(value)))}).toEqual({host,unsound:[]});
  // Precise: every shape is finite.
  expect({host,refused:results.filter(result=>result.error!==null).map(result=>result.name)}).toEqual({host,refused:[]});
 }
},120_000);

test('a 256-deep conditional on an undeclared name inside a function stays finite',()=>{
 let expression='"21;"';
 for(let index=0;index<256;index++)expression=`(flag?${expression}:"22;")`;
 const source=`function g(){return ${expression}}eval(g());`;
 for(const [host,expected] of [['open',['21;','22;']],['test262',[]]] as const){
  const graph=finiteEvalScriptSourceGraph([{path:'deep.js',source}],[],host);
  expect({host,error:graph.error,sources:graph.directEvalSources.map(record=>record.source).sort()}).toEqual({host,error:null,sources:[...expected]});
 }
},300_000);

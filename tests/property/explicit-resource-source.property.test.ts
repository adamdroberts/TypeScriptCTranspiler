import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

/* The compiler implements using and await using declarations (explicit
 * resource management, after the ES2026 freeze but compiled as Node 26
 * runs them), so the analysis models them: the resource's @@dispose
 * (@@asyncDispose, else @@dispose, for await using) is read at the
 * declaration, where a getter on it runs and a resource without one throws
 * TypeError; null and undefined are skipped; the method runs with the
 * resource as `this` when the block, the whole case block or one for-of
 * iteration completes, after every statement of the scope, and its throw
 * leaves the scope. Each generated Script evaluates what the disposal wrote;
 * the graph must fail closed or contain every source Node evaluates, and the
 * shapes listed as finite must stay finite. 256 nested blocks, each with a
 * using declaration, are the depth stress. */

const shapes:Record<string,string>={
 disposeAtExit:'var g="0;";{using r={[Symbol.dispose](){g="1;"}};g="2;"}',
 disposeThis:'var g="0;";{using r={k:"1;",[Symbol.dispose](){g=this.k}}}',
 reverseOrder:'var g="";{using a={[Symbol.dispose](){g+="a"}};using b={[Symbol.dispose](){g+="b"}}}g=g==="ba"?"1;":"2;";',
 nullResource:'var g="0;";{using r=null;using u=undefined;}g="1;";',
 missingMethod:'var g="0;";try{using r={};}catch(e){g=e instanceof TypeError?"1;":"2;"}',
 disposeThrows:'var g="0;";try{using r={[Symbol.dispose](){throw "1;"}};}catch(e){g=e}',
 getterAtDeclaration:'var g="0;";{using r={get [Symbol.dispose](){g="1;";return function(){}}};}',
 forOfUsing:'var g="0;";for(using r of [{[Symbol.dispose](){g="1;"}}]){g="2;"}',
 awaitUsing:'var g="0;";async function f(){await using r={[Symbol.asyncDispose](){g="1;"}};}f();',
 awaitUsingFallback:'var g="0;";async function f(){await using r={[Symbol.dispose](){g="1;"}};}f();',
 switchScope:'var g="0;";switch(1){case 1:{using r={[Symbol.dispose](){g="1;"}};}case 2:g="2;"}',
 nestedFunction:'var g="0;";function f(){using r={[Symbol.dispose](){g="1;"}};g="2;"}f();',
};
const finite=Object.keys(shapes).filter(name=>name!=='reverseOrder');

test('using declarations dispose their resources when their scope completes',()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];vm.runInNewContext(source,{observe:value=>seen.push(value)});out.push(seen)}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>shapes[name]+'observe(g);'))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const results=names.map((name,index)=>{
  const graph=finiteEvalScriptSourceGraph([{path:'main.js',source:shapes[name]+'eval(g);'}]);
  return {name,error:graph.error,sources:graph.directEvalSources.map(record=>record.source),node:observed[index]!};
 });
 // Sound: a finite graph contains every source Node evaluates.
 expect(results.filter(result=>result.error===null&&!result.node.every(value=>result.sources.includes(value)))).toEqual([]);
 // Precise: the listed shapes are finite.
 expect(results.filter(result=>finite.includes(result.name)&&result.error!==null).map(result=>result.name)).toEqual([]);
},120_000);

test('256 nested blocks with using declarations stay finite',()=>{
 let source='var g="start;";';
 for(let index=0;index<256;index++)source+=`{using r${index}={[Symbol.dispose](){g="${index};"}};`;
 source+='g="inner;";'+'}'.repeat(256)+'eval(g);';
 const graph=finiteEvalScriptSourceGraph([{path:'deep.js',source}]);
 const sources=graph.directEvalSources.map(record=>record.source);
 // Node disposes the outermost resource last.
 expect({error:graph.error,last:sources.includes('0;'),bounded:sources.length<=258}).toEqual({error:null,last:true,bounded:true});
},300_000);

import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

/* for await calls its operand's @@asyncIterator (else @@iterator, wrapped),
 * the iterator's next and return, and awaits each result, whose then may
 * run: the operand escapes at the loop as an opaque native's argument does,
 * and the loop variable stays unknown. Each generated Script evaluates what
 * those methods wrote by the end of the Script; the graph must fail closed
 * or contain every source Node evaluates, and the shapes listed as finite
 * must stay finite. 256 for await loops over distinct iterables are the
 * depth stress. */

const shapes:Record<string,string>={
 asyncIterator:'var g="0;";(async function(){for await(var v of {[Symbol.asyncIterator](){return {next(){g="1;";return Promise.resolve({done:true})}}}});})();',
 syncIterator:'var g="0;";(async function(){for await(var v of {[Symbol.iterator](){return {next(){g="1;";return {done:true}}}}});})();',
 iteratorMethod:'var g="0;";(async function(){for await(var v of {[Symbol.asyncIterator](){g="1;";return {next(){return Promise.resolve({done:true})}}}});})();',
 thenableResult:'var g="0;";(async function(){for await(var v of {[Symbol.asyncIterator](){return {next(){return {then(r){g="1;";r({done:true})}}}}}});})();',
};
const finite=Object.keys(shapes);

test('for await steps the async iteration protocol',()=>{
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

test('256 for await loops stay finite',()=>{
 const lines=['var g="start;";(async function(){'];
 for(let index=0;index<256;index++)lines.push(`for await(var v${index} of {[Symbol.asyncIterator](){return {next(){g="${index};";return Promise.resolve({done:true})}}}});`);
 lines.push('})();eval(g);');
 const graph=finiteEvalScriptSourceGraph([{path:'deep.js',source:lines.join('\n')}]);
 const sources=graph.directEvalSources.map(record=>record.source);
 expect({error:graph.error,first:sources.includes('0;'),bounded:sources.length<=257}).toEqual({error:null,first:true,bounded:true});
},300_000);

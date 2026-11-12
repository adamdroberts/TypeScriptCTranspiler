import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

/* Array destructuring (a binding pattern, an assignment pattern, a nested
 * pattern, a parameter) steps an iterator it does not get from an ordinary
 * Array and, when it stops before the iterator is done, calls the
 * iterator's return method (IteratorClose). A rest element exhausts the
 * iterator; an ordinary Array runs no user code. Each generated Script
 * evaluates what return wrote; the graph must fail closed or contain every
 * source Node evaluates, and the shapes listed as finite must stay finite.
 * 256 destructurings of closing iterators are the depth stress. */

const shapes:Record<string,string>={
 binding:'var g="0;";var [y]={[Symbol.iterator](){return {next(){return {done:false,value:1}},return(){g="1;";return {}}}}};',
 assignment:'var g="0;";var y;[y]={[Symbol.iterator](){return {next(){return {done:false,value:1}},return(){g="1;";return {}}}}};',
 nested:'var g="0;";var [[y]]=[{[Symbol.iterator](){return {next(){return {done:false,value:1}},return(){g="1;";return {}}}}}];',
 parameter:'var g="0;";(function([p]){})({[Symbol.iterator](){return {next(){return {done:false,value:1}},return(){g="1;";return {}}}}});',
 restExhausts:'var g="0;";var [...r]={[Symbol.iterator](){var n=0;return {next(){return {done:n++>0,value:1}},return(){g="2;";return {}}}}};',
 doneNoClose:'var g="0;";var [y]={[Symbol.iterator](){return {next(){return {done:true}},return(){g="2;";return {}}}}};',
 ordinaryArray:'var g="0;";var [y]=["1;"];g=y;',
};
const finite=Object.keys(shapes);

test('array destructuring closes the iterators it does not exhaust',()=>{
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

test('256 destructurings of closing iterators stay finite',()=>{
 const lines=['var g="start;";'];
 for(let index=0;index<256;index++)lines.push(`var [y${index}]={[Symbol.iterator](){return {next(){return {done:false,value:1}},return(){g="${index};";return {}}}}};`);
 lines.push('eval(g);');
 const graph=finiteEvalScriptSourceGraph([{path:'deep.js',source:lines.join('\n')}]);
 const sources=graph.directEvalSources.map(record=>record.source);
 expect({error:graph.error,last:sources.includes('255;'),bounded:sources.length<=257}).toEqual({error:null,last:true,bounded:true});
},300_000);

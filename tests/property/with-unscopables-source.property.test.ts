import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

/* A name a with object supplies runs HasBinding on the object Environment
 * Record: the object's @@unscopables is read and, when it is an Object, the
 * name is read on it, so getters at either place run. Each generated Script
 * evaluates what the getter wrote; the graph must fail closed or contain
 * every source Node evaluates, and the shapes listed as finite must stay
 * finite. 256 with statements over objects with unscopables getters are
 * the depth stress. */

const shapes:Record<string,string>={
 unscopablesGetter:'var g="0;";var o={x:1,get [Symbol.unscopables](){g="1;";return {}}};with(o){x}',
 nameGetter:'var g="0;";var o={x:1,[Symbol.unscopables]:{get x(){g="1;";return false}}};with(o){x}',
 blockedName:'var g="1;";var x="2;";var o={x:"3;",[Symbol.unscopables]:{x:true}};with(o){g=g}',
 noUnscopables:'var g="1;";var o={x:1};with(o){x}',
};
const finite=Object.keys(shapes);

test('with name resolution reads @@unscopables',()=>{
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

test('256 with statements reading unscopables stay finite',()=>{
 const lines=['var g="start;";'];
 for(let index=0;index<256;index++)lines.push(`with({v:1,get [Symbol.unscopables](){g="${index};";return {}}}){v}`);
 lines.push('eval(g);');
 const graph=finiteEvalScriptSourceGraph([{path:'deep.js',source:lines.join('\n')}]);
 const sources=graph.directEvalSources.map(record=>record.source);
 expect({error:graph.error,last:sources.includes('255;'),bounded:sources.length<=257}).toEqual({error:null,last:true,bounded:true});
},300_000);

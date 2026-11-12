import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

/* A name no declaration binds resolves on the global object, where
 * Object.defineProperty may have placed an accessor: GetValue runs its
 * getter even when the value is unused (an expression statement `name;`).
 * Each generated Script evaluates what the getter wrote; the graph must
 * fail closed or contain every source Node evaluates, and the shapes listed
 * as finite must stay finite. 256 global accessors read by bare name are
 * the depth stress. */

const shapes:Record<string,string>={
 bareRead:'var g="0;";Object.defineProperty(globalThis,"ga",{get(){g="1;";return 1},configurable:true});ga;',
 usedRead:'var g="0;";Object.defineProperty(globalThis,"gb",{get(){g="1;";return 1},configurable:true});var t=gb;',
 typeofRead:'var g="0;";Object.defineProperty(globalThis,"gc",{get(){g="1;";return 1},configurable:true});typeof gc;',
 setter:'var g="0;";Object.defineProperty(globalThis,"gd",{set(v){g=v},configurable:true});gd="1;";',
 dataGlobal:'var g="1;";globalThis.ge=2;ge;',
};
const finite=Object.keys(shapes);

test('a bare name runs a global accessor getter',()=>{
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

test('256 global accessors read by bare name stay finite',()=>{
 const lines=['var g="start;";'];
 for(let index=0;index<256;index++)lines.push(`Object.defineProperty(globalThis,"a${index}",{get(){g="${index};";return 1},configurable:true});a${index};`);
 lines.push('eval(g);');
 const graph=finiteEvalScriptSourceGraph([{path:'deep.js',source:lines.join('\n')}]);
 const sources=graph.directEvalSources.map(record=>record.source);
 expect({error:graph.error,last:sources.includes('255;'),bounded:sources.length<=257}).toEqual({error:null,last:true,bounded:true});
},300_000);

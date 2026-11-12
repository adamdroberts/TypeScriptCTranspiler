import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

/* A builtin without its own model still converts, iterates or reads its
 * Object arguments: new Date(value) runs ToPrimitive, new AggregateError and
 * a typed array or WeakMap constructor iterate theirs, new Error and new
 * ArrayBuffer read an options bag's getters, propertyIsEnumerable converts
 * its key, and a callable argument may be called. Whatever an argument
 * reaches may run at the call; a String-hint builtin (String(value)) keeps
 * its exact single conversion, and isPrototypeOf, which only walks its
 * argument's prototypes, runs nothing its argument reaches. Each generated
 * Script evaluates what the argument's method wrote; the graph must fail
 * closed or contain every source Node evaluates, and the shapes listed as
 * finite must stay finite. 256 Error constructions, each with a cause getter
 * that writes its own source, are the depth stress. */

const shapes:Record<string,string>={
 errorCause:'var g="0;";new Error("x",{get cause(){g="1;";return 1}});',
 errorMessage:'var g="0;";new Error({toString(){g="1;";return "m"}});',
 aggregateErrors:'var g="0;";new AggregateError({[Symbol.iterator](){return {next(){g="1;";return {done:true}}}}});',
 dateToPrimitive:'var g="0;";new Date({[Symbol.toPrimitive](){g="1;";return 0}});',
 dateValueOf:'var g="0;";new Date({valueOf(){g="1;";return 0}});',
 arrayBufferOptions:'var g="0;";new ArrayBuffer(1,{get maxByteLength(){g="1;";return 2}});',
 arrayBufferLength:'var g="0;";new ArrayBuffer({valueOf(){g="1;";return 1}});',
 typedArrayIterable:'var g="0;";new Uint8Array({[Symbol.iterator](){return {next(){g="1;";return {done:true}}}}});',
 weakMapIterable:'var g="0;";new WeakMap({[Symbol.iterator](){return {next(){g="1;";return {done:true}}}}});',
 dataViewOffset:'var g="0;";new DataView(new ArrayBuffer(2),{valueOf(){g="1;";return 0}});',
 stringExact:'var g="0;";String({toString(){g="1;";return "s"}});',
 primitiveArguments:'var g="1;";new Error("x");new Date(0);new ArrayBuffer(1);',
 propertyIsEnumerableKey:'var g="0;";Object.prototype.propertyIsEnumerable.call({},{toString(){g="1;";return "k"}});',
 isPrototypeOfInert:'var g="1;";Object.prototype.isPrototypeOf.call(Object.prototype,{valueOf(){g="2;"},toString(){g="3;"},get x(){g="4;"}});',
};
const finite=Object.keys(shapes);

test('a builtin without its own model reaches what its arguments reach',()=>{
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
 // Precise: the listed shapes are finite; primitive arguments and
 // isPrototypeOf add nothing Node never runs.
 expect(results.filter(result=>finite.includes(result.name)&&result.error!==null).map(result=>result.name)).toEqual([]);
 expect(results.find(result=>result.name==='primitiveArguments')!.sources).toEqual(['1;']);
 expect(results.find(result=>result.name==='isPrototypeOfInert')!.sources).toEqual(['1;']);
},120_000);

test('256 Error constructions with cause getters stay finite',()=>{
 const lines=['var g="start;";'];
 for(let index=0;index<256;index++)lines.push(`new Error("e${index}",{get cause(){g="${index};";return ${index}}});`);
 lines.push('eval(g);');
 const graph=finiteEvalScriptSourceGraph([{path:'deep.js',source:lines.join('\n')}]);
 const sources=graph.directEvalSources.map(record=>record.source);
 // Node evaluates the last getter's source; every getter's write may reach the eval.
 expect({error:graph.error,last:sources.includes('255;'),bounded:sources.length<=257}).toEqual({error:null,last:true,bounded:true});
},300_000);

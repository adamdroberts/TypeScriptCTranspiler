import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

/* Object.prototype.__proto__ is a non-enumerable accessor (Annex B, which
 * Node and Bun implement): its getter reports ToObject(this).[[Prototype]]
 * (a Proxy's getPrototypeOf trap runs), its setter ignores a value that is
 * neither an Object nor null and otherwise sets the receiver's prototype,
 * throwing TypeError for a cycle or a non-extensible receiver. An own data
 * property named __proto__ shadows it; an object literal's __proto__: sets
 * the prototype directly. Each generated Script evaluates what it read; the
 * graph must fail closed or contain every source Node evaluates, and the
 * shapes listed as finite must stay finite. 256 chained __proto__ reads down
 * a 256-deep Object.create chain are the depth stress. */

const shapes:Record<string,string>={
 getterReads:'var o={};var g=o.__proto__===Object.prototype?"1;":"2;";',
 nullPrototype:'var o=Object.create(null);var g=o.__proto__===undefined?"1;":"2;";',
 setterChanges:'var o={};o.__proto__={k:"1;"};var g=o.k;',
 setterIgnoresPrimitive:'var o={k:"1;"};o.__proto__=5;var g=o.k;',
 setterNull:'var o={};o.__proto__=null;var g=typeof o.toString==="undefined"?"1;":"2;";',
 setterCycleThrows:'var g="1;";var a={};var b=Object.create(a);try{a.__proto__=b}catch(e){g=e instanceof TypeError?"2;":"3;"}',
 frozenThrows:'var g="1;";var o=Object.preventExtensions({});try{o.__proto__={}}catch(e){g="2;"}',
 primitiveReceiver:'var g=("s").__proto__===String.prototype?"1;":"2;";',
 primitiveSetter:'var s="x";s.__proto__={};var g="1;";',
 ownDataShadows:'var o=JSON.parse(\'{"__proto__":"1;"}\');var g=o.__proto__;',
 inOperator:'var g="__proto__" in {}?"1;":"2;";',
 notEnumerable:'var g="1;";for(var k in {})if(k==="__proto__")g="2;";',
 proxyGetPrototype:'var g="0;";var p=new Proxy({},{getPrototypeOf(t){g="1;";return Object.prototype}});p.__proto__;',
 literalProto:'var o={__proto__:{k:"1;"}};var g=o.k;',
 computedProto:'var key="__proto__";var o={};o[key]={k:"1;"};var g=o.k;',
};
const finite=Object.keys(shapes).filter(name=>name!=='setterChanges'&&name!=='computedProto');

test('the __proto__ accessor reads and sets the receiver prototype',()=>{
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

test('256 chained __proto__ reads stay finite',()=>{
 const lines=['const o0={k:"1;"};'];
 for(let index=1;index<=256;index++)lines.push(`const o${index}=Object.create(o${index-1});`);
 lines.push(`eval(o256${'.__proto__'.repeat(256)}.k);`);
 const graph=finiteEvalScriptSourceGraph([{path:'deep.js',source:lines.join('\n')}]);
 expect({error:graph.error,sources:graph.directEvalSources.map(record=>record.source)}).toEqual({error:null,sources:['1;']});
},300_000);

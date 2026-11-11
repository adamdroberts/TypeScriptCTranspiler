import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

/* Array.prototype map, filter and flatMap create their result with
 * ArraySpeciesCreate: an Array receiver's "constructor" is read, its
 * @@species is read, and a species other than undefined, null or %Array% is
 * constructed and receives the elements. The getters on the way (an own or
 * inherited "constructor" accessor, a static @@species getter, a redefined
 * %Array%[@@species]) and the species constructor run user code; an object
 * that is not an Array is never asked. Each generated Script evaluates what
 * that code wrote; the graph must fail closed or contain every source Node
 * evaluates, and the shapes listed as finite must stay finite. 256 chained
 * map and filter calls over fresh arrays are the depth stress. */

const shapes:Record<string,string>={
 mapGetter:'var g="1;";class C extends Array{static get [Symbol.species](){g="2;";return Array}}new C().map(x=>x);observe(g);',
 filterGetter:'var g="3;";class C extends Array{static get [Symbol.species](){g="4;";return Array}}new C(1).filter(x=>x);observe(g);',
 flatMapGetter:'var g="5;";class C extends Array{static get [Symbol.species](){g="6;";return Array}}new C().flatMap(x=>x);observe(g);',
 speciesConstructor:'var g="7;";class D{constructor(n){g="8;"}}class C extends Array{static get [Symbol.species](){return D}}new C().map(x=>x);observe(g);',
 constructorGetter:'var g="9;";const a=[1];Object.defineProperty(a,"constructor",{get(){g="10;";return undefined}});a.map(x=>x);observe(g);',
 inheritedConstructor:'var g="11;";class C extends Array{}Object.defineProperty(C.prototype,"constructor",{get(){g="12;";return Array}});new C().filter(x=>x);observe(g);',
 arraySpeciesRedefined:'var g="13;";Object.defineProperty(Array,Symbol.species,{get(){g="14;";return Array},configurable:true});[1].map(x=>x);observe(g);',
 speciesResultElements:'class D{constructor(){}}const a=["15;"];a.constructor={[Symbol.species]:D};const r=a.map(x=>x);observe(r[0]);',
 nullSpecies:'const a=["16;"];a.constructor={[Symbol.species]:null};observe(a.map(x=>x)[0]);',
 nonConstructorSpecies:'var out="17;";const a=[1];a.constructor={[Symbol.species]:5};try{a.map(x=>x)}catch(e){out="18;"}observe(out);',
 primitiveConstructor:'var out="19;";const a=[1];a.constructor=1;try{a.filter(x=>x)}catch(e){out="20;"}observe(out);',
 arrayLikeNotAsked:'var g="21;";const o={length:1,0:"x",get constructor(){g="22;";return undefined}};Array.prototype.map.call(o,x=>x);observe(g);',
 plainArrays:'var src="23;";[1,2].map(x=>x);[1].filter(x=>x);[[1]].flatMap(x=>x);observe(src);',
 elementsKept:'observe(["24;"].map(x=>x).filter(x=>x)[0]);',
};
const finite=['speciesResultElements','nullSpecies','arrayLikeNotAsked','plainArrays','elementsKept'];

test('map, filter and flatMap run the species getters and constructor they reach',()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];vm.runInNewContext(source,{observe:value=>seen.push(value)});out.push(seen)}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>shapes[name]))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const results=names.map((name,index)=>{
  const graph=finiteEvalScriptSourceGraph([{path:'main.js',source:shapes[name]!.replaceAll('observe(','eval(')}]);
  return {name,error:graph.error,sources:graph.directEvalSources.map(record=>record.source),node:observed[index]!};
 });
 // Sound: a finite graph contains every source Node evaluates.
 expect(results.filter(result=>result.error===null&&!result.node.every(value=>result.sources.includes(value)))).toEqual([]);
 // Precise: the listed shapes are finite.
 expect(results.filter(result=>finite.includes(result.name)&&result.error!==null).map(result=>result.name)).toEqual([]);
},120_000);

test('256 chained map and filter calls stay finite',()=>{
 const lines=['const a0=["25;"];'];
 for(let index=1;index<=256;index++)lines.push(`const a${index}=a${index-1}.map(x=>x).filter(x=>x);`);
 lines.push('eval(a256[0]);');
 const graph=finiteEvalScriptSourceGraph([{path:'deep.js',source:lines.join('\n')}]);
 expect({error:graph.error,sources:graph.directEvalSources.map(record=>record.source)}).toEqual({error:null,sources:['25;']});
},300_000);

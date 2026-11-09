import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

/* Every language protocol that runs a program-defined member while it
 * evaluates (conversions, iteration, getters, setters, key conversion, JSON
 * hooks, thenables, @@hasInstance) keeps that member's effects in the source
 * graph, whether or not the object's shape may have been changed by unknown
 * code first (a RegExp-protocol String method on a primitive is an opaque
 * call). Each member writes a local binding that a later direct eval reads:
 * the graph must fail closed or contain every source Node evaluates. One
 * generated program per (prefix, use) pair covers the partition; a 128-deep
 * chain of spread and rest-pattern steps over a generator is the depth
 * stress (each step re-iterates an Array of unrepresented length). */

const uses:Record<string,string>={
 toJSON:'const o={toJSON(){src="2;";return 1}};JSON.stringify(o);',
 nestedToJSON:'const o={a:{toJSON(){src="2;";return 1}}};JSON.stringify(o);',
 forOf:'const o={[Symbol.iterator](){src="2;";return [][Symbol.iterator]()}};for(const v of o);',
 arraySpread:'const o={[Symbol.iterator](){src="2;";return [][Symbol.iterator]()}};[...o];',
 arraySpreadUsed:'const o={[Symbol.iterator](){src="2;";return [][Symbol.iterator]()}};const a=[1,...o];a.length;',
 arrayFrom:'const o={[Symbol.iterator](){src="2;";return [][Symbol.iterator]()}};Array.from(o);',
 bindingPattern:'const o={[Symbol.iterator](){src="2;";return [][Symbol.iterator]()}};const [x]=o;',
 assignmentPattern:'const o={[Symbol.iterator](){src="2;";return [][Symbol.iterator]()}};let x;[x]=o;',
 parameterPattern:'const o={[Symbol.iterator](){src="2;";return [][Symbol.iterator]()}};(function([x]){})(o);',
 restPattern:'const o={[Symbol.iterator](){src="2;";return [][Symbol.iterator]()}};const [...r]=o;',
 getter:'const o={get x(){src="2;";return 1}};o.x;',
 objectPattern:'const o={get a(){src="2;";return 1}};const {a}=o;',
 objectSpread:'const o={get a(){src="2;";return 1}};({...o});',
 assign:'const o={get a(){src="2;";return 1}};Object.assign({},o);',
 setter:'const o={set x(v){src="2;"}};o.x=1;',
 thenable:'const o={then(r){src="2;";r(1)}};Promise.resolve(o);',
 hasInstance:'const o={[Symbol.hasInstance](){src="2;";return true}};({}) instanceof o;',
 memberKey:'const k={toString(){src="2;";return "a"}};const t={};t[k]=1;',
 inKey:'const k={toString(){src="2;";return "a"}};k in {};',
 stringCall:'const o={toString(){src="2;";return ""}};String(o);',
 addition:'const o={toString(){src="2;";return ""}};o+"";',
 template:'const o={toString(){src="2;";return ""}};`${o}`;',
 unaryPlus:'const o={valueOf(){src="2;";return 1}};+o;',
 looseEquality:'const o={valueOf(){src="2;";return 1}};o==1;',
 relational:'const o={valueOf(){src="2;";return 1}};o<1;',
 toPrimitive:'({[Symbol.toPrimitive](){src="2;";return ""}}+"");',
 join:'const o={toString(){src="2;";return ""}};[o].join();',
};
const prefixes={plain:'',opaque:'"x".split("x");\n'};

test('program members run by language protocols keep their effects in the source graph',()=>{
 const entries=Object.entries(prefixes).flatMap(([prefix,code])=>Object.entries(uses).map(([use,body])=>({name:prefix+'-'+use,
  source:code+'(function(){ let src="1;"; '+body+' eval(src); })();\n',
  observed:'(function(){ let src="1;"; '+body+' __observe(src); })();'})));
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];vm.runInNewContext(source,{__observe:value=>seen.push(value)});out.push(seen)}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(entries.map(entry=>entry.observed))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const unsound=entries.flatMap((entry,index)=>{
  const graph=finiteEvalScriptSourceGraph([{path:'main.js',source:entry.source}]);
  const sources=graph.directEvalSources.map(record=>record.source);
  return graph.error===null&&!observed[index]!.every(value=>sources.includes(value))?[{name:entry.name,sources,node:observed[index]}]:[];
 });
 expect(unsound).toEqual([]);
 // Without an opaque prefix the protocol graph stays precise: a member that
 // writes nothing leaves the original source alone.
 const quiet=finiteEvalScriptSourceGraph([{path:'main.js',source:'(function(){ let src="1;"; const o={toString(){return ""}}; o+""; const [x]=[o]; eval(src); })();\n'}]);
 expect({error:quiet.error,sources:quiet.directEvalSources.map(record=>record.source)}).toEqual({error:null,sources:['1;']});
},120_000);

test('spread and destructuring keep iterator values and effects through a 128-deep chain',()=>{
 const depth=128,steps:string[]=[];
 for(let index=1;index<=depth;index++)steps.push(index%2?`const a${index}=[...a${index-1}];`:`const [...a${index}]=a${index-1};`);
 const source=`(function(){ let src="1;"; const a0={*[Symbol.iterator](){src="2;";yield "3;";}}; ${steps.join(' ')} eval(src); eval(a${depth}[0]); })();\n`;
 const graph=finiteEvalScriptSourceGraph([{path:'deep.js',source}]);
 expect(graph.error).toBeNull();
 expect(graph.directEvalSources.map(record=>record.source)).toEqual(expect.arrayContaining(['2;','3;']));
},300_000);

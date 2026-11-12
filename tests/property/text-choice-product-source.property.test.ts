import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

/* A text operation (a concatenation, a JSON text, an equality) evaluates
 * every combination of its operands' possible values. When the combinations
 * multiply past the analysis bound the result is a value the analysis does
 * not list: an eval of it fails closed, a comparison of it is either boolean,
 * and an eval elsewhere keeps its own finite source. Each generated Script
 * evaluates what it built; the graph must fail closed or contain every source
 * Node evaluates, and the shapes listed as finite must stay finite. A
 * JSON.stringify of 256 nested objects, each with a two-way property, is the
 * depth stress. */

const pick=(index:number)=>`(Math.random()<2?"${index}a":"${index}b")`;
const wideObject=(count:number)=>`{${Array.from({length:count},(_,index)=>`k${index}:${pick(index)}`).join(',')}}`;
const concatenation=(count:number)=>Array.from({length:count},(_,index)=>pick(index)).join('+');
const shapes:Record<string,string>={
 narrowJson:`var t=JSON.stringify(${wideObject(4)});observe("("+t+");");`,
 wideJson:`var t=JSON.stringify(${wideObject(24)});observe("("+t+");");`,
 wideJsonElsewhere:`var t=JSON.stringify(${wideObject(24)});observe("1;");`,
 narrowConcat:`var s=${concatenation(6)};observe(s+";");`,
 wideConcat:`var s=${concatenation(20)};observe(s+";");`,
 wideEquality:`var s=${concatenation(20)};observe(s===${concatenation(20)}?"1;":"2;");`,
};
const finite=['narrowJson','wideJsonElsewhere','narrowConcat','wideEquality'];

test('a text operation past the combination bound is a value the analysis does not list',()=>{
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
 // Precise: the listed shapes are finite; the narrow ones list every combination.
 expect(results.filter(result=>finite.includes(result.name)&&result.error!==null).map(result=>result.name)).toEqual([]);
 expect(results.filter(result=>result.name.startsWith('narrow')).map(result=>result.sources.length)).toEqual([16,64]);
 expect(results.find(result=>result.name==='wideJsonElsewhere')!.sources).toEqual(['1;']);
},300_000);

test('JSON.stringify of 256 nested two-way objects keeps an unrelated eval finite',()=>{
 let nested='"leaf"';
 for(let index=0;index<256;index++)nested=`{v:${pick(index)},n:${nested}}`;
 const graph=finiteEvalScriptSourceGraph([{path:'deep.js',source:`var t=JSON.stringify(${nested});eval("1;");`}]);
 expect({error:graph.error,sources:graph.directEvalSources.map(record=>record.source)}).toEqual({error:null,sources:['1;']});
},300_000);

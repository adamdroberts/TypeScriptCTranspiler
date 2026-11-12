import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

/* The RegExp methods read their receiver: RegExpExec (test, @@match,
 * @@matchAll, @@replace, @@search) calls an own or inherited exec that is
 * not the intrinsic one and reads the result it returns; exec converts
 * lastIndex with ToLength; @@match, @@matchAll, @@replace and @@split read
 * flags; @@split constructs through the receiver's constructor and
 * @@species. Each generated Script evaluates what those members wrote; the
 * graph must fail closed or contain every source Node evaluates, and the
 * shapes listed as finite must stay finite. 256 regular expressions with
 * their own exec are the depth stress. */

const shapes:Record<string,string>={
 testExec:'var g="0;";var re=/a/;re.exec=function(){g="1;";return null};re.test("a");',
 searchExec:'var g="0;";var re=/a/;re.exec=function(){g="1;";return null};"a".search(re);',
 replaceExec:'var g="0;";var re=/a/;re.exec=function(){g="1;";return null};"a".replace(re,"b");',
 matchAllExec:'var g="0;";var re=/a/g;re.exec=function(){g="1;";return null};[..."a".matchAll(re)];',
 execResultGetter:'var g="0;";var re=/a/;re.exec=function(){return {get 0(){g="1;";return "a"},length:1,index:0}};"a".replace(re,"b");',
 lastIndexValueOf:'var g="0;";var re=/a/g;re.lastIndex={valueOf(){g="1;";return 0}};re.exec("a");',
 flagsGetter:'var g="0;";var re=/a/;Object.defineProperty(re,"flags",{get(){g="1;";return ""}});"a".replace(re,"b");',
 splitSpecies:'var g="0;";var re=/a/;re.constructor={[Symbol.species]:function(){g="1;";return /a/}};"a".split(re);',
 inheritedExec:'var g="0;";class R extends RegExp{exec(s){g="1;";return null}}new R("a").test("a");',
 plain:'var g="1;";/a/.test("a");"a".replace(/a/,"b");/a/g.exec("a");',
};
// matchAll's iterator and split's species construction fail closed.
const finite=Object.keys(shapes).filter(name=>name!=='matchAllExec'&&name!=='splitSpecies');

test('RegExp methods read their receiver exec, lastIndex, flags and species',()=>{
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

test('256 regular expressions with their own exec stay finite',()=>{
 const lines=['var g="start;";'];
 for(let index=0;index<256;index++)lines.push(`var r${index}=/a/;r${index}.exec=function(){g="${index};";return null};r${index}.test("a");`);
 lines.push('eval(g);');
 const graph=finiteEvalScriptSourceGraph([{path:'deep.js',source:lines.join('\n')}]);
 const sources=graph.directEvalSources.map(record=>record.source);
 expect({error:graph.error,last:sources.includes('255;'),bounded:sources.length<=257}).toEqual({error:null,last:true,bounded:true});
},300_000);

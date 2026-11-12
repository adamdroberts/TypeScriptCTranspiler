import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

/* A super property reference reads and writes through the [[Prototype]] of
 * its method's home object (a class's prototype, the class itself for a
 * static element, an object literal) with `this` as the receiver: a getter
 * or setter found there runs with that `this`, and super.m() calls m with
 * it. Arrows inherit the home object. Each generated Script evaluates what
 * the reference read or wrote; the graph must fail closed or contain every
 * source Node evaluates, and the shapes listed as finite must stay finite.
 * A 64-deep class chain, each method returning super.m(), is the depth
 * stress (an explicit C.prototype.m.call(this) chain is refused at 256 as
 * well: the class-chain cost recorded in docs/todo.md). */

const shapes:Record<string,string>={
 method:'class A{m(){return "1;"}}class B extends A{m(){return super.m()}}var g=new B().m();',
 getterValue:'class A{get x(){return "1;"}}class B extends A{m(){return super.x}}var g=new B().m();',
 getterEffect:'var g="0;";class A{get x(){g="1;";return 1}}class B extends A{m(){return super.x}}new B().m();',
 getterThis:'class A{get k(){return this.v}}class B extends A{constructor(){super();this.v="1;"}m(){return super.k}}var g=new B().m();',
 setterEffect:'var g="0;";var p={set x(v){g=v}};var o={__proto__:p,m(){super.x="1;"}};o.m();',
 literalGetter:'var o={__proto__:{get x(){return "1;"}},m(){return super.x}};var g=o.m();',
 staticMethod:'class A{static s(){return "1;"}}class B extends A{static t(){return super.s()}}var g=B.t();',
 arrowField:'class A{m(){return "1;"}}class B extends A{f=()=>super.m()}var g=new B().f();',
 computedKey:'class A{m(){return "1;"}}class B extends A{n(){return super["m"]()}}var g=new B().n();',
};
const finite=Object.keys(shapes);

test('super property references go through the home object prototype with this as receiver',()=>{
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

test('a 64-deep class chain of super calls stays finite',()=>{
 const lines=['class C0{m(){return "2;"}}'];
 for(let index=1;index<=64;index++)lines.push(`class C${index} extends C${index-1}{m(){return super.m()}}`);
 lines.push('eval(new C64().m());');
 const graph=finiteEvalScriptSourceGraph([{path:'deep.js',source:lines.join('\n')}]);
 expect({error:graph.error,sources:graph.directEvalSources.map(record=>record.source)}).toEqual({error:null,sources:['2;']});
},300_000);

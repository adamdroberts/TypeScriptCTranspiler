import {expect,test} from 'bun:test';
import ts from 'typescript';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {nodeReferenceSync} from './node-reference';

/* An object or array literal that initializes a block-scoped const, whose
 * binding is only ever the base of a property access at a key the literal
 * defines as a data property, is reachable by no other code: no opaque
 * effect, whenever it runs, can change its fields. Every other route keeps
 * the object open: a method call, tagged template or prototype-chain read
 * that hands it to a getter as `this`, a delete, an array length or index
 * write, a direct eval or with in its scope, a shorthand or bare use, an
 * accessor or computed accessor in the literal, a __proto__ key, a Script's
 * top-level const. Each generated Script evaluates what it read; the graph
 * must fail closed or contain every source Node evaluates. Confined
 * literals read across opaque calls stay finite, the same shapes with a
 * bare use stay unknown, and 256 nested activations, each allocating a
 * literal before and reading it after one opaque call in the innermost, are
 * the depth stress. */

const shapes:Record<string,string>={
 protoGetter:'function f(){const o={a:"1;"};return o.b}Object.defineProperty(Object.prototype,"b",{get(){this.a="2;";leak=this;return "3;"},configurable:true});var leak;observe(f());observe(leak.a);',
 deleteThenRead:'var leak;Object.defineProperty(Object.prototype,"a",{get(){leak=this;return "2;"},configurable:true});function f(){const o={a:"1;"};delete o.a;return o.a}observe(f());',
 methodThis:'var leak;function f(){const o={a:"1;",m(){leak=this}};o.m();leak.a="2;";return o.a}observe(f());',
 parenCallee:'var leak;function f(){const o={a:"1;",m(){leak=this}};(o.m)();leak.a="2;";return o.a}observe(f());',
 taggedThis:'var leak;function f(){const o={a:"1;",m(){leak=this;return ""}};o.m`x`;leak.a="2;";return o.a}observe(f());',
 directEval:'var leak;function f(){const o={a:"1;"};eval("leak=o");leak.a="2;";return o.a}observe(f());',
 nestedEval:'var leak;function f(){const o={a:"1;"};(function(){eval("leak=o")})();leak.a="2;";return o.a}observe(f());',
 shorthand:'function f(){const o={a:"1;"};const p={o};p.o.a="2;";return o.a}observe(f());',
 arrayLength:'Object.defineProperty(Array.prototype,"0",{get(){return "2;"},configurable:true});function f(){const o=["1;"];o.length=0;return o[0]}observe(f());',
 arrayHole:'Object.defineProperty(Array.prototype,"0",{get(){return "2;"},configurable:true});function f(){const o=[,"1;"];return o[0]}observe(f());',
 literalGetter:'var g="1;";function f(){const o={get a(){return g}};return o.a}g="2;";observe(f());',
 computedAccessor:'var k="a";function f(){const o={a:"1;",get [k](){return "2;"}};return o.a}observe(f());',
 protoKey:'function f(){const o={__proto__:{a:"2;"}};return o.a}observe(f());',
 globalTopLevel:'const o={a:"1;"};function mutate(){o.a="2;"}mutate();observe(o.a);',
 closureWrite:'var w;function f(){const o={a:"1;"};w=v=>{o.a=v};w("2;");return o.a}observe(f());',
 destructureWrite:'function f(){const o={a:"1;"};[o.a]=["2;"];return o.a}observe(f());',
 ownSetterIgnored:'var leak;Object.defineProperty(Object.prototype,"a",{set(v){leak=this},configurable:true});function f(){const o={a:"1;"};o.a="2;";return o.a}observe(f());',
 generatorSuspend:'function* g(){const o={a:"1;"};yield;return o.a}const it=g();it.next();Object.prototype.a="2;";observe(it.next().value);',
 switchScope:'function f(x){switch(x){case 1:const o={a:"1;"};return o.a;default:return "2;"}}observe(f(1));observe(f(2));',
 spreadOverride:'var src={a:"2;"};function f(){const o={a:"1;",...src};return o.a}observe(f());',
 methodValue:'function f(){const o={m(){return "1;"}};const m=o.m;return m()}observe(f());',
};
const finite=['closureWrite','destructureWrite','ownSetterIgnored','generatorSuspend','switchScope','spreadOverride','methodValue'];

function evaluated(source:string):(readonly string[]|null)[]{
 const options:ts.CompilerOptions={noLib:true,allowJs:true,noEmit:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);
 host.getSourceFile=file=>file==='/model.js'?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>file==='/model.js'?source:undefined;host.fileExists=file=>file==='/model.js';
 return sourceEvaluationInvocations(ts.createProgram(['/model.js'],options,host),{roots:['/model.js']}).map(call=>call.choices);
}

test('every route that exposes a literal keeps it open; confined literals stay finite',()=>{
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

test('confined literals read across opaque calls stay finite; a bare use keeps them open',()=>{
 const confined=[
  "function f(){const o={s:'1;'};opaque();return o.s}eval(f());",
  "function f(){const o=['2;'];opaque();return o[0]}eval(f());",
  "function f(){const o={s:'3;'};return ()=>o.s}const read=f();opaque();eval(read());",
  "opaque();{let out;for(let i=0;i<2;i++){const o={s:'5;'};out=o.s}eval(out)}",
 ];
 for(const source of confined)expect({source,choices:evaluated(source)}).toEqual({source,choices:[[source.match(/'(\d+;)'/)![1]!]]});
 for(const source of confined.map(source=>source.replace(/(const o=(?:\{[^}]*\}|\[[^\]]*\]);)/,'$1void [o];')))
  expect({source,unknown:evaluated(source).includes(null)}).toEqual({source,unknown:true});
},120_000);

test('256 nested activations of confined literals around one opaque call stay finite',()=>{
 const lines=['(function(){function f0(){opaque()}'];
 for(let index=1;index<=256;index++)lines.push(`function f${index}(){const o={s:'6;'};f${index-1}();return o.s}`);
 lines.push('eval(f256());})();');
 expect(evaluated(lines.join('\n'))).toEqual([['6;']]);
},300_000);

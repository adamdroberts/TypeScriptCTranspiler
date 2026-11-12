import {expect,test} from 'bun:test';
import ts from 'typescript';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {nodeReferenceSync} from './node-reference';

/* A name a function declaration binds follows ECMAScript's scopes, not the
 * checker's symbols: a block's function declarations are that block's
 * binding (its last one the value), a var scope's parameters, vars and
 * top-level function declarations share one binding (the last declaration
 * its initial value), and a sloppy block function also stores its block's
 * binding into the var scope's when it is evaluated (B.3.2.1, and a
 * Script's global object property by B.3.2.2). Each shape computes `s`
 * through such a name inside a Script, an ordinary function and a strict
 * function; the graph must fail closed or contain every source Node
 * evaluates, with Script roots and without, and the shapes listed as exact
 * must evaluate exactly what Node evaluates. 256 nested blocks, each
 * declaring the name, are the depth stress. */

const shapes:Record<string,{body:string;sloppy?:true}>={
 twoFunctions:{body:'function f(){return "1;"}function f(){return "2;"}s=f();'},
 varAfterFunction:{body:'var f=function(){return "1;"};function f(){return "2;"}s=f();'},
 readBeforeVar:{body:'s=f();var f=function(){return "1;"};function f(){return "2;"}'},
 twoBlocksOutside:{body:'{function f(){return "1;"}}{function f(){return "2;"}}s=f();'},
 twoBlocksInside:{body:'{function f(){return "1;"}}{function f(){return "2;"}s=f();}'},
 beforeEvaluation:{body:'try{f()}catch(e){s="3;"}{function f(){}}'},
 letOutside:{body:'let f=function(){return "1;"};{function f(){return "2;"}s=f();}'},
 caseBlock:{body:'switch(1){case 0:function f(){return "1;"}case 1:s=f();}'},
 ifClause:{body:'if(true)function f(){return "1;"};s=f();',sloppy:true},
 closure:{body:'{function f(){return "1;"}function g(){return f()}s=g();}'},
 blockAssignment:{body:'{function f(){return "1;"}f=function(){return "2;"}}s=f();'},
 globalProperty:{body:'{function f(){return "1;"}}s=globalThis.f();'},
 topThenBlock:{body:'function f(){return "1;"}{function f(){return "2;"}}s=f();'},
 parameterBlockInside:{body:'(function(f){{function f(){return "2;"}s=f();}})(function(){return "1;"});'},
 parameterBlockOutside:{body:'(function(f){{function f(){return "2;"}}s=f();})(function(){return "1;"});'},
 parameterDefault:{body:'function f(){return "1;"}(function(a=f()){s=a;function f(){return "2;"}})();'},
};
const exact=['twoFunctions','twoBlocksInside','letOutside','caseBlock','closure','parameterBlockInside','parameterDefault'];
const wrappers:Record<string,(body:string)=>string>={
 script:body=>`var s="0;";${body}OUT(s);`,
 function:body=>`function o(){var s="0;";${body}return s}OUT(o());`,
 strict:body=>`function o(){"use strict";var s="0;";${body}return s}OUT(o());`,
};
function program(source:string):ts.Program {
 const name='source.js',options={allowJs:true,noLib:true,target:ts.ScriptTarget.ESNext};
 const host=ts.createCompilerHost(options);host.getSourceFile=file=>file===name?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>file===name?source:undefined;host.fileExists=file=>file===name;return ts.createProgram([name],options,host);
}

test('a function declaration binds what ECMAScript scoping gives it',()=>{
 const cases=Object.entries(shapes).flatMap(([name,shape])=>Object.entries(wrappers).filter(([wrapper])=>!(shape.sloppy&&wrapper==='strict')).map(([wrapper,wrap])=>({name,wrapper,source:wrap(shape.body)})));
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];try{vm.runInNewContext(source,{observe:value=>seen.push(value)})}catch{}out.push(seen)}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(cases.map(entry=>entry.source.replaceAll('OUT(','observe(')))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const results=cases.map((entry,index)=>{
  const source=entry.source.replaceAll('OUT(','eval(');
  const graph=finiteEvalScriptSourceGraph([{path:'main.js',source}]);
  const plain=sourceEvaluationInvocations(program(source));
  return {...entry,error:graph.error,sources:graph.directEvalSources.map(record=>record.source).sort(),plain:plain.map(call=>call.choices),node:observed[index]!};
 });
 // Sound with Script roots and without (where a file without Script roots
 // has no global object properties for its declarations): a finite graph
 // contains every source Node evaluates.
 expect(results.filter(result=>result.error===null&&!result.node.every(value=>result.sources.includes(value))).map(({name,wrapper,sources,node})=>({name,wrapper,sources,node}))).toEqual([]);
 expect(results.filter(result=>result.name!=='globalProperty'&&!result.plain.every(choices=>choices===null||result.node.every(value=>choices.includes(value)))).map(({name,wrapper,plain,node})=>({name,wrapper,plain,node}))).toEqual([]);
 // Precise: every shape that reaches its eval is finite (a name strict code
 // leaves unresolved is a global the host may supply); the exact ones
 // evaluate what Node evaluates besides s's initial "0;" (a write inside a
 // case or a callee does not hide it).
 expect(results.filter(result=>result.node.length&&result.error!==null).map(({name,wrapper,error})=>({name,wrapper,error}))).toEqual([]);
 expect(results.filter(result=>exact.includes(result.name)&&JSON.stringify(result.sources.filter(source=>source!=='0;'))!==JSON.stringify([...result.node].sort())).map(({name,wrapper,sources,node})=>({name,wrapper,sources,node}))).toEqual([]);
},300_000);

test('256 nested blocks declaring one name keep each reference to its own block',()=>{
 let body='s=f();';
 for(let index=255;index>=0;index--)body=`{function f(){return "${index};"}${body}}`;
 const inner=finiteEvalScriptSourceGraph([{path:'deep.js',source:`var s="";${body}eval(s);`}]);
 expect({error:inner.error,sources:inner.directEvalSources.map(record=>record.source)}).toEqual({error:null,sources:['255;']});
 // Only the outermost declaration is B.3.2.1's: a var f inside a block that
 // declares f lexically would be an early error. (Bun and the native
 // runtime give "0;"; V8 stores every nested declaration.)
 const outer=finiteEvalScriptSourceGraph([{path:'deep.js',source:`var s="";${body}eval(f());`}]);
 expect({error:outer.error,sources:outer.directEvalSources.map(record=>record.source)}).toEqual({error:null,sources:['0;']});
},300_000);

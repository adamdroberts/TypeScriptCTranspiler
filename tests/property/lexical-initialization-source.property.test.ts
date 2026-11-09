import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

/* A lexical declaration without an initializer (`let x;`) initializes its
 * binding to undefined when the declaration is evaluated. Reads before any
 * write, logical assignments that name an anonymous function after the
 * binding, writes in closures, loops and switch cases all start from that
 * undefined. Each generated program evaluates the text of what it read; the
 * graph must fail closed or contain every source Node evaluates, and the
 * straight-line forms must stay finite. A 256-deep chain of blocks, each
 * declaring a binding without an initializer and writing it from the
 * enclosing one, is the depth stress. */

const shapes:Record<string,string>={
 readBeforeWrite:'{let x;observe(String(x));}',
 functionScope:'function f(){let x;return String(x);}observe(f());',
 orAssign:'{let fn;fn||=function(){};observe("\'"+fn.name+"\'");}',
 andAssign:'{let fn;fn&&=function(){};observe(String(fn));}',
 nullishAssign:'{let fn;fn??=function(){};observe("\'"+fn.name+"\'");}',
 laterWrite:'{let x;x="1;";observe(x);}',
 closureWrite:'{let x;function set(){x="2;";}set();observe(x);}',
 uncalledClosure:'{let x;function set(){x="2;";}observe(String(x));}',
 loopFresh:'for(let index=0;index<2;index++){let x;if(index)x="3;";observe(String(x));}',
 switchCase:'switch(1){case 1:let x;observe(String(x));}',
 typeofRead:'{let x;observe(typeof x);}',
 forOfHead:'for(let item of ["4;"])observe(item);',
};

test('lexical declarations without initializers start as undefined',()=>{
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
 // Precise: every shape here is finite.
 expect(results.filter(result=>result.error!==null).map(result=>result.name)).toEqual([]);
},120_000);

test('a 256-deep chain of uninitialized block bindings stays finite',()=>{
 const depth=256;let source='let x0;x0="5;";';
 for(let index=1;index<=depth;index++)source+=`{let x${index};x${index}=x${index-1};`;
 source+=`eval(x${depth});`+'}'.repeat(depth)+'\n';
 const graph=finiteEvalScriptSourceGraph([{path:'deep.js',source}]);
 expect({error:graph.error,sources:graph.directEvalSources.map(record=>record.source)}).toEqual({error:null,sources:['5;']});
},300_000);

import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

/* A label on a function declaration (B.3.1) changes no scope: a Script's or a
 * function body's labelled function is one of its top-level declarations,
 * initialized on entry, and a labelled function in a sloppy block or case is
 * that block's lexical declaration and, through B.3.2, its var scope's
 * binding once evaluated. The native program and the source analysis must
 * both see that. One sloppy Script exercises a Script, a function body, a
 * block, a case clause, nested labels, last-declaration selection, a
 * shadowing let or parameter, closures and a direct eval against Node 26
 * running it as a global Script (Bun does not initialize a labelled
 * top-level function on entry); each analysis shape must evaluate exactly the
 * source Node does. 256 labels on one block function are the depth stress. */

const labels=(count:number)=>Array.from({length:count},(_,index)=>`a${index}:`).join(' ');
const script=`print("top-before:" + typeof g0);
l0: function g0() { return "g0"; }
print("top:" + g0() + ":" + Object.getOwnPropertyDescriptor(globalThis, "g0").configurable);
print("annexB-before:" + typeof g1);
{ l1: function g1() { return "g1"; } print("inside:" + g1()); }
print("annexB-after:" + g1() + ":" + Object.getOwnPropertyDescriptor(globalThis, "g1").configurable);
switch (1) { case 1: a: b: function g2() { return "g2"; } }
print("case:" + g2());
print("function:" + (function () {
  var out = [typeof h0, typeof h1];
  l: function h0() { return "h0"; }
  { m: function h1() { return "h1"; } out.push(h1()); }
  out.push(h0(), typeof h1);
  return out.join(",");
})());
print("last:" + (function () { a: function k() { return 1; } b: function k() { return 2; } return k(); })());
print("let:" + (function () { let n = "let"; { l: function n() {} } return typeof n; })());
print("parameter:" + (function (p) { { l: function p() {} } return typeof p; })(1));
print("closure:" + (function () { var x = "x"; { l: function c() { return x; } } x = "y"; return c(); })());
print("capture:" + (function () { var r = function () { return typeof q; }; var before = r(); { l: function q() {} } return before + ":" + r(); })());
print("recursive:" + (function () { { l: function fact(n) { return n < 2 ? 1 : n * fact(n - 1); } } return fact(5); })());
print("eval:" + eval("{ l: function e1() { return 'e1'; } } e1()") + ":" + typeof e1);
{ ${labels(256)} function deep() { return "deep"; } }
print("stress:" + deep());
`;

test('a labelled function declaration binds what the bare declaration binds',async()=>{
 const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");globalThis.print=value=>fs.writeSync(1,String(value)+"\\n");vm.runInThisContext(process.argv[1]);',script],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});
 const expected=reference.stdout.toString();
 expect(expected.split('\n').filter(line=>line.startsWith('top-before:')||line.startsWith('stress:'))).toEqual(['top-before:function','stress:deep']);
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-labelled-function-'));
 try{
  for(const noGc of [false,true]){
   const entry=path.join(directory,'subject.js'),output=path.join(directory,`subject-${noGc}`),diagnostics:string[]=[];
   await fs.writeFile(entry,script);
   const result=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],
    test262Observation:{kind:'test262-native-observation',scenarioId:'property/labelled-function.js#script',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},
    diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({noGc,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,exitCode:0,stderr:''});
   const observed=parseHostObservation(JSON.parse(native.stdout.toString()));
   expect({noGc,kind:observed.kind,stdout:observed.stdout}).toEqual({noGc,kind:'normal',stdout:expected});
  }
 }finally{await fs.rm(directory,{recursive:true,force:true});}
},600_000);

const shapes:Record<string,string>={
 block:'{ l: function f() { return "1;"; } } eval(f());',
 caseClause:'switch (1) { case 1: l: function f() { return "2;"; } } eval(f());',
 nested:'{ a: b: function f() { return "3;"; } } eval(f());',
 functionBlock:'(function () { { l: function f() { return "4;"; } } eval(f()); })();',
 functionTop:'(function () { eval(f()); l: function f() { return "5;"; } })();',
 scriptTop:'eval(f()); l: function f() { return "6;"; }',
 stress:`{ ${labels(256)} function f() { return "7;"; } } eval(f());`,
};

test('the source analysis sees through a function declaration\'s labels',()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];vm.runInNewContext(source,{observe:value=>seen.push(value)});out.push(seen)}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>shapes[name]!.replaceAll('eval(','observe(')))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const results=names.map((name,index)=>{
  const graph=finiteEvalScriptSourceGraph([{path:'main.js',source:shapes[name]!}]);
  return {name,error:graph.error,sources:graph.directEvalSources.map(record=>record.source).sort(),node:observed[index]!};
 });
 expect(results.filter(result=>result.error!==null||JSON.stringify(result.sources)!==JSON.stringify([...result.node].sort()))
  .map(({name,error,sources,node})=>({name,error,sources,node}))).toEqual([]);
},300_000);

import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

/* An indirect eval resolves the free names of its code in the callee's
 * Realm, and one source text is analysed once for every Realm that evaluates
 * it. A reference the evaluated code only reads must not count as a write of
 * that Realm's binding: an undeclared name stays unresolved there (a
 * ReferenceError under the Test262 host) instead of an unknown value that the
 * shared completion would hand to every caller. Each generated Script
 * evaluates what a Realm's eval returned; the graph must fail closed or contain
 * every source Node evaluates, and each shape must be finite. 128 Realms, each
 * created at its own site, evaluating the same source that only the first one
 * declares, are the depth stress. */

const shapes:Record<string,string>={
 sharedUndeclared:'const a=$262.createRealm().global,b=$262.createRealm().global;a.source="1;";observe(a.eval("source"));try{b.eval("source")}catch(error){observe("2;")}',
 readThenWrite:'const a=$262.createRealm().global;try{a.eval("mark")}catch(error){}a.eval("mark=\'3;\'");observe(a.eval("mark"));',
 functionCaller:'function read(realm){return realm.eval("source")}const a=$262.createRealm().global;a.source="4;";observe(read(a));try{read($262.createRealm().global)}catch(error){observe("5;")}',
 typeofForeign:'const a=$262.createRealm().global;observe(a.eval("typeof missing===\'undefined\'?\'6;\':\'7;\'"));',
 writeInOther:'const a=$262.createRealm().global,b=$262.createRealm().global;a.eval("value=\'8;\'");observe(a.eval("value"));try{b.eval("value")}catch(error){observe("9;")}',
 callerRealm:'var source="10;";const a=$262.createRealm().global;try{a.eval("source")}catch(error){}observe((0,eval)("source"));',
};

test('code a Realm only reads leaves its undeclared names unresolved',()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];globalThis.observe=value=>seen.push(value);globalThis.$262={createRealm(){return{global:vm.runInNewContext("globalThis")}}};vm.runInThisContext(source);out.push(seen)}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>`{${shapes[name]}}`))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const results=names.map((name,index)=>{
  const graph=finiteEvalScriptSourceGraph([{path:'main.js',source:shapes[name]!.replaceAll('observe(','eval(')}],[],'test262');
  return {name,error:graph.error,sources:graph.directEvalSources.map(record=>record.source),node:observed[index]!};
 });
 expect(results.filter(result=>result.error===null&&!result.node.every(value=>result.sources.includes(value)))).toEqual([]);
 expect(results.filter(result=>result.error!==null).map(result=>result.name)).toEqual([]);
},120_000);

test('128 Realms evaluating one source that only the first declares stay finite',()=>{
 const lines=['const r0=$262.createRealm().global;r0.source="11;";'];
 for(let index=1;index<128;index++)lines.push(`const r${index}=$262.createRealm().global;try{r${index}.eval("source")}catch(error){}`);
 lines.push('eval(r0.eval("source"));');
 const graph=finiteEvalScriptSourceGraph([{path:'deep.js',source:lines.join('\n')}],[],'test262');
 expect({error:graph.error,sources:graph.directEvalSources.map(record=>record.source)}).toEqual({error:null,sources:['11;']});
},300_000);

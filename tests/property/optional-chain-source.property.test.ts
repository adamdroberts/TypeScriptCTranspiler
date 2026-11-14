import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

// An OptionalChain is undefined when the base of any `?.` link is null or
// undefined, and the rest of the chain is not evaluated; otherwise each link
// reads, indexes or calls its non-nullish base. The source a direct eval of
// the chain's value evaluates must be among the proven ones.
const bases:Record<string,string>={
 null:'null',
 undefined:'undefined',
 field:'({p:"1;"})',
 nested:'({p:{q:"2;"}})',
 method:'({m(){return "3;"},p:{q:"4;"}})',
 maybe:'(Math.random()<2?{p:{q:"5;"},m(){return "6;"}}:null)',
};
const forms:Record<string,(base:string)=>string>={
 property:base=>`${base}?.p`,
 deep:base=>`${base}?.p?.q`,
 element:base=>`${base}?.["p"]`,
 call:base=>`${base}?.m?.()`,
 parenthesized:base=>`(${base}?.p)`,
 callee:base=>`(${base}?.m)?.call(${base})`,
};
function reference(source:string):string{
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30_000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});return node.stdout.toString().trimEnd();
}
function sources(source:string):string[]|null{
 const graph=finiteEvalScriptSourceGraph([{path:'main.js',source}]);
 return graph.error===null?graph.directEvalSources.map(entry=>entry.source).sort():null;
}
test('optional chains short-circuit to undefined on a nullish link base',()=>{
 for(const [baseName,base] of Object.entries(bases))for(const [formName,form] of Object.entries(forms)){
  const source=`const v=${form(base)};const text=JSON.stringify(String(v));print(text);eval(text);`;
  const actual=reference(source),found=sources(source),label={baseName,formName};
  expect({...label,sound:found===null||found.includes(actual)}).toEqual({...label,sound:true});
 }
 // A nullish base gives exactly undefined; a known object reads through.
 expect(sources('var a=null;eval(String(a?.b));')).toEqual(['undefined']);
 expect(sources('var a=undefined;eval(String(a?.()));')).toEqual(['undefined']);
 expect(sources('var a={b:"7;"};eval(a?.b);')).toEqual(['7;']);
 // The chain's outer expression always completes: a generator returning a
 // short-circuited call finishes without yielding, a key after a nullish
 // base is not evaluated, and a base that throws ends the chain.
 for(const source of [
  'var root=null;function* g(){return root?.m(yield "8;");}var it=g(),first=it.next();const text=JSON.stringify(String(first.value)+first.done);print(text);eval(text);',
  'var root=null,k="9;";root?.[k=String(Math.random())];print(k);eval(k);',
  'var root=null,s="10;";try{root.m?.(s=String(Math.random()))}catch{}print(s);eval(s);',
 ]){const found=sources(source),actual=reference(source);expect({source,sound:found===null||found.includes(actual)}).toEqual({source,sound:true});}
 expect(sources('var root=null,k="9;";root?.[k=String(Math.random())];eval(k);')).toEqual(['9;']);
 // One stress: 64 `?.` links over a nested object ending in null.
 const depth=64,object='{p:'.repeat(depth)+'null'+'}'.repeat(depth),chain='o'+'?.p'.repeat(depth+1);
 const stress=`const o=${object};const text=JSON.stringify(String(${chain}));print(text);eval(text);`;
 const found=sources(stress);expect(found===null||found.includes(reference(stress))).toBe(true);
},300_000);

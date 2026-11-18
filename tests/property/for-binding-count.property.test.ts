import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import {createEcmaSourceFile} from '../../src/ecmascript-source';
import {earlyControlFlowStaticSemanticsFailure} from '../../src/control-static-semantics';

// ForInOfStatement heads admit `var ForBinding` or one ForDeclaration: the
// grammar names exactly one binding. TypeScript's parser accepts a list and
// leaves the error to its checker, so the control static semantics own it.
// Partitions: head (in, of, await-of) x declaration (var, let, const) x
// binding form (identifier, object pattern, array pattern) x count (1, 2).
// The stress is a 128-binding head. Node's parser is the oracle.
const wide=128;
const heads=['in','of','await'] as const;
const kinds=['var','let','const'] as const;
const forms:Record<string,(index:number)=>string>={identifier:index=>`x${index}`,object:index=>`{x${index}}`,array:index=>`[x${index}]`};
const sources:string[]=[];
for(const head of heads)for(const kind of kinds)for(const form of Object.values(forms))for(const count of [1,2,wide]){
 const bindings=Array.from({length:count},(_,index)=>form(index)).join(', ');
 const loop=head==='await'?`for await (${kind} ${bindings} of []) ;`:`for (${kind} ${bindings} ${head} ${head==='in'?'{}':'[]'}) ;`;
 sources.push(head==='await'?`async function f() { ${loop} }`:loop);
}

test('a for-in/of head declares exactly one binding, matching Node',()=>{
 const oracle=`const vm=require('node:vm');for(const source of JSON.parse(process.argv[1])){let valid=true;try{new vm.Script(source)}catch(e){valid=!(e instanceof SyntaxError)}console.log(valid)}`;
 const reference=nodeReferenceSync(['node','-e',oracle,JSON.stringify(sources)],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});
 const expected=reference.stdout.toString().trim().split('\n').map(line=>line==='true');
 const actual=sources.map(source=>{
  const file=createEcmaSourceFile('main.js',source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,'script');
  const parse=(file as ts.SourceFile&{parseDiagnostics?:readonly ts.Diagnostic[]}).parseDiagnostics??[];
  return parse.length===0&&!earlyControlFlowStaticSemanticsFailure(file);
 });
 expect(sources.map((source,index)=>({source,valid:actual[index]}))).toEqual(sources.map((source,index)=>({source,valid:expected[index]})));
 // The oracle partitions both outcomes.
 expect(new Set(expected)).toEqual(new Set([true,false]));
});

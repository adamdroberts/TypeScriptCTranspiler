import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createEcmaSourceFile} from '../../src/ecmascript-source';
import {earlyFunctionStaticSemanticsFailure} from '../../src/function-static-semantics';
import {earlyControlFlowStaticSemanticsFailure} from '../../src/control-static-semantics';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

// A for head's `let` is the LexicalDeclaration keyword only when a
// BindingIdentifier or BindingPattern follows it; otherwise (and always when
// escaped) it is an IdentifierReference, which strict code rejects and a
// for-of head excludes by lookahead. Each token that can follow `let` is one
// partition, under every head kind and both strictness contexts.
const follows=['',' = 3',' / 2',' instanceof Object','.x','[0]','(0)',' x',' yield',' let',' {a} = {}',' [a] = []','\nx'];
const heads:Record<string,(lhs:string)=>string>={
 for:lhs=>`for (${lhs}; false; ) ;`,
 in:lhs=>`for (${lhs} in o) ;`,
 of:lhs=>`for (${lhs} of []) ;`,
 awaitOf:lhs=>`async function f(){for await (${lhs} of []) ;}`,
};
const spellings=['let','l\\u0065t'];
function accepted(source:string):boolean{
 const file=createEcmaSourceFile('/for-head.js',source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,'script') as ts.SourceFile&{parseDiagnostics?:readonly ts.Diagnostic[]};
 return !(file.parseDiagnostics??[]).length&&earlyFunctionStaticSemanticsFailure(file)===null&&earlyControlFlowStaticSemanticsFailure(file)===null;
}
test('a for head admits let as an identifier exactly where ECMAScript does',async()=>{
 const sources:string[]=[];
 for(const prologue of ['var o = {k: 1};\n','"use strict"; var o = {k: 1};\n'])for(const head of Object.values(heads))for(const spelling of spellings)for(const follow of follows)
  sources.push(prologue+head(spelling+follow));
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");fs.writeSync(1,JSON.stringify(JSON.parse(fs.readFileSync(0,"utf8")).map(s=>{try{new vm.Script(s);return true}catch{return false}})));'],{stdin:Buffer.from(JSON.stringify(sources)),stdout:'pipe',stderr:'pipe',timeout:30_000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});
 const expected:boolean[]=JSON.parse(node.stdout.toString());
 const mismatches=sources.flatMap((source,index)=>accepted(source)===expected[index]?[]:[{source,node:expected[index]}]);
 expect(mismatches).toEqual([]);
 // Both answers occur, so the comparison is not vacuous.
 expect(new Set(expected).size).toBe(2);
 // One stress: 64 nested for-in heads whose `let` is the identifier.
 expect(accepted('var let, o = {k: 1};'+'for (let in o) '.repeat(64)+';')).toBe(true);
 // The native program binds and assigns the identifier as Node does.
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-for-head-let-'));
 try{
  const program='var let, o = {k: 1}, out = [];\nlet = 1;\nfor (let; ; ) break;\nout.push(let);\nfor (let = 3; ; ) break;\nout.push(let);\nfor (let in o) ;\nout.push(let);\nfor (let.length in o) ;\nout.push(let);\nfor (let x = 5; ; ) { out.push(x); break; }\nfor (let [y] = [6]; ; ) { out.push(y); break; }\nconsole.log(out.join(","));\n';
  const reference=nodeReferenceSync(['node','-e',program],{stdout:'pipe',stderr:'pipe',timeout:30_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  const entry=join(directory,'main.js'),output=join(directory,'program'),diagnostics:string[]=[];await writeFile(entry,program);
  const built=await compile({entry,output,buildDir:join(directory,'build'),diagnosticWriter:message=>diagnostics.push(message)});
  expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:reference.stdout.toString()});
 }finally{await rm(directory,{recursive:true,force:true});}
},300_000);

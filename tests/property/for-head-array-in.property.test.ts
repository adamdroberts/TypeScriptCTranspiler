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

// ArrayLiteral elements are AssignmentExpression[+In] even inside the [~In]
// head of a for statement, so `in` there is a RelationalExpression operator.
// Parenthesized, object, function and template contexts already allow it; a
// bare `in` of the head itself is the for-in keyword.
const heads:Record<string,(pattern:string)=>string>={
 of:pattern=>`for (${pattern} of [[[]]]) {}`,
 in:pattern=>`for (${pattern} in {}) {}`,
 awaitOf:pattern=>`async function f(){for await (${pattern} of [[[]]]) {}}`,
 init:pattern=>`for (var i = ${pattern}; false;) {}`,
};
const patterns:Record<string,string>={
 element:'[x = "x" in {}]',
 nested:'[[x = "x" in {}]]',
 comparison:'[x = 1 in {} < 2]',
 template:'[x = `${"a" in {}}`]',
 property:'[x = o.in]',
 object:'{x = "x" in {}}',
 parenthesized:'[x = ("x" in {})]',
};
function parsed(source:string):{ok:boolean;ins:number}{
 const file=createEcmaSourceFile('/for-head.js',source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,'script') as ts.SourceFile&{parseDiagnostics?:readonly ts.Diagnostic[]};
 let ins=0;const pending:ts.Node[]=[file];
 while(pending.length){const node=pending.pop()!;if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.InKeyword)ins++;node.forEachChild(child=>{pending.push(child)});}
 // Parse diagnostics and the static-semantic early errors decide acceptance.
 return {ok:!(file.parseDiagnostics??[]).length&&earlyFunctionStaticSemanticsFailure(file)===null&&earlyControlFlowStaticSemanticsFailure(file)===null,ins};
}
test('an array literal in a for head admits the in operator',async()=>{
 const sources:string[]=[];
 for(const head of Object.values(heads))for(const pattern of Object.values(patterns))sources.push('var x,o={};'+head(pattern));
 // Node's parser decides acceptance; each `in` operator must survive as one.
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");fs.writeSync(1,JSON.stringify(JSON.parse(fs.readFileSync(0,"utf8")).map(s=>{try{new vm.Script(s);return true}catch{return false}})));'],{stdin:Buffer.from(JSON.stringify(sources)),stdout:'pipe',stderr:'pipe',timeout:30_000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});
 const accepted:boolean[]=JSON.parse(node.stdout.toString());
 for(const [index,source] of sources.entries()){
  const result=parsed(source),operators=(source.match(/"x" in|1 in|"a" in/g)??[]).length;
  expect({source,ok:result.ok,ins:result.ok?result.ins:operators}).toEqual({source,ok:accepted[index]!,ins:operators});
 }
 // One stress: an `in` inside 64 nested array literals of a for-of head.
 const depth=64,deep=`var x;for (${'['.repeat(depth)}x = "x" in {}${']'.repeat(depth)} of [${'['.repeat(depth)}${']'.repeat(depth)}]) {}`;
 expect(parsed(deep)).toEqual({ok:true,ins:1});
 // The native program evaluates the operator as Node does.
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-for-head-in-'));
 try{
  const program='var x,y,count=0;for ([x = "x" in {}, y = "length" in []] of [[]]) {console.log(String(x)+":"+String(y));count++;}for (var i = ["a" in {a:1}]; count<2; count++) console.log(String(i[0]));';
  const reference=nodeReferenceSync(['node','-e',program],{stdout:'pipe',stderr:'pipe',timeout:30_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  const entry=join(directory,'main.js'),output=join(directory,'program'),diagnostics:string[]=[];await writeFile(entry,program);
  const built=await compile({entry,output,buildDir:join(directory,'build'),diagnosticWriter:message=>diagnostics.push(message)});
  expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:reference.stdout.toString()});
 }finally{await rm(directory,{recursive:true,force:true});}
},300_000);

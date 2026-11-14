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

// A module's top-level await operand is parsed once as an identifier and then
// reparsed in the await context; the first parse's remnants must not survive
// into the tree or its diagnostics. Each statement form holds an AwaitExpression
// whose object-literal operand the identifier parse reads differently (a
// method named by a keyword, a computed or generator method); pairs of forms
// put one reparsed statement after another. A broken member makes a statement
// a real syntax error, which must still be reported.
const members=['function() {}','class() {}','if() {}','get() {}','[k]() {}','*g() {}','x: 1'];
const forms:Array<(member:string,index:number)=>string>=[
 (member,index)=>`var v${index} = await { ${member} };`,
 member=>`await { ${member} };`,
 (member,index)=>`({ x${index} = await { ${member} } } = {});`,
 member=>`for (await { ${member} }; false; ) ;`,
 (member,index)=>`export var e${index} = await { ${member} };`,
 member=>`if (await { ${member} }) ;`,
];
const broken=['function( {}','function() {} +','class() {'];
function ours(source:string):{ok:boolean;statements:number;awaits:number}{
 const file=createEcmaSourceFile('/main.mjs',source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,'module') as ts.SourceFile&{parseDiagnostics?:readonly ts.Diagnostic[]};
 let awaits=0;const pending:ts.Node[]=[file];
 while(pending.length){const node=pending.pop()!;if(ts.isAwaitExpression(node))awaits++;node.forEachChild(child=>{pending.push(child)});}
 const ok=!(file.parseDiagnostics??[]).length&&earlyFunctionStaticSemanticsFailure(file)===null&&earlyControlFlowStaticSemanticsFailure(file)===null;
 return {ok,statements:file.statements.length,awaits};
}
test('a reparsed top-level await statement leaves no remnant of the identifier parse',async()=>{
 const sources:string[]=[];
 for(const [a,first] of forms.entries())for(const [b,second] of forms.entries())for(const member of members){
  sources.push(`var k = "k", x0, x1;\n${first(member,0)}\n${second(member,1)}\n`);
  if(a===b)for(const fault of broken)sources.push(`var k = "k", x0, x1;\n${first(member,0)}\n${second(fault,1)}\n`);
 }
 const node=nodeReferenceSync(['node','--experimental-vm-modules','--no-warnings','-e','const fs=require("node:fs"),vm=require("node:vm");fs.writeSync(1,JSON.stringify(JSON.parse(fs.readFileSync(0,"utf8")).map(s=>{try{new vm.SourceTextModule(s);return true}catch{return false}})));'],{stdin:Buffer.from(JSON.stringify(sources)),stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});
 const accepted:boolean[]=JSON.parse(node.stdout.toString());
 const mismatches:unknown[]=[];
 for(const [index,source] of sources.entries()){
  const result=ours(source);
  if(result.ok!==accepted[index])mismatches.push({source,ours:result.ok,node:accepted[index]});
  // An accepted module keeps exactly its three statements and both awaits.
  else if(result.ok&&(result.statements!==3||result.awaits!==2))mismatches.push({source,...result});
 }
 expect(mismatches).toEqual([]);
 expect(new Set(accepted).size).toBe(2);
 // One stress: 64 reparsed statements in a row.
 const deep=Array.from({length:64},(_,index)=>`var v${index} = await { function() { return ${index}; } };`).join('\n');
 expect(ours(deep)).toEqual({ok:true,statements:64,awaits:64});
 // The native module evaluates the reparsed operands as Node does.
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-tla-reparse-'));
 try{
  const program='var c;\nvar a = await { function() { return 1; } };\nvar b = await { class() { return 2; } };\n({ c = await { if() { return 3; } } } = {});\nfor (var d = await { get() { return 4; } }; ; ) break;\nconsole.log(a.function(), b.class(), c.if(), d.get());\n';
  const entry=join(directory,'main.mjs'),output=join(directory,'program'),diagnostics:string[]=[];await writeFile(entry,program);
  const reference=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:30_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  const built=await compile({entry,output,buildDir:join(directory,'build'),diagnosticWriter:message=>diagnostics.push(message)});
  expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:reference.stdout.toString()});
 }finally{await rm(directory,{recursive:true,force:true});}
},300_000);

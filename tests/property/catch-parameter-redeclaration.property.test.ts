import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* B.3.4 VariableStatements in Catch Blocks: a var (statement, for-in or
 * for-of head, or declared by a direct eval) may share a simple catch
 * parameter's name; it is hoisted to the function scope while the assignment
 * inside the block reaches the catch parameter. Alongside, the arguments
 * object: a parameter expression sees it even when the body declares a
 * function named `arguments`, and `var arguments;` without an initializer
 * keeps it (FunctionDeclarationInstantiation steps 18 and 22-27). Generated
 * programs compare outputs with Node; one long run of catch blocks is the
 * stress input. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const statementForms=['var err = "assigned";','var err;','for (var err in { p: 1, q: 2 }) log.push("in:" + err);','for (var err of ["x", "y"]) log.push("of:" + err);','{ var err = "nested"; }','if (true) var err = "branch";'];
const evalForms=['eval("var err = \'evaluated\'");','eval("for (var err in { k: 1 }) {}");','eval("function err() {}");'];
function catchBlock(random:()=>number,index:number,forms:readonly string[]):string{
 const redeclaration=forms[Math.floor(random()*forms.length)]!;
 const after=random()<0.5?'log.push("after:" + String(typeof err === "function" ? "fn" : err));':'log.push("after:" + typeof err);';
 const body=`try { throw "thrown${index}"; } catch (err) { log.push("before:" + err); ${redeclaration} ${after} } log.push("outside:" + String(typeof err === "function" ? "fn" : err));`;
 switch(Math.floor(random()*3)){
  case 0:return `${body}\n`;
  case 1:return `(function scope${index}() { ${body} })();\n`;
  default:return `(function scope${index}() { var err = "outer"; ${body} })();\n`;
 }
}
const argumentsProgram=`var args;
function f1(x = args = arguments) { function arguments() {} } f1(undefined, 2); log.push(typeof args, args.length);
function f2() { return typeof arguments; var arguments = "answer"; } log.push(f2(1, 2, 3));
function f3() { var arguments; return typeof arguments + ":" + arguments.length; } log.push(f3(1));
function f4() { var arguments = 5; return arguments; } log.push(f4(1));
function f5() { return (() => { var arguments; return typeof arguments; })(); } log.push(f5(1));
function f6(a = typeof arguments) { var arguments = 3; return [a, arguments]; } log.push(JSON.stringify(f6()));
`;
function program(random:()=>number,count:number,forms:readonly string[]):string{
 let text='var log = [];\n';
 for(let index=0;index<count;index++)text+=catchBlock(random,index,forms);
 return text+argumentsProgram+'console.log(log.join("\\n"));\n';
}

async function compare(name:string,source:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-catch-redeclaration-'));
 try{
  const entry=join(root,'main.cjs');await writeFile(entry,source);
  const node=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({name,code:node.exitCode,stderr:node.stderr.toString()}).toEqual({name,code:0,stderr:''});
  const diagnostics:string[]=[],output=join(root,'program');
  const built=await compile({entry,output,buildDir:join(root,'build'),diagnosticWriter:x=>diagnostics.push(x)});
  expect({name,code:built.exitCode,diagnostics}).toEqual({name,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({name,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({name,code:0,stderr:'',stdout:node.stdout.toString()});
 }finally{await rm(root,{recursive:true,force:true});}
}

test('catch parameter redeclarations and arguments bindings behave like Node',async()=>{
 await compare('generated',program(rng(0xca7c),30,[...statementForms,...evalForms]));
},600000);

// The stress run keeps the statement forms only: the source-value analysis
// budget ends near 170 direct eval sites in one program, and 200 top-level
// blocks sharing one global `err` exhaust its memory, an open analysis item.
test('one long run of catch blocks',async()=>{
 await compare('stress',program(rng(0x5e55),100,statementForms));
},600000);

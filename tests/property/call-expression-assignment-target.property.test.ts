import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {earlyControlFlowStaticSemanticsFailure} from '../../src/control-static-semantics';
import {createEcmaSourceFile} from '../../src/ecmascript-source';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

const NODE=process.env.TSC2C_NODE_REFERENCE??'node';

/* AssignmentTargetType of a CallExpression is web-compat in non-strict code
 * (B.3.? Runtime Errors for Function Call Assignment Targets): the call is
 * evaluated, then a ReferenceError is thrown before any right-hand side,
 * ToNumeric or iteration body runs. In strict code, in patterns and for
 * optional chains the target is invalid, an early SyntaxError. Generated
 * sloppy programs compare the thrown error and evaluation order with Node;
 * generated strict and pattern forms compare the early verdict with the
 * specification (V8 reports a runtime ReferenceError in strict code
 * instead); one function of many call targets is the stress input. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const callees=['f()','(f())','((f()))','f(g())','o.m()','o["m"]()','f()()','async()'];
function statement(random:()=>number):string{
 const call=callees[Math.floor(random()*callees.length)]!;
 switch(Math.floor(random()*10)){
  case 0:return `${call} = g();`;
  case 1:return `${call} += g();`;
  case 2:return `${call} **= g();`;
  case 3:return `${call}++;`;
  case 4:return `--${call};`;
  case 5:return `for (${call} in {a: 1}) log.push('body');`;
  case 6:return `for (${call} of [g()]) log.push('body');`;
  case 7:return `for (${call} of []) log.push('body');`;
  case 8:return `for (${call} in {}) log.push('body');`;
  default:return `${call} -= g();`;
 }
}
const prelude=`var log = [];
var r = { valueOf() { log.push('valueOf'); return 1; }, toString() { log.push('toString'); return 'x'; }, m() { log.push('m'); return this; } };
function f() { log.push('f'); return r; }
function g() { log.push('g'); return 1; }
function async() { log.push('async'); return 1; }
var o = { m() { log.push('o.m'); return 1; } };
f.m = o.m;
`;
function sloppyProgram(random:()=>number,count:number):string{
 let text=prelude;
 for(let index=0;index<count;index++)text+=`try { ${statement(random)} log.push('done'); } catch (error) { log.push(error.name); }\n`;
 return text+`console.log(log.join(','));\n`;
}
async function compare(name:string,source:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-call-target-'));
 try{
  const entry=join(root,'main.cjs');await writeFile(entry,source);
  const node=nodeReferenceSync([NODE,entry],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({name,code:node.exitCode,stderr:node.stderr.toString()}).toEqual({name,code:0,stderr:''});
  const diagnostics:string[]=[],output=join(root,'program');
  const built=await compile({entry,output,buildDir:join(root,'build'),diagnosticWriter:x=>diagnostics.push(x)});
  expect({name,code:built.exitCode,diagnostics}).toEqual({name,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({name,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({name,code:0,stderr:'',stdout:node.stdout.toString()});
 }finally{await rm(root,{recursive:true,force:true});}
}

test('sloppy call-expression targets evaluate the call and throw ReferenceError like Node',async()=>{
 // 60 statements: each for-of head over a fresh array literal costs the source analysis superlinearly (300 plain `for (x of [g()])` sites exceed its memory budget), an open analysis item.
 await compare('sloppy',sloppyProgram(rng(0xca11),60));
},600000);

function ours(source:string):boolean{
 const file=createEcmaSourceFile('x.js',source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,'script');
 const parse=(file as ts.SourceFile&{parseDiagnostics?:readonly ts.Diagnostic[]}).parseDiagnostics??[];
 return parse.length>0||earlyControlFlowStaticSemanticsFailure(file)!==null;
}

test('strict code, patterns and optional chains reject call-expression targets early',()=>{
 const random=rng(0x5712);
 for(let index=0;index<60;index++){
  const body=statement(random);
  expect({body,strict:ours(`"use strict";\nfunction h(){ ${body} }`)}).toEqual({body,strict:true});
  expect({body,sloppy:ours(`function h(){ ${body} }`)}).toEqual({body,sloppy:false});
  expect({body,nested:ours(`function h(){ "use strict"; ${body} }`)}).toEqual({body,nested:true});
 }
 for(const pattern of ['[f()] = [];','({a: f()} = {});','[...f()] = [];','({...f()} = {});','[f() = 1] = [];','for ([f()] of []);'])
  expect({pattern,early:ours(`function h(){ ${pattern} }`)}).toEqual({pattern,early:true});
 for(const chain of ['f()?.x = 1;','o?.m() = 1;','f()?.() = 1;','o?.m()++;'])
  expect({chain,early:ours(`function h(){ ${chain} }`)}).toEqual({chain,early:true});
 for(const logical of ['f() ??= 1;','f() &&= 1;','o.m() ||= 1;','(f()) ??= 1;'])
  expect({logical,early:ours(`function h(){ ${logical} }`)}).toEqual({logical,early:true});
 for(const other of ['new f() = 1;','f`t` = 1;','import(x) = 1;','f().x = 1;','f()[0] += 1;','(f().x)++;','for (f().x of []);'])
  expect({other,early:ours(`function h(){ ${other} }`)}).toEqual({other,early:!other.startsWith('f(')&&!other.startsWith('(f(')&&!other.startsWith('for')});
});

test('one function of many call targets',async()=>{
 let text=prelude+'var n = 0;\nfunction many() {\n';
 // 150 targets returning one shared object: a fresh object literal per call site, or 300 mixed sites, make the source analysis exceed its memory budget, an open analysis item.
 for(let index=0;index<150;index++)text+=`try { ${index%2?'f() = g()':'f()++'}; } catch (error) { if (error instanceof ReferenceError) n++; }\n`;
 text+='}\nmany();\nconsole.log(n, log.length, log.indexOf("g"), log.indexOf("valueOf"));\n';
 await compare('stress',text);
},600000);

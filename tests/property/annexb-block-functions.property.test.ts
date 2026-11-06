import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* B.3.2.1 FunctionDeclarations in Blocks (non-strict function code): a
 * function declaration directly in a Block, CaseClause, DefaultClause or as
 * an IfStatement clause (B.3.3) whose name could replace a `var` without an
 * early error and is not a parameter name also gets a var binding of the
 * enclosing function, initialized to undefined at entry and set to the
 * block's function object when the declaration is evaluated. The block
 * binding and the var binding stay distinct afterwards (an assignment
 * inside the block after the declaration does not reach the var), a
 * conflicting let/const/class or parameter name suppresses the var, and
 * strict code never hoists. Generated functions compare observations with
 * Node; one function with many sequential blocks is the stress input. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
function describe(name:string):string{
 return `(() => { try { const v = ${name}; return typeof v === 'function' ? 'fn:' + v() : String(v); } catch (e) { return e.name; } })()`;
}
function block(random:()=>number,index:number):string{
 const decl=`function f() { return ${index}; }`;
 const inner=random()<0.4?`f = 'inner';`:'';
 const before=random()<0.5?`out.push('before', ${describe('f')});`:'';
 const strict=random()<0.15?'"use strict";':'';
 // A FunctionDeclaration as an IfStatement clause is itself an early error in strict code.
 const form=Math.floor(random()*(strict?4:6));
 const body=form===0?`{ ${decl} ${inner} }`:form===1?`switch (1) { case 1: ${decl} ${inner} }`:form===2?`switch (1) { default: ${decl} }`:form===3?`{ { ${decl} } ${inner} }`:form===4?`if (true) ${decl}`:`if (false) function _f() {} else ${decl}`;
 const conflict=Math.floor(random()*5);
 const prelude=conflict===1?`let f = 'let';`:conflict===2?`var f = 'var';`:conflict===3?`class f {}`:'';
 const parameter=conflict===4?'f':'';
 const closure=random()<0.3?`var g = () => ${describe('f')};`:'';
 const after=`out.push('after', ${describe('f')});`;
 const outer=random()<0.3?`f = 'outer';`:'';
 return `(function (${parameter}) { ${strict} ${prelude} ${before} ${closure} ${body} ${outer} ${after} ${closure?`out.push('closure', g());`:''} })(${parameter?`'param${index}'`:''});\n`;
}
function program(random:()=>number,count:number):string{
 let text='const out = [];\n';
 for(let index=0;index<count;index++)text+=block(random,index);
 return text+'console.log(out.join("\\n"));\n';
}
function stressProgram(count:number):string{
 let text='const out = [];\n(function () {\n out.push(String(f));\n';
 for(let index=0;index<count;index++)text+=` { function f() { return ${index}; } out.push(f()); }\n`;
 return text+' out.push(f());\n})();\nconsole.log(out.length, out[0], out[out.length - 1]);\n';
}
async function compare(name:string,source:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-annexb-functions-'));
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

test('block-level function declarations hoist a var binding exactly like Node',async()=>{
 await compare('functions',program(rng(0xb3b2),60));
},600000);

test('one function with many sequential blocks declaring the same name',async()=>{
 await compare('stress',stressProgram(300));
},600000);

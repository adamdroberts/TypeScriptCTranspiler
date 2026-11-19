import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';

/* A Script or function body may declare one name with several function
 * declarations; FunctionDeclarationInstantiation (and
 * GlobalDeclarationInstantiation) initializes the binding with the last of
 * them before any statement runs. The emitter named every top-level
 * declaration's C function after the binding, so gcc rejected the
 * redefinition, and references resolved through the checker's first
 * declaration. A module's top-level function declarations are lexically
 * scoped, so a duplicate there is an early SyntaxError.
 * Partitions: duplicate count, a call before, between and after the
 * declarations, a reference captured before a later declaration, a
 * superseded body calling the name, strict mode, the module goal, and a
 * `var` redeclaration of the name (bare, with an initializer, as a for-in or
 * for-of head, destructured from an array or an object; in a CommonJS module
 * body and in a function body). A var names the function's binding: it
 * starts as the function, and the CommonJS body emitted a second storage
 * field under the function's C name. The stress declares one
 * name 64 times. */
const stress=64;
const body=(count:number,strict:boolean,mixVar:boolean)=>{
 const lines=[strict?'"use strict";':'','const out = [];','out.push(f(), f.length, typeof f);','var early = f;'];
 for(let index=0;index<count;index++){
  lines.push(`function f(${Array.from({length:index},(_,position)=>`a${position}`).join(',')}) { return ${index === 0 ? '"first:" + (typeof g === "function" ? g() : "")' : `"d${index}"`}; }`);
  if(index===0)lines.push('function g() { return f.length; }');
  lines.push('out.push(f());');
  if(mixVar&&index===1)lines.push('var f;','out.push(f());');
 }
 if(mixVar)lines.push('var f = function () { return "assigned"; };','out.push(f(), early());');
 lines.push('console.log(out.join(","), early === f);');
 return lines.join('\n')+'\n';
};
const programs:Record<string,string>={};
for(const count of [2,3,4])for(const strict of [false,true])for(const mixVar of [false,true])programs[`n${count}${strict?'strict':'sloppy'}${mixVar?'Var':''}`]=body(count,strict,mixVar);
programs.stress=body(stress,false,false);
const varForms:Record<string,string>={bare:'var f;',initialized:'var f = function () { return "init"; };',forOf:'for (var f of [function () { return "of"; }]);',
 forIn:'for (var f in { k: 1 }); f = function () { return "in:" + "k"; };',array:'var [f] = [function () { return "array"; }];',object:'var { a: f } = { a: function () { return "object"; } };'};
for(const [form,statement] of Object.entries(varForms)){
 programs[`var_${form}`]=`console.log(typeof f, f());\nfunction f() { return "declared"; }\n${statement}\nconsole.log(f());\n`;
 programs[`varInFunction_${form}`]=`function outer() { const before = f(); function f() { return "declared"; }\n${statement}\nreturn before + ":" + f(); }\nconsole.log(outer());\n`;
}

test('a name declared by several function declarations binds the last one, as in Node',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-duplicate-functions-'));
 try{
  const mismatches:string[]=[];
  for(const [name,program] of Object.entries(programs)){
   const entry=join(directory,`${name}.js`),output=join(directory,name),diagnostics:string[]=[];
   await writeFile(entry,program);
   const reference=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:60_000});
   expect({name,code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({name,code:0,stderr:''});
   const built=await compile({entry,output,buildDir:join(directory,`build-${name}`),diagnosticWriter:message=>diagnostics.push(message)});
   if(built.exitCode!==0){mismatches.push(`${name}: compile ${built.exitCode} ${diagnostics.join('').slice(0,200)}`);continue;}
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:60_000});
   if(native.exitCode!==0||native.stdout.toString()!==reference.stdout.toString())mismatches.push(`${name}: ${native.stdout.toString()} vs ${reference.stdout.toString()}`);
  }
  expect(mismatches).toEqual([]);
 }finally{await rm(directory,{recursive:true,force:true});}
},900_000);

test('duplicate function declarations at a module top level are a SyntaxError',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-duplicate-functions-module-'));
 try{
  const entry=join(directory,'main.mjs'),diagnostics:string[]=[];
  await writeFile(entry,'function f() { return 1; }\nfunction f() { return 2; }\nconsole.log(f());\n');
  const reference=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  expect(reference.exitCode).not.toBe(0);
  expect(reference.stderr.toString()).toContain('SyntaxError');
  const built=await compile({entry,output:join(directory,'program'),buildDir:join(directory,'build'),diagnosticWriter:message=>diagnostics.push(message)});
  expect(built.exitCode).not.toBe(0);
  expect(diagnostics.join('')).toContain("LexicallyDeclaredNames contains duplicate 'f'");
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

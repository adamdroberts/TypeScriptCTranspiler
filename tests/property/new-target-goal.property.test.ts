import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {createEcmaSourceFile} from '../../src/ecmascript-source';
import {earlyFunctionStaticSemanticsFailure} from '../../src/function-static-semantics';
import {evalSourceIsValid,evalSourceRequest} from '../../src/eval-source';

// ScriptBody early error: a Script's StatementList must not Contain
// NewTarget. Arrow functions and class element keys/heritage see the
// enclosing environment; a non-arrow function, field initializer or static
// block owns its own NewTarget. Eval code is checked against its PerformEval
// context when it runs, and a CommonJS module body runs inside the loader's
// wrapper function, where NewTarget is undefined (Node).
// Partitions: position (top level, arrow, function, method, computed key,
// heritage, field initializer, static block, getter) x goal (Script, other).
// The stress is a 64-deep arrow nest.
const depth=64;
const positions:Record<string,{source:string,owned:boolean}>={
 top:{source:'new.target;',owned:false},
 arrow:{source:'(() => new.target)();',owned:false},
 deepArrow:{source:`${'(() => '.repeat(depth)}new.target${')'.repeat(depth)};`,owned:false},
 function:{source:'function f() { return new.target; }',owned:true},
 functionArrow:{source:'function f() { return () => new.target; }',owned:true},
 method:{source:'({ m() { return new.target; } });',owned:true},
 computedKey:{source:'({ [new.target]: 1 });',owned:false},
 methodKey:{source:'({ [new.target]() {} });',owned:false},
 heritage:{source:'class A extends (new.target ?? Object) {}',owned:false},
 field:{source:'class A { x = new.target; }',owned:true},
 staticBlock:{source:'class A { static { new.target; } }',owned:true},
 getter:{source:'({ get g() { return new.target; } });',owned:true},
};

test('a Script rejects NewTarget outside an owning function',()=>{
 for(const [name,{source,owned}] of Object.entries(positions))for(const script of [true,false]){
  const file=createEcmaSourceFile('main.js',source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,'script');
  const failure=earlyFunctionStaticSemanticsFailure(file,null,script);
  expect({name,script,message:failure?.message??null}).toEqual({name,script,message:script&&!owned?'new.target is only permitted in functions':null});
 }
 // $262.evalScript sources are Scripts; eval code defers to PerformEval.
 expect(evalSourceIsValid(evalSourceRequest('script','new.target;'))).toBe(false);
 expect(evalSourceIsValid(evalSourceRequest('script','function f() { return new.target; }'))).toBe(true);
});

test('a CommonJS module body reads NewTarget as undefined, matching Node',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-new-target-goal-'));
 try{
  const source=['console.log("top", typeof new.target);',
   'console.log("arrow", (() => typeof new.target)());',
   `console.log("deep", ${'(() => '.repeat(depth)}typeof new.target${')'.repeat(depth)});`,
   'function F() { return new.target === F; }',
   'console.log("function", new F() instanceof F, F());',
   'class A { x = typeof new.target; static s; static { A.s = typeof new.target; } }',
   'console.log("class", new A().x, A.s);'].join('\n')+'\n';
  const entry=join(directory,'main.js'),output=join(directory,'program'),diagnostics:string[]=[];
  await writeFile(entry,source);
  const reference=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});
  const built=await compile({entry,output,buildDir:join(directory,'build'),diagnosticWriter:message=>diagnostics.push(message)});
  expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  expect(native.stdout.toString()).toBe(reference.stdout.toString());
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

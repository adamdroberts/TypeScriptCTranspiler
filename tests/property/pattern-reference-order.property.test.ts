import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';

// A pattern element resolves its identifier target before it reads the value:
// KeyedBindingInitialization, IteratorBindingInitialization (SingleNameBinding,
// BindingRestElement) and the destructuring-assignment counterparts evaluate
// ResolveBinding / the DestructuringAssignmentTarget first, then GetV, the
// iterator step and the initializer, and PutValue stores through that one
// Reference. A `with` object whose `has` trap logs makes each resolution
// observable. Node 26 (V8) resolves at the store instead, so the expected
// orders here are derived from the spec (Test262
// keyed-destructuring-property-reference-target-evaluation-order-with-bindings).
// Partitions: element kind (keyed with and without initializer, array element
// with initializer, array rest after an elision, object rest, nested leaf) and
// form (var statement, for-of var head, assignment expression, for-of
// assignment head). The stress is one 128-wide pattern with initializers and
// one 64-deep nested pattern.
const kinds:Record<string,{pattern:string,source:string,events:string}>={
 keyedDefault:{pattern:'{ p: a = d }',source:'s',events:'has:s has:a get p has:d'},
 keyed:{pattern:'{ q: b }',source:'s',events:'has:s has:b get q'},
 arrayDefault:{pattern:'[c = d]',source:'it',events:'has:it has:c next has:d return'},
 arrayRest:{pattern:'[, ...e]',source:'it',events:'has:it next has:e next next'},
 objectRest:{pattern:'{ q: f, ...r }',source:'s',events:'has:s has:f get q has:r get p'},
 nested:{pattern:'{ q: { p: g } }',source:'s',events:'has:s get q has:g get p'},
};
const forms:Record<string,(pattern:string,source:string)=>string>={
 var:(pattern,source)=>`var ${pattern} = ${source};`,
 forOfVar:(pattern,source)=>`for (var ${pattern} of [${source}]);`,
 assign:(pattern,source)=>`(${pattern} = ${source});`,
 forOfAssign:(pattern,source)=>`for (${pattern} of [${source}]);`,
};

test('pattern targets resolve before their values are read',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-pattern-reference-order-'));
 try{
  const lines=['var log = [];',
   'var env = new Proxy({}, { has(t, k) { if (typeof k === "string") log.push("has:" + k); return false; } });',
   'var s = { get p() { log.push("get p"); return undefined; }, get q() { log.push("get q"); return { get p() { log.push("get p"); return 3; } }; } };',
   'var it = { [Symbol.iterator]() { var n = 0; return { next() { log.push("next"); return { done: n++ > 1, value: undefined }; }, return() { log.push("return"); return {}; } }; } };',
   'var d = 0;',
   'function run(name, body) { log = []; body(); console.log(name + ": " + log.join(" ")); }'];
  const expected:string[]=[];
  for(const [formName,form] of Object.entries(forms))for(const [kindName,kind] of Object.entries(kinds)){
   lines.push(`run(${JSON.stringify(`${formName} ${kindName}`)}, function () { var a, b, c, e, f, g, r; with (env) { ${form(kind.pattern,kind.source)} } });`);
   expected.push(`${formName} ${kindName}: ${kind.events}`);
  }
  const width=128,depth=64;
  const wide=Array.from({length:width},(_,i)=>`k${i}: v${i} = d`).join(', ');
  lines.push(`var w = {}; for (var i = 0; i < ${width}; i++) (function (k) { Object.defineProperty(w, k, { get() { log.push("get " + k); return undefined; } }); })("k" + i);`,
   `run("wide", function () { with (env) { var { ${wide} } = w; } });`);
  expected.push('wide: has:w '+Array.from({length:width},(_,i)=>`has:v${i} get k${i} has:d`).join(' '));
  lines.push('var deep = { get p() { log.push("get p"); return deep; } };',
   `run("deep", function () { var leaf; with (env) { var ${'{ p: '.repeat(depth)}leaf${' }'.repeat(depth)} = deep; } });`);
  expected.push(`deep: has:deep ${'get p '.repeat(depth-1)}has:leaf get p`,'');
  const entry=join(directory,'main.js'),output=join(directory,'program'),diagnostics:string[]=[];
  await writeFile(entry,lines.join('\n')+'\n');
  const built=await compile({entry,output,buildDir:join(directory,'build'),diagnosticWriter:message=>diagnostics.push(message)});
  expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  expect(native.stdout.toString().split('\n')).toEqual(expected);
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

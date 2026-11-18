import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import ts from 'typescript';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';

// Proxy [[Call]] / [[Construct]]: when GetMethod(handler, "apply"/"construct")
// is undefined the operation is exactly Call(target, thisArgument, args) or
// Construct(target, args, newTarget), so the source analysis forwards it to the
// target instead of treating the Proxy as unknown code. A Proxy is never
// %eval%, so a call through one is an indirect eval.
// Partitions: handler (no trap, trap undefined, trap null, prototype without
// the trap) x target (%eval%, function, class, receiver-returning function)
// x operation (call, construct). A present trap stays opaque and fails closed
// when it could reach %eval%. The stress is a 64-deep Proxy chain over %eval%.
const depth=64;
const program=`
globalThis.x = 'global';
function F(a) { this.a = a; }
class C { constructor(a) { this.c = a; } }
const handlers = {
  absent: () => ({}),
  undef: () => ({ apply: undefined, construct: undefined }),
  nul: () => ({ apply: null, construct: null }),
  inherited: () => Object.create({}),
};
for (const [name, make] of Object.entries(handlers)) {
  const pe = new Proxy(eval, make());
  console.log(name, 'eval', pe('1 + 1'), pe(), typeof pe);
  try { new pe(); } catch (e) { console.log(name, 'new eval', e.constructor === TypeError); }
  const pf = new Proxy(F, make()), o = new pf(3);
  console.log(name, 'F', o.a, o instanceof F, Object.getPrototypeOf(o) === F.prototype);
  const pc = new Proxy(C, make());
  console.log(name, 'C', new pc(4).c);
  try { pc(); } catch (e) { console.log(name, 'call C', e.constructor === TypeError); }
  const pa = new Proxy(function () { return this; }, make()), receiver = {};
  console.log(name, 'this', pa.call(receiver) === receiver);
}
function local() { var x = 'local'; const indirect = new Proxy(eval, {}); return indirect('x'); }
console.log('indirect', local());
let deep = eval;
for (let i = 0; i < ${depth}; i++) deep = new Proxy(deep, {});
console.log('deep', deep('2 + 3'));
`;

test('a trapless Proxy call or construct is its target operation, matching Node',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-proxy-trapless-'));
 try{
  const entry=join(directory,'main.js'),output=join(directory,'program'),diagnostics:string[]=[];
  await writeFile(entry,program);
  const reference=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});
  const built=await compile({entry,output,buildDir:join(directory,'build'),diagnosticWriter:message=>diagnostics.push(message)});
  expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  expect(native.stdout.toString()).toBe(reference.stdout.toString());
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

test('a Proxy whose trap may run code reaching %eval% fails closed',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-proxy-trap-'));
 try{
  // An unknown choice list (null) is the fail-closed unknown eval site.
  const unknownSite=async(trap:string)=>{
   const entry=join(directory,'main.js');
   await writeFile(entry,`var p = new Proxy(eval, ${trap}); p(); p("1");\n`);
   const program=ts.createProgram([entry],{allowJs:true,noLib:true});
   return sourceEvaluationInvocations(program,{roots:[entry]}).some(invocation=>invocation.choices===null);
  };
  for(const trap of ['({})','({ apply: undefined })','({ apply: null })','Object.create({})','({ get apply() { return undefined; } })'])
   expect({trap,unknown:await unknownSite(trap)}).toEqual({trap,unknown:false});
  for(const trap of ['({ apply(t, r, a) { return 1; } })','Object.create({ apply: (t, r, a) => 1 })'])
   expect({trap,unknown:await unknownSite(trap)}).toEqual({trap,unknown:true});
 }finally{await rm(directory,{recursive:true,force:true});}
});

import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* Unbounded recursion through any call shape (direct, method, arrow,
 * dynamic value, construct, apply, Reflect.apply, getter) throws a
 * RangeError at the native stack guard instead of faulting, the error is
 * catchable, and the program continues to recurse to ordinary depths
 * afterwards. Every shape runs three overflow/recovery rounds; the output
 * is compared with Node. */

const source=`
function direct(n) { return n === 0 ? 0 : 1 + direct(n - 1); }
const o = { m(n) { return n === 0 ? 0 : 1 + this.m(n - 1); } };
function viaGetter(n) { return n === 0 ? 0 : 1 + ({ get g() { return viaGetter(n - 1); } }).g; }
const arrow = n => n === 0 ? 0 : 1 + arrow(n - 1);
function viaValue(n) { const f = [viaValue][0]; return n === 0 ? 0 : 1 + f(n - 1); }
class K { constructor(n) { this.v = n === 0 ? 0 : 1 + new K(n - 1).v; } }
function viaApply(n) { return n === 0 ? 0 : 1 + viaApply.apply(null, [n - 1]); }
function viaReflect(n) { return n === 0 ? 0 : 1 + Reflect.apply(viaReflect, null, [n - 1]); }
function viaBound(n) { return n === 0 ? 0 : 1 + viaBound.bind(null)(n - 1); }
const shapes = [["direct", direct], ["method", n => o.m(n)], ["arrow", arrow], ["value", viaValue], ["construct", n => new K(n).v], ["apply", viaApply], ["reflect", viaReflect], ["bound", viaBound], ["getter", viaGetter]];
const out = [];
for (const [name, f] of shapes) {
  for (let round = 0; round < 3; round++) {
    try { f(1e8); out.push(name, "no-throw"); } catch (e) { out.push(name, e instanceof RangeError, e.name, e.message === "Maximum call stack size exceeded", e.constructor === RangeError); }
    out.push(f(300));
  }
}
console.log(JSON.stringify(out));
`;

test('stack exhaustion through every call shape throws a catchable RangeError like Node',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-stack-depth-'));
 try{
  const entry=join(root,'main.cjs');await writeFile(entry,source);
  const node=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const diagnostics:string[]=[],output=join(root,'program');
  const built=await compile({entry,output,buildDir:join(root,'build'),diagnosticWriter:x=>diagnostics.push(x)});
  expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:node.stdout.toString()});
 }finally{await rm(root,{recursive:true,force:true});}
},600000);

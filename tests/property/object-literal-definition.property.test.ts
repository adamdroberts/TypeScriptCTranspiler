import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* PropertyDefinitionEvaluation is CreateDataPropertyOrThrow: an object
 * literal defines own data properties whatever the prototype chain holds
 * (inherited accessors, non-writable data), while the non-computed,
 * non-shorthand `__proto__: value` form sets [[Prototype]] for an Object or
 * null value and is ignored otherwise (B.3.1). Alongside: IsConcatSpreadable
 * is false for every primitive even when its wrapper prototype is marked,
 * and an index store on an array's own accessor element runs the setter
 * (Array.prototype.sort writes back through it). Generated literals mix key
 * kinds and prototype interference; one wide literal is the stress input. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const keys=['0','1','7','length','name','x','__proto__2','constructor','a b','123abc'];
function literalProgram(random:()=>number,count:number):string{
 let text=`const out = [];
const describe = (o) => Object.getOwnPropertyNames(o).map(k => { const d = Object.getOwnPropertyDescriptor(o, k); return k + ':' + (d.get ? 'get' : JSON.stringify(d.value) + (d.writable ? 'w' : '') + (d.enumerable ? 'e' : '') + (d.configurable ? 'c' : '')); }).join(',') + '|' + (Object.getPrototypeOf(o) === Object.prototype ? 'OP' : Object.getPrototypeOf(o) === null ? 'null' : Object.getPrototypeOf(o) === parent ? 'parent' : '?');
const parent = { marker: 'p' };
`;
 for(let index=0;index<count;index++){
  const interference=Math.floor(random()*4);
  const key=keys[Math.floor(random()*keys.length)]!;
  const setup=interference===0?'':interference===1?`Object.defineProperty(Object.prototype, ${JSON.stringify(key)}, { get(){ out.push('get'); return 'inherited'; }, set(v){ out.push('set ' + v); }, configurable: true });`:interference===2?`Object.defineProperty(Object.prototype, ${JSON.stringify(key)}, { value: 'ro', writable: false, configurable: true });`:`Object.defineProperty(Object.prototype, ${JSON.stringify(key)}, { get(){ return 'getter-only'; }, configurable: true });`;
  const members:string[]=[];
  const memberCount=1+Math.floor(random()*4);
  for(let member=0;member<memberCount;member++){
   const roll=random();
   if(roll<0.35)members.push(`${JSON.stringify(key)}: ${index}`);
   else if(roll<0.5)members.push(`[${JSON.stringify(key)}]: 'computed'`);
   else if(roll<0.6)members.push(`${JSON.stringify(key)}() { return 'method'; }`);
   else if(roll<0.7)members.push(`get ${JSON.stringify(key)}() { return 'accessor'; }`);
   else if(roll<0.78)members.push(`__proto__: parent`);
   else if(roll<0.84)members.push(`__proto__: null`);
   else if(roll<0.9)members.push(`__proto__: ${Math.floor(random()*3)}`);
   else if(roll<0.95)members.push(`['__proto__']: 'computed-proto'`);
   else members.push(`...{ ${JSON.stringify(key)}: 'spread' }`);
  }
  // Duplicate `__proto__:` members are an early error, so keep one.
  let protoSeen=false;
  const filtered=members.filter(member=>{ if(!member.startsWith('__proto__:'))return true; if(protoSeen)return false; protoSeen=true; return true; });
  text+=`{ ${setup} const o = { ${filtered.join(', ')} }; out.push(describe(o)); ${interference?`delete Object.prototype[${JSON.stringify(key)}];`:''} }\n`;
 }
 return text+'console.log(out.join("\\n"));\n';
}

const runtimeProgram=`const out = [];
Boolean.prototype[Symbol.isConcatSpreadable] = true; String.prototype[Symbol.isConcatSpreadable] = true; Number.prototype[Symbol.isConcatSpreadable] = true;
Boolean.prototype.length = 2; Boolean.prototype[0] = 'b0'; Boolean.prototype[1] = 'b1';
out.push(JSON.stringify([].concat(true, 'ab', 3, new Boolean(false), new String('xy'), [1, [2]], { length: 1, 0: 'o', [Symbol.isConcatSpreadable]: true })));
delete Boolean.prototype[Symbol.isConcatSpreadable]; delete String.prototype[Symbol.isConcatSpreadable]; delete Number.prototype[Symbol.isConcatSpreadable];
delete Boolean.prototype.length; delete Boolean.prototype[0]; delete Boolean.prototype[1];
const a = [5, 4, 3, 2, 1];
Object.defineProperty(a, '1', { get(){ return this.shadow; }, set(v){ out.push('set ' + v); this.shadow = v; }, configurable: true });
a[1] = 9; out.push(String(a[1]), String(a.shadow));
a.sort(); out.push(JSON.stringify(a), String(a.shadow));
const b = [3, 1, 2]; Object.defineProperty(b, '0', { value: 7, writable: false, configurable: true });
try { b.sort(); out.push('no throw ' + JSON.stringify(b)); } catch (error) { out.push(error.name + ' ' + JSON.stringify(b)); }
const c = [3, , 1, undefined, 2]; Object.defineProperty(Object.prototype, '1', { get(){ out.push('proto get'); return 0; }, set(v){ out.push('proto set ' + v); }, configurable: true });
c.sort(); out.push(JSON.stringify(Object.getOwnPropertyNames(c)), JSON.stringify(c), String(1 in c)); delete Object.prototype[1];
Object.defineProperty(Object.prototype, '0', { get(){ return false; }, configurable: true });
out.push(String(Array.prototype.indexOf.call({ 0: true, 1: 1, length: 2 }, true)), String(Array.prototype.lastIndexOf.call({ 0: true, 1: 1, length: 2 }, true)));
delete Object.prototype[0];
// Hole bookkeeping never touches user code on Object.prototype: literal holes,
// unshift (holes move), and a sort under an accessor on the hole's index.
Object.defineProperty(Object.prototype, '2', { get(){ out.push('get 2'); return 'inherited'; }, set(v){ out.push('set 2 ' + v); }, configurable: true });
Object.defineProperty(Object.prototype, '3', { value: 'ro', writable: false, configurable: true });
const holes = [undefined, 3, , 2, undefined, , 1];
out.push(JSON.stringify(Object.getOwnPropertyNames(holes)), String(2 in holes), String(holes.hasOwnProperty('2')), String(holes[2]));
holes.unshift('u'); out.push(JSON.stringify(Object.getOwnPropertyNames(holes)), String(holes.hasOwnProperty('3')), String(holes[3]), String(holes.length));
const sorted = [undefined, 3, , 2, undefined, , 1]; sorted.sort(); out.push(JSON.stringify(Object.getOwnPropertyNames(sorted)), JSON.stringify(sorted), String(sorted[2]), String('2' in sorted));
delete Object.prototype[2]; delete Object.prototype[3];
console.log(out.join('\\n'));
`;

function stressProgram(width:number):string{
 let text=`Object.defineProperty(Object.prototype, 'k${Math.floor(width/2)}', { get(){ return 'inherited'; }, configurable: true });\nconst o = { `;
 for(let index=0;index<width;index++)text+=`k${index}: ${index}, `;
 text+=`__proto__: null };\nconsole.log(Object.getOwnPropertyNames(o).length, o['k${Math.floor(width/2)}'], Object.getPrototypeOf(o), o.k0 + o.k${width-1});\n`;
 return text;
}

async function compare(name:string,source:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-literal-'));
 try{
  const entry=join(root,'main.cjs');await writeFile(entry,source);
  const node=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({name,code:node.exitCode,stderr:node.stderr.toString()}).toEqual({name,code:0,stderr:''});
  for(const noGc of [false,true]){
   const diagnostics:string[]=[],output=join(root,`program-${noGc}`);
   const built=await compile({entry,output,buildDir:join(root,`build-${noGc}`),noGc,diagnosticWriter:x=>diagnostics.push(x)});
   expect({name,noGc,code:built.exitCode,diagnostics}).toEqual({name,noGc,code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});
   expect({name,noGc,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({name,noGc,code:0,stderr:'',stdout:node.stdout.toString()});
  }
 }finally{await rm(root,{recursive:true,force:true});}
}

test('generated object literals define own properties and __proto__ exactly like Node',async()=>{
 await compare('literals',literalProgram(rng(0x0b1ec7),80));
},600000);

test('concat never spreads primitives and array accessor elements take index stores',async()=>{
 await compare('runtime',runtimeProgram);
},600000);

test('one wide literal under an inherited accessor',async()=>{
 await compare('stress',stressProgram(3000));
},600000);

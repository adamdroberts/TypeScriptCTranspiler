import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {earlyControlFlowStaticSemanticsFailure} from '../../src/control-static-semantics';
import {earlyFunctionStaticSemanticsFailure} from '../../src/function-static-semantics';
import {earlyPrivateStaticSemanticsFailure} from '../../src/emit/private-names';
import {createEcmaSourceFile} from '../../src/ecmascript-source';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* ClassBody early errors: one constructor, no special method or field named
 * constructor, no static method or field named prototype, a getter without
 * parameters and a setter with exactly one; SuperProperty needs a HomeObject
 * and SuperCall a derived class constructor, reached through arrows and
 * past element keys. PerformEval gives direct eval code the same context:
 * `arguments` is rejected in a class field initializer, `super.x` works in
 * a method, accessor, field initializer or static block, `super()` in a
 * derived constructor, and an indirect eval admits neither. Alongside, a
 * class's prototype property is non-writable, `static constructor() {}`
 * is a static method and a private-field destructuring target reads `this`
 * before the source getter runs. Generated class bodies compare early
 * verdicts with Node, generated eval placements compare outputs with Node,
 * and one deep arrow nest around super checks the ascent. A static block's
 * eval rejects `arguments` as Node does (JSC admits it; the specification
 * names only the field initializer). */

const NODE=process.env.TSC2C_NODE_REFERENCE??'node';
function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const pick=<T,>(random:()=>number,items:readonly T[]):T=>items[Math.floor(random()*items.length)]!;

const superBodies=['super();','super.x;','(() => super())();','(() => super.x)();','class N { [super.x]() {} }','class N extends (super.x, Object) {}','({ m() { super.x; } });'];
function member(random:()=>number):string{
 switch(Math.floor(random()*14)){
  case 0:return `constructor() { ${pick(random,superBodies)} }`;
  case 1:return pick(random,['static constructor() {}','async constructor() {}','*constructor() {}','get constructor() {}','set constructor(v) {}',"'constructor'() {}","['constructor']() {}",'static async constructor() {}']);
  case 2:return pick(random,['static prototype() {}','static get prototype() {}',"static ['prototype']() {}",'prototype() {}','static prototype = 1;','prototype = 1;',"static 'prototype';",'static *prototype() {}']);
  case 3:return pick(random,['constructor = 1;',"'constructor';","['constructor'] = 1;",'static constructor = 1;']);
  case 4:return `get a(${pick(random,['','p','p = 1','this'])}) {}`;
  case 5:return `set a(${pick(random,['','p','p = 1','p, q','...p','[p]'])}) {}`;
  case 6:return `m() { ${pick(random,superBodies)} }`;
  case 7:return `static m() { ${pick(random,superBodies)} }`;
  case 8:return `x = ${pick(random,['super()','super.x','() => super.x','() => super()','arguments','() => arguments','function () { return arguments; }','class { [arguments]() {} }'])};`;
  case 9:return `static { ${pick(random,['super();','super.x;','arguments;','(() => super.x)();'])} }`;
  case 10:return `[${pick(random,['super.x','super()','arguments'])}]() {}`;
  case 11:return `constructor() {}`;
  case 12:return `static [${pick(random,['super.x','arguments'])}] = 1;`;
  default:return `get [super.x]() {}`;
 }
}
function program(random:()=>number):string{
 const heritage=random()<0.5?' extends B':'';
 const members:string[]=[];
 for(let count=1+Math.floor(random()*3);count>0;count--)members.push(member(random));
 const body=`class C${heritage} { ${members.join(' ')} }`;
 switch(Math.floor(random()*5)){
  case 0:return `class B {}\n${body}\n`;
  case 1:return `class B {}\nfunction f() { ${body} }\n`;
  case 2:return `class B {}\nclass O extends B { m() { ${body} } }\n`;
  case 3:return `class B {}\n({ ${pick(random,['get a(p) {}','set a() {}','m() { super(); }','m() { super.x; }','x: super.x','set a(p = 1) {}','get a() {}'])} });\n`;
  default:return `class B {}\n${pick(random,['super.x;','super();','function f() { super.x; }','(() => super.x);','class O extends B { constructor() { super(); class I { constructor() { super(); } } } }'])}\n`;
 }
}
function ours(source:string):boolean{
 const file=createEcmaSourceFile('x.js',source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,'script');
 const parse=(file as ts.SourceFile&{parseDiagnostics?:readonly ts.Diagnostic[]}).parseDiagnostics??[];
 return parse.length>0||earlyControlFlowStaticSemanticsFailure(file)!==null||earlyFunctionStaticSemanticsFailure(file)!==null||earlyPrivateStaticSemanticsFailure(file)!==null;
}
function nodeVerdicts(sources:readonly string[]):boolean[]{
 const script='const sources=JSON.parse(require("node:fs").readFileSync(0,"utf8"));process.stdout.write(JSON.stringify(sources.map(source=>{try{new Function(source);return false;}catch(error){return error instanceof SyntaxError;}})));';
 const node=nodeReferenceSync([NODE,'-e',script],{stdin:Buffer.from(JSON.stringify(sources)),stdout:'pipe',stderr:'pipe',timeout:60000});
 expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
 return JSON.parse(node.stdout.toString());
}

test('class element and super placement early errors match Node',()=>{
 const random=rng(0xc1a55);
 const sources:string[]=[];
 for(let index=0;index<400;index++)sources.push(program(random));
 const expected=nodeVerdicts(sources);
 expect(expected.filter(Boolean).length).toBeGreaterThan(100);
 expect(expected.filter(value=>!value).length).toBeGreaterThan(60);
 for(const [index,source] of sources.entries())expect({source,early:ours(source)}).toEqual({source,early:expected[index]!});
});

test('one deep arrow nest reaches the method or function around super',()=>{
 let nest='super.x';
 for(let depth=0;depth<600;depth++)nest=`(() => ${nest})()`;
 const sources=[`class C { m() { return ${nest}; } }`,`function f() { return ${nest}; }`,`class C { x = ${nest}; }`,`class C extends Object { constructor() { ${nest.replace('super.x','super()')}; } }`,`class C { constructor() { ${nest.replace('super.x','super()')}; } }`];
 const expected=nodeVerdicts(sources);
 expect(expected).toEqual([false,true,false,false,true]);
 for(const [index,source] of sources.entries())expect({index,early:ours(source)}).toEqual({index,early:expected[index]!});
});

/* Runtime: each block places one eval source in one context and logs the
 * value or the error name. Eval sources stay few so the finite source graph
 * holds one entry per (source, context) pair. */
const evalSources=["'arguments'","'super.x'","'super()'","'() => super.x'","'typeof this'"];
function evalBlock(random:()=>number,index:number):string{
 const source=pick(random,evalSources);
 const call=random()<0.2?`(0, eval)(${source})`:`eval(${source})`;
 const wrapped=random()<0.3?`(() => ${call})()`:call;
 const context=Math.floor(random()*9);
 const body=[
  `new (class extends B { x = ${wrapped}; })().x`,
  `new (class { x = ${wrapped}; })().x`,
  `new (class extends B { m() { return ${wrapped}; } })().m()`,
  `(() => { let v; class C extends B { static { v = ${wrapped}; } } return v; })()`,
  `new (class extends B { constructor() { ${wrapped}; } })().b`,
  `new (class { constructor() { return { v: ${wrapped} }; } })().v`,
  `(function () { return ${wrapped}; })()`,
  `({ __proto__: B.prototype, m() { return ${wrapped}; } }).m()`,
  `(class extends B { static m() { return ${wrapped}; } }).m()`,
 ][context]!;
 return `attempt(${JSON.stringify(`b${index}`)}, () => ${body});\n`;
}
const prelude=`var log = [];
class B { constructor() { this.b = 'b'; } get x() { return 'bx'; } static get x() { return 'bsx'; } }
function attempt(label, fn) { try { const v = fn(); log.push(label + ':' + (typeof v === 'function' ? 'function' : typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v))); } catch (e) { log.push(label + ':' + e.name); } }
`;
const fixed=`attempt('static-ctor', () => { class C { static constructor() { return 'sc'; } constructor() { this.i = 1; } } return [C.constructor(), new C().i, C.hasOwnProperty('constructor'), C.prototype.constructor === C].join(','); });
attempt('proto-desc', () => { class C {} const d = Object.getOwnPropertyDescriptor(C, 'prototype'); return [d.writable, d.enumerable, d.configurable].join(','); });
attempt('proto-assign-sloppy', () => { class C {} C.prototype = 1; return typeof C.prototype; });
attempt('proto-assign-strict', () => { 'use strict'; class C {} C.prototype = 1; return typeof C.prototype; });
attempt('private-destructure-order', () => { class C extends B { #f; constructor() { var init = () => super(); var o = { get a() { init(); } }; ({ a: this.#f } = o); } } return new C(); });
attempt('derived-eval-super-then-this', () => { class C extends B { constructor() { eval('super()'); this.after = 1; } } return new C().after; });
console.log(log.join('\\n'));
`;
function runtimeProgram(random:()=>number,count:number):string{
 let text=prelude;
 for(let index=0;index<count;index++)text+=evalBlock(random,index);
 return text+fixed;
}
async function compare(name:string,source:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-class-elements-'));
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

test('eval contexts, static constructor methods and class prototypes run like Node',async()=>{
 await compare('generated',runtimeProgram(rng(0xe7a1),40));
},600000);

test('one long run of eval placements',async()=>{
 await compare('stress',runtimeProgram(rng(0x5e55),100));
},600000);

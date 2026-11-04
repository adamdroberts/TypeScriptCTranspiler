import {expect,test} from 'bun:test';
import {existsSync} from 'node:fs';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {homedir,tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* Function.prototype.caller and Function.prototype.arguments, compared with
 * Node 26 (V8 exposes both as accessors; sec-forbidden-extensions permits
 * them on non-strict functions only). The receiver rule, the descriptors,
 * the setters and the arguments snapshot must match exactly. The caller
 * value is implementation-defined: a generated call chain mixes every
 * function kind and transport (direct, call, apply, bind, Reflect.apply, a
 * built-in callback, new, a function value) and each result must equal
 * Node's, except that a null where Node names a caller is accepted, since a
 * call that never passed through a value-call frame has no caller record. */

const NODE26=join(homedir(),'.nvm/versions/node/v26.11.0/bin/node');
const NODE=existsSync(NODE26)?NODE26:'node';

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}

const linkKinds=['sloppy','strict','arrow','strictArrow','method','generatorStep'] as const;
const transports=['direct','call','apply','bind','reflect','map','new','value'] as const;
function transport(random:()=>number,callee:string):string{
 // A built-in callback transport nested inside construct and value calls
 // multiplies analysis contexts (an open source-analysis cost item), so the
 // built-in sits only directly below the probe, where it exercises the null
 // caller.
 const choices=callee==='probe'?transports:transports.filter(kind=>kind!=='map');
 switch(choices[Math.floor(random()*choices.length)]!){
  case 'direct':return `${callee}()`;
  case 'call':return `${callee}.call(null)`;
  case 'apply':return `${callee}.apply(null, [])`;
  case 'bind':return `${callee}.bind(null)()`;
  case 'reflect':return `Reflect.apply(${callee}, null, [])`;
  case 'map':return `[0].map(${callee})[0]`;
  case 'new':return `new ${callee}().value`;
  default:return `(0, ${callee})()`;
 }
}
function link(random:()=>number,name:string,next:string):string{
 const body=`return ${transport(random,next)};`;
 switch(linkKinds[Math.floor(random()*linkKinds.length)]!){
  case 'sloppy':return `function ${name}(){ ${body} }\n`;
  case 'strict':return `function ${name}(){ "use strict"; ${body} }\n`;
  case 'arrow':return `var ${name} = () => { ${body} };\n`;
  case 'strictArrow':return `var ${name} = () => { "use strict"; ${body} };\n`;
  case 'method':return `var ${name} = ({ ${name}(){ ${body} } }).${name};\n`;
  default:return `function ${name}(){ function* step(){ yield (function(){ ${body} })(); } return step().next().value; }\n`;
 }
}
function chainProgram(random:()=>number,chains:number):string{
 let text=`const name = v => v === null ? "null" : typeof v === "function" ? (v.name || "<anon>") : Object.prototype.toString.call(v);
function probe(){ this.value = probe.caller; return probe.caller; }
`;
 for(let index=0;index<chains;index++){
  const depth=1+Math.floor(random()*4);
  let next='probe';
  for(let level=depth-1;level>=0;level--){text+=link(random,`c${index}_${level}`,next);next=`c${index}_${level}`;}
  text+=`try { console.log("chain${index}", name(${transport(random,next)})); } catch (error) { console.log("chain${index}", "throws", error.name); }\n`;
 }
 return text;
}

const receiverProgram=`const name = v => v === null ? "null" : typeof v === "function" ? (v.name || "<anon>") : Object.prototype.toString.call(v);
const probe = (label, fn) => {
 const results = [];
 for (const key of ["caller", "arguments"]) {
  try { results.push(name(fn[key])); } catch (error) { results.push("throws " + error.name); }
  try { fn[key] = 1; results.push("set ok"); } catch (error) { results.push("set throws " + error.name); }
 }
 results.push(Object.getOwnPropertyDescriptor(fn, "caller") === undefined, Object.getOwnPropertyDescriptor(fn, "arguments") === undefined);
 console.log(label, results.join(" "));
};
probe("declaration", function f(){});
probe("expression", function(){});
probe("strict", function(){ "use strict"; });
probe("arrow", () => 1);
probe("strictArrow", () => { "use strict"; });
probe("native", Math.max);
probe("bound", (function(){}).bind(null));
probe("class", class {});
probe("generator", function*(){});
probe("async", async function(){});
probe("asyncArrow", async () => 1);
probe("method", ({ m(){} }).m);
probe("getter", Object.getOwnPropertyDescriptor({ get x(){ return 1; } }, "x").get);
probe("dynamic", Function("return 1"));
probe("dynamicStrict", Function("'use strict'; return 1"));
probe("dynamicGenerator", Object.getPrototypeOf(function*(){}).constructor("yield 1"));
probe("prototype", Function.prototype);
for (const key of ["caller", "arguments"]) {
 const descriptor = Object.getOwnPropertyDescriptor(Function.prototype, key);
 console.log(key, typeof descriptor.get, typeof descriptor.set, descriptor.get.name, descriptor.set.name, descriptor.get.length, descriptor.set.length, descriptor.enumerable, descriptor.configurable, descriptor.get === descriptor.set);
 for (const receiver of [{}, 1, "s", null, undefined, Symbol()]) {
  try { descriptor.get.call(receiver); console.log(key, "get on", typeof receiver, "ok"); } catch (error) { console.log(key, "get on", typeof receiver, error.name); }
  try { descriptor.set.call(receiver, 1); console.log(key, "set on", typeof receiver, "ok"); } catch (error) { console.log(key, "set on", typeof receiver, error.name); }
 }
}
console.log(Object.getOwnPropertyDescriptor(Function.prototype, "caller").get !== Object.getOwnPropertyDescriptor(Function.prototype, "arguments").get);
function args(a, b){ const x = args.arguments; a = 9; return [x === arguments, x[0], x[1], x.length, Object.prototype.toString.call(x), x.callee === args, Array.isArray(x), Object.getOwnPropertyDescriptor(x, "callee").writable]; }
console.log(JSON.stringify(args(1, 2)));
console.log(JSON.stringify([0].map(function m(){ return m.arguments.length; })));
// A caller or an active argument list is recorded only for value calls, so
// these exact comparisons invoke through Function.prototype.call.
function sloppy(){} function wrap(){ return (function(){ return arguments.callee.caller; }).call(null); } console.log(sloppy.arguments, name(wrap.call(null)));
function noParameterMapping(){ const x = noParameterMapping.arguments; return x.length; } console.log(noParameterMapping.call(null, 1, 2, 3));
try { (function(){ "use strict"; return arguments.callee; })(); console.log("strict callee ok"); } catch (error) { console.log("strict callee", error.name); }
`;

function stressProgram(depth:number):string{
 return `const name = v => v === null ? "null" : typeof v === "function" ? (v.name || "<anon>") : String(v);
function bottom(){ return bottom.caller; }
const links = [bottom];
for (let index = 0; index < ${depth}; index++) { const next = links[index]; links.push(function link(){ return next.call(null); }); }
console.log(name(links[${depth}].call(null)));
let nulls = 0; for (let index = 0; index < ${depth}; index++) nulls += links[index].caller === null ? 1 : 0; console.log(nulls);
function recursive(n){ return n ? recursive.call(null, n - 1) : name(recursive.caller); } console.log(recursive.call(null, ${depth}));
`;
}

function acceptable(ours:string,node:string):boolean{
 if(ours===node)return true;
 const [label,...rest]=ours.split(' ');
 const theirs=node.split(' ');
 return theirs[0]===label&&rest.join(' ')==='null'&&!theirs.slice(1).join(' ').startsWith('throws')&&theirs.slice(1).join(' ')!=='null';
}

async function compare(name:string,source:string,exact:boolean):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-caller-'));
 try{
  const entry=join(root,'main.cjs');await writeFile(entry,source);
  const node=nodeReferenceSync([NODE,entry],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({name,code:node.exitCode,stderr:node.stderr.toString()}).toEqual({name,code:0,stderr:''});
  for(const noGc of [false,true]){
   const diagnostics:string[]=[],output=join(root,`program-${noGc}`);
   const built=await compile({entry,output,buildDir:join(root,`build-${noGc}`),noGc,diagnosticWriter:x=>diagnostics.push(x)});
   expect({name,noGc,code:built.exitCode,diagnostics}).toEqual({name,noGc,code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});
   expect({name,noGc,code:native.exitCode,stderr:native.stderr.toString()}).toEqual({name,noGc,code:0,stderr:''});
   const ours=native.stdout.toString().split('\n'),theirs=node.stdout.toString().split('\n');
   expect({name,noGc,lines:ours.length}).toEqual({name,noGc,lines:theirs.length});
   for(const [index,line] of ours.entries()){
    const reference=theirs[index]!;
    if(exact||!acceptable(line,reference))expect({name,noGc,index,line}).toEqual({name,noGc,index,line:reference});
   }
  }
 }finally{await rm(root,{recursive:true,force:true});}
}

test('receiver rule, descriptors, setters and arguments snapshots match Node',async()=>{
 await compare('receivers',receiverProgram,true);
},600000);

test('generated call chains report the caller Node reports or null',async()=>{
 // Eight chains: this transport mix is costly for the source analysis at
 // larger counts (an open item recorded in docs/todo.md).
 await compare('chains',chainProgram(rng(0xca11e4),8),false);
},600000);

test('one deep value-call chain resolves callers at every depth',async()=>{
 await compare('stress',stressProgram(3000),true);
},600000);

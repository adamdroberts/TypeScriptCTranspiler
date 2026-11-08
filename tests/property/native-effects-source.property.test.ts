import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildProgram} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {runtimeArrayPrototypeMethods} from '../../src/global-bindings';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* Three rules of the source analysis around native calls, each observable
 * through the eval sources that stay finite:
 * 1. A known native (an Array.prototype method without a precise model)
 *    writes only its receiver and arguments and runs user code only through
 *    the callables they reach; it never widens a global binding, so a
 *    mutable global eval source read after the call stays finite. Every
 *    non-callback Array native is placed before an eval; one long program
 *    of such calls is the stress.
 * 2. Under the Test262 host a reference to a name outside the runtime's
 *    global bindings, the host's names and the scripts' declarations is
 *    unresolvable: GetValue throws ReferenceError and typeof answers
 *    "undefined"; without that host the name stays an unknown value.
 * 2b. The unmodelled result of a native call, an unmodelled builtin member
 *    and an escaped native's actual arguments are native values: reading,
 *    calling, constructing or converting them stays bounded. Every shape is
 *    placed before an eval of a mutable global; one long member chain on a
 *    native result is the stress.
 * 2c. A value stored into a native result (or any object the analysis does
 *    not represent) escapes at the store: a function read back through the
 *    native value, or through an object the native value aliases, and called
 *    still runs its effects. A store, definition or native mutation through a
 *    native value reaches every object that reached a native, so a value
 *    written through an alias is seen there (or the read is unknown). Every
 *    store/call pair on every native receiver reaches a local eval source; a
 *    200-deep relay of one function through successive native results is the
 *    stress.
 * 3. A value from a Function-constructor source that a later solve compiles
 *    stays pending through a `!== undefined` guard and a constructor check
 *    instead of becoming unknown; the intrinsic-table program compiles and
 *    runs like Node. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const CALLBACK_NATIVES=new Set(['forEach','map','flatMap','filter','some','every','find','findIndex','findLast','findLastIndex','reduce','reduceRight','sort','toSorted']);
function choices(entry:string,host?:'test262'):(readonly string[]|null)[]{
 const built=buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]});
 return sourceEvaluationInvocations(built.program,{roots:[entry],...(host?{host}:{})}).filter(call=>call.operation==='eval').map(call=>call.choices);
}

test('a known native call never widens a global eval source',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-native-effects-'));
 try{
  const random=rng(0x5e11);
  const natives=[...runtimeArrayPrototypeMethods.keys()].filter(name=>!CALLBACK_NATIVES.has(name)&&name!=='toLocaleString');
  expect(natives.length).toBeGreaterThan(15);
  const call=(name:string)=>`try { [3, 1, 2].${name}(${['0','1','"x"','{}'].slice(0,Math.floor(random()*4)).join(', ')}); } catch (e) {}\n`;
  for(const name of natives){
   const source=`let source = "1;";\nvar out = [];\n${call(name)}const executeSource = eval;\nexecuteSource(source);\n`;
   const entry=join(directory,`${name}.js`);await writeFile(entry,source);
   expect({name,choices:choices(entry)}).toEqual({name,choices:[['1;']]});
  }
  let stress='let source = "1;";\nvar out = [];\n';
  for(let index=0;index<200;index++)stress+=call(natives[index%natives.length]!);
  stress+='const executeSource = eval;\nexecuteSource(source);\n';
  const entry=join(directory,'stress.js');await writeFile(entry,stress);
  expect(choices(entry)).toEqual([['1;']]);
 }finally{await rm(directory,{recursive:true,force:true});}
},600000);

test('an unresolvable name throws ReferenceError under the Test262 host and stays unknown elsewhere',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-host-names-'));
 try{
  const shapes=[
   'try { NoSuchGlobal.member(); } catch (e) { source = "2;"; }',
   'try { new NoSuchGlobal(); } catch (e) { source = "2;"; }',
   'source = typeof NoSuchGlobal === "undefined" ? "2;" : "3;";',
   'try { source = NoSuchGlobal; } catch (e) { source = "2;"; }',
  ];
  for(const [index,shape] of shapes.entries()){
   const source=`let source = "1;";\n${shape}\nconst executeSource = eval;\nexecuteSource(source);\n`;
   const entry=join(directory,`shape-${index}.js`);await writeFile(entry,source);
   // The try's normal completion is kept conservatively, so "1;" may remain
   // beside the catch's "2;"; the set is finite either way.
   const hosted=choices(entry,'test262');
   expect({shape,finite:hosted.length===1&&hosted[0]!==null,caught:hosted[0]?.includes('2;')}).toEqual({shape,finite:true,caught:true});
   // Without the host the name is an unknown value: a call or construction
   // widens the sources, a typeof keeps a finite type-name set.
   if(index!==2)expect({shape,plain:choices(entry)}).toEqual({shape,plain:[null]});
  }
 }finally{await rm(directory,{recursive:true,force:true});}
},600000);

test('Function-constructor results guarded and checked as constructors run like Node',async()=>{
 const source=`const table = [
  { name: "Array", source: "Array" }, { name: "eval", source: "eval" }, { name: "parseInt", source: "parseInt" },
  { name: "AsyncFunction", source: "(async function() {}).constructor" }, { name: "Promise", source: "Promise" },
  { name: "GeneratorFunction", source: "(function* () {}).constructor" }, { name: "none", source: "undefined" },
];
table.forEach(function (entry) { var actual; try { actual = new Function("return " + entry.source)(); } catch (e) {} entry.value = actual; });
function get(name) { for (var i = 0; i < table.length; i++) { if (table[i].name === name) { var value = table[i].value; if (value !== undefined) return value; throw new Error("missing " + name); } } throw new Error("unknown " + name); }
function isConstructor(f) { if (typeof f !== "function") throw new Error("not a function"); try { Reflect.construct(function () {}, [], f); } catch (e) { return false; } return true; }
const out = [];
for (const name of ["Array", "eval", "parseInt", "AsyncFunction", "Promise", "GeneratorFunction", "none"]) {
  try { const f = get(name); out.push(name + ":" + isConstructor(f) + ":" + typeof f); } catch (e) { out.push(name + ":caught"); }
}
try { out.push(typeof new (get("AsyncFunction"))()); } catch (e) { out.push("threw"); }
try { new (get("eval"))(); out.push("constructed eval"); } catch (e) { out.push("threw"); }
const executeSource = eval; out.push(typeof executeSource("40 + 2"));
console.log(out.join("\\n"));
`;
 const root=await mkdtemp(join(tmpdir(),'tsc2c-pending-ctor-'));
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

test('operations on native results never widen a global eval source',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-native-results-'));
 try{
  const shapes=['Iterator.from([])','Iterator.from([]).drop(0)','Object.getPrototypeOf(Iterator.from([]).drop(0))','new String()[Symbol.iterator]()',
   'new Map()[Symbol.iterator]()','RegExp.prototype[Symbol.matchAll]("")','Iterator.from({ [Symbol.iterator]() { return {}; } })','new Set().values()',
   '[].keys().next()','"x".matchAll(/x/g)','Object.getPrototypeOf(new Uint8Array(1))','String(Object.getPrototypeOf(new Int8Array(2)))','new (Object.getPrototypeOf(Iterator.from([])).constructor)()',
   '"" + [Float64Array].concat([Int32Array])[Math.floor(Math.random())].name','String([{}].slice()[Math.floor(Math.random())])'];
  for(const [index,shape] of shapes.entries()){
   const source=`var source = "1;";\nvar executeSource = eval;\nvar result; try { result = ${shape}; } catch (e) {}\nexecuteSource(source);\n`;
   const entry=join(directory,`shape-${index}.js`);await writeFile(entry,source);
   expect({shape,choices:choices(entry)}).toEqual({shape,choices:[['1;']]});
  }
  // Another realm's runtime bindings start as that realm's intrinsics.
  for(const [index,shape] of ['String($262.createRealm().global.Int8Array.prototype)','"" + $262.createRealm().global["Int" + "8Array"].prototype'].entries()){
   const entry=join(directory,`realm-${index}.js`);await writeFile(entry,`var source = "1;";\nvar executeSource = eval;\nvar result; try { result = ${shape}; } catch (e) {}\nexecuteSource(source);\n`);
   expect({shape,choices:choices(entry,'test262')}).toEqual({shape,choices:[['1;']]});
  }
  let chain='Iterator.from([1, 2, 3])';for(let depth=0;depth<300;depth++)chain+=depth%2?'.drop(0)':'.take(9)';
  const entry=join(directory,'chain.js');await writeFile(entry,`var source = "1;";\nvar executeSource = eval;\nvar result; try { result = ${chain}.toArray(); } catch (e) {}\nexecuteSource(source);\n`);
  expect(choices(entry)).toEqual([['1;']]);
 }finally{await rm(directory,{recursive:true,force:true});}
},600000);

test('a function stored into a native result runs its effects when called back',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-native-stores-'));
 try{
  const receivers=['[].concat([])','Iterator.from([])','[0].slice()','new Map().entries()','Object.getPrototypeOf(Iterator.from([]).drop(0))'];
  const stores=[
   (r:string)=>`const r = ${r};\n  r.x = writer;\n  r.x();`,
   (r:string)=>`const r = ${r};\n  r["x"] = writer;\n  const g = r.x;\n  g();`,
   (r:string)=>`const r = [box].concat(${r});\n  r[0].x = writer;\n  box.x();`,
  ];
  const program=(body:string)=>`function f() {\n  let source = "1;";\n  const box = {};\n  const writer = function () { source = "2;"; };\n  ${body}\n  return eval(source);\n}\nf();\n`;
  for(const [index,receiver] of receivers.entries())for(const [kind,store] of stores.entries()){
   const entry=join(directory,`store-${index}-${kind}.js`);await writeFile(entry,program(store(receiver)));
   const found=choices(entry);
   expect({receiver,kind,finite:found.length===1&&found[0]!==null,stored:found[0]?.includes('2;')}).toEqual({receiver,kind,finite:true,stored:true});
  }
  // A value written through an alias of a represented object: the eval sees
  // "2;" at run time, so the analysis must include it or report the site.
  const aliases=[
   (r:string)=>`box.y = "1;";\n  const r = [box].concat(${r});\n  r[0].y = "2;";\n  source = box.y;`,
   (r:string)=>`box.y = "1;";\n  Object.assign([box].concat(${r})[0], { y: "2;" });\n  source = box.y;`,
   (r:string)=>`box.y = "1;";\n  const it = Iterator.from([box, ${r}]);\n  it.next().value.y = "2;";\n  source = box.y;`,
   (r:string)=>`box.y = "1;";\n  Object.defineProperty([${r}, box].slice(1)[0], "y", { value: "2;" });\n  source = box.y;`,
  ];
  for(const [index,receiver] of receivers.entries())for(const [kind,alias] of aliases.entries()){
   const entry=join(directory,`alias-${index}-${kind}.js`);await writeFile(entry,program(alias(receiver)));
   const found=choices(entry);
   expect({receiver,kind,sound:found.length===1&&(found[0]===null||found[0].includes('2;'))}).toEqual({receiver,kind,sound:true});
  }
  let relay='let previous = { x: writer };\n';
  for(let depth=0;depth<200;depth++)relay+=`  { const r = ${receivers[depth%receivers.length]}; r.x = previous.x; previous = r; }\n`;
  relay+='  previous.x();';
  const entry=join(directory,'relay.js');await writeFile(entry,program(relay));
  const found=choices(entry);
  expect({finite:found.length===1&&found[0]!==null,stored:found[0]?.includes('2;')}).toEqual({finite:true,stored:true});
 }finally{await rm(directory,{recursive:true,force:true});}
},600000);

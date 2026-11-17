import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';

// AddRestrictedFunctionProperties(%Function.prototype%): `caller` and
// `arguments` are configurable, non-enumerable accessors whose getter and
// setter are the one %ThrowTypeError% intrinsic (also the strict arguments
// object's `callee` accessor), a frozen function of length 0 named "".
// Reading or writing them on any function other than a non-strict ordinary
// function throws TypeError. A non-strict ordinary function (declaration,
// expression, Function constructor) carries the legacy extension as own
// configurable, non-enumerable accessors that never reveal a strict function
// (sec-forbidden-extensions; function-legacy-caller compares their values
// with Node). Node 26 reads the extension through Function.prototype instead,
// so the expected values here are derived from the spec.
// Partitions: function kind (sloppy, strict, arrow, method, generator, async,
// async generator, class, bound, built-in, Function constructor), access
// (read, write, Reflect.get with a receiver, in sloppy and strict code) and
// the call transport the read runs under. One 256-deep call chain reading
// `caller` at every level is the stress.
const kinds:Record<string,string>={
 sloppy:'function () {}',strict:'function () { "use strict"; }',arrow:'() => {}',method:'({ m() {} }).m',
 generator:'function* () {}',async:'async function () {}',asyncGenerator:'async function* () {}',class:'class {}',
 bound:'(function () {}).bind(null)',builtin:'Math.max',dynamic:'Function("return 1")',
};
const accesses:Record<string,(target:string,name:string)=>string>={
 read:(target,name)=>`${target}.${name}`,
 write:(target,name)=>`${target}.${name} = 1`,
 strictWrite:(target,name)=>`(() => { "use strict"; ${target}.${name} = 1; })()`,
 reflect:(target,name)=>`Reflect.get(Function.prototype, ${JSON.stringify(name)}, ${target})`,
};
const transports:Record<string,(body:string)=>string>={
 direct:body=>`(function () { ${body} })()`,
 call:body=>`(function () { ${body} }).call(null)`,
 apply:body=>`Reflect.apply(function () { ${body} }, null, [])`,
 callback:body=>`[0].forEach(function () { ${body} })`,
};

test('Function.prototype caller and arguments are %ThrowTypeError% accessors',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-function-restricted-'));
 try{
  const lines=['const out = [];','const thrower = Object.getOwnPropertyDescriptor(Function.prototype, "caller").get;',
   'function outcome(run) { try { run(); return "no-throw"; } catch (e) { return e.constructor.name; } }',
  ];
  const expected:string[]=[];
  for(const name of ['caller','arguments']){
   lines.push(`{ const d = Object.getOwnPropertyDescriptor(Function.prototype, ${JSON.stringify(name)}); out.push(${JSON.stringify(name)} + " " + [typeof d.get, d.get === d.set, d.get === thrower, d.enumerable, d.configurable, "value" in d].join()); }`);
   expected.push(`${name} function,true,true,false,true,false`);
  }
  lines.push('{ const callee = (function () { "use strict"; return Object.getOwnPropertyDescriptor(arguments, "callee"); })(); out.push("callee " + [callee.get === thrower, callee.set === thrower].join()); }',
   'out.push("thrower " + [Object.isFrozen(thrower), thrower.length, JSON.stringify(thrower.name), Object.getPrototypeOf(thrower) === Function.prototype, outcome(() => thrower())].join());');
  expected.push('callee true,true','thrower true,0,"",true,TypeError');
  let index=0;
  const legacy=new Set(['sloppy','dynamic']);
  for(const [kind,source] of Object.entries(kinds)){
   const target=`k${index++}`,extended=legacy.has(kind);
   lines.push(`const ${target} = ${source};`,
    `out.push(${JSON.stringify(kind+' own')} + " " + [Object.hasOwn(${target}, "caller"), Object.hasOwn(${target}, "arguments")].join());`);
   expected.push(`${kind} own ${extended}`+`,${extended}`);
   for(const name of ['caller','arguments'])for(const [accessName,access] of Object.entries(accesses)){
    lines.push(`out.push(${JSON.stringify(`${kind} ${name} ${accessName}`)} + " " + outcome(() => ${access(target,name)}));`);
    // The extension reads null when the function is not executing and its
    // setters ignore the value; Reflect.get through Function.prototype still
    // reaches %ThrowTypeError%.
    expected.push(`${kind} ${name} ${accessName} ${extended&&accessName!=='reflect'?'no-throw':'TypeError'}`);
   }
  }
  for(const [transportName,transport] of Object.entries(transports)){
   lines.push(transport(`out.push(${JSON.stringify('transport '+transportName)} + " " + outcome(() => arguments.callee.caller) + " " + outcome(() => arguments.callee.arguments));`)+';');
   expected.push(`transport ${transportName} no-throw no-throw`);
  }
  // From strict code a sloppy function's extension still reads, while a
  // function written in strict code is strict and throws. (One transport: each added
  // transport multiplies the source analysis cost of `arguments.callee`.)
  lines.push(transports.direct!(`"use strict"; out.push("strict transport " + outcome(() => k0.caller) + " " + outcome(() => (function () {}).caller));`)+';');
  expected.push('strict transport no-throw TypeError');
  // The extension never reveals a strict function: a strict caller reads null.
  const depth=256;
  lines.push(`function level(n) { if (n === 0) return 0; const caller = level.caller; return (caller === null || caller === level ? 1 : 0) + strictLevel(n - 1); }`,
   `function strictLevel(n) { "use strict"; return level(n); }`,
   `out.push("stress " + level(${depth}));`,'console.log(out.join("\\n"));');
  expected.push(`stress ${depth}`,'');
  const entry=join(directory,'main.js'),output=join(directory,'program'),diagnostics:string[]=[];
  await writeFile(entry,lines.join('\n')+'\n');
  const built=await compile({entry,output,buildDir:join(directory,'build'),diagnosticWriter:message=>diagnostics.push(message)});
  expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  expect(native.stdout.toString().split('\n')).toEqual(expected);
  // The extension's own accessor shape, in its own program: reading these
  // descriptors next to a Function-constructor source exhausts the source
  // analysis budget (an open analysis-cost item), which leaves that source
  // unproven.
  const shapeEntry=join(directory,'shape.js'),shapeOutput=join(directory,'shape'),shapeDiagnostics:string[]=[];
  await writeFile(shapeEntry,['const thrower = Object.getOwnPropertyDescriptor(Function.prototype, "caller").get;',
   'for (const key of ["caller", "arguments"]) { const d = Object.getOwnPropertyDescriptor(function () {}, key); console.log(key, typeof d.get, typeof d.set, d.enumerable, d.configurable, d.get !== thrower, d.get === Object.getOwnPropertyDescriptor(function () {}, key).get); }',
   'console.log(Object.getOwnPropertyDescriptor(function () { "use strict"; }, "caller"), Object.getOwnPropertyDescriptor(() => {}, "caller"));'].join('\n')+'\n');
  const shape=await compile({entry:shapeEntry,output:shapeOutput,buildDir:join(directory,'shape-build'),diagnosticWriter:message=>shapeDiagnostics.push(message)});
  expect({code:shape.exitCode,diagnostics:shapeDiagnostics}).toEqual({code:0,diagnostics:[]});
  const shapeRun=Bun.spawnSync([shapeOutput],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  expect({code:shapeRun.exitCode,stdout:shapeRun.stdout.toString()}).toEqual({code:0,
   stdout:'caller function function false true true true\narguments function function false true true true\nundefined undefined\n'});
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

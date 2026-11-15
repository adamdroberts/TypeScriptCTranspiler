import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

// A JavaScript compile root is classified like an imported file under Node's
// rules: .cjs, or .js outside a "type": "module" scope without module syntax,
// is a CommonJS module, so its body runs inside the module wrapper (exports,
// require, module, __filename, __dirname) with `this` bound to module.exports,
// top-level var bindings that are not global properties, and the wrapper's
// arguments object. That object is mapped to the wrapper's parameter bindings
// (a same-named var or function declaration is that binding) unless the body
// is strict, and is reached directly, from arrows and from direct eval.
// Partitions: entry kind (.cjs, .js, .js with module syntax), strictness, and
// var/function shadowing of a formal. One 128-deep arrow chain reading
// `arguments` with 512 mapped writes is the stress.
const observe=`
const out = [];
const strict = (function () { return this === undefined; })();
var topVar = 1;
out.push("kinds " + [typeof exports, typeof require, typeof module, typeof __filename, typeof __dirname].join());
out.push("this " + (this === module.exports) + " global " + (globalThis.topVar === undefined));
out.push("arguments " + Object.prototype.toString.call(arguments) + " " + arguments.length + " " + Object.keys(arguments).join());
if (!strict) out.push("callee " + typeof arguments.callee + " " + JSON.stringify(arguments.callee.name) + " " + arguments.callee.length);
out.push("identity " + (arguments[0] === exports) + (arguments[1] === require) + (arguments[2] === module));
out.push("eval " + eval("arguments.length") + " " + eval("typeof arguments[2]"));
out.push("arrow " + (() => arguments.length)() + " " + (() => () => arguments[0] === exports)()());
function own(a) { return arguments.length + ":" + typeof arguments[0]; }
out.push("own " + own(1, 2));
`;
const mapped=`
const before = arguments[4];
arguments[4] = "dir"; out.push("index4 " + (__dirname === "dir"));
__dirname = "back"; out.push("binding4 " + arguments[4]);
__dirname = before;
exports = 5; out.push("binding0 " + arguments[0]);
arguments[0] = 6; out.push("index0 " + exports);
`;
const entries:Record<string,{file:string;source:string}>={
 cjs:{file:'cjs.cjs',source:observe+mapped+'console.log(out.join("\\n"));\n'},
 js:{file:'js.js',source:observe+mapped+'console.log(out.join("\\n"));\n'},
 strict:{file:'strict.cjs',source:'"use strict";\n'+observe+'exports = 7; out.push("unmapped " + (arguments[0] === 7));\ntry { arguments.callee; } catch (e) { out.push("callee " + e.constructor.name); }\nconsole.log(out.join("\\n"));\n'},
 shadow:{file:'shadow.cjs',source:'const out = [];\nvar exports = 3; out.push("var " + arguments[0]);\narguments[0] = 4; out.push("var write " + exports);\nfunction require() { return "own"; }\nout.push("function " + (arguments[1] === require) + " " + arguments[1]());\nconsole.log(out.join("\\n"));\n'},
 moduleSyntax:{file:'esm.js',source:'export const marker = 1;\nvar topVar = 1;\nconsole.log([this === undefined, typeof arguments, globalThis.topVar === undefined].join());\n'},
};

test('a CommonJS compile root runs inside the module wrapper',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-commonjs-entry-'));
 try{
  // Stress: a 128-deep arrow chain reads the wrapper's arguments; 512 writes
  // alternate between the binding and its mapped index.
  let chain='arguments[3]';
  for(let depth=0;depth<128;depth++)chain=`(() => ${chain})()`;
  entries.stress={file:'stress.cjs',source:`const name = ${chain};\nlet agree = 0;\nfor (let index = 0; index < 512; index++) { if (index % 2) __filename = "f" + index; else arguments[3] = "a" + index; if (arguments[3] === __filename) agree++; }\nconsole.log((name === arguments[3] || name.endsWith("stress.cjs")) + " " + agree);\n`};
  for(const [name,{file,source}] of Object.entries(entries)){
   const entry=join(directory,file),output=join(directory,`${name}.out`),diagnostics:string[]=[];
   await writeFile(entry,source);
   const node=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:30_000});
   expect({name,exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({name,exitCode:0,stderr:''});
   const built=await compile({entry,output,buildDir:join(directory,`${name}-build`),diagnosticWriter:message=>diagnostics.push(message)});
   expect({name,code:built.exitCode,diagnostics}).toEqual({name,code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:60_000});
   expect({name,code:native.exitCode,stderr:native.stderr.toString()}).toEqual({name,code:0,stderr:''});
   expect({name,stdout:native.stdout.toString()}).toEqual({name,stdout:node.stdout.toString()});
  }
 }finally{await rm(directory,{recursive:true,force:true});}
},900_000);

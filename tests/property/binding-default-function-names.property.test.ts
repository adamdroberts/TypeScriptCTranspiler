import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

const NODE=process.env.TSC2C_NODE_REFERENCE??'node';

/* NamedEvaluation applies to an anonymous function, arrow or class used as
 * the Initializer of a SingleNameBinding or of an AssignmentProperty or
 * AssignmentElement whose target is an identifier, in declarations,
 * parameters, assignment patterns and iteration heads alike; a named
 * function expression keeps its own name and a non-identifier target names
 * nothing. Generated patterns compare the resulting `name` descriptors with
 * Node; one deep pattern is the stress input. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const definitions=['function () {}','() => {}','class {}','function* () {}','async function () {}','async () => {}','(function () {})','function own() {}','class Own {}','(0, function () {})','cover = function () {}'];
let counter=0;
// A nested pattern defaults to its own empty source, so every leaf sees undefined and takes its default.
function nested(random:()=>number,depth:number,names:string[]):string{
 const text=pattern(random,depth,names).trim();
 return text.startsWith('[')?`${text} = []`:text.startsWith('{')?`${text} = {}`:text;
}
function pattern(random:()=>number,depth:number,names:string[]):string{
 const id=`v${counter++}`;names.push(id);
 const definition=definitions[Math.floor(random()*definitions.length)]!;
 if(depth===0||random()<0.35)return random()<0.5?`${id} = ${definition}`:`${id}`;
 switch(Math.floor(random()*5)){
  case 0:return `{ ${id} = ${definition}, k${counter}: ${nested(random,depth-1,names)} }`;
  case 1:return `{ k${counter}: ${nested(random,depth-1,names)}, ${id} = ${definition} }`;
  case 2:return `[ ${id} = ${definition}, ${nested(random,depth-1,names)} ]`;
  case 3:{const rest=`v${counter++}`;names.push(rest);return `{ [${JSON.stringify('c'+counter)}]: ${id} = ${definition}, ...${rest} }`;}
  default:return `[ ${nested(random,depth-1,names)}, ...${id} ]`;
 }
}
function describe(names:readonly string[]):string{
 return `for (const [label, value] of [${names.map(name=>`['${name}', typeof ${name} === 'undefined' ? undefined : ${name}]`).join(', ')}]) { const d = typeof value === 'function' ? Object.getOwnPropertyDescriptor(value, 'name') : null; out.push(label + ':' + (d ? JSON.stringify(d.value) + (d.writable ? 'w' : '') + (d.enumerable ? 'e' : '') + (d.configurable ? 'c' : '') : typeof value)); }`;
}
function program(random:()=>number,count:number):string{
 let text='var out = [], cover;\n';
 for(let index=0;index<count;index++){
  const names:string[]=[];
  const shape=index%5;
  const inner=pattern(random,3,names);
  // A bare `id = definition` is only a pattern inside brackets.
  const text1=inner.trim().startsWith('[')||inner.trim().startsWith('{')?inner:`[ ${inner} ]`;
  const source=text1.trim().startsWith('[')?'[]':'{}';
  const decls=names.map(name=>`var ${name};`).join(' ');
  if(shape===0)text+=`{ const ${text1} = ${source}; ${describe(names)} }\n`;
  else if(shape===1)text+=`{ ${decls} (${text1} = ${source}); ${describe(names)} }\n`;
  else if(shape===2)text+=`{ ${decls} for (${text1} of [${source}]) { ${describe(names)} } }\n`;
  else if(shape===3)text+=`{ (function (${text1} = ${source}) { ${describe(names)} })(); }\n`;
  else text+=`{ let ${text1} = ${source}; ${describe(names)} }\n`;
 }
 return text+'console.log(out.join("\\n"));\n';
}
async function compare(name:string,source:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-default-names-'));
 try{
  const entry=join(root,'main.cjs');await writeFile(entry,source);
  const node=nodeReferenceSync([NODE,entry],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({name,code:node.exitCode,stderr:node.stderr.toString()}).toEqual({name,code:0,stderr:''});
  const diagnostics:string[]=[],output=join(root,'program');
  const built=await compile({entry,output,buildDir:join(root,'build'),diagnosticWriter:x=>diagnostics.push(x)});
  expect({name,code:built.exitCode,diagnostics}).toEqual({name,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({name,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({name,code:0,stderr:'',stdout:node.stdout.toString()});
 }finally{await rm(root,{recursive:true,force:true});}
}

test('generated binding defaults name anonymous functions exactly like Node',async()=>{
 counter=0;
 // 30 blocks: the source analysis of many pattern defaults grows superlinearly (60 blocks take eight minutes), an open analysis item.
 await compare('names',program(rng(0x9a3e),30));
},600000);

test('one deep assignment pattern names the function at its leaf',async()=>{
 // Every level defaults its missing value, so the leaf receives undefined and its own default.
 let text='{ k: leaf = function () {} }';
 for(let depth=1;depth<400;depth++)text=depth%2?`[ ${text} = {} ]`:`{ k: ${text} = [] }`;
 const source=`var leaf;\n(${text} = []);\nconsole.log(leaf.name, Object.getOwnPropertyDescriptor(leaf, 'name').configurable);\n`;
 await compare('stress',source);
},600000);

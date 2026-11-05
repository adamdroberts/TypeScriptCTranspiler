import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* ForIn/OfBodyEvaluation with a `var` ForBinding that is a pattern performs
 * BindingInitialization of the pattern against each iteration value in the
 * function's variable environment: a null or undefined value for an object
 * pattern throws a TypeError, an array pattern consumes and closes an inner
 * iterator, defaults evaluate per iteration, and a throw or return inside
 * the binding or body closes the outer iterator. Generated loops sit inside
 * functions (plain, arrow, generator, nested blocks) and at module level;
 * one deeply nested pattern is the stress input. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const patterns=[
 {text:'[a, b = a + 1, ...rest]',use:'a, b, rest.length'},
 {text:'[a = log("d"), [b = 2] = []]',use:'a, b'},
 {text:'{x, y: [z] = [9], ...others}',use:'x, z, Object.keys(others).length'},
 {text:'{x = 1, y: {z = x + 1} = {}}',use:'x, z'},
 {text:'[head, ...[tail = head]]',use:'head, tail'},
 {text:'{}',use:'"empty"'},
 {text:'[]',use:'"emptyarray"'},
 {text:'[closed]',use:'closed'},
 {text:'{length}',use:'length'},
];
const values=['[[1, 2, 3], [4]]','[{x: 1, y: [2], w: 3}, {x: 5}]','[null]','[undefined]','["ab", "cd"]','[closing(), closing()]','closingOf([[1, 2], [3], [4, 5, 6]])','closingOf([{x: 1}, {x: 2, y: [3]}])','[1]','[[{}]]','{a: 1, bb: 2}'];
const owners=[
 (body:string)=>`function f() { ${body} } f();`,
 (body:string)=>`(() => { { ${body} } })();`,
 (body:string)=>`function* g() { ${body} } for (const _ of g());`,
 (body:string)=>`function f() { if (true) { try { ${body} } catch (e) { out.push("inner " + e.constructor.name); } } } f();`,
 (body:string)=>`{ ${body} }`,
];
function program(random:()=>number,count:number):string{
 let text=`const out = [];
const log = (v) => { out.push("log " + v); return v; };
let closes = 0;
const closingOf = (items) => ({ [Symbol.iterator]() { let i = 0; return { next() { return { value: items[i++], done: i > items.length }; }, return() { closes++; return {}; } }; } });
const closing = () => closingOf([0, 1, 2]);
`;
 for(let index=0;index<count;index++){
  const pattern=patterns[Math.floor(random()*patterns.length)]!;
  const value=values[Math.floor(random()*values.length)]!;
  const inOrOf=random()<0.2?'in':'of';
  const owner=Math.floor(random()*owners.length);
  // A module-level `return` would leave the CommonJS wrapper before the output is printed.
  const exit=random()<0.2?(owner===owners.length-1?'break;':'return;'):random()<0.3?'break;':random()<0.3?'throw new RangeError("stop");':'';
  const body=`try { for (var ${pattern.text} ${inOrOf} ${value}) { out.push(String([${pattern.use}])); ${exit} } out.push("done"); } catch (e) { out.push(e.constructor.name); } out.push("closes " + closes);`;
  text+=owners[owner]!(body)+'\n';
 }
 return text+'console.log(out.join("\\n"));\n';
}
function stressProgram(depth:number):string{
 let pattern='v',value='0';
 for(let level=0;level<depth;level++){pattern=level%2?`[${pattern}]`:`{k: ${pattern}}`;value=level%2?`[${value}]`:`{k: ${value}}`;}
 return `function f() { const out = []; for (var ${pattern} of [${value}, ${value}]) out.push(v); for (var ${pattern} in {}) {} return out; }\nconsole.log(f().join(","));\n`;
}
async function compare(name:string,source:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-iteration-var-'));
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

test('var patterns in for-of and for-in heads bind and throw like Node',async()=>{
 // 40 blocks: the source analysis cost of closures plus caught unknown
 // exceptions grows superlinearly with the block count (80 exceed the memory budget), an open analysis item.
 await compare('loops',program(rng(0xf0f0),40));
},600000);

test('one deeply nested var pattern head',async()=>{
 await compare('stress',stressProgram(60));
},600000);

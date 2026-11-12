import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* Primitive prototype methods in the source analysis: a String, Number or
 * BigInt method called on a primitive receiver with primitive arguments runs
 * no user code, so it must not invalidate the global bindings that a later
 * direct eval and a sloppy global constructor depend on. Generated programs
 * chain random represented methods before an eval of a global holding a
 * literal source. match, matchAll and search given a String create a RegExp
 * and call its overridable methods, which may rewrite that global, so they
 * stay opaque and a program that calls one before the same eval is rejected; split, replace and replaceAll look up a
 * pattern's @@split or @@replace only when the pattern is an Object. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const stringCalls=['toLowerCase()','toUpperCase()','trim()','at(0)','charAt(1)','charCodeAt(0)','codePointAt(1)','concat("x",1)','includes("a")','indexOf("b",1)','lastIndexOf("a")','startsWith("a")','endsWith("c")','repeat(2)','padStart(5,"-")','padEnd(6,"*")','slice(1)','substring(0,2)','substr(1,1)','trimStart()','trimEnd()','normalize("NFC")','isWellFormed()','toWellFormed()','localeCompare("b")','anchor("n")','bold()','link("u")','toLocaleLowerCase()','toLocaleUpperCase()'];
const numberCalls=['toFixed(2)','toExponential(1)','toPrecision(3)','toLocaleString()'];
const opaqueCalls=['match("a")','matchAll("a")','search("c")'];

function program(random:()=>number,calls:number,opaque:boolean):string{
 const lines=['function Marker(message){if(!(this instanceof Marker))return new Marker(message);this.message=message;}','var total="";','var source="\'ok\'";'];
 for(let index=0;index<calls;index++){
  const kind=random();
  if(kind<0.6)lines.push(`total+=String(${JSON.stringify('abc'+index)}.${stringCalls[Math.floor(random()*stringCalls.length)]});`);
  else if(kind<0.9)lines.push(`total+=String((${(random()*1000).toFixed(3)}).${numberCalls[Math.floor(random()*numberCalls.length)]});`);
  else lines.push(`total+=String(${Math.floor(random()*100)}n.toLocaleString());`);
 }
 if(opaque)lines.push(`total+=String("abc".${opaqueCalls[Math.floor(random()*opaqueCalls.length)]});`);
 lines.push('var marker=new Marker(total.length);','console.log(eval(source),typeof marker.message,total.length,total.slice(0,64));');
 return lines.join('\n');
}

async function compileOnce(source:string):Promise<{code:number;diagnostics:string[];stdout:string}>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-primitive-member-'));
 try{
  const entry=join(root,'main.js');await writeFile(entry,source);
  const diagnostics:string[]=[],output=join(root,'program');
  const built=await compile({entry,output,buildDir:join(root,'build'),diagnosticWriter:x=>diagnostics.push(x)});
  if(built.exitCode!==0)return {code:built.exitCode,diagnostics,stdout:''};
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  return {code:0,diagnostics,stdout:native.stdout.toString()};
 }finally{await rm(root,{recursive:true,force:true});}
}

function nodeOutput(source:string):string{
 const node=nodeReferenceSync(['node','-e',source],{stdout:'pipe',stderr:'pipe',timeout:60000});
 expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
 return node.stdout.toString();
}

test('represented primitive methods keep a later literal eval and global constructor finite',async()=>{
 const random=rng(0x9e3779b9);
 for(let index=0;index<6;index++){
  const source=program(random,8+index*3,false);
  const result=await compileOnce(source);
  expect({index,code:result.code,diagnostics:result.diagnostics}).toEqual({index,code:0,diagnostics:[]});
  expect(result.stdout).toBe(nodeOutput(source));
 }
},600_000);

test('a RegExp-protocol string method before the eval stays opaque and is rejected',async()=>{
 const result=await compileOnce(program(rng(0x1234),3,true));
 expect(result.code).not.toBe(0);
 expect(result.diagnostics.join('')).toContain('unknown eval() source');
},600_000);

test('one long chain of primitive method calls stays finite',async()=>{
 let expression='"Seed"';
 for(let index=0;index<1500;index++)expression=`${expression}.${stringCalls[index%stringCalls.length]}`.replace(/\.(charCodeAt|codePointAt|indexOf|lastIndexOf|localeCompare|includes|startsWith|endsWith|isWellFormed)\([^)]*\)$/,'.concat("k")');
 const source=`function Marker(m){if(!(this instanceof Marker))return new Marker(m);this.m=m;}\nvar text=${expression};\nconsole.log(eval("'ok'"),new Marker(text.length).m>=0,text.length);`;
 const result=await compileOnce(source);
 expect({code:result.code,diagnostics:result.diagnostics}).toEqual({code:0,diagnostics:[]});
 expect(result.stdout).toBe(nodeOutput(source));
},600_000);

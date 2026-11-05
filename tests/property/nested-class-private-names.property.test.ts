import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* A class nested in another class's element (a field initializer, a static
 * field initializer, a static block or a method) resolves a private name
 * through the innermost class that declares it: an inner declaration of
 * `#m` shadows the outer one for the inner body, an outer reference never
 * sees the inner declaration, and an access through the wrong brand throws
 * a TypeError. The nested class is created each time its element runs, so
 * every instance of the outer class carries a distinct inner brand.
 * Generated programs combine member kinds, element positions and shadowing;
 * one deep chain of nested classes is the stress input. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const kinds=[
 {declare:(v:string)=>`#m() { return ${v}; }`,read:'this.#m()'},
 {declare:(v:string)=>`get #m() { return ${v}; }`,read:'this.#m'},
 {declare:(v:string)=>`set #m(x) { this.seen = ${v}; }`,read:'(this.#m = 1, this.seen)'},
 {declare:(v:string)=>`#m = ${v};`,read:'this.#m'},
 {declare:(v:string)=>`static #m() { return ${v}; }`,read:'this.constructor.#m()'},
 {declare:(v:string)=>`static #m = ${v};`,read:'this.constructor.#m'},
];
function block(random:()=>number,index:number):string{
 const outer=kinds[Math.floor(random()*kinds.length)]!,inner=kinds[Math.floor(random()*kinds.length)]!;
 const shadow=random()<0.7;
 const innerBody=`${shadow?inner.declare(`"inner${index}"`):''} read() { return ${shadow?inner.read:outer.read}; } readOuter() { return ${outer.read}; }`;
 const innerClass=`class { ${innerBody} }`;
 const position=Math.floor(random()*5);
 const element=position===0?`Inner = ${innerClass};`:position===1?`static Inner = ${innerClass};`:position===2?`static { this.Inner = ${innerClass}; }`:position===3?`inner() { return ${innerClass}; }`:`inner = () => ${innerClass};`;
 return `{ class Outer { ${outer.declare(`"outer${index}"`)} ${element} readOuter() { return ${outer.read}; } }
  const o = new Outer(); const Inner = ${position===0?'o.Inner':position===1||position===2?'Outer.Inner':position===3?'o.inner()':'o.inner()'}; const i = new Inner();
  for (const step of [() => i.read(), () => i.readOuter(), () => o.readOuter(), () => Inner.prototype.read.call(o), () => Outer.prototype.readOuter.call(i)${position===0?', () => new (new Outer().Inner)().read(), () => i.read.call(new (new Outer().Inner)())':''}]) {
    try { out.push(String(step())); } catch (e) { out.push(e.constructor.name); }
  }
}
`;
}
function program(random:()=>number,count:number):string{
 let text='const out = [];\n';
 for(let index=0;index<count;index++)text+=block(random,index);
 return text+'console.log(out.join("\\n"));\n';
}
function stressProgram(depth:number):string{
 let text='class C0 { #m() { return 0; } read() { return this.#m(); } ';
 for(let level=1;level<=depth;level++)text+=`Next${level} = class { #m() { return ${level}; } read() { return this.#m(); } `;
 text+='}'.repeat(depth)+' }\n';
 text+=`let o = new C0(); const out = [o.read()];\nfor (let level = 1; level <= ${depth}; level++) { o = new o['Next' + level](); out.push(o.read()); }\nconsole.log(out.join(","));\n`;
 return text;
}
async function compare(name:string,source:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-nested-private-'));
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

test('nested classes resolve shadowed private names like Node',async()=>{
 await compare('nested',program(rng(0x9e57),40));
},600000);

test('one deep chain of nested classes each shadowing #m',async()=>{
 await compare('stress',stressProgram(40));
},600000);

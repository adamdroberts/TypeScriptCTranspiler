import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* A static ClassElement whose PropName is "constructor" is an ordinary
 * static method (only a non-static "constructor" is the class constructor
 * and may not be a special method). TypeScript's parser calls it a
 * ConstructorDeclaration and parses its body without the async or generator
 * context of its modifiers; the source parse shadows the name so the member
 * parses as the static method it is. Generated classes mix every spelling
 * of the name, every method kind, bodies that await or yield, a real
 * constructor beside it and derived classes reaching it through super; one
 * deep derived chain of static async constructors is the stress input. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const spellings=['constructor','"constructor"',"'constructor'",'["constructor"]','["con" + "structor"]','\\u0063onstructor'];
type Kind='plain'|'async'|'generator'|'asyncGenerator'|'getter';
const kinds:Kind[]=['plain','async','generator','asyncGenerator','getter'];
function member(kind:Kind,name:string,index:number,self:string,derived:boolean):string{
 const parent=derived?`super.constructor`:'';
 switch(kind){
  case 'plain':return `static ${name}(x) { return [x + ${index}, this === ${self}${derived?`, ...${parent}(x)`:''}]; }`;
  case 'async':return `static async ${name}(x) { await null; const y = ${derived?`await ${parent}(x)`:'[x]'}; return [x + ${index}, this === ${self}, ...y]; }`;
  case 'generator':return `static *${name}(x) { yield x + ${index}; ${derived?`yield* ${parent}(x);`:''} yield this === ${self}; }`;
  case 'asyncGenerator':return `static async *${name}(x) { await null; yield x + ${index}; ${derived?`yield* ${parent}(x);`:''} yield this === ${self}; }`;
  case 'getter':return `static get ${name}() { return 'got' + ${index}; }`;
 }
}
function invoke(kind:Kind,index:number):string{
 const K=`K${index}`;
 switch(kind){
  case 'plain':return `out.push(JSON.stringify(${K}.constructor(${index})));`;
  case 'async':return `out.push(JSON.stringify(await ${K}.constructor(${index})));`;
  case 'generator':return `out.push(JSON.stringify([...${K}.constructor(${index})]));`;
  case 'asyncGenerator':return `{ const items = []; for await (const item of ${K}.constructor(${index})) items.push(item); out.push(JSON.stringify(items)); }`;
  case 'getter':return `out.push(String(${K}.constructor));`;
 }
}
function block(random:()=>number,index:number):string{
 const kind=kinds[Math.floor(random()*kinds.length)]!;
 const name=spellings[Math.floor(random()*spellings.length)]!;
 const derived=kind!=='getter'&&random()<0.4;
 const realConstructor=random()<0.6?`constructor() { ${derived?'super(); ':''}this.v = ${index}; }`:'';
 const base=derived?`class B${index} { ${member(kind,'constructor',index+1000,`B${index}`,false)} }`:'';
 const before=random()<0.5;
 const cls=`class K${index}${derived?` extends B${index}`:''} { ${before?realConstructor:''} ${member(kind,name,index,`K${index}`,derived)} ${before?'':realConstructor} static other() { return 'other'; } }`;
 return `{ ${base}
  ${cls}
  const d = Object.getOwnPropertyDescriptor(K${index}, 'constructor');
  out.push([K${index}.hasOwnProperty('constructor'), K${index}.prototype.hasOwnProperty('constructor'), K${index}.prototype.constructor === K${index}, typeof K${index}.constructor, d.enumerable, d.writable === true || typeof d.get === 'function', K${index}.constructor.name === 'constructor' || K${index}.constructor.name === 'get constructor', new K${index}().v, K${index}.other()].join());
  ${invoke(kind,index)}
}
`;
}
function program(random:()=>number,count:number):string{
 let text='const out = [];\n(async () => {\n';
 for(let index=0;index<count;index++)text+=block(random,index);
 return text+'console.log(out.join("\\n"));\n})();\n';
}
function stressProgram(depth:number):string{
 let text='class K0 { static async constructor(n) { await null; return n; } }\n';
 for(let level=1;level<=depth;level++)text+=`class K${level} extends K${level-1} { static async constructor(n) { return (await super.constructor(n)) + 1; } }\n`;
 return text+`K${depth}.constructor(0).then(value => console.log(value, K${depth}.hasOwnProperty('constructor'), new K${depth}() instanceof K0));\n`;
}
async function compare(name:string,source:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-static-ctor-'));
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

test('static methods named constructor of every kind and spelling behave like Node',async()=>{
 await compare('kinds',program(rng(0x5c70),60));
},600000);

test('one deep chain of static async constructors reaching super',async()=>{
 await compare('stress',stressProgram(200));
},600000);

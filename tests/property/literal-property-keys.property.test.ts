import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* PropName of a LiteralPropertyName is ToString of its NumericLiteral value,
 * for a DecimalBigIntegerLiteral included (`{ 0x10n: 1 }` defines "16",
 * `{ 1e21: 1 }` defines "1e+21"), in object literals, class bodies, binding
 * patterns and assignment patterns alike. Generated programs spell keys in
 * every literal form and read the resulting own property names and values
 * back; one wide literal is the stress input. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const spellings=['1','1.0','.5','1e3','1e21','0x10','0b11','0o17','1_000','999999999999999999','0.1e-7','1n','0x10n','0b11n','0o17n','1_000n','999999999999999999n','"16"','"1e+21"','"0x10"','sixteen','__proto__'];
function key(random:()=>number):string{return spellings[Math.floor(random()*spellings.length)]!;}
const ref=(k:string):string=>/^[A-Za-z_]/.test(k)?JSON.stringify(k):k;
function program(random:()=>number,count:number):string{
 let text=`const out = [];
const show = (o) => out.push(Object.getOwnPropertyNames(o).map(k => k + '=' + (k === 'constructor' ? 'ctor' : typeof o[k] === 'function' ? o[k]() : String(o[k]))).join(','));
`;
 for(let index=0;index<count;index++){
  const k=key(random),k2=key(random);
  switch(Math.floor(random()*5)){
   case 0:text+=`show({ ${k}: ${index}, ${k2}() { return 'm'; }, get ${key(random)}() { return 'g'; } });\n`;break;
   case 1:text+=`{ class C { ${k}() { return 'i'; } static ${k2}() { return 's'; } static ${key(random)} = ${index}; } show(C); show(C.prototype); }\n`;break;
   case 2:text+=`{ const { ${k}: a = 'dflt', ${k2}: b } = { ${k}: ${index}, "16": 'sixteen', "3": 'three', "1e+21": 'big' }; out.push(String(a) + '|' + String(b)); }\n`;break;
   case 3:text+=`{ let a, b; ({ ${k}: a, ${k2}: b = 'dflt' } = { ${k2}: ${index}, "1": 'one', "1000": 'thousand' }); out.push(String(a) + '|' + String(b)); }\n`;break;
   default:text+=`{ const o = { ${k}: 'first', ${k==='__proto__'?'x':k2}: 'second' }; out.push(JSON.stringify(o), String(${ref(k)} in o), String(o[${ref(k2)}])); }\n`;
  }
 }
 return text+'console.log(out.join("\\n"));\n';
}
function stressProgram(width:number):string{
 let text='const o = { ';
 for(let index=0;index<width;index++)text+=`${index%3===0?`${index}n`:index%3===1?`0x${index.toString(16)}n`:`${index}.0`}: ${index}, `;
 text+=`};\nconsole.log(Object.getOwnPropertyNames(o).length, o[0], o[${width-1}], Object.keys(o).every((k, i) => k === String(i)));\n`;
 return text;
}
async function compare(name:string,source:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-literal-keys-'));
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

test('numeric, BigInt and string literal keys name the same properties as Node',async()=>{
 await compare('keys',program(rng(0xb16),60));
},600000);

test('one wide literal of BigInt and numeric keys',async()=>{
 await compare('stress',stressProgram(1500));
},600000);

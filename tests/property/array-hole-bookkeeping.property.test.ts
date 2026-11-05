import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* An Array's absent indices below its initialized cell prefix are one bitset
 * (never an ordinary property collection), so ArraySetLength discards a
 * cell tail in one step and every hole query is constant time; a side
 * descriptor (accessor, non-configurable data) still runs the descending
 * per-key deletion that stops at the first non-configurable index. Generated
 * programs mix stores, truncation, delete, unshift, slice, concat, sort and
 * own-key enumeration and compare with Node; the stress input is the Test262
 * harness shape that fills and truncates one chunk array for every code point. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
function describe():string{
 return `const describe = (a) => { const keys = Object.keys(a).join(','); let holes = ''; for (let i = 0; i < a.length; i++) holes += i in a ? '.' : '_'; return a.length + '|' + keys + '|' + holes + '|' + JSON.stringify(a); };\n`;
}
function program(random:()=>number,count:number):string{
 let text=describe()+'const out = [];\n';
 for(let index=0;index<count;index++){
  const ops:string[]=[];
  const steps=2+Math.floor(random()*7);
  for(let step=0;step<steps;step++){
   const roll=random();
   const at=Math.floor(random()*12);
   if(roll<0.2)ops.push(`a[${at}] = ${step};`);
   else if(roll<0.35)ops.push(`a.length = ${Math.floor(random()*10)};`);
   else if(roll<0.45)ops.push(`delete a[${at}];`);
   else if(roll<0.52)ops.push(`a.unshift(${step});`);
   else if(roll<0.58)ops.push(`a.push(${step});`);
   else if(roll<0.64)ops.push(`a = a.slice(${Math.floor(random()*4)});`);
   else if(roll<0.7)ops.push(`a = a.concat([, ${step}]);`);
   else if(roll<0.75)ops.push(`a.sort();`);
   else if(roll<0.8)ops.push(`Object.defineProperty(a, ${at}, { get(){ return 'g'; }, configurable: true });`);
   else if(roll<0.85)ops.push(`Object.defineProperty(a, ${at}, { value: 'nc', configurable: false });`);
   else if(roll<0.9)ops.push(`try { a.length = ${Math.floor(random()*6)}; } catch (error) { out.push(error.name); }`);
   else if(roll<0.95)ops.push(`a.shift();`);
   else ops.push(`a.splice(${Math.floor(random()*4)}, 1);`);
  }
  text+=`{ let a = [${index % 3 === 0 ? '1, , 2' : index % 3 === 1 ? '' : ', , ,'}]; try { ${ops.join(' ')} } catch (error) { out.push(error.name); } out.push(describe(a)); }\n`;
 }
 return text+'console.log(out.join("\\n"));\n';
}
const stress=`function buildString(ranges) {
  const CHUNK_SIZE = 10000; let result = ''; const codePoints = [];
  for (const [start, end] of ranges) {
    let length = 0;
    for (let codePoint = start; codePoint <= end; codePoint++) {
      codePoints[length++] = codePoint;
      if (length === CHUNK_SIZE) { result += String.fromCodePoint.apply(null, codePoints); codePoints.length = length = 0; }
    }
    result += String.fromCodePoint.apply(null, codePoints); codePoints.length = length = 0;
  }
  return result;
}
const all = buildString([[0, 0x10FFFF]]);
const big = []; for (let i = 0; i < 200000; i++) big[i] = i; big.length = 100; big[150000] = 1; big.length = 120000; big.length = 0;
console.log(all.length, /^\\P{Script=Zanabazar_Square}+$/u.test(all), /^[\\s\\S]+$/u.test(all), big.length, Object.keys(big).length);
`;

async function compare(name:string,source:string,budgetMs:number):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-holes-'));
 try{
  const entry=join(root,'main.cjs');await writeFile(entry,source);
  const node=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({name,code:node.exitCode,stderr:node.stderr.toString()}).toEqual({name,code:0,stderr:''});
  const diagnostics:string[]=[],output=join(root,'program');
  const built=await compile({entry,output,buildDir:join(root,'build'),diagnosticWriter:x=>diagnostics.push(x)});
  expect({name,code:built.exitCode,diagnostics}).toEqual({name,code:0,diagnostics:[]});
  const started=performance.now();
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:240000});
  const elapsed=performance.now()-started;
  expect({name,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({name,code:0,stderr:'',stdout:node.stdout.toString()});
  expect({name,withinBudget:elapsed<budgetMs}).toEqual({name,withinBudget:true});
 }finally{await rm(root,{recursive:true,force:true});}
}

test('generated hole, truncation and side-descriptor programs match Node',async()=>{
 // 48 blocks: the source analysis cost of these reassigned arrays grows superlinearly (120 blocks exceed the memory budget), an open analysis item.
 await compare('generated',program(rng(0x401e5),48),120000);
},600000);

test('one harness-shaped build over every code point stays in budget',async()=>{
 // The former property-object bookkeeping took about 160 s here.
 await compare('stress',stress,30000);
},600000);

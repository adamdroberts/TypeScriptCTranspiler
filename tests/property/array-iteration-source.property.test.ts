import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildProgram} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* Every Array.prototype native that calls a callback per element (forEach,
 * map, filter, find, findLast, findIndex, findLastIndex, some, every,
 * flatMap, reduce, reduceRight) is one iteration model: the callback sees the
 * element values, its returns form the result by mode, and the result keeps
 * flowing. The verdict is observable through eval: a source text that
 * reaches eval only through such a native stays a finite choice set (an
 * eval result is an unknown value, so the programs report only its typeof
 * or comparisons, and a reduce accumulating texts is unbounded by design).
 * Generated programs route the sources through random chains of the natives
 * and compare the compiled output with Node; one deep chain is the stress. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const prelude='const executeSource = eval;\nfunction read(body = "17;") { return executeSource(body); }\nconst sources = ["1;", "2;", "3;"];\nconst out = [];\n';
// Each shape consumes a list of source texts and reports values read from
// them; cb builds the callback as a function expression or an arrow.
type Callback=(params:string,body:string)=>string;
const shapes:((l:string,cb:Callback)=>string)[]=[
 (l,cb)=>`${l}.forEach(${cb('s','out.push(typeof read(s));')});`,
 (l,cb)=>`out.push(${l}.map(${cb('s','return typeof read(s);')}).join(","));`,
 (l,cb)=>`out.push(${l}.filter(${cb('s','return read(s) > 1;')}).join("|"));`,
 (l,cb)=>`out.push(typeof read(${l}.find(${cb('s','return s === "2;";')})));`,
 (l,cb)=>`out.push(typeof read(${l}.findLast(${cb('s','return s !== "3;";')})));`,
 (l,cb)=>`out.push(typeof read(${l}[${l}.findIndex(${cb('s','return s === "3;";')})]));`,
 (l,cb)=>`out.push(typeof read(${l}[${l}.findLastIndex(${cb('s','return s === "1;";')})]));`,
 (l,cb)=>`out.push(${l}.some(${cb('s','return read(s) === 2;')}), ${l}.every(${cb('s','return read(s) > 0;')}));`,
 (l,cb)=>`${l}.flatMap(${cb('s','return [s, s + "4;"];')}).forEach(${cb('s','out.push(typeof read(s));')});`,
 (l,cb)=>`out.push(typeof read(${l}.reduce(${cb('acc, s','return s;')}, "")));`,
 (l,cb)=>`out.push(typeof read(${l}.reduceRight(${cb('acc, s','return acc;')})));`,
 (l,cb)=>`out.push(${l}.map(${cb('s, i, a','return read(a[i]) + i;')}).join());`,
 (l,cb)=>`out.push(${l}.filter(function (s) { return read(s) !== this.skip; }, { skip: 2 }).length);`,
];
function statement(random:()=>number):string{
 const shape=shapes[Math.floor(random()*shapes.length)]!;
 const cb:Callback=random()<0.5?(params,body)=>`function (${params}) { ${body} }`:(params,body)=>`(${params}) => { ${body} }`;
 const list=random()<0.5?'sources':'sources.map(function (s) { return s; })';
 return shape(list,cb)+'\n';
}
function program(random:()=>number,count:number,depth:number):string{
 let source=prelude;
 for(let index=0;index<count;index++)source+=statement(random);
 let chain='sources';for(let level=0;level<depth;level++)chain=`${chain}.map(function (s) { return s; })`;
 source+=`${chain}.forEach(function (s) { out.push(typeof read(s)); });\nconsole.log(out.join(","));\n`;
 return source;
}
function choices(entry:string):(readonly string[]|null)[]{
 const built=buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]});
 return sourceEvaluationInvocations(built.program,{roots:[entry]}).filter(call=>call.operation==='eval').map(call=>call.choices);
}

test('sources reaching eval through every callback native stay finite and run like Node',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-array-iteration-'));
 try{
  const source=program(rng(0x17e4),40,60);
  const entry=join(root,'main.cjs');await writeFile(entry,source);
  const node=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const verdicts=choices(entry);
  expect(verdicts.length).toBeGreaterThan(0);
  expect(verdicts.every(choice=>choice!==null)).toBe(true);
  const texts=new Set(verdicts.flatMap(choice=>[...choice!]));
  for(const text of ['1;','2;','3;','1;4;','','17;'])expect({text,known:texts.has(text)}).toEqual({text,known:true});
  const diagnostics:string[]=[],output=join(root,'program');
  const built=await compile({entry,output,buildDir:join(root,'build'),diagnosticWriter:x=>diagnostics.push(x)});
  expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:node.stdout.toString()});
 }finally{await rm(root,{recursive:true,force:true});}
},600000);

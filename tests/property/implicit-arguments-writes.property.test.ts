import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildProgram} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* In sloppy code the implicit `arguments` binding of a non-arrow function is
 * mutable: every assignment target form (plain, compound, update, for-of
 * and for-await-of heads, array and object patterns with defaults, rest,
 * nested patterns) writes the binding that later reads and inner arrows
 * observe. Generated functions mix the forms with random pattern nesting;
 * one function nests the pattern deeply. The analysis side: a sloppy
 * assignment that creates a global through a pattern default keeps the
 * global's value known, so a String conversion of it does not make eval
 * sources unknown. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
function wrap(target:string,source:string,depth:number):[string,string]{
 for(let level=0;level<depth;level++){target=`[${target}]`;source=`[${source}]`;}
 return [target,source];
}
function form(random:()=>number,value:number,asyncFunction:boolean):string{
 const depth=Math.floor(random()*3);
 const choice=Math.floor(random()*(asyncFunction?12:10));
 switch(choice){
  case 0:return `arguments = ${value};`;
  case 1:return `arguments += ${value};`;
  case 2:return 'arguments++;';
  case 3:return `for (arguments of [${value}]);`;
  case 4:{const [t,s]=wrap('arguments',`${value}`,depth);return `[${t}] = [${s}];`;}
  case 5:{const [t,s]=wrap(`arguments = ${value}`,'',depth);return `[${t}] = [${s}];`;}
  case 6:{const [t,s]=wrap(`arguments = ${value}`,'',depth);return `({a: [${t}]} = {a: [${s}]});`;}
  case 7:return `({arguments} = {arguments: ${value}});`;
  case 8:return `[...arguments] = [${value}, ${value+1}];`;
  case 9:{const [t,s]=wrap(`arguments = ${value}`,'',depth);return `for ([${t}] of [[${s}]]);`;}
  case 10:{const [t,s]=wrap(`arguments = ${value}`,'',depth);return `for await ([${t}] of [[${s}]]);`;}
  default:return `for await (arguments of [${value}]);`;
 }
}
const showSource='(v) => typeof v === "object" && v !== null ? Object.prototype.toString.call(v) + ":" + JSON.stringify(Array.from(v)) : String(v)';
function fn(index:number,body:string,asyncFunction:boolean):string{
 return `${asyncFunction?'async ':''}function f${index}(p) { const before = show(arguments); const inner = () => arguments; ${body} return [before, show(arguments), show(inner()), p]; }\n`;
}
function program(random:()=>number,count:number,stressDepth:number):string{
 let source=`const show = ${showSource};\nconst out = [];\n`;
 const calls:string[]=[];
 for(let index=0;index<count;index++){
  const asyncFunction=random()<0.5;
  source+=fn(index,form(random,index%7+1,asyncFunction),asyncFunction);
  calls.push(`out.push(${asyncFunction?'await ':''}f${index}(${index}));`);
 }
 const [t,s]=wrap('arguments = 9','',stressDepth);
 source+=fn(count,`[${t}] = [${s}];`,false);calls.push(`out.push(f${count}("deep"));`);
 source+=`(async () => { ${calls.join(' ')} console.log(JSON.stringify(out)); })();\n`;
 return source;
}

async function compare(name:string,source:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-arguments-writes-'));
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

test('every sloppy write form to implicit arguments is observed by later reads like Node',async()=>{
 const source=program(rng(0x4a11),48,300);
 expect(source.split('\n').filter(line=>/for await/.test(line)).length).toBeGreaterThan(2);
 await compare('forms',source);
},600000);

function choices(entry:string):(readonly string[]|null)[]{
 const built=buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]});
 return sourceEvaluationInvocations(built.program,{roots:[entry]}).filter(call=>call.operation==='eval').map(call=>call.choices);
}

test('a global created by a sloppy pattern default keeps a known value for the analysis',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-arguments-analysis-'));
 try{
  const deep=wrap('g = 4','',300);
  const cases:[string,string,boolean][]=[
   ['array-default','const x = eval;\n[g = 4] = [];\nconst s = String(g);\nx("1;");\n',true],
   ['object-default','const x = eval;\n({h = 5} = {});\nconst s = String(h);\nx("1;");\n',true],
   ['plain','const x = eval;\nk = 6;\nconst s = String(k);\nx("1;");\n',true],
   ['deep-default',`const x = eval;\n[${deep[0]}] = [${deep[1]}];\nconst s = String(g);\nx("1;");\n`,true],
  ];
  for(const [name,source,finite] of cases){
   const entry=join(directory,`${name}.js`);await writeFile(entry,source);
   const observed=choices(entry);
   expect({name,finite:observed.length>0&&observed.every(choice=>choice!==null)}).toEqual({name,finite});
  }
 }finally{await rm(directory,{recursive:true,force:true});}
},600000);

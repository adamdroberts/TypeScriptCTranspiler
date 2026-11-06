import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildProgram} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* RegExp values in the source analysis: a literal or a construction is an
 * object whose prototype is %RegExp.prototype%, whose flag accessors answer
 * from its [[OriginalSource]] / [[OriginalFlags]] (canonical flag order,
 * EscapeRegExpPattern for constructed patterns), whose methods and the
 * String methods dispatching to them give typed results (booleans, numbers,
 * strings, match arrays), and whose string conversion is "/source/flags".
 * Before, every regular expression was an opaque value whose string
 * conversion in a message escaped every global binding; now a trailing
 * direct eval stays finite. Generated programs mix literals, constructions
 * and uses and run like Node; one program of many literals is the stress
 * input. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const patterns=['a','a+b','[/]','\\/','(?<n>x)','.','x{2}','\\d+','[a-z]*','^$'];
const flagSets=['','g','i','gi','m','s','u','y','d','gimsuyd','v'];
function block(random:()=>number,index:number):string{
 const pattern=patterns[Math.floor(random()*patterns.length)]!,flags=flagSets[Math.floor(random()*flagSets.length)]!;
 const literal=random()<0.5;
 const expression=literal?`/${pattern}/${flags}`:random()<0.5?`new RegExp(${JSON.stringify(pattern)}, ${JSON.stringify(flags)})`:`RegExp(${JSON.stringify(pattern)}${flags?`, ${JSON.stringify(flags)}`:''})`;
 const use=Math.floor(random()*9);
 const line=use===0?`out.push(r.flags, r.source, String(r), typeof r, r instanceof RegExp);`
  :use===1?`out.push(r.global, r.ignoreCase, r.multiline, r.dotAll, r.unicode, r.unicodeSets, r.sticky, r.hasIndices, r.lastIndex);`
  :use===2?`out.push(r.test("xab/ab"), String(r.exec("aaab")), r.lastIndex);`
  :use===3?`out.push(JSON.stringify("x/ab aab".match(r)), "aab".search(r), JSON.stringify("a/b/c".split(r)));`
  :use===4?`out.push("abab".replace(r, "_"), "abab".replace(r, (m) => "[" + m + "]"));`
  :use===5?`out.push(Object.getPrototypeOf(r) === RegExp.prototype, Object.keys(r).length, "" + r, \`\${r}\`);`
  :use===6?`{ const m = r.exec("ab"); out.push(m === null ? "null" : [m.index, m.input, m.length, typeof m.groups].join()); }`
  :use===7?`out.push(r.toString(), RegExp.prototype.toString.call(r), r.compile === RegExp.prototype.compile);`
  :`try { out.push(String(new RegExp(r, "g").flags), new RegExp(r).source === r.source); } catch (e) { out.push(e.constructor.name); }`;
 return `{ const r = ${expression}; try { ${line} } catch (e) { out.push("error " + e.constructor.name); } assertLike(r, ${index}); }\n`;
}
function program(random:()=>number,count:number):string{
 let text=`const executeSource = eval;
const out = [];
function assertLike(actual, expected) { if (actual === expected) return; out.push("assertion " + String(actual) + " " + String(expected)); }
`;
 for(let index=0;index<count;index++)text+=block(random,index);
 return text+'out.push(String(executeSource("17;")));\nconsole.log(out.join("\\n"));\n';
}
function stressProgram(count:number):string{
 let text='const out = [];\n';
 for(let index=0;index<count;index++)text+=`out.push(/p${index}/${index%2?'g':''}.flags + /p${index}/.source.length);\n`;
 return text+'console.log(out.length, out[0], out[out.length - 1], String(eval("17;")));\n';
}
async function compare(name:string,source:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-regexp-values-'));
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
async function verdict(source:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-regexp-values-verdict-'));
 try{
  const entry=join(root,'main.js');await writeFile(entry,source);
  const built=buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]});
  const calls=sourceEvaluationInvocations(built.program,{roots:[entry]}).filter(call=>call.operation==='eval');
  expect(calls.map(call=>call.choices)).toEqual([['17;']]);
 }finally{await rm(root,{recursive:true,force:true});}
}

test('regular expression values keep the eval source finite and behave like Node',async()=>{
 const source=program(rng(0x4e6e),40);
 await verdict(source);
 await compare('values',source);
},600000);

test('one program of many regular expression literals',async()=>{
 const source=stressProgram(300);
 await verdict(source);
 await compare('stress',source);
},600000);

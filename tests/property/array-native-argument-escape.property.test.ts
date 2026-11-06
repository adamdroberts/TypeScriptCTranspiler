import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildProgram} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {compile} from '../../src/compile';
import {runtimeArrayPrototypeMethods} from '../../src/global-bindings';
import {nodeReferenceSync} from './node-reference';

/* An opaque Array.prototype native invokes only its callback or comparator
 * argument as a function; every other argument (thisArg, search element,
 * fill value, separator, ...) is read, so a function passed there keeps its
 * own argument facts. The analysis verdict is observable through the eval
 * source of a helper: a helper that escapes as a callee gets an unknown
 * source, one that is only stored or compared keeps its finite source. Every
 * native from the runtime table is placed at every argument position (the
 * iteration natives have their own precise model and are covered by
 * array-iteration-source); one long program of non-callback placements is
 * the stress input. */

const CALLBACK_NATIVES=new Set(['forEach','map','flatMap','filter','some','every','find','findIndex','findLast','findLastIndex','reduce','reduceRight','sort','toSorted']);
// Natives with their own model: the iteration natives invoke the callback
// with the element values, so a helper passed there keeps a finite source.
const PRECISE_NATIVES=new Set(['forEach','map','flatMap','filter','some','every','find','findIndex','findLast','findLastIndex','reduce','reduceRight','push','toString','join','keys','values','entries']);
// toLocaleString forwards locales/options to element conversions whose
// locale validation is host-defined; the verdict test still covers it.
const RUNTIME_SKIP=new Set(['toLocaleString']);
const prelude='const executeSource=eval;function read(body="17;"){return executeSource(body);}\n';

function placement(name:string,position:number):string{
 const args=['0','1','2'].map((value,index)=>index===position?'read':value).slice(0,position+1);
 return `try{const r=[3,1,2].${name}(${args.join(', ')});out.push(${JSON.stringify(name+'@'+position)}, typeof r === 'object' && r !== null ? Object.prototype.toString.call(r) : typeof r);}catch(error){out.push(${JSON.stringify(name+'@'+position)}, error.name);}\n`;
}

function verdicts(source:string,entry:string):(readonly string[]|null)[]{
 const built=buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]});
 void source;
 return sourceEvaluationInvocations(built.program,{roots:[entry]}).filter(call=>call.operation==='eval').map(call=>call.choices);
}

test('only callback positions of Array natives make a passed helper an unknown callee',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-array-escape-'));
 try{
  const natives=[...runtimeArrayPrototypeMethods.keys()].filter(name=>!PRECISE_NATIVES.has(name));
  expect(natives.length).toBeGreaterThan(12);
  for(const name of natives)for(const position of [0,1,2]){
   const source=prelude+'const out=[];\n'+placement(name,position)+'read();\n';
   const entry=join(directory,`${name}-${position}.js`);await writeFile(entry,source);
   const choices=verdicts(source,entry);
   const unknown=CALLBACK_NATIVES.has(name)&&position===0;
   expect({name,position,choices}).toEqual({name,position,choices:unknown?[null]:[['17;']]});
  }
 }finally{await rm(directory,{recursive:true,force:true});}
},600000);

async function compare(name:string,source:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-array-escape-run-'));
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

test('non-callback placements compile with a finite eval source and run like Node',async()=>{
 let source=prelude+'const out=[];\n';
 // Precise natives (some, every, push, ...) are modelled by their own operations, not the opaque fallback this test covers.
 for(const name of runtimeArrayPrototypeMethods.keys())for(const position of [0,1,2])if(!RUNTIME_SKIP.has(name)&&!PRECISE_NATIVES.has(name)&&!(CALLBACK_NATIVES.has(name)&&position===0))source+=placement(name,position);
 source+='out.push(String(read()));\nconsole.log(out.join("\\n"));\n';
 await compare('placements',source);
},600000);

test('one long program of non-callback placements keeps the source finite',async()=>{
 let source=prelude+'const out=[];\n';
 const names=[...runtimeArrayPrototypeMethods.keys()].filter(name=>!CALLBACK_NATIVES.has(name)&&!PRECISE_NATIVES.has(name)&&!RUNTIME_SKIP.has(name));
 // 300 opaque call sites: the escape model's cost grows superlinearly with
 // the number of such sites (2000 exceed ten minutes), an open analysis item.
 for(let index=0;index<300;index++)source+=placement(names[index%names.length]!,index%3);
 source+='out.push(String(read()));\nconsole.log(out.length);\n';
 await compare('stress',source);
},600000);

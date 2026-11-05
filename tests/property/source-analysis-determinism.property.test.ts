import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildProgram} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* The source-value solver is a monotone fixpoint over fact collections whose
 * iteration traverses copied sources transitively. Its result must not depend
 * on the engine tier that runs it: a JavaScriptCore DFG fast path copied the
 * raw entries of a Set subclass on array spread, bypassing that traversal
 * once a spread site got hot, so the same program analyzed twice in one
 * process reached different fixpoints (and Test262 eval tests flipped between
 * pass and unsupported). Generated programs route each eval source through
 * prototype chains, arrows and conditionals; the analysis runs repeatedly in
 * one process and every run must report the same finite sources. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}

function program(random:()=>number,count:number):{source:string;expected:string[][]}{
 let text='const out = [];\n';
 const expected:string[][]=[];
 for(let index=0;index<count;index++){
  const form=Math.floor(random()*3);
  const left=`${index}`,right=`${index+1}`;
  text+=`{ const base${index} = { text: ${JSON.stringify(left)} }; const mid${index} = Object.create(base${index}); mid${index}.extra = ${JSON.stringify(' + '+right)}; const top${index} = Object.create(mid${index});\n`;
  if(form===0){
   text+=`  function f${index}(o) { return o.text + o.extra; } const g${index} = (o) => f${index}(o); out.push(eval(g${index}(top${index}))); }\n`;
   expected.push([`${left} + ${right}`]);
  }else if(form===1){
   text+=`  const pick${index} = (o, flag) => flag ? o.text + o.extra : o.text + " * 2"; out.push(eval(pick${index}(top${index}, out.length % 2 === 0))); }\n`;
   expected.push([`${left} + ${right}`,`${left} * 2`].sort());
  }else{
   text+=`  const parts${index} = [top${index}.text, top${index}.extra]; const join${index} = function () { return parts${index}.join(""); }; out.push(eval(join${index}.call(null))); }\n`;
   expected.push([`${left} + ${right}`]);
  }
 }
 return {source:text+'console.log(JSON.stringify(out));\n',expected};
}

function analyze(entry:string):(string[]|null)[]{
 const built=buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]});
 return sourceEvaluationInvocations(built.program,{roots:[entry]}).filter(call=>call.operation==='eval'&&call.direct).map(call=>call.choices===null?null:[...call.choices].sort());
}

test('repeated analyses of one program report identical finite eval sources',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-analysis-determinism-'));
 try{
  const {source,expected}=program(rng(0xd37e),40);
  const entry=join(directory,'main.cjs');await writeFile(entry,source);
  for(let run=0;run<12;run++){
   const choices=analyze(entry);
   expect({run,choices}).toEqual({run,choices:expected});
  }
 }finally{await rm(directory,{recursive:true,force:true});}
},600000);

test('the generated program runs like Node',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-analysis-determinism-run-'));
 try{
  const {source}=program(rng(0xd37e),40);
  const entry=join(root,'main.cjs');await writeFile(entry,source);
  const node=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const diagnostics:string[]=[],output=join(root,'program');
  const built=await compile({entry,output,buildDir:join(root,'build'),diagnosticWriter:x=>diagnostics.push(x)});
  expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:node.stdout.toString()});
 }finally{await rm(root,{recursive:true,force:true});}
},600000);

test('one long program keeps every eval source finite',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-analysis-determinism-stress-'));
 try{
  const {source,expected}=program(rng(0x5715),160);
  const entry=join(directory,'main.cjs');await writeFile(entry,source);
  expect(analyze(entry)).toEqual(expected);
 }finally{await rm(directory,{recursive:true,force:true});}
},600000);

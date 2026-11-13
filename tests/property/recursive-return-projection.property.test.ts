import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildProgram} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {nodeReferenceSync} from './node-reference';

// A recursive call's return projection belongs to a nested activation: its
// formal reads take that activation's arguments, never the outer call's. An
// eval of a recursive result is either unknown or contains the actual source.
function reference(source:string):string{
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30_000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});return node.stdout.toString().trimEnd();
}
async function choices(directory:string,source:string){
 const entry=join(directory,'main.js');await writeFile(entry,source);
 const program=buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]}).program;
 return sourceEvaluationInvocations(program,{host:'test262',roots:[entry]}).map(call=>call.choices);
}
// How the recursive step changes the carried text, and whether the analysis
// must keep it exact (the text never changes, only moves between formals).
const steps:Record<string,{call:string;exact:boolean}>={
 grow:{call:'x+"1"',exact:false},
 prefix:{call:'"1"+x',exact:false},
 keep:{call:'x',exact:true},
};
// The recursion shape: direct, through a second function, or as a method.
const shapes:Record<string,(step:string)=>string>={
 direct:step=>`function f(x,n){return n?f(${step},n-1):x}const r=f(SEED,N);`,
 mutual:step=>`function f(x,n){return n?g(${step},n-1):x}function g(x,n){return f(x,n)}const r=f(SEED,N);`,
 method:step=>`const o={f(x,n){return n?this.f(${step},n-1):x}};const r=o.f(SEED,N);`,
};
test('recursive return projections never substitute the outer activation\'s arguments',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-recursive-return-'));
 try{
  for(const [shapeName,shape] of Object.entries(shapes))for(const [stepName,step] of Object.entries(steps))for(const depth of [1,3]){
   const source=shape(step.call).replace('SEED',step.exact?'"5;"':'"1"').replace('N',String(depth))+'print(r);eval(r);';
   const actual=reference(source);
   const [found]=await choices(directory,source);
   const label={shapeName,stepName,depth};
   if(step.exact)expect({...label,found}).toEqual({...label,found:[actual]});
   else expect({...label,sound:found===null||found!.includes(actual)}).toEqual({...label,sound:true});
  }
  // The depth is unknown: a growing text has no finite domain.
  for(const shape of Object.values(shapes)){
   const source=shape('x+"1"').replace('SEED','"1"').replace('N','Math.floor(Math.random()*4)')+'eval(r);';
   expect(await choices(directory,source)).toEqual([null]);
  }
  // One stress: a 64-deep passthrough keeps its exact source.
  const stress='function f(x,n){return n?f(x,n-1):x}const r=f("7;",64);print(r);eval(r);';
  expect(reference(stress)).toBe('7;');
  expect(await choices(directory,stress)).toEqual([['7;']]);
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

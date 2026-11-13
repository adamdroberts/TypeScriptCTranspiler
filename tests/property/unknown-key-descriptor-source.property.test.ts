import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildProgram} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {nodeReferenceSync} from './node-reference';

// [[GetOwnProperty]] of a represented owner that is not a Proxy runs no code.
// With a key the analysis cannot enumerate, Object.getOwnPropertyDescriptor
// gives undefined or a fresh descriptor holding one of the owner's own values,
// so reading its fields never counts as unknown code.
function reference(source:string):string{
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30_000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});return node.stdout.toString();
}
async function choices(directory:string,name:string,source:string){
 const entry=join(directory,name+'.js');await writeFile(entry,source);
 const program=buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]}).program;
 return sourceEvaluationInvocations(program,{host:'test262',roots:[entry]}).map(call=>call.choices&&[...call.choices].sort());
}
// A block function is a global binding (Annex B), so code the analysis cannot
// see could call it with any argument.
const reader='{const execute=eval;function read(body){print(execute(body));}read("47;");}';
const builtins=['String','Number','Object','Array','Math','Reflect','Function.prototype'];
const fields:Record<string,string>={
 name:"if(typeof d.value==='function')print(d.value.name);",
 length:"if(typeof d.value==='function')print(d.value.length);",
 getter:"if(d.get)print(d.get.name);",
 setter:"if(d.set)print(typeof d.set);",
};
// Index keys of an unknown numeric string; the program always selects 0.
const key='const k=String(Math.floor(Math.random()*0));';
const owners:Record<string,{source:string;values:string[]}>={
 data:{source:'const o={0:"11;",1:"13;"};const d=Object.getOwnPropertyDescriptor(o,k);print(eval(d.value));',values:['11;','13;']},
 reflect:{source:'const o={0:"11;",1:"13;"};const d=Reflect.getOwnPropertyDescriptor(o,k);print(eval(d.value));',values:['11;','13;']},
 accessor:{source:'const o={get 0(){return "17;";},1:"19;"};const d=Object.getOwnPropertyDescriptor(o,k);print(eval(d.get()));',values:['17;']},
 own:{source:'const o=Object.create({0:"23;"});o[1]="29;";Object.defineProperty(o,0,{value:"31;"});const d=Object.getOwnPropertyDescriptor(o,k);print(eval(d.value));',values:['29;','31;']},
};

test('descriptors read under an unknown key keep unrelated and own sources finite',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-unknown-key-descriptor-'));
 try{
  for(const builtin of builtins)for(const [field,read] of Object.entries(fields)){
   const source=reader+`for(const name of Object.getOwnPropertyNames(${builtin})){const d=Object.getOwnPropertyDescriptor(${builtin},name);${read}}`;
   expect(reference(source).startsWith('47\n')).toBe(true);
   expect({builtin,field,choices:await choices(directory,'builtin',source)}).toEqual({builtin,field,choices:[['47;']]});
  }
  for(const [name,owner] of Object.entries(owners)){
   const source=key+owner.source,observed=reference(source).trimEnd()+';';
   const [found]=await choices(directory,name,source);
   expect({name,contains:found?.includes(observed),subset:found?.every(value=>owner.values.includes(value))}).toEqual({name,contains:true,subset:true});
  }
  // One stress: 64 builtin descriptor loops before one reader.
  let stress='';for(let index=0;index<64;index++)stress+=`for(const name of Object.getOwnPropertyNames(${builtins[index%builtins.length]})){const d=Object.getOwnPropertyDescriptor(${builtins[index%builtins.length]},name);${Object.values(fields)[index%4]}}`;
  stress+=reader;
  expect(reference(stress).trimEnd().split('\n').at(-1)).toBe('47');
  expect(await choices(directory,'stress',stress)).toEqual([['47;']]);
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

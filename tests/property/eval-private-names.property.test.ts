import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* PerformEval requires AllPrivateIdentifiersValid of the eval code against
 * the caller's private environment: a direct eval whose source names a
 * private name that no enclosing class of the call site declares throws a
 * SyntaxError before evaluating anything, while a name the caller's class
 * (or an outer class) declares resolves to that brand. The verdict is per
 * call site, so an absent name at one site must not make another site's
 * source unknown. Generated programs mix declaring and non-declaring
 * classes, nested evals and top-level evals; one program with many sites
 * is the stress input. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
function block(random:()=>number,index:number):string{
 const declares=random()<0.5;
 const name=random()<0.5?'#x':'#y';
 const member=random()<0.5?`${name} = ${index};`:`${name}() { return ${index}; }`;
 const read=member.includes('()')?`this.${name}()`:`this.${name}`;
 const site=Math.floor(random()*4);
 const source=JSON.stringify(`executed${index} = true; ${read}`);
 // Nested and arrow-creating sources are quoted at generation time: an
 // eval source built by JSON.stringify or String.prototype.slice inside a
 // function is an open analysis item, not a private-name question.
 const inner=JSON.parse(source) as string;
 const call=site===0?`eval(${source})`:site===1?`eval(${JSON.stringify(`eval(${source})`)})`:site===2?`(() => eval(${source}))()`:`eval(${JSON.stringify(`(() => ${inner.slice(inner.indexOf(';')+1)})()`)})`;
 const outer=random()<0.3?`class Outer${index} { ${name} = 'outer'; Inner = class { ${declares?member:''} run() { return ${call}; } }; }`:'';
 const cls=outer?`${outer} const C${index} = new Outer${index}().Inner;`:`class C${index} { ${declares?member:''} run() { return ${call}; } }`;
 return `var executed${index} = false;
{ ${cls}
  try { out.push(String(new C${index}().run())); } catch (e) { out.push(e.constructor.name); }
  out.push("executed " + executed${index});
  ${random()<0.3?`try { out.push(String(eval(${JSON.stringify(`new C${index}().${name}`)}))); } catch (e) { out.push("top " + e.constructor.name); }`:''}
}
`;
}
function program(random:()=>number,count:number):string{
 let text='const out = [];\n';
 for(let index=0;index<count;index++)text+=block(random,index);
 return text+'console.log(out.join("\\n"));\n';
}
async function compare(name:string,source:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-eval-private-'));
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

test('direct eval private names resolve or throw SyntaxError per call site like Node',async()=>{
 await compare('sites',program(rng(0xe7a1),16));
},600000);

test('one program with many eval sites of both kinds',async()=>{
 await compare('stress',program(rng(0x5e55),40));
},600000);

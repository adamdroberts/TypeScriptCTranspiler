import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* A call or `new` whose target is any expression (a literal, a comma or
 * void expression, a class, an arrow, a regular expression, a parenthesized
 * chain) evaluates the target and then either calls it or throws the
 * TypeError for a non-callable or non-constructor value. Generated programs
 * pair every target shape with call and construct positions and random
 * argument lists; one target nests a comma chain deeply. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const targets=['true','false','null','undefined','0','1.5','"s"','`t`','1n','[]','({})','(() => 1)','(function () { return 2; })','(function () { return this === undefined; })','(class {})','(class { constructor(a) { this.a = a; } })','(1, 2)','(1, g)','(void 0)','(typeof g)','/re/','(g)','(0 ? g : null)','(g || null)','(null ?? g)','(!g)','(-g)','(g, class {})','g.call','Symbol'];
function statement(random:()=>number):string{
 const target=targets[Math.floor(random()*targets.length)]!;
 const count=Math.floor(random()*3);
 const args=Array.from({length:count},(_,index)=>String(index+1)).join(', ');
 const construct=random()<0.4;
 return construct
  ?`try { const r = new (${target})(${args}); out.push("new", typeof r, r !== null && typeof r === "object" ? Object.keys(r).join(",") : ""); } catch (e) { out.push("new", e.name); }\n`
  :`try { out.push("call", String((${target})(${args}))); } catch (e) { out.push("call", e.name); }\n`;
}
function program(random:()=>number,count:number,depth:number):string{
 let source='const out = [];\nfunction g() { return arguments.length; }\n';
 for(let index=0;index<count;index++)source+=statement(random);
 let chain='g';for(let level=0;level<depth;level++)chain=`(0, ${chain})`;
 source+=`out.push("deep", ${chain}(1, 2));\ntry { new ${chain}(); out.push("deep-new"); } catch (e) { out.push("deep-new", e.name); }\n`;
 source+='console.log(JSON.stringify(out));\n';
 return source;
}

test('every call and new target shape evaluates like Node',async()=>{
 const source=program(rng(0x7a11),120,300);
 const root=await mkdtemp(join(tmpdir(),'tsc2c-call-targets-'));
 try{
  const entry=join(root,'main.cjs');await writeFile(entry,source);
  const node=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  expect(node.stdout.toString()).toContain('TypeError');
  const diagnostics:string[]=[],output=join(root,'program');
  const built=await compile({entry,output,buildDir:join(root,'build'),diagnosticWriter:x=>diagnostics.push(x)});
  expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:node.stdout.toString()});
 }finally{await rm(root,{recursive:true,force:true});}
},600000);

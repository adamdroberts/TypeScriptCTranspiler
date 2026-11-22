import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {nodeReferenceSync} from './node-reference';

/* Another realm's original global bindings are that realm's intrinsics:
 * native values. No ECMA-262 global constructor, function or namespace
 * object writes its this value or its arguments when called (eval is its own
 * operation), and a native's own throw is a native value, so
 * `other.Number(1)` no longer marks that realm's global object (and through
 * the shared mutation every global binding) as written, and `e instanceof
 * other.TypeError` (a native @@hasInstance) runs code only through a Proxy
 * or unknown value on its left. A member of such an intrinsic is still a
 * general native value, whose calls may write their arguments. The
 * partitions, sound against Node with a created realm: a call, a caught
 * native throw tested with instanceof and an Array call, each followed by an
 * exact literal global; a write through other.Object.assign, observed; a
 * Proxy left operand whose getPrototypeOf trap writes the global (fails
 * closed or lists it). The stress makes 256 calls of another realm's
 * globals. */

const P=`eval("print('"+w+"')");`;
const realm='var w="1";var other=$262.createRealm().global;';
const shapes:Record<string,{source:string;exact:string[]|null}>={
 call:{source:`${realm}other.Number(1);${P}`,exact:["print('1')"]},
 caught:{source:`${realm}var e;try{other.Number(Symbol("v"))}catch(x){e=x}e instanceof other.TypeError;${P}`,exact:["print('1')"]},
 array:{source:`${realm}other.Array(1,2);${P}`,exact:["print('1')"]},
 assign:{source:`${realm}var o={w:"1"};other.Object.assign(o,{w:"2"});w=o.w;${P}`,exact:null},
 proxy:{source:`${realm}var p=new Proxy({},{getPrototypeOf:function(){w="2";return null}});p instanceof other.TypeError;${P}`,exact:null},
 stress:{source:`${realm}${Array.from({length:256},(_,k)=>['other.Number(1);','other.String(2);','other.Boolean(0);','other.isNaN(3);'][k%4]).join('')}${P}`,exact:["print('1')"]},
};

test('calls of another realm\'s intrinsics write nothing, sound against Node',async()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];vm.runInNewContext(source,{print:value=>seen.push("print(\x27"+value+"\x27)"),$262:{createRealm(){return {global:vm.runInNewContext("globalThis")};}}});out.push(seen)}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>shapes[name]!.source))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-realm-intrinsic-calls-'));
 try{
  for(const [index,name] of names.entries()){
   const entry=join(directory,`${name}.js`);
   await writeFile(entry,shapes[name]!.source+'\n');
   const started=performance.now();
   const choices=sourceEvaluationInvocations(ts.createProgram([entry],{allowJs:true,noLib:true}),{roots:[entry],host:'test262'})[0]?.choices??null;
   expect({name,fast:(performance.now()-started)/1000<30}).toEqual({name,fast:true});
   expect({name,missing:choices===null?[]:observed[index]!.filter(value=>!choices.includes(value))}).toEqual({name,missing:[]});
   const exact=shapes[name]!.exact;
   if(exact)expect({name,choices}).toEqual({name,choices:exact});
  }
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';

/* `typeof UnaryExpression` runs GetValue on its operand reference: a member
 * read whose base is an unresolvable name throws ReferenceError, so the
 * typeof expression completes abruptly instead of yielding a type name.
 * The source analysis must carry that abrupt completion rather than leave
 * the result empty (which the closed graph seals as an unknown value that a
 * callee would receive). Partitions: operand completion (abrupt only, a bare
 * unresolvable name answering "undefined", abrupt or normal by branch,
 * a deeper member chain), consumer (call argument, catch handler, a value
 * stored and evaluated later). The stress is one callee reached by 256
 * abrupt typeof arguments next to one normal call. */
const stress=256;
// Each evaluated source prints one string literal, so the text Node records
// from the printed value is the evaluated source text.
const P=(value:string)=>`eval("print('"+${value}+"')")`;
const shapes:Record<string,string>={
 abruptArgument:`function f(a){${P('a')}}try{f(typeof missing.p)}catch(e){}f("x")`,
 unresolvableName:`${P('typeof missing')}`,
 branch:`function g(k){try{var t=typeof (k?missing.p:1);${P('t')}}catch(e){${P('"caught"')}}}g(0);g(1)`,
 memberChain:`function f(a){${P('a')}}try{f(typeof missing.a.b.c)}catch(e){}f("y")`,
 storedResult:`var r="z";try{r=typeof missing.p}catch(e){}${P('r')}`,
 stress:`function f(a){${P('a')}}`+Array.from({length:stress},(_,i)=>`try{f(typeof missing${i}.p)}catch(e){}`).join('')+`f("w")`,
};

test('typeof of an abruptly completing operand keeps eval sources finite and sound against Node',async()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=new Set();vm.runInNewContext(source,{print:value=>seen.add("print(\x27"+value+"\x27)")});out.push([...seen])}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>shapes[name]!))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-typeof-abrupt-'));
 try{
  const results=[];
  for(const [index,name] of names.entries()){
   const entry=join(directory,`${name}.js`);
   await writeFile(entry,shapes[name]!+'\n');
   const program=ts.createProgram([entry],{allowJs:true,noLib:true});
   const sites=sourceEvaluationInvocations(program,{roots:[entry],host:'test262'}).filter(invocation=>invocation.operation==='eval');
   const choices=sites.some(site=>site.choices===null)?null:sites.flatMap(site=>site.choices!);
   results.push({name,choices,node:observed[index]!});
  }
  // Precise and sound: every shape stays finite and lists what Node evaluates.
  expect(results.filter(result=>result.choices===null).map(result=>result.name)).toEqual([]);
  expect(results.filter(result=>!result.node.every(value=>result.choices!.includes(value))).map(result=>result.name)).toEqual([]);
  // An abrupt typeof argument never reaches the callee.
  expect(results.find(result=>result.name==='stress')!.choices).toEqual(["print('w')"]);
  expect(results.find(result=>result.name==='abruptArgument')!.choices).toEqual(["print('x')"]);
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

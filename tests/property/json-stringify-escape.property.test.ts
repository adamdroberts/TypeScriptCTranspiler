import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sourceEvaluationInvocations,sourceConstructorInvocations} from '../../src/source-value-flow';
import {nodeReferenceSync} from './node-reference';

/* When the source analysis cannot follow a JSON.stringify serialization (a
 * key it cannot name, an array an opaque native rearranged), the code that
 * serialization may run is still only what its arguments reach
 * (SerializeJSONProperty, SerializeJSONObject, SerializeJSONArray): getters
 * and toJSON methods of the value graph, the replacer, the Number/String
 * wrapper conversions of value and space, and a BigInt's toJSON through its
 * prototype. The fallback used to treat the call as unknown code, which made
 * every global binding (eval included) unknown. The partitions: a toJSON
 * method, a getter, a replacer, a thrown value, BigInt.prototype.toJSON, a
 * Number space with its own valueOf, and an array after reverse(); each sets
 * a global the next eval prints (sound against Node), and a later literal
 * global stays exact (no unknown code ran). The stress serializes 256 such
 * values in sequence, each its own object. */

const P=(value:string)=>`eval("print('"+${value}+"')");`;
const unknownKey='var k=String(Math.random());var o={};';
const after=`d='done';${P('d')}`;
const shapes:Record<string,string>={
 toJSON:`var w='none';${unknownKey}o[k]={toJSON:function(){w='t';return 1}};JSON.stringify(o);${P('w')}${after}`,
 getter:`var w='none';${unknownKey}Object.defineProperty(o,k,{enumerable:true,get:function(){w='g';return 1}});JSON.stringify(o);${P('w')}${after}`,
 replacer:`var w='none';${unknownKey}o[k]=1;JSON.stringify(o,function(key,value){w='r';return value});${P('w')}${after}`,
 thrown:`var w='none';${unknownKey}o[k]={toJSON:function(){throw {k:'x'}}};try{JSON.stringify(o)}catch(e){w=e.k}${P('w')}${after}`,
 bigint:`var w='none';BigInt.prototype.toJSON=function(){w='b';return 1};${unknownKey}o[k]=1n;JSON.stringify(o);${P('w')}${after}`,
 space:`var w='none';${unknownKey}o[k]=1;var s=new Number(2);s.valueOf=function(){w='s';return 2};JSON.stringify(o,null,s);${P('w')}${after}`,
 reversed:`var w='none';var a=[{toJSON:function(){w='a';return 1}}].reverse();JSON.stringify(a);${P('w')}${after}`,
 stress:`var w='none';var k=String(Math.random());${Array.from({length:256},(_,i)=>`var o${i}={};o${i}[k]={toJSON:function(){w='s${i}';return 1}};JSON.stringify(o${i});`).join('')}${P('w')}${after}`,
};

test('JSON.stringify that the analysis cannot follow runs only what its arguments reach, sound against Node',async()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];vm.runInNewContext(source,{print:value=>seen.push("print(\x27"+value+"\x27)")});out.push(seen)}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>shapes[name]))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-json-stringify-escape-'));
 try{
  for(const [index,name] of names.entries()){
   const entry=join(directory,`${name}.js`);
   await writeFile(entry,shapes[name]+'\n');
   const started=performance.now();
   const sites=sourceEvaluationInvocations(ts.createProgram([entry],{allowJs:true,noLib:true}),{roots:[entry],host:'test262'}).map(site=>site.choices);
   expect({name,fast:(performance.now()-started)/1000<30}).toEqual({name,fast:true});
   const [global,literal]=observed[index]!;
   // Sound: the global's site lists what Node printed.
   expect({name,listed:sites[0]?.includes(global!)??false}).toEqual({name,listed:true});
   // Precise: no unknown code ran, so the later literal global is exact.
   expect({name,literal:sites[1]}).toEqual({name,literal:[literal]});
  }
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

// An unknown value (an unresolved name is an external input without the
// Test262 host) has unknown members: its toJSON, reached directly, through a
// property, an element or a key the analysis cannot name, is unknown code, which may rewrite the top-level `list` the
// Function call spreads, so that source stays unproven (fails closed).
test('JSON.stringify of an unknown value runs unknown code',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-json-stringify-unknown-'));
 try{for(const value of ['runtimeInput','{a:runtimeInput}','[runtimeInput]','(function(){var o={};o[String(Math.random())]=runtimeInput;return o})()']){
  const entry=join(directory,'unknown.js');
  await writeFile(entry,`const list=['return 37;'];JSON.stringify(${value});Function(...list);\n`);
  const facts=sourceConstructorInvocations(ts.createProgram([entry],{allowJs:true,noLib:true}),{roots:[entry]});
  expect({value,unproven:facts.some(fact=>fact.choices===null)}).toEqual({value,unproven:true});
 }}finally{await rm(directory,{recursive:true,force:true});}
},600_000);

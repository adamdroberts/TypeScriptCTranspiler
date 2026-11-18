import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';

/* SerializeJSONProperty reads Get(value, "toJSON") before it serializes an
 * object. A namespace object (Math, JSON, Atomics, Reflect) owns only
 * the members its clause lists and inherits %Object.prototype%, so the read
 * is undefined unless the program writes a toJSON on the object itself or on
 * %Object.prototype%. The source analysis read it as an unmodelled native
 * member, and calling that member mutated the namespace object and the
 * argument opaquely, so later conversions of them ran unknown code and an
 * unrelated eval source became unknown.
 * Partitions: namespace object (each of the four ECMA-262 ones; the
 * runtime has no ECMA-402 Intl), position (the root
 * value, nested in an object or an array), toJSON source (absent, written on
 * the namespace object, written on %Object.prototype% as a method or an
 * accessor), and a later ToPrimitive of the namespace object. The stress
 * serializes 256 namespace references in one array. */
const stress=256;
const NAMESPACES=['Math','JSON','Atomics','Reflect'];
// Each evaluated source prints one string literal, so the text Node records
// from the printed value is the evaluated source text.
const P=(value:string)=>`eval("print('"+${value}+"')")`;
const shapes:Record<string,{source:string;finite:boolean}>={};
for(const name of NAMESPACES){
 // The eval source does not depend on the serialization: only the effect of
 // the toJSON read may change it.
 shapes[`root${name}`]={source:`var s="k";JSON.stringify(${name});String(${name});${P('s')}`,finite:true};
 shapes[`nested${name}`]={source:`var s="k";JSON.stringify({a:${name},b:[${name}]});${P('s')}`,finite:true};
 shapes[`own${name}`]={source:`${name}.toJSON=function(){return "o"};${P('JSON.stringify('+name+')')}`,finite:false};
}
shapes.inheritedMethod={source:`Object.prototype.toJSON=function(){return "p"};${P('JSON.stringify(Math)')}`,finite:false};
shapes.inheritedAccessor={source:`var n=0;Object.defineProperty(Object.prototype,"toJSON",{get:function(){n++;return undefined},configurable:true});JSON.stringify([JSON,Atomics]);${P('n')}`,finite:false};
shapes.stress={source:`var s="k",t=[${Array.from({length:stress},(_,i)=>NAMESPACES[i%NAMESPACES.length]).join(',')}];JSON.stringify(t);${P('s')}`,finite:true};

test('a namespace object has no toJSON of its own: eval sources stay finite and sound against Node',async()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=new Set();vm.runInNewContext(source,{print:value=>seen.add("print(\x27"+value+"\x27)")});out.push([...seen])}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>shapes[name]!.source))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-namespace-tojson-'));
 try{
  const results=[];
  for(const [index,name] of names.entries()){
   const entry=join(directory,`${name}.js`);
   await writeFile(entry,shapes[name]!.source+'\n');
   const program=ts.createProgram([entry],{allowJs:true,noLib:true});
   const sites=sourceEvaluationInvocations(program,{roots:[entry],host:'test262'}).filter(invocation=>invocation.operation==='eval');
   const choices=sites.some(site=>site.choices===null)?null:sites.flatMap(site=>site.choices!);
   results.push({name,choices,node:observed[index]!});
  }
  // Sound: a finite choice list contains every source Node evaluates.
  expect(results.filter(result=>result.choices!==null&&!result.node.every(value=>result.choices!.includes(value))).map(result=>result.name)).toEqual([]);
  // Precise: a toJSON read the program never wrote has no effect.
  expect(results.filter(result=>shapes[result.name]!.finite&&result.choices===null).map(result=>result.name)).toEqual([]);
  expect(results.find(result=>result.name==='stress')!.choices).toEqual(["print('k')"]);
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

test('compiled serialization of namespace objects matches Node',async()=>{
 const program=`
const out = [JSON.stringify(Math), JSON.stringify({ a: JSON, b: [Atomics, Reflect] })];
Math.toJSON = function () { return "own"; };
out.push(JSON.stringify(Math));
delete Math.toJSON;
Object.prototype.toJSON = function () { return "inherited"; };
out.push(JSON.stringify([JSON]));
delete Object.prototype.toJSON;
out.push(JSON.stringify(Atomics), eval("'" + "k" + "'"));
console.log(out.join("|"));
`;
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-namespace-tojson-run-'));
 try{
  const entry=join(directory,'main.js'),output=join(directory,'program'),diagnostics:string[]=[];
  await writeFile(entry,program);
  const reference=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});
  const built=await compile({entry,output,buildDir:join(directory,'build'),diagnosticWriter:message=>diagnostics.push(message)});
  expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  expect(native.stdout.toString()).toBe(reference.stdout.toString());
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

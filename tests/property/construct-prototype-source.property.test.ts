import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';

/* `new F()` of an ordinary function links the new object to
 * GetPrototypeFromConstructor(F): Get(F, "prototype") when that is an
 * Object, otherwise %Object.prototype% of F's Realm; an abrupt Get throws
 * before the object exists. The source analysis copied the whole Get result
 * into the instance's [[Prototype]], so an abrupt completion or a primitive
 * there read as an unknown prototype: a write on `this` then reported an
 * unknown exception, and a catch that converted it ran unknown code (the
 * Test262 `with` cascade S12.10_A1.3_T4/A1.8_T4).
 * Partitions: F.prototype (an object, each primitive kind, null, replaced
 * after creation), a callee evaluation that may throw (an unresolvable
 * alternative), the instance's use (own write, inherited read, the caught
 * exception converted to a string before an unrelated eval). The stress constructs 256 instances
 * across a cycle of prototype values. */
const stress=256;
// Each evaluated source prints one string literal, so the text Node records
// from the printed value is the evaluated source text.
const P=(value:string)=>`eval("print('"+${value}+"')")`;
const proto=`(Object.getPrototypeOf(o)===Object.prototype?"object":Object.getPrototypeOf(o)===q?"own":"other")`;
const shapes:Record<string,{source:string;finite:boolean}>={};
for(const [name,value] of Object.entries({undefined:'undefined',number:'1',string:'"s"',boolean:'true',symbol:'Symbol()',bigint:'1n',null:'null',object:'q'}))
 shapes[`prototype_${name}`]={source:`var q={k:"q"};function F(){this.p="w"}F.prototype=${value};var o=new F();${P(proto+'+o.p+o.k')}`,finite:true};
shapes.replacedAfter={source:`var q={k:"q"};function F(){}var o=new F();F.prototype=q;${P(proto)}`,finite:true};
// The seed: the callee may be an unresolvable name, so its Get(F, "prototype")
// may be abrupt; the function alternative's write on `this` must not make
// the caught exception unknown.
// A caught TypeError's text is not modelled, so the exception is converted
// for its effect only: an unknown prototype made that conversion run unknown
// code, which may rewrite the unrelated global `s`.
shapes.abruptCallee={source:`var s="k",r="none";function g(k){var F=k?function(){this.p2="x";throw "v"}:missing;try{new F()}catch(e){r=e}}g(1);try{g(0)}catch(e){}String(r);${P('s')}`,finite:true};
shapes.caughtConversion={source:`var s="k",r="none";function F(){this.p="x";throw "value"}try{new F()}catch(e){r=e}String(r);${P('s')}`,finite:true};
shapes.stress={source:`var q={k:"q"},vals=[undefined,1,"s",null,q],seen="";function F(){this.p="w"}for(var i=0;i<${stress};i++){F.prototype=vals[i%5];var o=new F();}${P(proto)}`,finite:true};

test('a constructed object links to GetPrototypeFromConstructor: eval sources stay finite and sound against Node',async()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=new Set();try{vm.runInNewContext(source,{print:value=>seen.add("print(\x27"+value+"\x27)")})}catch(e){seen.add("threw "+e.name)}out.push([...seen])}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>shapes[name]!.source))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 // Every shape completes in Node; a throw would make the comparison vacuous.
 expect(names.filter((_,index)=>observed[index]!.some(value=>value.startsWith('threw')))).toEqual([]);
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-construct-prototype-'));
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
  // Precise: the shapes listed finite stay finite.
  expect(results.filter(result=>shapes[result.name]!.finite&&result.choices===null).map(result=>result.name)).toEqual([]);
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

test('compiled construction with non-object prototypes matches Node',async()=>{
 const program=`
const out = [];
function F() { this.p = "w"; }
for (const value of [undefined, 1, "s", true, null, Symbol(), 1n, { k: "q" }]) {
  F.prototype = value;
  const o = new F();
  const proto = Object.getPrototypeOf(o);
  out.push(proto === Object.prototype ? "object" : proto === value ? "own" : "other", o.p);
}
let caught = "none", s = "k";
function G() { this.p2 = "x"; throw "value"; }
try { new G(); } catch (e) { caught = e; }
out.push(String(caught));
// The eval result stays out of the joined array: an opaque join after the
// construction still reaches the earlier prototype link (a timing gap).
const evaluated = eval("'" + s + "'");
console.log(out.join(","), evaluated);
`;
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-construct-prototype-run-'));
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

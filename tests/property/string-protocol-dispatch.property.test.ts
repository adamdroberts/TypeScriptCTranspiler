import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {nodeReferenceSync} from './node-reference';

/* String.prototype.match, matchAll, replace, replaceAll, search and split
 * with an Object argument read its @@-method and, when there is one, return
 * Call(method, argument, «O, ...rest»); without one, O and the argument are
 * converted and a new RegExp's native method runs. Other String, Number and
 * BigInt prototype methods run user code only through their receiver's and
 * arguments' conversions. Such a call is not unknown code writing every
 * global, so a later eval of a literal global stays exact. The partitions,
 * sound against Node: @@match and @@search methods that write nothing and
 * return a value (exact); a @@replace method, a replacer function, a
 * receiver's toString and a split argument without @@split (converted by
 * toString) that write the global (listed or the site unproven); a String
 * method's result from a user @@match flowing into the evaluated text. Number
 * toString and toFixed check thisNumberValue before converting their
 * argument: a non-Number receiver throws without running the radix's valueOf
 * (exact); a valid one runs it (listed). A Number or Boolean wrapper has no own
 * members, so its toString is its prototype's (exact). A call the model answers
 * only as an escape still has its method's result kind (typeof exact).
 * Array.from reads its items (their @@iterator, or length and indices) and
 * calls mapfn but writes only its new array: a generator it consumed keeps
 * its members (exact), and a writing mapfn is listed; its result is an Array of
 * the items' values (iterated, or an array-like's indices), whose elements'
 * toString join runs (listed). A join over an array without an exact List
 * (slice's, Array.from's) converts each Object element with ToString: a plain
 * object keeps a later eval exact, a writing toString is listed. The
 * stress makes 256
 * dispatching calls. */

const P=`eval("print('"+w+"')");`;
const shapes:Record<string,{source:string;exact:string[]|null}>={
 matchMethod:{source:`var w='1';var m={[Symbol.match](s){return [s]}};"ab".match(m);"ab".search({[Symbol.search](){return 0}});${P}`,exact:["print('1')"]},
 matchResult:{source:`var w='1';var m={[Symbol.match](s){return '2'}};w="ab".match(m);${P}`,exact:["print('2')"]},
 replaceWrites:{source:`var w='1';"ab".replace({[Symbol.replace](){w='2';return ''}},'x');${P}`,exact:null},
 replacer:{source:`var w='1';"ab".replace(/a/,function(){w='2';return ''});${P}`,exact:null},
 receiverText:{source:`var w='1';String.prototype.padEnd.call({toString(){w='2';return 'a'}},3);${P}`,exact:null},
 splitConverted:{source:`var w='1';"a,b".split({toString(){w='2';return ','}});${P}`,exact:null},
 numberReceiverFirst:{source:`var w='1';try{Reflect.apply((1).toString,{},[{valueOf(){w='2';return 10}}])}catch(e){}${P}`,exact:["print('1')"]},
 numberRadix:{source:`var w='1';(255).toString({valueOf(){w='2';return 16}});new Number(255).toFixed({valueOf(){w+='3';return 1}});${P}`,exact:null},
 wrapperMethod:{source:`var w='1';var radix={valueOf(){return 16}};for(var i=0;i<2;i++){new Number(255).toString(radix);new Boolean(true).toString();}${P}`,exact:["print('1')"]},
 fallbackResult:{source:`var w=typeof (12).toLocaleString(undefined,{});${P}`,exact:["print('string')"]},
 arrayFromItems:{source:`function* g(){yield 7;yield 8}var w='1';var it=g();Array.from(it);it.next();it[Symbol.iterator]();${P}`,exact:["print('1')"]},
 arrayFromMapper:{source:`var w='1';Array.from([1,2],function(v){w='2';return v});${P}`,exact:null},
 arrayFromElements:{source:`var w='1';var o={toString(){w='2';return 'x'}};Array.from([o]).join();${P}`,exact:null},
 arrayFromArrayLike:{source:`var w='1';var o={toString(){w+='3';return 'x'}};Array.from({length:1,0:o}).join();${P}`,exact:null},
 joinSummaryObject:{source:`var w='1';[{x:1}].slice().join("|");Array.from([{x:1}]).join("|");${P}`,exact:["print('1')"]},
 joinSummaryWriter:{source:`var w='1';[{toString(){w='2';return 'x'}}].slice().join("|");${P}`,exact:null},
 arrayFromIterator:{source:`var w='1';var it={[Symbol.iterator](){return {next(){w='2';return {done:true}}}}};Array.from(it);${P}`,exact:null},
 arrayFromGetter:{source:`var w='1';var o={length:1,get 0(){w+='3';return 1}};Array.from(o);${P}`,exact:null},
 arrayFromArguments:{source:`var w='1';function f(){return Array.from(arguments).join("|")}f(1,"two",undefined,{x:1});${P}`,exact:["print('1')"]},
 spreadIterator:{source:`var w='1';var r=[...new Set([3]).values()];${P}`,exact:["print('1')"]},
 spreadGetterLength:{source:`var w='1';var o={valueOf(){w='2';return 1}};var r=[...[o]];r.join();${P}`,exact:null},
 reduceInitial:{source:`var w='1';var r="x:"+[1,2].values().reduce(function(a,b){return a+b},10);${P}`,exact:["print('1')"]},
 reduceReducer:{source:`var w='1';[1].values().reduce(function(a,b){w='2';return a},0);${P}`,exact:null},
 reduceNext:{source:`var w='1';var it={next(){w+='3';return {done:true}},__proto__:Iterator.prototype};it.reduce(function(a){return a},0);${P}`,exact:null},
 setIteration:{source:`var w='1';var a=[...new Set([3])].join();var b=new Set([3]).values().next().value;var c=new Set([3,5]).values().reduce(function(x,y){return x+y});${P}`,exact:["print('1')"]},
 mapPropertyWrite:{source:`var w='1';var m=new Map([[1,2]]);var k='x';m[k]=3;var v=m.get(1);${P}`,exact:["print('1')"]},
 newObject:{source:`var o=new Object();o.x='1';var w=o.x;${P}`,exact:["print('1')"]},
 newObjectWriter:{source:`var o=new Object();o.toString=function(){w='2';return 'x'};var w='1';String(o);${P}`,exact:null},
 proxyTrapless:{source:`var w='1';var p=new Proxy({a:1},{});Object.getOwnPropertySymbols(p);Object.keys(p);${P}`,exact:["print('1')"]},
 proxyOwnKeysWrites:{source:`var w='1';var p=new Proxy({},{ownKeys(t){w='2';return []}});Object.getOwnPropertySymbols(p);${P}`,exact:null},
 proxyOwnKeysResult:{source:`var w='1';var p=new Proxy({},{ownKeys(t){return {length:1,get 0(){w+='3';return 'k'}}}});try{Reflect.ownKeys(p)}catch(e){}${P}`,exact:null},
 proxyValuesTrapless:{source:`var w='1';var p=new Proxy({a:1,b:2},{});Object.values(p).join(",");${P}`,exact:["print('1')"]},
 proxyValuesGetTrap:{source:`var w='1';var o={toString(){w='2';return 'x'}};var p=new Proxy({a:1},{get(t,k){return o}});Object.values(p).join(",");${P}`,exact:null},
 entriesComputedKeys:{source:`var w='1';var o={};for(var i=0;i<3;i++)Object.defineProperty(o,"k"+i,{enumerable:true,get(){return {index:1}}});var sum=0;var e=Object.entries(o);for(var j=0;j<e.length;j++)sum+=e[j][1].index;${P}`,exact:["print('1')"]},
 entriesGetterWrites:{source:`var w='1';var o={};for(var i=0;i<2;i++)Object.defineProperty(o,"k"+i,{enumerable:true,get(){w='2';return 1}});Object.entries(o);${P}`,exact:null},
 localeReserved:{source:`var w='1';var r="ab".toLocaleString({[Symbol.toPrimitive](){w='9';throw 1}});var n=(5).toLocaleString({[Symbol.toPrimitive](){w='8';throw 1}});${P}`,exact:["print('1')"]},
 localeInvokesToString:{source:`var w='1';var o={toString(){w='2';return 'x'}};o.toLocaleString();${P}`,exact:null},
 stress:{source:`var w='1';var m={[Symbol.match](s){return null}};${Array.from({length:256},(_,k)=>['"ab".match(m);','"ab".search({[Symbol.search](){return 0}});','"ab".padStart(4);','"ab".split({[Symbol.split](){return []}});'][k%4]).join('')}${P}`,exact:["print('1')"]},
};

test('String prototype methods dispatch to their argument protocol, sound against Node',async()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];vm.runInNewContext(source,{print:value=>seen.push("print(\x27"+value+"\x27)")});out.push(seen)}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>shapes[name]!.source))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 expect(observed[names.indexOf('numberRadix')]).toEqual(["print('23')"]);
 expect(observed[names.indexOf('arrayFromMapper')]).toEqual(["print('2')"]);
 expect(observed[names.indexOf('joinSummaryWriter')]).toEqual(["print('2')"]);
 expect(observed[names.indexOf('arrayFromIterator')]).toEqual(["print('2')"]);
 expect(observed[names.indexOf('spreadGetterLength')]).toEqual(["print('1')"]);
 expect(observed[names.indexOf('reduceReducer')]).toEqual(["print('2')"]);
 expect(observed[names.indexOf('reduceNext')]).toEqual(["print('13')"]);
 expect(observed[names.indexOf('newObjectWriter')]).toEqual(["print('2')"]);
 expect(observed[names.indexOf('proxyOwnKeysWrites')]).toEqual(["print('2')"]);
 expect(observed[names.indexOf('proxyOwnKeysResult')]).toEqual(["print('13')"]);
 expect(observed[names.indexOf('proxyValuesGetTrap')]).toEqual(["print('2')"]);
 expect(observed[names.indexOf('entriesGetterWrites')]).toEqual(["print('2')"]);
 expect(observed[names.indexOf('localeInvokesToString')]).toEqual(["print('2')"]);
 expect(observed[names.indexOf('arrayFromGetter')]).toEqual(["print('13')"]);
 expect(observed[names.indexOf('arrayFromElements')]).toEqual(["print('2')"]);
 expect(observed[names.indexOf('arrayFromArrayLike')]).toEqual(["print('13')"]);
 for(const name of ['replaceWrites','replacer','receiverText','splitConverted'])expect({name,observed:observed[names.indexOf(name)]}).toEqual({name,observed:["print('2')"]});
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-string-protocol-'));
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

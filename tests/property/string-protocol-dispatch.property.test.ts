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
 * object keeps a later eval exact, a writing toString is listed.
 * Number's and Math's value properties are non-writable Numbers: their
 * toLocaleString ignores its reserved arguments (exact), and a sloppy write
 * or delete keeps them. A RegExp's @@split and @@matchAll construct their
 * matcher through SpeciesConstructor: with %RegExp% and its intrinsic exec no
 * other code runs (exact), a defined @@species or a replaced exec runs
 * (listed), and @@split's limit is converted (listed). A match's indices
 * (the d flag) are an Array of undefined or [start, end] Arrays with a
 * null-prototype groups object: their keys are no unknown code (exact), and a
 * pair is an ordinary Array whose own toString runs (listed). A descriptor of
 * a match result's named property is that of a data property, though its
 * elements are defined under unknown index keys (exact). RegExp exec on an
 * object literal, an array literal or %RegExp.prototype% throws a TypeError
 * (no [[RegExpMatcher]]) and test runs the receiver's own exec (listed). A
 * builtin's, a native value's and a primitive's own descriptors and keys run
 * no code (exact), while a member the program stored on a builtin keeps its
 * effects (listed); a String wrapper's members are its prototype's, and
 * Array.prototype[@@unscopables] is a null-prototype object of true flags
 * (exact). A String of unknown text read at an unknown key is a one-code-unit
 * String, its length or a %String.prototype% member: no unknown code (exact),
 * and a program member there runs (listed). A read under a typeof test (an
 * if, or a switch clause and the clauses falling into it) has that type
 * (exact), a clause reached by fall-through keeps the earlier type (listed).
 * Converting or reading a native value throws a native error or what a
 * program callable stored on a builtin throws (listed), never unknown code
 * (exact). The stress makes 256
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
 numericConstants:{source:`var w='1';var p={[Symbol.toPrimitive](){w='9';throw 1}};var a=[Number.MIN_VALUE,Number.MAX_VALUE,Number.EPSILON,Math.PI];for(var i=0;i<a.length;i++)a[i].toLocaleString(p);${P}`,exact:["print('1')"]},
 constantWrite:{source:`Math.PI=3;delete Number.EPSILON;var w=Math.PI+':'+Number.EPSILON;${P}`,exact:null},
 regexpSpeciesIntrinsic:{source:`"use strict";Boolean.prototype.kind=function(){return typeof this};"36.9".split(/\\./);[..."ab".matchAll(/a/g)];var w=true.kind();${P}`,exact:["print('boolean')"]},
 regexpSpeciesDefined:{source:`var w='1';Object.defineProperty(RegExp,Symbol.species,{get(){return function(){w='4';return /x/}}});try{"a.b".split(/\\./)}catch(e){}${P}`,exact:null},
 regexpSplitExec:{source:`var w='1';RegExp.prototype.exec=function(){w='5';return null};"a.b".split(/\\./);${P}`,exact:null},
 regexpSplitLimit:{source:`var w='1';"a.b".split(/\\./,{valueOf(){w='7';return 1}});${P}`,exact:null},
 matchIndicesKeys:{source:`var w='1';var hit=/(?<part>a)(b)?/d.exec("xa");var k=Object.keys(hit.indices).join(",")+hit.indices[1][0]+Object.getPrototypeOf(hit.indices.groups);${P}`,exact:["print('1')"]},
 matchIndicesPair:{source:`var w='1';var hit=/(a)/d.exec("xa");hit.indices[0].toString=function(){w='2';return ''};""+hit.indices[0];${P}`,exact:null},
 matchResultDescriptor:{source:`var w='1';var hit=/(a)/dg.exec("a");for(var key of ["index","input","groups","indices"]){var d=Object.getOwnPropertyDescriptor(hit,key);var t=key+":"+d.writable}${P}`,exact:["print('1')"]},
 regexpBrand:{source:`var w='1';var base=Object.getPrototypeOf(/a/);var names=[];for(var receiver of [{},base,[]]){try{base.exec.call(receiver,"a")}catch(e){names.push(e.name)}}try{base.test.call({},"a")}catch(e){}${P}`,exact:["print('1')"]},
 regexpTestExec:{source:`var w='1';var base=Object.getPrototypeOf(/a/);var r={exec(){w='2';return {}}};base.test.call(r,"a");${P}`,exact:null},
 nativeDescriptors:{source:`var w='1';for(var ns of [Math,Array.prototype,"ab",5,new String("cd")]){var d=Object.getOwnPropertyDescriptors(ns);Reflect.ownKeys(d).forEach(function(k){var x=d[k];if('value' in x)try{""+x.value}catch(e){}})}var it=new String()[Symbol.iterator]();${P}`,exact:["print('1')"]},
 nativeDescriptorWriter:{source:`var w='1';Math.mine={toString(){w='2';return ''}};var d=Object.getOwnPropertyDescriptors(Math);""+d.mine.value;${P}`,exact:null},
 unscopables:{source:`var u=Array.prototype[Symbol.unscopables];var w=Object.getPrototypeOf(u)+":"+u.flat+":"+u.map;${P}`,exact:["print('null:true:undefined')"]},
 unknownTextIndex:{source:`var w='1';var s=String(Math.max);var pos=0;while(pos<s.length){var c=s[pos];/[a-z]/.test(c);pos+=1}${P}`,exact:["print('1')"]},
 textInherited:{source:`var w='1';String.prototype.zz=function(){w='3'};var s=String(Math.max);var k=["zz"];for(var n of k)s[n]();${P}`,exact:null},
 typeofNarrowing:{source:`var w='1';function f(v){switch(v===null?'null':typeof v){case 'string':return JSON.stringify(v);case 'number':return String(v);}if(typeof v==='bigint')return String(v)}f({toJSON(){w='2';return 1},toString(){w='3';return ''}});f("a");f(null);f(1n);${P}`,exact:["print('1')"]},
 typeofFallthrough:{source:`var w='1';function f(v){switch(typeof v){case 'object':v;case 'string':return String(v);}}f({toString(){w='3';return ''}});${P}`,exact:null},
 nativeThrown:{source:`var w='1';var v=Object.getOwnPropertyDescriptors(Math).abs.value;Function.prototype.valueOf=function(){throw 'q'};try{var t=1/v}catch(e){w=typeof e}${P}`,exact:null},
 nativeConversionError:{source:`var w='1';var v=Object.getOwnPropertyDescriptors(Math).abs.value;try{var t=1/v;var u=v.zz}catch(e){w=typeof e}${P}`,exact:["print('1')","print('object')"]},
 mixedWrappers:{source:`var w='1';var o=[Number,Boolean];for(var i=0;i<2;i++){var c=o[i];var x=new c(1);x.valueOf();}${P}`,exact:["print('1')"]},
 mixedConstructors:{source:`var w='1';var o=[String,{token:1},function(v){return v}];for(var i=0;i<3;i++){try{var c=o[i];var x=new c(1);x.then;x.valueOf()}catch(e){}}${P}`,exact:["print('1')"]},
 stringMatchKinds:{source:`var w='1';var m=["match","search"];for(var k of m){var r=String.prototype[k].call("a")}var t=""+r+typeof String.prototype.matchAll.call("ab").next;${P}`,exact:["print('1')"]},
 fallbackThrows:{source:`var w='1';try{"ab".padEnd({valueOf(){throw 'p'}})}catch(e){w=typeof e}${P}`,exact:null},
 sequenceProtocol:{source:`var w='1';RegExp.prototype[Symbol.search]=function(){w='5';return 0};var f=[String.prototype.match,String.prototype.search];for(var g of f){var r=g.call("ab","a")}${P}`,exact:null},
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
 expect(observed[names.indexOf('regexpSpeciesDefined')]).toEqual(["print('4')"]);
 expect(observed[names.indexOf('regexpSplitExec')]).toEqual(["print('5')"]);
 expect(observed[names.indexOf('regexpSplitLimit')]).toEqual(["print('7')"]);
 expect(observed[names.indexOf('matchIndicesPair')]).toEqual(["print('2')"]);
 expect(observed[names.indexOf('regexpTestExec')]).toEqual(["print('2')"]);
 expect(observed[names.indexOf('nativeDescriptorWriter')]).toEqual(["print('2')"]);
 expect(observed[names.indexOf('textInherited')]).toEqual(["print('3')"]);
 expect(observed[names.indexOf('typeofFallthrough')]).toEqual(["print('3')"]);
 expect(observed[names.indexOf('nativeThrown')]).toEqual(["print('string')"]);
 expect(observed[names.indexOf('nativeConversionError')]).toEqual(["print('1')"]);
 expect(observed[names.indexOf('fallbackThrows')]).toEqual(["print('string')"]);
 expect(observed[names.indexOf('sequenceProtocol')]).toEqual(["print('5')"]);
 expect(observed[names.indexOf('constantWrite')]).toEqual(["print('3.141592653589793:2.220446049250313e-16')"]);
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

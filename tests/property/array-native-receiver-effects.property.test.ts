import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

/* An Array.prototype native the analysis does not model step by step still
 * has the receiver effect its algorithm specifies: copyWithin, fill, pop,
 * push, reverse, shift, sort, splice and unshift Set elements at integer
 * indices, delete integer indices and Set "length"; the other methods leave
 * the receiver unchanged; none writes an argument; copyWithin, fill, reverse
 * and sort return the receiver. String.prototype split, replace and
 * replaceAll ask only an Object argument for its @@-method, so with primitive
 * arguments they run no user code. Elements a native moves, values it is
 * handed, deletions, getters and setters it reaches (own, inherited, a Proxy
 * trap, a mapped arguments object) and writes through the returned receiver
 * must all reach later reads; other own keys of the receiver, and the
 * methods it inherits, keep their values, so a native on an array allocated
 * in a loop does not turn the next iteration's method call into unknown
 * code. The native never calls its receiver or a value stored there, but
 * runs their accessors and conversion methods (ToString in sort,
 * toLocaleString, a length's valueOf, @@isConcatSpreadable, a flattened
 * element's getter, a Proxy trap) and the @@species of its "constructor":
 * a function stored by fill keeps its own argument facts, and every such
 * method must reach later reads. Each generated Script evaluates what it read; the graph must fail
 * closed or contain every source Node evaluates, and the shapes listed as
 * finite must stay finite. A 256-deep chain of arrays, each reversed, sorted
 * and filled from the previous one, is the depth stress. */

const shapes:Record<string,string>={
 loopPushSort:'var src="1;";for(let n=0;n<3;++n){const seen=[];seen.push(n);seen.sort();}observe(src);',
 loopSortChain:'var src="2;";for(let n=0;n<3;++n){const seen=[];seen.push(n);seen.sort((a,b)=>a-b).every(v=>v>=0);}observe(src);',
 loopReverseSlice:'var src="3;";function f(){const seen=[];seen.push(1);seen.reverse();seen.slice();seen.indexOf(1);}f();f();observe(src);',
 reverseValues:'const a=["4;","5;"];a.reverse();observe(a[0]);',
 fillValue:'const a=["6;"];a.fill("7;");observe(a[0]);',
 spliceInsert:'const a=["8;"];a.splice(0,1,"9;");observe(a[0]);',
 unshiftInsert:'const a=["10;"];a.unshift("11;");observe(a[0]);',
 copyWithinMove:'const a=["12;","13;"];a.copyWithin(0,1);observe(a[0]);',
 shiftMove:'const a=["14;","15;"];a.shift();observe(a[0]);',
 popDelete:'const a=["16;"];a.pop();observe(String(a[0])+";");',
 sortReturnsReceiver:'const a=["17;"];const b=a.sort();b[0]="18;";observe(a[0]);',
 receiverKeysKept:'const a=["19;"];a.label="20;";a.sort();a.reverse();observe(a.label);',
 methodKept:'const a=[];a.sort();a.push("21;");observe(a[0]);',
 getterEffect:'var g="22;";const a=[];Object.defineProperty(a,"0",{get(){g="23;";return 1},configurable:true});a.indexOf(1);observe(g);',
 inheritedSetter:'var g="24;";const p=[];Object.defineProperty(p,"0",{set(v){g=v},configurable:true});const a=Object.setPrototypeOf([],p);a.length=1;a.fill("25;");observe(g);',
 argumentsReceiver:'function f(x){Array.prototype.fill.call(arguments,"26;");return x}observe(f("27;"));',
 proxyReceiver:'var g="28;";const p=new Proxy(["x"],{set(t,k,v){g="29;";return Reflect.set(t,k,v)}});p.fill("y");observe(g);',
 globalReceiver:'globalThis.length=1;Array.prototype.fill.call(globalThis,"30;",0,1);observe(globalThis[0]);',
 comparatorEffect:'var g="31;";[2,1].sort((a,b)=>{g="32;";return a-b});observe(g);',
 splitPrimitive:'var src="33;";const parts="a:b".split(":");observe(parts.length===2?src:"34;");',
 replacePrimitive:'var src="35;";"a-b".replace("-","+");"a-b".replaceAll("-","+");observe(src);',
 storedFunctionKept:'function read(body){return body}const a=[1];a.fill(read);a.sort();a.reverse();observe(read("37;"));',
 elementToString:'var g="38;";const o={toString(){g="39;";return "x"}};[o,o].sort();observe(g);',
 elementToPrimitive:'var g="40;";const o={[Symbol.toPrimitive](){g="41;";return "a"}};[o,"b"].sort();observe(g);',
 storedFunctionToString:'var g="42;";function f(){g="43;"}f.toString=function(){g="44;";return "f"};[1,2].fill(f).sort();observe(g);',
 elementLocale:'var g="45;";const e={toLocaleString(){g="46;";return ""}};[e].toLocaleString();observe(g);',
 speciesGetter:'var g="47;";const a=[1];a.constructor={get [Symbol.species](){g="48;";return Array}};a.slice();observe(g);',
 speciesConstruct:'var g="49;";class D{constructor(){g="50;"}}const a=[1];a.constructor={[Symbol.species]:D};a.splice(0,0);observe(g);',
 lengthValueOf:'var g="51;";const o={length:{valueOf(){g="52;";return 1}},0:1};Array.prototype.fill.call(o,0);observe(g);',
 flatElementGetter:'var g="53;";const inner=[1];Object.defineProperty(inner,"0",{get(){g="54;";return 1}});[inner].flat();observe(g);',
 proxyGetTrap:'var g="55;";const p=new Proxy([1,2],{get(t,k,r){g="56;";return Reflect.get(t,k,r)}});Array.prototype.reverse.call(p);observe(g);',
 concatSpreadable:'var g="57;";const a=[1];Object.defineProperty(a,Symbol.isConcatSpreadable,{get(){g="58;";return true}});a.concat([2]);observe(g);',
 inheritedIndexGetter:'var g="59;";class C extends Array{}Object.defineProperty(C.prototype,"0",{get(){g="60;";return 1},configurable:true});const c=new C(2);c.reverse();observe(g);',
};
const finite=['loopPushSort','loopSortChain','loopReverseSlice','reverseValues','fillValue','spliceInsert','unshiftInsert','copyWithinMove','shiftMove','popDelete','sortReturnsReceiver','receiverKeysKept','methodKept','splitPrimitive','replacePrimitive','storedFunctionKept'];

test('Array natives write only their receiver indices and length; primitive split and replace run no user code',()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];vm.runInNewContext(source,{observe:value=>seen.push(value)});out.push(seen)}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>shapes[name]))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const results=names.map((name,index)=>{
  const graph=finiteEvalScriptSourceGraph([{path:'main.js',source:shapes[name]!.replaceAll('observe(','eval(')}]);
  return {name,error:graph.error,sources:graph.directEvalSources.map(record=>record.source),node:observed[index]!};
 });
 // Sound: a finite graph contains every source Node evaluates.
 expect(results.filter(result=>result.error===null&&!result.node.every(value=>result.sources.includes(value)))).toEqual([]);
 // Precise: the listed shapes are finite.
 expect(results.filter(result=>finite.includes(result.name)&&result.error!==null).map(result=>result.name)).toEqual([]);
},120_000);

test('a 256-deep chain of reversed, sorted and filled arrays stays finite',()=>{
 const lines=['var v0="36;";'];
 for(let index=1;index<=256;index++)lines.push(`const a${index}=[v${index-1}];a${index}.reverse();var v${index}=a${index}.sort().fill(a${index}[0])[0];`);
 lines.push('eval(v256);');
 const graph=finiteEvalScriptSourceGraph([{path:'deep.js',source:lines.join('\n')}]);
 expect({error:graph.error,sources:graph.directEvalSources.map(record=>record.source)}).toEqual({error:null,sources:['36;']});
},300_000);

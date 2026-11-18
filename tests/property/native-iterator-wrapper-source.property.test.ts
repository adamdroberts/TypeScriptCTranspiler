import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {hostProtocolVersion,parseHostObservation} from '../test262/protocol';

/* Natives whose steps the source analysis models instead of treating as
 * unknown code or as writes of every native-held object:
 * - Iterator.prototype helpers and consumers, and Iterator.from with its
 *   %WrapForValidIteratorPrototype% wrapper, read their receiver and
 *   arguments and call what those reach; none writes them.
 * - RegExp.prototype[@@matchAll] returns a RegExp String Iterator after
 *   SpeciesConstructor; String.prototype[@@iterator] returns a String
 *   Iterator after ToString(this).
 * - A String method on a wrapper Object converts it with ToString (its own
 *   toString runs); a Number/BigInt method reads [[NumberData]] and runs no
 *   code, throwing TypeError for any other Object.
 * - %ArrayIteratorPrototype%.next called by a native's escape returns a
 *   native value.
 * - Under the Test262 host, a Function-constructor body's reference to an
 *   unresolvable name throws ReferenceError, also when that body is
 *   connected after the presence closure.
 * Partitions: each native x (user code it may run, none). Soundness: every
 * source Node evaluates is among the analysis's choices. Precision: the
 * shapes without user code stay finite. The stress is a 64-deep helper chain. */
const depth=64;
const shapes:Record<string,{source:string;finite:boolean}>={
 helperThenMatchAll:{source:'function a(){return Iterator.from([]).drop(0)}function b(){return RegExp.prototype[Symbol.matchAll]("")}a();b();',finite:true},
 arrayHelperThenMatchAll:{source:'function a(){return [].values().drop(0)}function b(){return RegExp.prototype[Symbol.matchAll]("")}a();b();',finite:true},
 helperCallback:{source:'var it=[1].values().map(function(x){g="1;";return x});it.next();',finite:true},
 helperNames:{source:'g=String(Iterator.prototype.map.length)+Iterator.prototype.toArray.name+Iterator.from.length+";";',finite:true},
 fromUserNext:{source:'var it=Iterator.from({next(){g="1;";return {done:true}}});it.next();',finite:true},
 fromPrimitive:{source:'try{Iterator.from(5)}catch(e){if(e instanceof TypeError)g="1;"}',finite:true},
 matchAllSpecies:{source:'var r=/a/g;r.constructor={[Symbol.species]:function(){g="1;";return /a/g}};r[Symbol.matchAll]("a");',finite:true},
 matchAllTag:{source:'var t=Object.prototype.toString.call(/a/g[Symbol.matchAll]("aa"));if(t==="[object RegExp String Iterator]")g="1;";',finite:true},
 stringIteratorUser:{source:'var o={toString(){g="1;";return "q"}};String.prototype[Symbol.iterator].call(o);',finite:true},
 stringIteratorPrototype:{source:'function f(){return Object.getPrototypeOf(new String()[Symbol.iterator]())}var p=f();try{new p()}catch(e){}',finite:true},
 stringWrapperMethod:{source:'function f(){return new String("x").charAt(0)}f();',finite:true},
 stringWrapperUser:{source:'var o={toString(){g="1;";return "ab"}};String.prototype.charAt.call(o,0);',finite:true},
 numberWrapperMethod:{source:'function f(){return new Number(1).toFixed(2)}f();',finite:true},
 numberPlainObject:{source:'try{Number.prototype.toFixed.call({},1)}catch(e){if(e instanceof TypeError)g="1;"}',finite:true},
 numberValueOfUnused:{source:'try{Number.prototype.toFixed.call({valueOf(){g="1;";return 1}},1)}catch(e){}',finite:true},
 helperChain:{source:`var it=[1,2].values();for(var i=0;i<${depth};i++)it=it.map(function(x){return x});it.toArray();`,finite:true},
};

test('modelled natives keep eval sources sound and finite, matching Node',async()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];vm.runInNewContext(source,{observe:value=>seen.push(value)});out.push(seen)}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>'var g="0;";'+shapes[name]!.source+'observe(g);'))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-native-iterator-'));
 try{
  const results=[];
  for(const [index,name] of names.entries()){
   const entry=join(directory,`${name}.js`);
   await writeFile(entry,'var g="0;";'+shapes[name]!.source+'eval(g);\n');
   const program=ts.createProgram([entry],{allowJs:true,noLib:true});
   const choices=sourceEvaluationInvocations(program,{roots:[entry],host:'test262'}).find(invocation=>invocation.operation==='eval')?.choices??null;
   results.push({name,choices,node:observed[index]!});
  }
  // Sound: a finite choice list contains every source Node evaluates.
  expect(results.filter(result=>result.choices!==null&&!result.node.every(value=>result.choices!.includes(value))).map(result=>result.name)).toEqual([]);
  // Precise: the shapes listed finite stay finite.
  expect(results.filter(result=>shapes[result.name]!.finite&&result.choices===null).map(result=>result.name)).toEqual([]);
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

test('compiled iterator, RegExp String Iterator and wrapper natives match Node',async()=>{
 const program=`
const log=(...a)=>console.log(...a);
const tag=(v)=>Object.prototype.toString.call(v);
const H=Iterator.prototype;
log('helpers', ['map','filter','take','drop','flatMap','forEach','reduce','some','every','find','toArray'].map(k=>k+':'+H[k].name+'/'+H[k].length).join(' '), Iterator.from.name, Iterator.from.length);
try { new H.map(); } catch (e) { log('helper-new', e.constructor === TypeError); }
const seen=[];
log('map', [...[1,2,3].values().map(x=>{seen.push(x);return x*2;})].join(','), seen.join(','));
const helper=[1].values().map(x=>x);
log('helper-object', tag(helper), Object.getPrototypeOf(Object.getPrototypeOf(helper)) === Iterator.prototype, typeof helper.return, helper.next.name);
log('drop', [1,2,3].values().drop(1).toArray().join(','), Object.getPrototypeOf([].values().drop(0)) === Object.getPrototypeOf([].values().take(0)));
const user={i:0,next(){return this.i<2?{value:this.i++,done:false}:{done:true};}};
const wrapped=Iterator.from(user);
log('from', Object.getPrototypeOf(wrapped) !== Iterator.prototype, Iterator.prototype.isPrototypeOf(wrapped), wrapped.toArray().join(','));
const array=[7].values();log('from-same', Iterator.from(array) === array);
try { Iterator.from(5); } catch (e) { log('from-number', e.constructor === TypeError); }
log('from-string', Iterator.from('ab').toArray().join('|'));
const matches=/a(.)/g[Symbol.matchAll]('ab ac');
log('matchAll', tag(matches), Object.getPrototypeOf(Object.getPrototypeOf(matches)) === Iterator.prototype, [...matches].map(m=>m[1]).join(','));
const proto=Object.getPrototypeOf(RegExp.prototype[Symbol.matchAll](''));
log('matchAll-proto', proto[Symbol.toStringTag], typeof proto.next, proto.next.name, proto.next.length);
let species=0;const r=/b/g;r.constructor={[Symbol.species]:function(source,flags){species++;return new RegExp(source,flags);}};
log('matchAll-species', [...r[Symbol.matchAll]('bb')].length, species);
const si=new String('xy')[Symbol.iterator]();
log('string-iterator', tag(si), Object.getPrototypeOf(si)[Symbol.toStringTag], [...si].join('|'), String.prototype[Symbol.iterator].name);
let converted=0;const custom={toString(){converted++;return 'pq';}};
log('string-iterator-user', [...String.prototype[Symbol.iterator].call(custom)].join('|'), converted);
try { String.prototype[Symbol.iterator].call(null); } catch (e) { log('string-iterator-null', e.constructor === TypeError); }
log('wrapper-string', new String('xyz').charAt(1), String.prototype.toUpperCase.call(new String('ab')), String.prototype.charAt.call(custom, 1), converted);
log('wrapper-number', new Number(1.5).toFixed(2), Number.prototype.toString.call(new Number(255), 16));
let valued=0;
try { Number.prototype.toFixed.call({valueOf(){valued++;return 1;}}, 1); } catch (e) { log('number-plain', e.constructor === TypeError, valued); }
let it=[1,2].values();for(let i=0;i<${depth};i++)it=it.map(x=>x+1);
log('chain', it.toArray().join(','));
`;
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-native-iterator-run-'));
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

test('a Function body read of an unresolvable name under the Test262 host is a ReferenceError',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-late-unresolvable-'));
 try{
  const entry=join(directory,'subject.js'),executable=join(directory,'subject'),diagnostics:string[]=[],scenarioId='property/late-unresolvable.js#sloppy';
  // The eval entry keeps %eval% reachable from the harness-style table, so an
  // unknown value there would make every eval site unknown.
  await writeFile(entry,`var table=[{source:'eval'},{source:'NoSuchIntrinsic.member'},{source:'(function(){}).constructor'}];
table.forEach(function(row){try{row.value=new Function('return '+row.source)();}catch(e){row.error=e.constructor===ReferenceError;}});
function lookup(i){return table[i].value;}
var F=lookup(2);new F();
print(table[1].error===true&&table[1].value===undefined?'late-unresolvable-ok':'late-unresolvable-bad');
`);
  const result=await compile({entry,output:executable,buildDir:join(directory,'build'),initializationEntries:[entry],
   test262Observation:{kind:'test262-native-observation',scenarioId,setupEntries:[],testEntry:entry,async:false},
   diagnosticWriter:message=>diagnostics.push(message)});
  expect({code:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({code:0,diagnostics:''});
  const run=Bun.spawnSync([executable],{stdout:'pipe',stderr:'pipe'});
  expect({code:run.exitCode,stderr:run.stderr.toString()}).toEqual({code:0,stderr:''});
  expect(parseHostObservation(JSON.parse(run.stdout.toString()))).toEqual({protocolVersion:hostProtocolVersion,scenarioId,kind:'normal',
   asyncCompletion:undefined,stdout:'late-unresolvable-ok\n',stderr:undefined,nativeTranscript:undefined});
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(profile:boolean,noGc:boolean):string {
 return `// @ts-nocheck
 export {};
 function emit(value:any):void{${profile?'(globalThis as any).print':'console.log'}(value);}
 function check(value:boolean,label:string):void{if(!value)throw label;emit(label+':true');}
 function collect():void{${profile&&!noGc?'(globalThis as any).$262.gc();':''}}
 const original=Symbol,tag=original.toStringTag,iterator=original.iterator,events:any[]=[],marker={token:61};
 const stringify=Object.prototype.toString;
 function brand(value:any):string{return Reflect.apply(stringify,value,[]);}
 function caught(callback:any):string{try{callback();return 'none';}catch(error){return error instanceof TypeError?'TypeError':error instanceof RangeError?'RangeError':error instanceof SyntaxError?'SyntaxError':String(error);}}
 for(const value of [undefined,null,false,true,0,-0,17,NaN,Infinity,'','text',17n]){
  const symbol=Symbol(value,events.push('ignored'));
  check(symbol.description===(value===undefined?undefined:String(value))&&typeof symbol==='symbol','description-'+String(value));
 }
 check(Symbol().description===undefined&&Symbol(undefined).description===undefined&&Symbol('').description==='','missing-and-empty-description');
 check(caught(()=>Symbol(original('reject')))==='TypeError','description-rejects-symbol');
 const input={ [original.toPrimitive](hint:any){events.push('hint:'+hint);collect();return 'converted';}};
 events.length=0;const converted=Symbol(input,events.push('extra'));check(converted.description==='converted'&&events.join('|')==='extra|hint:string','description-ordered-conversion');
 for(const key of [undefined,null,false,17,17n,'','key','unicode:😀','nul:\u0000tail']){
  const first=Symbol.for(key),second=Symbol.for(String(key));check(first===second&&Symbol.keyFor(first)===String(key),'registry-'+String(key));
 }
 check(Symbol.for()===Symbol.for('undefined')&&Symbol.keyFor(Symbol('local'))===undefined&&Symbol.keyFor(iterator)===undefined,'registry-default-and-unregistered');
 check(caught(()=>Symbol.for(original()))==='TypeError','registry-key-rejects-symbol');
 for(const bad of [undefined,null,0,'key',{},Object(original())])check(caught(()=>Symbol.keyFor(bad))==='TypeError','keyFor-requires-symbol-'+typeof bad);
 const descriptor=Object.getOwnPropertyDescriptor(original.prototype,'description'),toPrimitive=original.prototype[original.toPrimitive];
 for(const symbol of [original(),original(''),original('text'),original.for('registered'),iterator]){
  const wrapped=Object(symbol);check(Reflect.apply(original.prototype.valueOf,wrapped,[])===symbol&&Reflect.apply(toPrimitive,wrapped,['arbitrary'])===symbol,'borrowed-symbol-value');
  check(Reflect.apply(descriptor.get,wrapped,[])===symbol.description&&Reflect.apply(original.prototype.toString,wrapped,[])===String(symbol),'borrowed-symbol-description');
 }
 for(const bad of [original.prototype,{},17,'text'])check(caught(()=>Reflect.apply(original.prototype.valueOf,bad,[]))==='TypeError'&&caught(()=>Reflect.apply(descriptor.get,bad,[]))==='TypeError','invalid-symbol-receiver');
 check(caught(()=>Reflect.construct(original,[]))==='TypeError'&&caught(()=>Reflect.construct(original.for,[]))==='TypeError','symbol-call-only');
 events.length=0;check(caught(()=>new Symbol(input,events.push('extra')))==='TypeError'&&events.join('|')==='extra','new-symbol-evaluates-arguments-without-description-conversion');
 for(const entry of [[original,'Symbol',0],[original.for,'for',1],[original.keyFor,'keyFor',1],[original.prototype.toString,'toString',0],[original.prototype.valueOf,'valueOf',0],[descriptor.get,'get description',0],[toPrimitive,'[Symbol.toPrimitive]',1]]){
  const fn=entry[0],name=Object.getOwnPropertyDescriptor(fn,'name'),length=Object.getOwnPropertyDescriptor(fn,'length');
  check(fn.name===entry[1]&&fn.length===entry[2]&&!name.writable&&!name.enumerable&&name.configurable&&!length.writable&&!length.enumerable&&length.configurable,'symbol-callable-metadata-'+entry[1]);
 }
 check(!descriptor.enumerable&&descriptor.configurable&&descriptor.set===undefined,'description-accessor-descriptor');
 for(const name of Object.getOwnPropertyNames(original).sort()){
  const value=original[name];if(typeof value!=='symbol')continue;const d=Object.getOwnPropertyDescriptor(original,name);check(!d.writable&&!d.enumerable&&!d.configurable,'well-known-descriptor-'+name);
 }
 const primitive:symbol=original('typed'),prior=Object.getOwnPropertyDescriptor(original.prototype,'toString');
 original.prototype.toString=function(...args:any[]):any{return {receiver:this,args};};
 const actual:any=primitive.toString(1,2);check(actual.receiver===primitive&&actual.args.join('|')==='1|2','typed-prototype-actual-result');Object.defineProperty(original.prototype,'toString',prior);
 Object.defineProperty(original.prototype,'description',{get(){events.push(this===primitive?'primitive':'other');return marker;},configurable:true});
 check(primitive.description===marker&&events.at(-1)==='primitive','typed-description-actual-getter');Object.defineProperty(original.prototype,'description',descriptor);
 let chain:any={payload:primitive};for(let depth=0;depth<2048;depth++)chain={next:chain};collect();for(let depth=0;depth<2048;depth++)chain=chain.next;check(chain.payload===primitive,'retained-owner-graph');
 const fallbackNames=['Boolean','Number','String','Object','Object'];const constructors=[Boolean,Number,String,BigInt,original];const payloads=[true,17,'text',17n,primitive];
 for(let index=0;index<constructors.length;index++){
  const prototype=constructors[index].prototype,saved=Object.getOwnPropertyDescriptor(prototype,tag);delete prototype[tag];
  check(brand(payloads[index])==='[object '+fallbackNames[index]+']'&&brand(Object(payloads[index]))==='[object '+fallbackNames[index]+']','deleted-tag-fallback-'+index);
  events.length=0;Object.defineProperty(prototype,tag,{get(){events.push(typeof this+':'+String(this.valueOf()));collect();return 'Custom';},configurable:true});
  check(brand(payloads[index])==='[object Custom]'&&events.length===1&&events[0].startsWith('object:'),'primitive-tag-boxed-receiver-'+index);
  Object.defineProperty(prototype,tag,{value:17,configurable:true});check(brand(payloads[index])==='[object '+fallbackNames[index]+']','non-string-tag-fallback-'+index);
  Object.defineProperty(prototype,tag,{get(){throw marker;},configurable:true});let failure:any;try{brand(payloads[index]);}catch(error){failure=error;}check(failure===marker,'tag-abrupt-'+index);
  delete prototype[tag];if(saved)Object.defineProperty(prototype,tag,saved);
 }
 for(const value of [undefined,null,[],{},function(){},new Date(0),/x/,new TypeError('x')])emit('brand:'+brand(value));
 const proxyEvents:any[]=[];const proxy=new Proxy([],{get(target:any,key:any,receiver:any){proxyEvents.push(key===tag?'tag':'other');return key===tag?'ProxyTag':Reflect.get(target,key,receiver);}});
 check(brand(proxy)==='[object ProxyTag]'&&proxyEvents.join('|')==='tag','proxy-tag-get');
 const revoked=Proxy.revocable([],{});revoked.revoke();check(caught(()=>brand(revoked.proxy))==='TypeError','revoked-proxy-before-tag');
 let revoke:any;const revoking=Proxy.revocable([],{get(_target:any,key:any){if(key===tag){revoke();return 17;}return undefined;}});revoke=revoking.revoke;check(brand(revoking.proxy)==='[object Array]','builtin-brand-before-revoking-tag-get');
 events.length=0;let keyReads=0;Symbol={get iterator(){events.push('key');keyReads++;return 'replacement';}};
 class Computed { [Symbol.iterator](){return marker;} get [Symbol.iterator](){return marker;} }
 check(keyReads===2&&Object.getOwnPropertyDescriptor(Computed.prototype,'replacement').get.name==='get replacement','class-computed-keys-evaluate-once');
 Symbol=original;const instance:any=new Computed();check(instance.replacement===marker&&keyReads===2,'class-retains-evaluated-key');
 const local=original('local-name');class Named { [local](){return marker;} [original()](){return marker;} }
 check(Named.prototype[local].name==='[local-name]'&&Object.getOwnPropertySymbols(Named.prototype).map((key:any)=>Named.prototype[key].name).includes(''),'class-computed-symbol-method-names');
 Symbol={get iterator(){events.push('object-key');return 'chosen';}};const object:any={ [Symbol.iterator]:marker };check(object.chosen===marker&&events.at(-1)==='object-key','object-computed-key-actual-global');Symbol=original;
 const dynamic:any={chosen(...args:any[]){return {receiver:this,args};}};Symbol={get iterator(){events.push('call-key');return 'chosen';}};events.length=0;const called=dynamic[Symbol.iterator](events.push('arg'));check(called.receiver===dynamic&&called.args[0]===2&&events.join('|')==='call-key|arg','computed-call-actual-key-and-reference');Symbol=original;
 const array:any[]=[];const hasKey:any={ [original.toPrimitive](hint:any){events.push('convert:'+hint);return iterator;}};
 events.length=0;check((events.push('left'),hasKey) in (events.push('right'),array),'in-shared-symbol-key');check(events.join('|')==='left|right|convert:string','in-expression-and-key-conversion-order');
 events.length=0;check(caught(()=>hasKey in 17)==='TypeError'&&events.length===0,'in-validates-object-before-key-conversion');
 Symbol={iterator:'length'};check(Symbol.iterator in array,'in-actual-global-key');Symbol=original;
 check('inline' in {inline:marker}&&({[original.toPrimitive](){return 'inline';}} in {inline:marker}),'in-inline-ordinary-aggregates');
 const globalDescriptor=Object.getOwnPropertyDescriptor(globalThis,'Symbol');events.length=0;Object.defineProperty(globalThis,'Symbol',{configurable:true,get(){events.push('get');return function(...args:any[]){events.push('call');return args[0];};}});
 Symbol(events.push('argument'));check(events.join('|')==='get|argument|call','unused-symbol-call-keeps-effects');Object.defineProperty(globalThis,'Symbol',globalDescriptor);
 Symbol=function(value:any):void{this.value=value;};check(new Symbol(marker).value===marker,'new-symbol-actual-mutable-constructor');
 Symbol=function(...args:any[]):any{return args[0];};const typed:symbol=Symbol(marker,events.push('ignored'));check(typed===marker,'typed-global-actual-result');Symbol=17;check(typeof Symbol==='number','mutable-symbol-typeof');Symbol=original;
 if(${profile}){const other=(globalThis as any).$262.createRealm().global;check(other.Symbol!==original&&other.Symbol.prototype!==original.prototype&&other.Symbol.iterator===iterator&&other.Symbol.for('cross-realm')===original.for('cross-realm'),'realm-owner-and-agent-shared-symbols');}
 async function delayed():Promise<any>{return Symbol(await Promise.resolve(marker));}async function delayedFor():Promise<any>{return Symbol.for(await Promise.resolve('saved-registry'));}
 Symbol=function(value:any):any{return value;};Symbol.for=function(value:any):any{return {key:value};};const pending=delayed(),registered=delayedFor();Symbol=original;
 async function observe():Promise<void>{const result=await pending,entry=await registered;collect();check(result===marker&&entry.key==='saved-registry','saved-symbol-callees-through-suspension');}observe();
 `;
}

test('Symbol owners and object brands share ordinary References and evaluated keys',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-symbol-owner-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try {
  const expected=new Map<boolean,string[]>();
  for(const profile of [false,true]){
   const referenceFile=path.join(temporary,`reference-${profile}.mjs`);await fs.writeFile(referenceFile,erase(subject(profile,true)));
   const reference=Bun.spawnSync([process.execPath,'-e','const fs=require("node:fs"),vm=require("node:vm");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");globalThis.print=console.log;globalThis.$262={global:globalThis,createRealm(){return {global:vm.runInNewContext("globalThis")};}};import(process.argv[1]);',referenceFile],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const lines=reference.stdout.toString().trimEnd().split('\n');expect(lines.at(-1)).toBe('saved-symbol-callees-through-suspension:true');expected.set(profile,lines);
  }
  // V8 currently exposes primitive receivers to @@toStringTag getters; the
  // pinned ToObject/Get algorithm and JavaScriptCore agree on boxed receivers.
  // Independently check V8 on the preceding Symbol partitions as well.
  const nodeFile=path.join(temporary,'node-symbol-reference.mjs');
  await fs.writeFile(nodeFile,erase(subject(false,true).split(' const fallbackNames=')[0]+"emit('node-symbol-reference:true');"));
  const node=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");import(process.argv[1]);',nodeFile],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  const nodeLines=node.stdout.toString().trimEnd().split('\n');expect(nodeLines.pop()).toBe('node-symbol-reference:true');
  expect(expected.get(false)!.slice(0,nodeLines.length)).toEqual(nodeLines);
  for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(profile,noGc);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),moduleRoots:[entry],initializationEntries:[entry],...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/symbol-owner.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,exitCode:native.exitCode,stderr:native.stderr.toString(),stdout:native.exitCode?native.stdout.toString():''}).toEqual({typed,profile,noGc,exitCode:0,stderr:'',stdout:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:'normal'});
   expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')).toEqual(expected.get(profile)!);
  }
 } finally {await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

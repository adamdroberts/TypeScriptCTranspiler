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
 const original=Array,prototype=original.prototype,marker={token:71},events:any[]=[],symbol=Symbol('element');
 function caught(callback:any):string{try{callback();return 'none';}catch(error){return error instanceof TypeError?'TypeError':error instanceof RangeError?'RangeError':String(error);}}
 const payloads=[undefined,null,false,true,'','text',17n,symbol,marker,function(){},[]];
 const lists:any[]=[[],...payloads.map((value:any)=>[value]),[0],[-0],[1],[4294967295],[-1],[1.5],[NaN],[Infinity],[4294967296]];
 let seed=0x54ab;for(let sample=0;sample<24;sample++){seed=(seed*1664525+1013904223)>>>0;const values:any[]=[];for(let index=0;index<(seed%47)+2;index++)values.push(payloads[(seed+index)%payloads.length]);lists.push(values);}
 for(const values of lists)for(const construct of [false,true]){
  let result:any,error:any;try{result=construct?Reflect.construct(original,values):Reflect.apply(original,marker,values);}catch(caught){error=caught;}
  const singleNumber=values.length===1&&typeof values[0]==='number';const invalid=singleNumber&&(!Number.isInteger(values[0])||values[0]<0||values[0]>4294967295);
  if(invalid){check(error instanceof RangeError,'invalid-numeric-length');continue;}
  const length=singleNumber?values[0]:values.length;check(!error&&original.isArray(result)&&result.length===length&&Object.getPrototypeOf(result)===prototype,'constructor-result-owner');
  if(singleNumber)check(Object.getOwnPropertyNames(result).join('|')==='length'&&Object.is(result.length,0)===Object.is(length===0?0:length,0),'numeric-length-remains-sparse');
  else check(values.every((value:any,index:number)=>Object.is(result[index],value)),'ordered-elements-and-identity');
 }
 const desc=Object.getOwnPropertyDescriptor(original,'prototype'),back=Object.getOwnPropertyDescriptor(prototype,'constructor'),species=Object.getOwnPropertyDescriptor(original,Symbol.species);
 check(desc.value===prototype&&!desc.writable&&!desc.enumerable&&!desc.configurable,'array-prototype-descriptor');
 check(back.value===original&&back.writable&&!back.enumerable&&back.configurable&&Reflect.apply(species.get,marker,[])===marker&&!species.enumerable&&species.configurable,'prototype-constructor-and-species-receiver');
 check(!Reflect.set(original,'prototype',marker)&&!Reflect.deleteProperty(original,'prototype')&&!Reflect.defineProperty(original,'prototype',{value:marker})&&Reflect.defineProperty(original,'prototype',{value:prototype}),'immutable-constructor-prototype');
 check(caught(()=>{original.prototype=marker;})==='TypeError','strict-prototype-write');
 for(const fn of [original,original.isArray,original.from,original.of,original.fromAsync]){
  const name=Object.getOwnPropertyDescriptor(fn,'name'),length=Object.getOwnPropertyDescriptor(fn,'length');check(!name.writable&&!name.enumerable&&name.configurable&&!length.writable&&!length.enumerable&&length.configurable,'array-callable-metadata');
 }
 const otherPrototype:any={label:'custom'},target=new Proxy(function Target(){},{get(object:any,key:any,receiver:any){if(key==='prototype'){events.push('prototype');collect();return otherPrototype;}return Reflect.get(object,key,receiver);}});
 events.length=0;const custom=Reflect.construct(original,[marker,17],target);check(custom[0]===marker&&custom[1]===17&&Object.getPrototypeOf(custom)===otherPrototype&&events.join('|')==='prototype','actual-new-target-prototype');
 events.length=0;check(caught(()=>Reflect.construct(original,[-1],target))==='RangeError'&&events.join('|')==='prototype','prototype-before-range-validation');
 const poison={ [Symbol.toPrimitive](){throw marker;}};check(original(poison)[0]===poison&&new original(poison)[0]===poison,'single-object-is-an-element-without-coercion');
 const globalDescriptor=Object.getOwnPropertyDescriptor(globalThis,'Array');events.length=0;Object.defineProperty(globalThis,'Array',{configurable:true,get(){events.push('get');return function(...args:any[]){events.push('call');return {args,receiver:this};};}});
 Array(events.push('argument'));check(events.join('|')==='get|argument|call','unused-call-ordinary-reference-effects');
 const result:number[]=Array(marker,symbol);check(result.args[0]===marker&&result.args[1]===symbol,'typed-constructor-actual-result');Object.defineProperty(globalThis,'Array',globalDescriptor);
 Array=function(this:any,...args:any[]){events.push('construct');this.args=args;};events.length=0;const wrapper:any=new Array(marker,symbol);check(wrapper.args[0]===marker&&wrapper.args[1]===symbol&&events.join('|')==='construct','new-actual-global-constructor');Array=original;
 const replacement={prototype:marker,get of(){events.push('method');return function(this:any,...args:any[]){return {receiver:this,args};};},isArray(){return marker;}};
 Array=replacement;events.length=0;const factory:string[]=Array.of(marker,events.push('arg'));check(factory.receiver===replacement&&factory.args[0]===marker&&factory.args[1]===2&&events.join('|')==='method|arg'&&Array.prototype===marker&&Array.isArray([])===marker,'static-members-prototype-and-actual-result');
 Array=17;check(typeof Array==='number','mutable-array-typeof');Array=original;
 let graph:any={values:original(marker,symbol)};for(let depth=0;depth<2048;depth++)graph={next:graph};collect();for(let depth=0;depth<2048;depth++)graph=graph.next;check(graph.values[0]===marker&&graph.values[1]===symbol,'retained-owner-graph');
 if(${profile}){const other=(globalThis as any).$262.createRealm().global;check(other.Array!==original&&other.Array.prototype!==prototype,'realm-array-owners');const foreign=new Proxy(other.Proxy,{get(object:any,key:any,receiver:any){return key==='prototype'?17:Reflect.get(object,key,receiver);}});const foreignArray=Reflect.construct(original,[marker],foreign);check(Object.getPrototypeOf(foreignArray)===other.Array.prototype&&foreignArray[0]===marker,'new-target-realm-prototype-fallback');}
 async function delayed():Promise<any>{return Array(await Promise.resolve(marker));}async function delayedNew():Promise<any>{return new Array(await Promise.resolve(marker));}async function delayedOf():Promise<any>{return Array.of(await Promise.resolve(marker));}
 Array=function(value:any):any{return {value};};Array.of=function(value:any):any{return {value};};const call=delayed(),construct=delayedNew(),pendingFactory=delayedOf();Array=original;
 async function observe():Promise<void>{const one=await call,two=await construct,three=await pendingFactory;collect();check(one.value===marker&&two.value===marker&&three.value===marker,'saved-array-callees-through-suspension');}observe();
 `;
}

test('Array construction shares ordinary Realm owners, actual Lists and prototype identity',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-array-constructor-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try {
  const expected=new Map<boolean,string[]>();
  for(const profile of [false,true]){
   const referenceFile=path.join(temporary,`reference-${profile}.mjs`);await fs.writeFile(referenceFile,erase(subject(profile,true)));
   const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");globalThis.print=console.log;globalThis.$262={global:globalThis,createRealm(){return {global:vm.runInNewContext("globalThis")};}};import(process.argv[1]);',referenceFile],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const lines=reference.stdout.toString().trimEnd().split('\n');expect(lines.at(-1)).toBe('saved-array-callees-through-suspension:true');expected.set(profile,lines);
  }
  for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(profile,noGc);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),moduleRoots:[entry],initializationEntries:[entry],...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/array-constructor-owner.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,exitCode:native.exitCode,stderr:native.stderr.toString(),stdout:native.exitCode?native.stdout.toString():''}).toEqual({typed,profile,noGc,exitCode:0,stderr:'',stdout:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:'normal'});
   expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')).toEqual(expected.get(profile)!);
  }
 } finally {await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

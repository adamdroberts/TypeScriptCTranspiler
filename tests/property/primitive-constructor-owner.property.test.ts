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
 const originals=[Number,String,Boolean],names=['Number','String','Boolean'],marker={token:59},events:any[]=[];
 function describe(value:any):string{return Object.is(value,-0)?'-0':typeof value+':'+originals[1](value);}
 const values=[undefined,null,false,true,0,-0,17,1.5,NaN,Infinity,-Infinity,'',' -0 ','0xff','1.5',17n,Symbol('payload')];
 for(let index=0;index<originals.length;index++){
  const constructor=originals[index],name=names[index];
  for(const value of values){
   try{emit(name+':call:'+describe(constructor(value,marker)));}catch(error){check(error instanceof TypeError,name+':call-error');}
   try{const wrapper=new constructor(value,marker);collect();emit(name+':construct:'+describe(wrapper.valueOf()));check(Object.getPrototypeOf(wrapper)===constructor.prototype,name+':default-prototype');}catch(error){check(error instanceof TypeError,name+':construct-error');}
  }
  const missing=constructor(),wrapper=new constructor();check(Object.is(wrapper.valueOf(),missing),name+':omitted-actual');
  const prototype=Object.getOwnPropertyDescriptor(constructor,'prototype');check(constructor.name===name&&constructor.length===1&&prototype.value===constructor.prototype&&!prototype.writable&&!prototype.enumerable&&!prototype.configurable&&constructor.prototype.constructor===constructor,name+':constructor-metadata');
  const input={[Symbol.toPrimitive](hint:string){events.push(hint);collect();return '23';}};
  events.length=0;const ignored=(events.push('ignored'),marker),result=constructor(input,ignored);check((index===2?result===true&&events.join('|')==='ignored':events.join('|')==='ignored|'+(index===0?'number':'string')),name+':actual-effects-before-conversion');
  const target=new Proxy(function Target(){},{get(object,key,receiver){if(key==='prototype'){events.push('prototype');collect();return constructor.prototype;}return Reflect.get(object,key,receiver);}});
  events.length=0;const constructed=Reflect.construct(constructor,[input],target);check(Object.getPrototypeOf(constructed)===constructor.prototype&&(index===2?constructed.valueOf()===true&&events.join('|')==='prototype':events.join('|')===(index===0?'number':'string')+'|prototype'),name+':conversion-before-newtarget-prototype');
  const throwing={[Symbol.toPrimitive](){collect();throw marker;}};events.length=0;let caught:any;try{Reflect.construct(constructor,[throwing],target);}catch(error){caught=error;}check(index===2?events.join('|')==='prototype':caught===marker&&events.length===0,name+':abrupt-conversion-before-allocation');
 }
 const symbol=Symbol('call-only');check(String(symbol)==='Symbol(call-only)','string-call-symbol-exception');let symbolError:any;try{new String(symbol);}catch(error){symbolError=error;}check(symbolError instanceof TypeError,'string-construction-rejects-symbol');
 for(const constructor of originals){const boxed=Object(constructor===Number?17:constructor===String?'A😀Z':true);check(Object.getPrototypeOf(boxed)===constructor.prototype&&boxed.valueOf()===(constructor===Number?17:constructor===String?'A😀Z':true),'object-boxing-shares-wrapper-initialization');}
 const text=new String('A😀Z');check(text.length===4&&Reflect.ownKeys(text).join('|')==='0|1|2|3|length','string-wrapper-exotic-own-keys');
 for(let index=0;index<text.length;index++){const descriptor=Object.getOwnPropertyDescriptor(text,String(index));check(descriptor.value.charCodeAt(0)==='A😀Z'.charCodeAt(index)&&!descriptor.writable&&descriptor.enumerable&&!descriptor.configurable,'string-wrapper-exotic-code-unit-descriptor');}
 const length=Object.getOwnPropertyDescriptor(text,'length');check(length.value===4&&!length.writable&&!length.enumerable&&!length.configurable,'string-wrapper-exotic-length-descriptor');
 let owner:any={constructors:originals,input:{valueOf(){collect();return '31';},toString(){collect();return '31';}}};for(let depth=0;depth<2048;depth++)owner={next:owner};collect();for(let depth=0;depth<2048;depth++)owner=owner.next;check(owner.constructors[0](owner.input)===31&&owner.constructors[1](owner.input)==='31'&&owner.constructors[2](owner.input)===true,'retained-primitive-constructor-owner-graph-stress');
 ${profile?`
 const other=$262.createRealm().global;
 for(let index=0;index<originals.length;index++){const constructor=originals[index],foreign=other[names[index]],target=new Proxy(other.Proxy,{get(object,key,receiver){return key==='prototype'?17:Reflect.get(object,key,receiver);}});const wrapper=Reflect.construct(constructor,[17],target);check(Object.getPrototypeOf(wrapper)===foreign.prototype,'newtarget-creation-realm-fallback-prototype');}
 let foreignError:any;try{other.Number(Symbol('value'));}catch(error){foreignError=error;}check(foreignError instanceof other.TypeError&&!(foreignError instanceof TypeError),'constructor-error-creation-realm');
 `:''}
 function numeric(value:number):number{return Number(value);}function textual(value:string):string{return String(value);}function boolean(value:boolean):boolean{return Boolean(value);}
 const callbacks=[numeric,textual,boolean];
 for(let index=0;index<names.length;index++){
  const name=names[index];globalThis[name]=function(...actual:any[]){collect();return actual[0];};check(callbacks[index](marker)===marker&&globalThis[name](marker,undefined)===marker,'mutable-primitive-global-and-typed-result-'+name);
  globalThis[name]={token:marker};check((index===0?typeof Number:index===1?typeof String:typeof Boolean)==='object','mutable-primitive-global-typeof-'+name);globalThis[name]=originals[index];
 }
 for(let index=0;index<names.length;index++){
  const name=names[index];Object.defineProperty(globalThis,name,{configurable:true,enumerable:false,get(){events.push('get');collect();return function(...actual:any[]){events.push('call');collect();return marker;};}});
  events.length=0;if(index===0)Number((events.push('argument'),marker));else if(index===1)String((events.push('argument'),marker));else Boolean((events.push('argument'),marker));check(events.join('|')==='get|argument|call','unused-global-call-retains-get-and-call-effects-'+name);
  Object.defineProperty(globalThis,name,{value:originals[index],writable:true,enumerable:false,configurable:true});
 }
 async function delayedNumber():Promise<any>{return Number(await Promise.resolve(marker));}
 async function delayedString():Promise<any>{return new String(await Promise.resolve(marker));}
 Number=function(value:any){return value;};String=function(value:any){return value;};const number=delayedNumber(),string=delayedString();Number=originals[0];String=originals[1];
 async function observe():Promise<void>{const first=await number,second=await string;collect();check(first===marker&&second===marker,'saved-call-and-construct-callees-through-suspension');}observe();
 `;
}

test('Primitive constructors share Realm References, actual Lists and ordered wrapper construction',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-primitive-constructor-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try {
  const expected=new Map<boolean,string[]>();
  for(const profile of [false,true]){
   const referenceFile=path.join(temporary,`reference-${profile}.mjs`);await fs.writeFile(referenceFile,erase(subject(profile,true)));
   const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");globalThis.print=console.log;globalThis.$262={global:globalThis,createRealm(){return {global:vm.runInNewContext("globalThis")};}};import(process.argv[1]);',referenceFile],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const lines=reference.stdout.toString().trimEnd().split('\n');expect(lines.at(-1)).toBe('saved-call-and-construct-callees-through-suspension:true');expected.set(profile,lines);
  }
  for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(profile,noGc);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),moduleRoots:[entry],initializationEntries:[entry],...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/primitive-constructor-owner.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,exitCode:native.exitCode,stderr:native.stderr.toString(),stdout:native.exitCode?native.stdout.toString():''}).toEqual({typed,profile,noGc,exitCode:0,stderr:'',stdout:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:'normal'});
   expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')).toEqual(expected.get(profile)!);
  }
 } finally {await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

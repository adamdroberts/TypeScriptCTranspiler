import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {runtimeGlobalBindings} from '../../src/global-bindings';
import {parseHostObservation} from '../test262/protocol';

function subject(profile:boolean,noGc:boolean):string {
 const entries=[...runtimeGlobalBindings].map(([name,descriptor])=>({name,...descriptor}));
 const accesses=entries.filter(entry=>entry.writable).map(({name})=>{const actuals='marker,symbol',ignored="events.push('argument'),marker,symbol",order='get|argument|call',first='marker',second='symbol';return `{
  const saved=own(host,${JSON.stringify(name)});events.length=0;
  const replacement=function(this:any,...args:any[]):any{events.push('call');return {args,receiver:this};};
  define(host,${JSON.stringify(name)},{get(){events.push('get');collect();return replacement;},configurable:true});
  ${name}(${ignored});check(events.join('|')==='${order}','unused-global-call-${name}');
  events.length=0;const actual:number=${name}(${actuals});check(actual.args[0]===${first}&&actual.args[1]===${second}&&actual.receiver===undefined&&events.join('|')==='get|call','typed-actual-global-result-${name}');
  events.length=0;const built:any=new ${name}(${actuals});check(built.args[0]===${first}&&built.args[1]===${second}&&events.join('|')==='get|call','actual-global-construction-${name}');
  define(host,${JSON.stringify(name)},{value:{get method(){events.push('method');return function(this:any,...args:any[]):any{return {receiver:this,args};};},prototype:marker},writable:true,configurable:true});
  const owner:any=${name};events.length=0;const member:any=${name}.method(events.push('argument'),marker);check(member.receiver===owner&&member.args[0]===2&&member.args[1]===marker&&events.join('|')==='method|argument'&&${name}.prototype===marker,'actual-global-property-reference-${name}');
  define(host,${JSON.stringify(name)},{value:17,writable:true,configurable:true});check(typeof ${name}==='number','actual-global-typeof-${name}');
  define(host,${JSON.stringify(name)},saved);
 }`;}).join('\n');
 return `// @ts-nocheck
 export {};
 function emit(value:any):void{${profile?'output':'console.log'}(value);}
 function check(value:boolean,label:string):void{if(!value)throw label;emit(label+':true');}
 function collect():void{${profile&&!noGc?'collectHook();':''}}
 const host=globalThis;const output=host.print,collectHook=${profile&&!noGc?'host.$262.gc':'undefined'};
 const define=Object.defineProperty,own=Object.getOwnPropertyDescriptor,same=Object.is,keys=Object.keys,apply=Reflect.apply,marker={token:83},symbol=Symbol('actual'),events:any[]=[];
 const entries:any[]=${JSON.stringify(entries)};
 for(const entry of entries){const descriptor=own(host,entry.name);check(!!descriptor&&descriptor.writable===entry.writable&&descriptor.configurable===entry.configurable&&!descriptor.enumerable,'canonical-global-descriptor-'+entry.name);}
 ${accesses}
 let functionError:any;try{Function(symbol);}catch(error){functionError=error;}check(functionError instanceof TypeError,'intrinsic-function-converts-only-after-actual-callee');
 let calls=0;function increment():number{calls+=1;return calls;}check(increment()===1&&increment()===2&&calls===2,'shared-physical-reference-storage');
 const constructors=[Map,Set,Promise,Date,RegExp,Error],maps:any=new Map([[marker,symbol]]),sets:any=new Set([marker,symbol]);check(maps.get(marker)===symbol&&sets.has(marker)&&sets.has(symbol),'actual-keyed-constructor-values');
 const mapped:any=JSON.parse('{"token":17,"nested":[true,null]}');check(mapped.token===17&&mapped.nested[0]===true&&mapped.nested[1]===null,'actual-json-consumer-result');
 let graph:any={owners:constructors};for(let depth=0;depth<2048;depth++)graph={next:graph};collect();for(let depth=0;depth<2048;depth++)graph=graph.next;check(graph.owners.every((owner:any,index:number)=>owner===constructors[index]),'retained-canonical-owner-graph');
 const originalError=Error,originalJSON=JSON;
 async function delayed():Promise<any>{return Error(await Promise.resolve(marker));}async function delayedNew():Promise<any>{return new Error(await Promise.resolve(marker));}async function delayedMember():Promise<any>{return JSON.parse(await Promise.resolve(marker));}
 Error=function(value:any):any{return {value};};JSON={parse(value:any){return {value};}};const call=delayed(),construction=delayedNew(),member=delayedMember();Error=originalError;JSON=originalJSON;
 async function observe():Promise<void>{const first=await call,second=await construction,third=await member;collect();check(first.value===marker&&second.value===marker&&third.value===marker,'saved-canonical-callees-through-suspension');}observe();
 `;
}

test('Canonical Realm bindings share actual References, callable owners and result flow',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-canonical-globals-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try {
  const expected=new Map<boolean,string[]>();
  for(const profile of [false,true]){
   const referenceFile=path.join(temporary,`reference-${profile}.mjs`);await fs.writeFile(referenceFile,erase(subject(profile,true)));
   const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");globalThis.print=console.log;globalThis.$262={global:globalThis,createRealm(){return {global:vm.runInNewContext("globalThis")};}};import(process.argv[1]);',referenceFile],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const lines=reference.stdout.toString().trimEnd().split('\n');expect(lines.at(-1)).toBe('saved-canonical-callees-through-suspension:true');expected.set(profile,lines);
  }
  for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(profile,noGc);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),moduleRoots:[entry],initializationEntries:[entry],...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/canonical-global-owner.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,exitCode:native.exitCode,stderr:native.stderr.toString(),stdout:native.exitCode?native.stdout.toString():''}).toEqual({typed,profile,noGc,exitCode:0,stderr:'',stdout:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:'normal'});
   expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')).toEqual(expected.get(profile)!);
  }
 } finally {await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

test('Opaque intrinsic Function source retains its runtime diagnostic without a bridge',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-function-source-boundary-'));
 try{
  for(const noGc of [false,true]){
   const directory=path.join(temporary,String(noGc));await fs.mkdir(directory);const entry=path.join(directory,'main.ts'),output=path.join(directory,'program'),diagnostics:string[]=[];
   await fs.writeFile(entry,`// @ts-nocheck\nexport {};const body=process.argv[1];try{Function(body);console.log('unexpected');}catch(error){console.log(error instanceof EvalError,error.message==='Function source is outside the finite AOT graph');}`);
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output,'return 177;'],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({exitCode:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({exitCode:0,stderr:'',stdout:'true true\n'});
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},120_000);

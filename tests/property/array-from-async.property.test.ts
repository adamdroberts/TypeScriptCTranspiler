import {expect,test} from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";

function subject(strict:boolean,profile:boolean,noGc:boolean):string{
 return `${strict?'export {};':''}
 function emit(value:any):void{${profile?'(globalThis as any).print':'console.log'}(value);}
 function collect():void{${profile&&!noGc?'(globalThis as any).$262.gc();':''}}
 function check(value:boolean,label:string):void{if(!value)throw label;emit(label+':true');}
 function deferred(value:any,rejected:boolean=false):any{return new Promise((resolve:any,reject:any)=>queueMicrotask(()=>{collect();if(rejected)reject(value);else resolve(value);}));}
 async function verify():Promise<void>{
  const from:any=Array.fromAsync,marker:any={token:11},trace:any[]=[];
  check(from.name==='fromAsync'&&from.length===1&&!Object.hasOwn(from,'prototype'),'ordinary-builtin-metadata');
  const descriptor:any=Object.getOwnPropertyDescriptor(Array,'fromAsync');check(descriptor.writable&&!descriptor.enumerable&&descriptor.configurable,'ordinary-builtin-descriptor');
  try{Reflect.construct(from,[]);throw 'missing';}catch(error){check(error instanceof TypeError,'ordinary-builtin-not-constructor');}
  let touched=0;const invalid:any={get [Symbol.asyncIterator](){touched++;return ()=>({});}};
  try{await from(invalid,0);throw 'missing';}catch(error){check(error instanceof TypeError&&touched===0,'mapper-validation-precedence');}
  for(const mode of ['sync','async','arraylike']){
   let index=0,changed=false;const receiver:any={token:17},order:any[]=[];
   const iterator:any={get next(){order.push('get-next');return function(this:any):any{order.push('next:'+index+':'+arguments.length+':'+(this===iterator));const k=index++;return deferred({done:k>=2,value:deferred(k===0?19:changed?23:29)});};}};
   const sync:any={get next(){order.push('get-next');return function(this:any):any{order.push('next:'+index+':'+arguments.length+':'+(this===sync));const k=index++;return {done:k>=2,value:deferred(k===0?19:changed?23:29)};};}};
   const source:any={get [Symbol.asyncIterator](){order.push('get-async');return mode==='async'?function(this:any):any{order.push('open:'+arguments.length+':'+(this===source));return iterator;}:undefined;},get [Symbol.iterator](){order.push('get-sync');return mode==='sync'?function(this:any):any{order.push('open:'+arguments.length+':'+(this===source));return sync;}:undefined;},get length(){order.push('length');return 2;},get 0(){order.push('get:0');return deferred(19);},get 1(){order.push('get:1');return deferred(changed?23:29);}};
   const result:any=await from(source,function(this:any,value:any,k:any):any{order.push('map:'+k+':'+arguments.length+':'+(this===receiver)+':'+(value instanceof Promise));changed=true;return deferred(mode==='async'?value:value+1);},receiver);
   check(result.length===2&&result[0]===(mode==='async'?19:20)&&result[1]===(mode==='async'?23:24),'sequential-'+mode+'-values');
   emit(mode+':'+order.join('|'));
  }
  const promised=deferred(marker),asynchronous:any={[Symbol.asyncIterator](){let done=false;return {next(){const result={done,value:promised};done=true;return result;}};}};
  const unwrapped:any=await from(asynchronous);check(unwrapped[0]===promised,'async-iterator-value-is-not-awaited');
  const iterable:any={[Symbol.iterator](){let done=false;return {next(){const result={done,value:promised};done=true;return result;}};}};
  const wrapped:any=await from(iterable);check(wrapped[0]===marker,'sync-iterator-value-is-awaited');
  function Product(this:any,...args:any[]):any{trace.push('construct:'+args.length+':'+args[0]);return new Proxy({}, {defineProperty(target:any,key:any,descriptor:any):boolean{trace.push('define:'+String(key));return Reflect.defineProperty(target,key,descriptor);},set(target:any,key:any,value:any):boolean{trace.push('set:'+String(key));return Reflect.set(target,key,value);}});}
  const built:any=await from.call(Product,{0:marker,length:1});check(built[0]===marker&&built.length===1,'generic-arraylike-constructor');
  emit('constructor:'+trace.join('|'));trace.length=0;
  const constructed:any=await from.call(Product,[marker]);check(constructed[0]===marker&&constructed.length===1,'generic-iterable-constructor');emit('constructor:'+trace.join('|'));
  const saved:any=Array.fromAsync;(Array as any).fromAsync=function(this:any,...args:any[]):any{return [this===Array,args.length,args[0]];};
  const replacement:any=Array.fromAsync([marker]);check(replacement[0]===true&&replacement[1]===1&&replacement[2][0]===marker,'mutable-ordinary-method-lookup');(Array as any).fromAsync=saved;
  for(const failure of ['next-call','next-reject','next-primitive','done-get','value-get','mapper-call','mapper-reject','define','length']){
   const error:any={failure},events:any[]=[];let done=false;
   const source:any={[Symbol.asyncIterator](){return {next(){events.push('next');if(failure==='next-call')throw error;if(failure==='next-reject')return deferred(error,true);if(failure==='next-primitive')return 0;return {get done(){if(failure==='done-get')throw error;return done;},get value(){if(failure==='value-get')throw error;done=true;return marker;}};},return(){events.push('close:'+arguments.length);return deferred('close-rejection',true);}};}};
   function Result(this:any):any{return new Proxy({}, {defineProperty(target:any,key:any,descriptor:any):boolean{if(failure==='define')throw error;return Reflect.defineProperty(target,key,descriptor);},set(target:any,key:any,value:any):boolean{if(failure==='length')throw error;return Reflect.set(target,key,value);}});}
   try{await from.call(Result,source,(value:any):any=>{if(failure==='mapper-call')throw error;if(failure==='mapper-reject')return deferred(error,true);return value;});throw 'missing';}catch(actual){check(failure==='next-primitive'?actual instanceof TypeError:actual===error,'abrupt-'+failure);}
   emit(failure+':'+events.join('|'));
  }
  for(const failure of ['get-return','call-return','reject-return','primitive-return']){
   const error:any={failure};let closes=0;
   const source:any={[Symbol.asyncIterator](){return {next(){return {done:false,value:marker};},get return(){closes++;if(failure==='get-return')throw 'secondary';return function():any{if(failure==='call-return')throw 'secondary';return deferred(failure==='primitive-return'?0:'secondary',failure==='reject-return');};}};}};
   try{await from(source,()=>{throw error;});throw 'missing';}catch(actual){check(actual===error&&closes===1,'close-precedence-'+failure);}
  }
  try{await from({length:1n});throw 'missing';}catch(error){check(error instanceof TypeError,'arraylike-length-to-number');}
  for(const mode of ['sync','async','arraylike']){
   const error:any={token:43},poison:any=Promise.resolve(marker);Object.defineProperty(poison,'constructor',{get(){throw error;}});let closed=0,done=false;
   const iterator:any={next(){const result={done,value:poison};done=true;return result;},return(){closed++;return {done:true};}};
   const source:any=mode==='arraylike'?{0:poison,length:1}:mode==='sync'?{[Symbol.iterator](){return iterator;}}:{[Symbol.asyncIterator](){return iterator;}};
   if(mode==='async'){const result:any=await from(source);check(result[0]===poison&&closed===0,'async-value-constructor-is-not-read');}
   else{try{await from(source);throw 'missing';}catch(actual){check(actual===error&&closed===(mode==='sync'?1:0),'await-constructor-abrupt-'+mode);}}
  }
  let reads=0;const arraylike:any={get length(){reads++;return 2;},get 0(){return deferred(marker);},get 1(){return deferred(marker);}};
  const snapshot:any=await from(arraylike);check(reads===1&&snapshot[0]===marker&&snapshot[1]===marker,'arraylike-length-snapshot');
  let thenable:any=marker;for(let depth=0;depth<128;depth++){const captured:any=thenable;thenable={then(resolve:any){collect();resolve(captured);}};}
  const deep:any=await from({0:thenable,length:1});check(deep[0]===marker,'deep-thenable-worklist');
 }
 verify().catch((error:any)=>{emit('failure:'+String(error));throw error;});`;
}

// Independent JavaScript transcription of the pinned sec-array.fromasync and
// AsyncFromSyncIteratorContinuation algorithms. Node 26.11 reads sync next
// twice and retries AsyncIteratorClose after next/return rejection; those
// implementation differences make its built-in unsuitable as a full oracle.
const specificationOracle = `
(function(){
 const method=(object,key)=>{const value=object[key];if(value==null)return undefined;if(typeof value!=='function')throw new TypeError();return value;};
 const closeSync=(iterator,error)=>{try{const fn=method(iterator,'return');if(fn!==undefined){const result=Reflect.apply(fn,iterator,[]);if(Object(result)!==result)throw new TypeError();}}catch(_){}throw error;};
 const wrap=(iterator,next)=>({next(){try{const result=Reflect.apply(next,iterator,[]);if(Object(result)!==result)throw new TypeError();const done=!!result.done,value=result.value;let promise;try{promise=Promise.resolve(value);}catch(error){if(!done)closeSync(iterator,error);throw error;}return promise.then(value=>({done,value}),error=>{if(!done)closeSync(iterator,error);throw error;});}catch(error){return Promise.reject(error);}},return(){try{const fn=method(iterator,'return');if(fn===undefined)return Promise.resolve({done:true,value:undefined});const result=Reflect.apply(fn,iterator,[]);if(Object(result)!==result)throw new TypeError();const done=!!result.done,value=result.value;return Promise.resolve(value).then(value=>({done,value}));}catch(error){return Promise.reject(error);}}});
 async function fromAsync(items,mapper,thisArg){
  const C=this,mapping=mapper!==undefined;if(mapping&&typeof mapper!=='function')throw new TypeError();
  const asyncMethod=method(items,Symbol.asyncIterator);let iterator,next;
  if(asyncMethod!==undefined){iterator=Reflect.apply(asyncMethod,items,[]);if(Object(iterator)!==iterator)throw new TypeError();next=iterator.next;}
  else{const syncMethod=method(items,Symbol.iterator);if(syncMethod!==undefined){const sync=Reflect.apply(syncMethod,items,[]);if(Object(sync)!==sync)throw new TypeError();iterator=wrap(sync,sync.next);next=iterator.next;}}
  const constructor=(()=>{try{Reflect.construct(new Proxy(C,{construct(){return {};}}),[]);return true;}catch(_){return false;}})();
  if(iterator!==undefined){const result=constructor?Reflect.construct(C,[]):[];let k=0;
   const close=async(error)=>{try{const fn=method(iterator,'return');if(fn!==undefined)await Reflect.apply(fn,iterator,[]);}catch(_){}throw error;};
   for(;;){if(k>=9007199254740991)return close(new TypeError());const step=await Reflect.apply(next,iterator,[]);if(Object(step)!==step)throw new TypeError();if(step.done){if(!Reflect.set(result,'length',k))throw new TypeError();return result;}const value=step.value;let mapped=value;
    if(mapping){try{mapped=await Reflect.apply(mapper,thisArg,[value,k]);}catch(error){return close(error);}}
    try{if(!Reflect.defineProperty(result,String(k),{value:mapped,writable:true,enumerable:true,configurable:true}))throw new TypeError();}catch(error){return close(error);}k++;}
  }
  const source=Object(items),raw=+source.length,length=Number.isNaN(raw)||raw<=0?0:Math.min(Math.floor(raw),9007199254740991),result=constructor?Reflect.construct(C,[length]):new Array(length);
  for(let k=0;k<length;k++){const value=await source[k],mapped=mapping?await Reflect.apply(mapper,thisArg,[value,k]):value;if(!Reflect.defineProperty(result,String(k),{value:mapped,writable:true,enumerable:true,configurable:true}))throw new TypeError();}
  if(!Reflect.set(result,'length',length))throw new TypeError();return result;
 }
 Object.defineProperty(fromAsync,'length',{value:1});Object.defineProperty(Array,'fromAsync',{value:fromAsync,writable:true,enumerable:false,configurable:true});
})();`;

test("Array.fromAsync retains one async iterator and completion worklist",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-array-from-async-"));
    const erase=(source:string,module:ts.ModuleKind)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module}}).outputText;
    try{
        for(const strict of [false,true]){
            const referenceFile=path.join(temporary,`reference-${strict}.cjs`);await fs.writeFile(referenceFile,specificationOracle+erase(subject(strict,false,true),ts.ModuleKind.CommonJS));
            const reference=Bun.spawnSync(["node","-e",'const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");require(process.argv[1]);',referenceFile],{stdout:"pipe",stderr:"pipe",timeout:120_000});
            expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const expected=reference.stdout.toString().trimEnd().split("\n");expect(expected.at(-1)).toBe("deep-thenable-worklist:true");
            for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]){
                const directory=path.join(temporary,`${strict}-${typed}-${profile}-${noGc}`);await fs.mkdir(directory);
                const entry=path.join(directory,typed?"main.ts":strict?"main.mjs":"main.js"),output=path.join(directory,"program"),diagnostics:string[]=[];
                const source=subject(strict,profile,noGc);await fs.writeFile(entry,typed?source:erase(source,ts.ModuleKind.ESNext));
                const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),...(strict?{moduleRoots:[entry]}:{}),initializationEntries:[entry],
                    ...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/array-from-async.js#"+(strict?"module":"sloppy"),setupEntries:[],testEntry:entry,async:false,scriptEntries:strict?[]:[entry]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
                expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
                const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
                expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
                const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:"normal"});
                expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split("\n")).toEqual(expected);
            }
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

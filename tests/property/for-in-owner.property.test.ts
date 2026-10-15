import {nodeReferenceSync} from './node-reference';
import {expect,test} from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";

function subject(strict:boolean,profile:boolean,noGc:boolean,reference=false):string{
 const keyHead=(source:string)=>reference?`const key of enumerate(${source})`:`const key in ${source}`;
 const oracle=reference?`
 function* enumerate(source:any):Generator<string>{
  if(source===null||source===undefined)return;
  let object:any=Object(source);const visited=new Set<string>();
  while(object!==null){
   const remaining=Reflect.ownKeys(object).filter(key=>typeof key==='string');
   for(const key of remaining){if(visited.has(key as string))continue;
    const descriptor=Reflect.getOwnPropertyDescriptor(object,key);
    if(descriptor){visited.add(key as string);if(descriptor.enumerable)yield key as string;}
   }
   object=Reflect.getPrototypeOf(object);
  }
 }`:'';
 return `${strict?'export {};':''}
 ${oracle}
 function emit(value:any):void{${profile?'(globalThis as any).print':'console.log'}(value);}
 function check(value:boolean,label:string):void{if(!value)throw label;emit(label+':true');}
 function collect():void{${profile&&!noGc?'(globalThis as any).$262.gc();':''}}
 const marker:any={token:11},symbol=Symbol('excluded');
 class Fields{first=1;second='two';method(){return marker;}}
 function keys(source:any):string{const output:string[]=[];for(const key in source){collect();output.push(key);}return output.join('|');}
 const prototype:any={inherited:1,shadowed:2},source:any=Object.create(prototype);
 source[2]=marker;source[1]=marker;source.own=marker;source[symbol]=marker;
 Object.defineProperty(source,'shadowed',{value:marker,enumerable:false});
 let getterCalls=0;Object.defineProperty(source,'accessor',{enumerable:true,get(){getterCalls++;throw marker;}});
 check(keys(source)==='1|2|own|accessor|inherited'&&getterCalls===0,'ordered-own-and-inherited-keys-without-get');
 check(keys(new Fields())==='first|second','native-class-owner-fields');
 const array:any[]=[marker,marker];delete array[0];(array as any).extra=marker;
 let iteratorCalls=0;(array as any)[Symbol.iterator]=()=>{iteratorCalls++;throw marker;};
 check(keys(array)==='1|extra'&&iteratorCalls===0,'native-array-holes-and-properties');
 check(keys('💡')==='0|1','primitive-string-code-unit-properties');
 for(const primitive of [null,undefined,0,false,37n,symbol])check(keys(primitive)==='','nullish-and-primitive-inputs');
 let sourceCalls=0;function once():any{sourceCalls++;return source;}
 const observed:string[]=[];for(const key in once())observed.push(key);
 check(sourceCalls===1&&observed.join('|')==='1|2|own|accessor|inherited','source-evaluated-once');
 const readers:any[]=[],mutable:any[]=[],shared:any[]=[];
 for(const key in {ant:1,bee:2})readers.push(()=>key);
 // @ts-ignore - the runtime iteration initializes the captured lexical key.
 for(let key in {ant:1,bee:2})mutable.push(()=>{key+='!';return key;});
 for(var key in {ant:1,bee:2})shared.push(()=>key);
 collect();check(readers[0]()==='ant'&&readers[1]()==='bee'&&mutable[0]()==='ant!'&&mutable[1]()==='bee!'&&mutable[0]()==='ant!!'&&shared[0]()==='bee'&&shared[1]()==='bee','canonical-iteration-binding-cells');
 // @ts-ignore - deliberate runtime TDZ failure.
 try{for(let key in key){}throw 'missing';}catch(error){check(error instanceof ReferenceError,'head-environment-tdz');}
 let receiverGets=0,keyGets=0;const target:any={};
 function receiver():any{receiverGets++;collect();return target;}
 function index():string{keyGets++;collect();return 'saved';}
 const assigned:string[]=[];for(receiver()[index()] in {ant:1,bee:2})assigned.push(target.saved);
 check(receiverGets===2&&keyGets===2&&assigned.join('|')==='ant|bee','assignment-reference-evaluation');
 // Array destructuring assignment consumes each String key through the existing BindingName tree.
 let letter:any;const letters:string[]=[];
 // @ts-ignore - ECMAScript permits a pattern in an enumeration assignment head.
 for([letter] in {ant:1,bee:2})letters.push(letter);
 check(letters.join('|')==='a|b','assignment-binding-tree');
 const originalReturn=Object.getOwnPropertyDescriptor(Object.prototype,'return');let closeCalls=0;
 Object.defineProperty(Object.prototype,'return',{configurable:true,get(){closeCalls++;throw marker;}});
 function completion(kind:string):any{let text='';for(const key in {a:1,b:2}){text+=key;if(kind==='break')break;if(kind==='return')return key;if(kind==='throw')throw marker;continue;}return text;}
 check(completion('continue')==='ab'&&completion('break')==='a'&&completion('return')==='a','normal-and-control-completions');
 try{completion('throw');throw 'missing';}catch(error){check(error===marker&&closeCalls===0,'throw-completion-without-iterator-close');}
 if(originalReturn)Object.defineProperty(Object.prototype,'return',originalReturn);else delete (Object.prototype as any).return;
 let labelled='';outer:for(const key in {a:1,b:2}){for(const inner in {x:1,y:2}){labelled+=key+inner;continue outer;}}
 check(labelled==='axbx','labelled-completion-environments');
 // These protocol partitions use an independent transcription of the pinned
 // CreateForInIterator algorithm; engines may choose different Proxy and
 // mutation behaviour under EnumerateObjectProperties' explicit exceptions.
 const parent:any={b:1,inherited:1},changing:any=Object.create(parent);changing.a=1;changing.b=2;changing.c=3;
 const live:string[]=[];for(${keyHead('changing')}){live.push(key);if(key==='a'){delete changing.b;delete changing.c;changing.added=4;Object.defineProperty(parent,'inherited',{enumerable:false});}collect();}
 check(live.join('|')==='a|b','live-descriptors-and-unvisited-deleted-keys');
 let trace='';const proxyParent:any={p:1};const proxyTarget:any=Object.create(proxyParent);proxyTarget.a=1;proxyTarget.b=2;proxyTarget[symbol]=3;
 const proxy:any=new Proxy(proxyTarget,{
  ownKeys(target:any):any{trace+='K';collect();return Reflect.ownKeys(target);},
  getOwnPropertyDescriptor(target:any,key:any):any{trace+='D'+String(key);collect();return Reflect.getOwnPropertyDescriptor(target,key);},
  getPrototypeOf(target:any):any{trace+='P';collect();return Reflect.getPrototypeOf(target);},
  get(){throw marker;}
 });
 const trapped:string[]=[];for(${keyHead('proxy')}){trapped.push(key);trace+='B'+key;}
 check(trapped.join('|')==='a|b|p'&&trace==='KDaBaDbBbPBp','proxy-key-descriptor-and-prototype-order');
 for(const phase of ['keys','descriptor','prototype']){
  const bad:any=new Proxy({a:1},{ownKeys(target:any):any{if(phase==='keys')throw marker;return Reflect.ownKeys(target);},getOwnPropertyDescriptor(target:any,key:any):any{if(phase==='descriptor')throw marker;return Reflect.getOwnPropertyDescriptor(target,key);},getPrototypeOf(target:any):any{throw marker;}});
  try{for(${keyHead('bad')}){collect();}throw 'missing';}catch(error){check(error===marker,'enumeration-abrupt-owner');}
 }
 const revoked:any=Proxy.revocable({},{});revoked.revoke();try{for(const key in revoked.proxy){}throw 'missing';}catch(error){check(error instanceof TypeError,'revoked-proxy');}
 async function retained(owner:any):Promise<any[]>{const output:any[]=[];for(const key in owner){await Promise.resolve(marker);collect();output.push(()=>[key,owner[key]]);}return output;}
 function* generated(owner:any):Generator<string>{for(const key in owner){collect();yield key;}}
 async function* asynchronous(owner:any):AsyncGenerator<string>{for(const key in owner){await Promise.resolve(marker);collect();yield key;}}
 async function verify():Promise<void>{
  const callbacks=await retained({ant:marker,bee:symbol});collect();check(callbacks[0]()[0]==='ant'&&callbacks[0]()[1]===marker&&callbacks[1]()[0]==='bee'&&callbacks[1]()[1]===symbol,'retained-resumable-key-and-source-owners');
  check(Array.from(generated(source)).join('|')==='1|2|own|accessor|inherited','generator-enumeration-owner');
  const iterator=asynchronous({ant:marker,bee:symbol});const first=await iterator.next();const second=await iterator.next();const end=await iterator.next();check(first.value==='ant'&&second.value==='bee'&&end.done===true,'async-generator-enumeration-owner');
  let cleanup=0;async function rejected():Promise<any>{for(const key in {ant:1,bee:2}){try{await Promise.reject(marker);}catch(error){check(error===marker&&key==='ant','resumable-catch-key');}finally{cleanup++;await Promise.reject(symbol);}}return 'missing';}
  try{await rejected();throw 'missing';}catch(error){check(error===symbol&&cleanup===1,'resumable-finally-replaces-completion');}
  let nested:any={root:marker};for(let level=0;level<128;level++){const child:any=Object.create(nested);child['level'+level]=marker;nested=child;}
  const deep=await retained(nested);collect();check(deep.length===129&&deep[0]()[0]==='level127'&&deep[128]()[0]==='root'&&deep[128]()[1]===marker,'deep-prototype-and-retained-owner-worklist');
 }
 verify().catch((error:any)=>{emit('failure:'+String(error));throw error;});`;
}

test("for-in enumeration and binding owners share one retained prototype worklist",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-for-in-owner-"));
    const erase=(source:string,module:ts.ModuleKind)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module}}).outputText;
    try{
        for(const strict of [false,true]){
            const referenceFile=path.join(temporary,`reference-${strict}.cjs`);await fs.writeFile(referenceFile,erase(subject(strict,false,true,true),ts.ModuleKind.CommonJS));
            const reference=nodeReferenceSync(["node","-e",'const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");require(process.argv[1]);',referenceFile],{stdout:"pipe",stderr:"pipe",timeout:120_000});
            expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const expected=reference.stdout.toString().trimEnd().split("\n");expect(expected.at(-1)).toBe("deep-prototype-and-retained-owner-worklist:true");
            for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]){
                const directory=path.join(temporary,`${strict}-${typed}-${profile}-${noGc}`);await fs.mkdir(directory);
                const entry=path.join(directory,typed?"main.ts":strict?"main.mjs":"main.js"),output=path.join(directory,"program"),diagnostics:string[]=[];
                const source=subject(strict,profile,noGc);await fs.writeFile(entry,typed?source:erase(source,ts.ModuleKind.ESNext));
                const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),...(strict?{moduleRoots:[entry]}:{}),initializationEntries:[entry],
                    ...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/for-in-owner.js#"+(strict?"module":"sloppy"),setupEntries:[],testEntry:entry,async:false,scriptEntries:strict?[]:[entry]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
                expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
                const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
                expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
                const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:"normal"});
                expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split("\n")).toEqual(expected);
            }
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

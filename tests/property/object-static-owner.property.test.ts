import {nodeReferenceSync} from './node-reference';
import {expect,test} from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";

function subject(strict:boolean,profile:boolean,noGc:boolean):string{
 return `${strict?'export {};':''}
 const marker:any={token:17};let trace='',calls=0;
 function emit(value:any):void{${profile?'(globalThis as any).print':'console.log'}(value);}
 function collect():void{${profile&&!noGc?'(globalThis as any).$262.gc();':''}}
 function check(value:boolean,label:string):void{if(!value)throw label;emit(label+':true');}
 function throws(callback:()=>any,expected:any,label:string):void{try{callback();throw 'missing';}catch(error){check(expected===TypeError?error instanceof TypeError:error===expected,label);}}
 const savedFrozen=Object.isFrozen,savedExtensible=Reflect.isExtensible,savedAssign=Object.assign;
 const define=Object.defineProperty,getDescriptor=Object.getOwnPropertyDescriptor,ownKeys=Reflect.ownKeys;
 (Object as any).isFrozen=function(value:any):any{collect();calls++;return marker;};const frozen:boolean=Object.isFrozen({});
 check((frozen as any)===marker&&calls===1,'typed-object-static-actual-result');
 const objectOwner:ObjectConstructor=Object,member=objectOwner.isFrozen;check((member({}) as any)===marker,'typed-object-owner-and-member-alias');
 (Reflect as any).isExtensible=function(value:any):any{collect();calls++;return marker;};const extensible:boolean=Reflect.isExtensible({});
 check((extensible as any)===marker&&calls===3,'typed-reflect-static-actual-result');const reflectOwner=Reflect,reflectMember=reflectOwner.isExtensible;check((reflectMember({}) as any)===marker,'reflect-owner-and-member-alias');
 Object.isFrozen({});Reflect.isExtensible({});check(calls===6,'discarded-mutable-method-effects');
 Object.isFrozen=savedFrozen;Reflect.isExtensible=savedExtensible;
 const savedKeys=Object.keys;let visited=0;(Object as any).keys=function(value:any):any{collect();return [marker];};for(const value of Object.keys('')){if((value as any)!==marker)throw 'mutable-key-result';visited++;}check(visited===1,'mutable-key-result-iteration');Object.keys=savedKeys;

 for(const owner of [Object,Reflect])for(const key of ownKeys(owner)){
  const descriptor=getDescriptor(owner,key)!;if(typeof descriptor.value!=='function')continue;
  define(owner,key,{...descriptor,value:function(this:any,...actual:any[]):any{collect();if(this!==owner||actual.length!==3||actual[0]!==marker||actual[1]!==undefined||actual[2]!==marker)throw 'method-activation';return marker;}});
  check((owner as any)[key](marker,undefined,marker)===marker,'generated-ordinary-method-activation');define(owner,key,descriptor);
 }
 function argument(label:string,value:any):any{trace+=label+';';collect();return value;}
 const assignDescriptor=Object.getOwnPropertyDescriptor(Object,'assign')!;
 Object.defineProperty(Object,'assign',{configurable:true,get(){trace+='G;';collect();return function(this:any,...actual:any[]):any{trace+='C;';check(this===Object&&actual.length===3&&actual[0]===marker&&actual[1]===marker&&actual[2]===undefined,'captured-static-callee-and-list');return marker;};}});
 trace='';const assigned=Object.assign(argument('A',marker),argument('B',marker),argument('U',undefined));check(assigned===marker&&trace==='G;A;B;U;C;','static-get-before-arguments');
 Object.defineProperty(Object,'assign',assignDescriptor);
 // @ts-ignore - absent actual arguments reach the ordinary runtime callable.
 throws(()=>Object.getPrototypeOf(),TypeError,'static-absent-actual');
 // @ts-ignore - ignored actual arguments are still evaluated.
 check(Object.is(marker,marker,argument('ignored',marker)),'static-ignored-actual-effects');
 const objectGlobal=Object,reflectGlobal=Reflect;
 let constructorCalls=0;(globalThis as any).Object=function(value:any):any{collect();constructorCalls++;return marker;};const constructed=Object(1),created=new Object(2);Object(3);check(constructed===marker&&created===marker&&constructorCalls===3,'mutable-object-call-and-construct');(globalThis as any).Object=objectGlobal;
 (globalThis as any).Object={isFrozen(value:any){collect();return marker;}};check((Object.isFrozen({}) as any)===marker,'typed-mutable-object-global');(globalThis as any).Object=objectGlobal;
 (globalThis as any).Reflect={isExtensible(value:any){collect();return marker;}};check((Reflect.isExtensible({}) as any)===marker,'typed-mutable-reflect-global');(globalThis as any).Reflect=reflectGlobal;
 function shadow(Object:any,Reflect:any):boolean{return Object.isFrozen(marker)===marker&&Reflect.isExtensible(marker)===marker;}
 check(shadow({isFrozen(){return marker;}},{isExtensible(){return marker;}}),'source-global-shadows');
 const typed:number[]=[1];check(Object.assign(typed,{'4000':marker})===typed&&(typed as any)[4000]===marker&&typed.length===4001,'typed-assign-actual-index-owner');
 const native:{value:number}={value:1};Object.assign(native,{value:marker});const nativeResult:number=native.value;check((native as any).value===marker&&(nativeResult as any)===marker,'typed-assign-actual-property-owner');
 const virtual=Object.assign(new Array(4294967295),{'4000':marker});check(virtual.length===4294967295&&virtual[4000]===marker&&Object.keys(virtual).length===1,'assign-virtual-array-owner');
 const boxed:any=Object.assign(3,{value:marker});check(typeof boxed==='object'&&boxed.value===marker&&boxed.valueOf()===3,'assign-boxed-target');
 check(Object.assign(boxed,null,undefined)===boxed,'assign-nullish-sources');
 const symbol=Symbol('owner');const source:any={a:marker};source[symbol]=marker;const target:any={};trace='';
 const sourceProxy:any=new Proxy(source,{ownKeys(owner:any){trace+='K;';collect();return Reflect.ownKeys(owner);},getOwnPropertyDescriptor(owner:any,key:any){trace+='D'+String(key)+';';collect();return Reflect.getOwnPropertyDescriptor(owner,key);},get(owner:any,key:any,receiver:any){trace+='G'+String(key)+';';collect();return Reflect.get(owner,key,receiver);}});
 check(Object.assign(target,sourceProxy)===target&&target.a===marker&&target[symbol]===marker,'assign-symbol-actual-values');emit('assign-trace:'+trace);
 const live:any={get a(){delete live.b;Object.defineProperty(live,'c',{enumerable:false});return marker;},b:marker,c:marker};const projected:any=Object.assign({},live);check(projected.a===marker&&!Object.hasOwn(projected,'b')&&!Object.hasOwn(projected,'c'),'assign-live-descriptors');
 const setterTarget:any={};Object.setPrototypeOf(setterTarget,{set x(value:any){collect();check(this===setterTarget&&value.token===17,'assign-inherited-setter-receiver');}});Object.assign(setterTarget,{get x(){return {token:17};}});check(!Object.hasOwn(setterTarget,'x'),'assign-set-consumer');
 const partial:any={};Object.defineProperty(partial,'b',{value:1,writable:false});throws(()=>Object.assign(partial,{a:marker,b:marker,c:marker}),TypeError,'assign-set-failure-typeerror');check(partial.a===marker&&partial.b===1&&!Object.hasOwn(partial,'c'),'assign-abrupt-partial-state');
 const abrupt:any={get value(){collect();throw marker;}};throws(()=>Object.assign({},abrupt),marker,'assign-get-abrupt-identity');
 const refuses:any=new Proxy({},{preventExtensions(){return false;}});throws(()=>Object.preventExtensions(refuses),TypeError,'static-prevent-failure-typeerror');
 const date:Date=new Date(0);check(Object.preventExtensions(date)===date&&!Object.isExtensible(date)&&Object.isSealed(date)&&Object.isFrozen(date),'native-builtin-integrity-owner');
 async function verify():Promise<void>{
  Object.defineProperty(Object,'assign',{configurable:true,get(){trace='captured;';return function(this:any,...actual:any[]):any{collect();check(this===Object&&actual[0]===marker&&actual[1]===marker,'suspended-static-callee-owner');return marker;};}});
  const retained=Object.assign(marker,await Promise.resolve(marker));Object.defineProperty(Object,'assign',assignDescriptor);check(retained===marker&&trace==='captured;','static-callee-survives-suspension');
  (Object as any).isFrozen=function(value:any):any{collect();return value;};const saved=Object.isFrozen;Object.isFrozen=savedFrozen;
  let tree:any=marker;for(let depth=0;depth<2048;depth++)tree={callee:saved,next:tree};await Promise.resolve(tree);collect();let cursor:any=tree;
  for(let depth=0;depth<2048;depth++){if(cursor.callee(cursor.next)!==cursor.next)throw 'deep-owner';cursor=cursor.next;}check(cursor===marker,'retained-static-owner-graph-stress');
 }
 verify().catch((error:any)=>{emit('failure:'+String(error));throw error;});`;
}
test("Object and Reflect static members share ordinary value owners",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-object-static-owner-"));
    const erase=(source:string,module:ts.ModuleKind)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module}}).outputText;
    try{
        for(const strict of [false,true]){
            const referenceFile=path.join(temporary,`reference-${strict}.cjs`);await fs.writeFile(referenceFile,erase(subject(strict,false,true),ts.ModuleKind.CommonJS));
            const reference=nodeReferenceSync(["node","-e",'const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");require(process.argv[1]);',referenceFile],{stdout:"pipe",stderr:"pipe",timeout:120_000});
            expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const expected=reference.stdout.toString().trimEnd().split("\n");expect(expected.at(-1)).toBe("retained-static-owner-graph-stress:true");
            for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]){
                const directory=path.join(temporary,`${strict}-${typed}-${profile}-${noGc}`);await fs.mkdir(directory);
                const entry=path.join(directory,typed?"main.ts":strict?"main.mjs":"main.js"),output=path.join(directory,"program"),diagnostics:string[]=[];
                const source=subject(strict,profile,noGc);await fs.writeFile(entry,typed?source:erase(source,ts.ModuleKind.ESNext));
                const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),...(strict?{moduleRoots:[entry]}:{}),initializationEntries:[entry],
                    ...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/object-static-owner.js#"+(strict?"module":"sloppy"),setupEntries:[],testEntry:entry,async:false,scriptEntries:strict?[]:[entry]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
                expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
                const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
                expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
                const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:"normal"});
                expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split("\n")).toEqual(expected);
            }
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

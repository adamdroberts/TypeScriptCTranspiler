import {expect,test} from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";

// Node 26 reports empty non-extensible arrays and sealed functions frozen with writable intrinsic properties.
// The reference uses an independent transcription of pinned TestIntegrityLevel
// for this predicate, retaining every own key and the prescribed early returns.
function subject(strict:boolean,profile:boolean,noGc:boolean,reference=false):string{
 return `${strict?'export {};':''}
 function frozen(owner:any):boolean{${reference?`if((typeof owner!=='object'||owner===null)&&typeof owner!=='function')return true;if(Reflect.isExtensible(owner))return false;for(const key of Reflect.ownKeys(owner)){const descriptor=Reflect.getOwnPropertyDescriptor(owner,key);if(descriptor!==undefined&&(descriptor.configurable||(Object.prototype.hasOwnProperty.call(descriptor,'value')&&descriptor.writable)))return false;}return true;`:`return Object.isFrozen(owner);`}}
 const marker:any={token:17};let trace='',reads=0;
 function emit(value:any):void{${profile?'(globalThis as any).print':'console.log'}(value);}
 function collect():void{${profile&&!noGc?'(globalThis as any).$262.gc();':''}}
 function check(value:boolean,label:string):void{if(!value)throw label;emit(label+':true');}
 function throws(callback:()=>any,expected:any,label:string):void{try{callback();throw 'missing';}catch(error){check(expected===TypeError?error instanceof TypeError:error===expected,label);}}
 for(const primitive of [undefined,null,false,0,-0,NaN,'owner',17n,Symbol('owner')]){check(Object.is(Object.seal(primitive),primitive)&&Object.is(Object.freeze(primitive),primitive)&&Object.isSealed(primitive)&&frozen(primitive),'primitive-integrity');}
 const sparseArray:any[]=new Array(4294967295);sparseArray[4000]=marker;
 for(const array of [[],new Array(4294967295),[marker],sparseArray]){
  Object.preventExtensions(array);let writable=false;
  for(const key of Reflect.ownKeys(array)){const descriptor=Object.getOwnPropertyDescriptor(array,key)!;writable=writable||!!descriptor.writable;Object.defineProperty(array,key,{configurable:false});}
  check(Object.isSealed(array)&&frozen(array)===!writable,'manual-array-seal-descriptors');
  for(const key of Reflect.ownKeys(array)){Object.defineProperty(array,key,{writable:false});}
  collect();check(frozen(array),'manual-array-freeze-descriptors');
 }
 function callable(value:any):any{return value;}
 (callable as any).owner=marker;Object.preventExtensions(callable);
 for(const key of Reflect.ownKeys(callable)){Object.defineProperty(callable,key,{configurable:false,writable:false});}
 check(Object.isSealed(callable)&&frozen(callable)&&callable(marker)===marker,'manual-callable-integrity');
 const symbol=Symbol('data'),accessor=Symbol('accessor');
 for(const kind of ['object','array','function']){
  const owner:any=kind==='object'?{}:kind==='array'?[marker]:function(value:any):any{return value;};
  Object.defineProperty(owner,symbol,{value:marker,writable:true,enumerable:true,configurable:true});
  Object.defineProperty(owner,accessor,{get(){reads++;collect();return marker;},set(value:any){check(this===owner&&value===marker,'frozen-accessor-receiver');},configurable:true});
  check(Object.seal(owner)===owner&&Object.isSealed(owner)&&!frozen(owner)&&reads===0,'seal-actual-owner');
  check(Reflect.set(owner,symbol,marker)&&!Reflect.deleteProperty(owner,symbol)&&!Reflect.set(owner,'missing',marker),'sealed-property-state');
  check(Object.freeze(owner)===owner&&frozen(owner)&&!Reflect.set(owner,symbol,marker),'freeze-actual-owner');
  const descriptor=Object.getOwnPropertyDescriptor(owner,accessor)!;check(!Object.hasOwn(descriptor,'writable')&&!descriptor.configurable&&Reflect.set(owner,accessor,marker),'freeze-retains-accessor');
 }
 check(reads===0,'integrity-never-invokes-accessor');
 for(const operation of ['seal','freeze','isSealed','isFrozen']){
  const target:any={};if(operation==='isSealed'||operation==='isFrozen')Object.preventExtensions(target);
  trace='';const handler:any=new Proxy({},{get(owner:any,key:any){collect();trace+=String(key)+';';return undefined;}});
  const proxy:any=new Proxy(target,handler);const result=(Object as any)[operation](proxy);
  emit('transparent-'+operation+':'+trace);check(result===proxy||result===true,'transparent-integrity-result');
 }
 function observing(target:any):any{return new Proxy(target,{
  preventExtensions(owner:any){trace+='P;';collect();return Reflect.preventExtensions(owner);},
  isExtensible(owner:any){trace+='E;';collect();return Reflect.isExtensible(owner);},
  ownKeys(owner:any){trace+='K;';collect();return Reflect.ownKeys(owner);},
  getOwnPropertyDescriptor(owner:any,key:any){trace+='G'+String(key)+';';collect();return Reflect.getOwnPropertyDescriptor(owner,key);},
  defineProperty(owner:any,key:any,descriptor:any){trace+='D'+String(key)+':'+Object.keys(descriptor).join('|')+';';collect();return Reflect.defineProperty(owner,key,descriptor);}
 });}
 for(const operation of ['seal','freeze']){
  const target:any={data:marker};Object.defineProperty(target,'accessor',{get(){reads++;return marker;},configurable:true});target[symbol]=marker;
  const proxy=observing(target);trace='';check((Object as any)[operation](proxy)===proxy,'proxy-integrity-identity');emit(operation+'-trace:'+trace);
  trace='';check(Object.isSealed(proxy),'proxy-sealed-state');emit('sealed-trace:'+trace);trace='';emit('frozen-result:'+frozen(proxy));emit('frozen-trace:'+trace);
 }
 const sparse:any[]=new Array(4294967295);sparse[4000]=marker;const sparseProxy:any=observing(sparse);trace='';Object.freeze(sparseProxy);check(frozen(sparseProxy)&&sparse[4000]===marker&&Reflect.ownKeys(sparse).length===2,'sparse-proxy-integrity');
 const partial:any={a:marker,b:marker};const refusing:any=new Proxy(partial,{defineProperty(owner:any,key:any,descriptor:any){collect();if(key==='b')return false;return Reflect.defineProperty(owner,key,descriptor);}});
 throws(()=>Object.freeze(refusing),TypeError,'define-false-actual-typeerror');check(!Object.isExtensible(partial)&&!Object.getOwnPropertyDescriptor(partial,'a')!.writable&&Object.getOwnPropertyDescriptor(partial,'b')!.writable,'partial-integrity-state');
 const throwing:any=new Proxy({a:marker},{defineProperty(){collect();throw marker;}});throws(()=>Object.seal(throwing),marker,'define-throw-identity');
 for(const operation of ['seal','freeze']){const refusing:any=new Proxy({},{preventExtensions(){collect();return false;}});throws(()=>(Object as any)[operation](refusing),TypeError,'prevent-false-actual-typeerror');}
 const revoked=Proxy.revocable({},{});revoked.revoke();for(const operation of ['seal','freeze','isSealed','isFrozen'])throws(()=>(Object as any)[operation](revoked.proxy),TypeError,'revoked-integrity');
 const disappearing:any={a:marker,b:marker};const disappearingProxy:any=new Proxy(disappearing,{getOwnPropertyDescriptor(owner:any,key:any){if(key==='b'){delete owner.b;return undefined;}return Reflect.getOwnPropertyDescriptor(owner,key);}});
 Object.freeze(disappearingProxy);check(frozen(disappearing)&&!Object.hasOwn(disappearing,'b'),'freeze-skips-absent-descriptor');
 const nestedTarget:any={a:marker};Object.defineProperty(nestedTarget,'b',{value:marker,configurable:false});
 const inner=observing(nestedTarget),outer:any=new Proxy(inner,{ownKeys(owner:any){trace+='O;';return Reflect.ownKeys(owner);}});trace='';Reflect.ownKeys(outer);emit('nested-ownkeys-trace:'+trace);
 const flexible:any=function():void{};check(Reflect.ownKeys(new Proxy(flexible,{ownKeys(){return ['prototype'];}})).join('|')==='prototype','configurable-function-key-omission');
 trace='';const duplicate:any=new Proxy(inner,{ownKeys(){return ['a','a'];}});throws(()=>Reflect.ownKeys(duplicate),TypeError,'duplicate-ownkey-error');check(trace==='','duplicate-before-target-operations');
 for(const owner of [{data:marker},[marker],function():void{}]){
  Object.seal(owner);const actual=Reflect.ownKeys(owner);const missing=new Proxy(owner,{ownKeys(){return actual.slice(1);}}),extra=new Proxy(owner,{ownKeys(){return actual.concat(['extra']);}});
  throws(()=>Reflect.ownKeys(missing),TypeError,'missing-nonconfigurable-ownkey');throws(()=>Reflect.ownKeys(extra),TypeError,'extra-nonextensible-ownkey');
 }
 trace='';const intake:any=new Proxy({},{ownKeys(){return {get length(){trace+='L;';return {valueOf(){collect();trace+='C;';return 1.9;}};},get 0(){collect();trace+='I;';return symbol;}};}});
 check(Reflect.ownKeys(intake)[0]===symbol&&trace==='L;C;I;','ownkey-list-length-and-get-order');

 async function verify():Promise<void>{
  const leaf:any[]=[];for(let index=0;index<2048;index++)Object.defineProperty(leaf,String(index*1024),{value:{index},writable:true,configurable:true});
  let tree:any=leaf;for(let depth=0;depth<2048;depth++)tree=[tree];await Promise.resolve(tree);collect();let cursor:any=tree;
  while(cursor!==leaf){Object.freeze(cursor);if(!frozen(cursor))throw 'deep-integrity';cursor=cursor[0];}
  Object.freeze(cursor);await Promise.resolve(cursor);collect();check(frozen(cursor)&&cursor[2047*1024].index===2047&&Reflect.ownKeys(cursor).length===2049,'retained-integrity-worklist-stress');
 }
 verify().catch((error:any)=>{emit('failure:'+String(error));throw error;});`;
}
test("Integrity levels project actual owners through one descriptor worklist",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-integrity-owner-"));
    const erase=(source:string,module:ts.ModuleKind)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module}}).outputText;
    try{
        for(const strict of [false,true]){
            const referenceFile=path.join(temporary,`reference-${strict}.cjs`);await fs.writeFile(referenceFile,erase(subject(strict,false,true,true),ts.ModuleKind.CommonJS));
            const reference=Bun.spawnSync(["node","-e",'const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");require(process.argv[1]);',referenceFile],{stdout:"pipe",stderr:"pipe",timeout:120_000});
            expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const expected=reference.stdout.toString().trimEnd().split("\n");expect(expected.at(-1)).toBe("retained-integrity-worklist-stress:true");
            for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]){
                const directory=path.join(temporary,`${strict}-${typed}-${profile}-${noGc}`);await fs.mkdir(directory);
                const entry=path.join(directory,typed?"main.ts":strict?"main.mjs":"main.js"),output=path.join(directory,"program"),diagnostics:string[]=[];
                const source=subject(strict,profile,noGc);await fs.writeFile(entry,typed?source:erase(source,ts.ModuleKind.ESNext));
                const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),...(strict?{moduleRoots:[entry]}:{}),initializationEntries:[entry],
                    ...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/integrity-owner.js#"+(strict?"module":"sloppy"),setupEntries:[],testEntry:entry,async:false,scriptEntries:strict?[]:[entry]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
                expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
                const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
                expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
                const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:"normal"});
                expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split("\n")).toEqual(expected);
            }
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(profile:boolean,collect:boolean):string{return `
function check(value,label){if(!value)throw label}
function throwsType(action){try{action();return false}catch(error){return error instanceof TypeError}}
const key={},token={},symbol=Symbol('target');const Ref=WeakRef,Registry=FinalizationRegistry;
for(const [Ctor,tag,length,methods] of [[Ref,'WeakRef',1,['deref']],[Registry,'FinalizationRegistry',1,['register','unregister']]]){
 check(Ctor===globalThis[tag]&&Ctor.name===tag&&Ctor.length===length&&Ctor.prototype.constructor===Ctor,'intrinsic-owner');
 check(Object.getPrototypeOf(Ctor.prototype)===Object.prototype&&Object.prototype.toString.call(Ctor.prototype)==='[object '+tag+']','prototype');
 const descriptor=Object.getOwnPropertyDescriptor(Ctor,'prototype');check(!descriptor.writable&&!descriptor.enumerable&&!descriptor.configurable,'prototype-descriptor');
 check(throwsType(()=>Reflect.apply(Ctor,undefined,[()=>{}])),'constructor-requires-new');
 for(const name of methods){const method=Ctor.prototype[name];const d=Object.getOwnPropertyDescriptor(Ctor.prototype,name);check(method.name===name&&method.length===(name==='register'?2:name==='unregister'?1:0)&&d.writable&&!d.enumerable&&d.configurable,'method-descriptor');check(throwsType(()=>Reflect.construct(method,[]))&&throwsType(()=>Reflect.apply(method,{},[])),'method-brand');}
}
for(const target of [key,[],()=>{},symbol,Symbol.iterator]){const ref=new Ref(target);check(ref.deref()===target,'accepted-target');const reg=new Registry(()=>{});check(reg.register(target,'held',target)===undefined&&reg.unregister(target)&&!reg.unregister(target),'accepted-registration');}
for(const target of [undefined,null,false,1,'text',1n,Symbol.for('registered')]){check(throwsType(()=>new Ref(target)),'rejected-target');const reg=new Registry(()=>{});check(throwsType(()=>reg.register(target,'held'))&&throwsType(()=>reg.register(key,'held',target===undefined?null:target))&&throwsType(()=>reg.unregister(target)),'rejected-registration');}
check(throwsType(()=>new Registry({}))&&throwsType(()=>new Registry()),'callable-cleanup-required');
const registry=new Registry(()=>{});check(throwsType(()=>registry.register(key,key))&&throwsType(()=>registry.register(symbol,symbol)),'target-differs-from-holdings');
registry.register(key,'first',token);registry.register(key,'second',token);registry.register({},'other',symbol);check(registry.unregister(token)&&!registry.unregister(token)&&registry.unregister(symbol),'duplicate-records-and-token-partitions');
let touched=0;const newTarget=new Proxy(function(){},{get(target,name){if(name==='prototype'){touched++;return null}return Reflect.get(target,name)}});
check(throwsType(()=>Reflect.construct(Ref,[1],newTarget))&&throwsType(()=>Reflect.construct(Registry,[1],newTarget))&&touched===0,'validation-precedes-prototype-get');
const alternate={};const targetCtor=new Proxy(function(){},{get(target,name){return name==='prototype'?alternate:Reflect.get(target,name)}});check(Object.getPrototypeOf(Reflect.construct(Ref,[key],targetCtor))===alternate&&Object.getPrototypeOf(Reflect.construct(Registry,[()=>{}],targetCtor))===alternate,'new-target-prototype');
class DerivedRef extends Ref{};class DerivedRegistry extends Registry{};check(new DerivedRef(key).deref()===key&&new DerivedRegistry(()=>{}) instanceof DerivedRegistry,'derived-owners');
const proxied=new Proxy(new Ref(key),{});check(throwsType(()=>Ref.prototype.deref.call(proxied)),'proxy-wrong-brand');
const callback=new Proxy(function(){},{apply(){throw 'cleanup unexpected'}});new Registry(callback).register(key,'held');
const revoked=Proxy.revocable(function(){},{});revoked.revoke();new Registry(revoked.proxy).register(key,'held');
let coercions=0;const raw={ [Symbol.toPrimitive](){coercions++;throw 'coerced'}};check(new Ref(raw).deref()===raw&&coercions===0,'no-target-coercion');
const retainedRef=new Ref(key),get=Ref.prototype.deref,retainedRegistry=new Registry(()=>{}),register=Registry.prototype.register,unregister=Registry.prototype.unregister;
WeakRef=function(){throw 'mutable'};FinalizationRegistry=function(){throw 'mutable'};
async function resume(){await Promise.resolve();register.call(retainedRegistry,key,'held',token);check(get.call(retainedRef)===key&&unregister.call(retainedRegistry,token),'retained-borrowed-methods');WeakRef=Ref;FinalizationRegistry=Registry;}
resume();
const refs=[],targets=[],deepRegistry=new Registry(()=>{});for(let i=0;i<4096;i++){const target={i};targets.push(target);refs.push(new Ref(target));deepRegistry.register(target,i,token)}
${collect?'$262.gc();':''}
for(let i=0;i<targets.length;i++)check(refs[i].deref()===targets[i],'deep-retention');check(deepRegistry.unregister(token)&&!deepRegistry.unregister(token),'deep-independent-records');
console.log('weak-lifetime owners ok');
`}
test('Weak reference and finalization owners share retained source identities and weak-key partitions',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-weak-lifetime-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false,false));
  const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile,profile&&!noGc));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'weak-collection-owner.mjs#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({mode,noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({mode,noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({mode,noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({mode,noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect({mode,noGc,observationKind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({mode,noGc,observationKind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

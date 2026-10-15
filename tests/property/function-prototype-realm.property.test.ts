import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(noGc:boolean):string {
 const observations=[
  {label:'property-read',value:'owner.prototype'},
  {label:'descriptor-read',value:'Object.getOwnPropertyDescriptor(owner,"prototype").value'},
  {label:'foreign-reader',value:'reader(owner)'},
 ];
 return `// @ts-nocheck
 const host=globalThis,output=host.print,collectHook=${noGc?'undefined':'host.$262.gc'};
 function collect():void{${noGc?'':'collectHook();'}}
 function check(value:boolean,label:string):void{if(!value)throw label;output(label+':true');}
 const a=$262.createRealm().global,b=$262.createRealm().global;
 const reader=b.Function('owner','return owner.prototype;');
 const originalObject=a.Object,originalFunction=a.Function;
 a.calls=0;const target=new b.Function();target.prototype=null;
 const fn=Reflect.construct(a.Function,['calls += 1;'],target);
 check(Object.getPrototypeOf(fn)===b.Function.prototype,'newtarget-function-realm');
 check(Object.getPrototypeOf(fn.prototype)===a.Object.prototype,'own-prototype-creation-realm');
 check(new fn() instanceof a.Object&&a.calls===1,'body-and-construction-creation-realm');
 ${observations.map(({label,value})=>`{
  const owner:any=a.Function('return 37;');collect();
  const prototype:any=${value};
  const descriptor=Object.getOwnPropertyDescriptor(owner,'prototype');
  check(Object.getPrototypeOf(prototype)===originalObject.prototype&&prototype.constructor===owner&&descriptor.value===prototype&&descriptor.writable&&!descriptor.enumerable&&!descriptor.configurable,'${label}-creation-realm');
  check(Object.getPrototypeOf(new owner())===prototype&&owner()===37,'${label}-construction');
 }`).join('\n')}
 const called=a.Function('return 37;'),constructed=new a.Function('return 37;');
 check(called!==constructed&&called.prototype!==constructed.prototype&&Object.getPrototypeOf(constructed.prototype)===originalObject.prototype,'fresh-source-constructor-prototypes');
 const sourceOwner=a.Function('return function Owned() { this.value = 37; };')();
 const sourceDescriptor=Object.getOwnPropertyDescriptor(sourceOwner,'prototype');
 check(Object.getPrototypeOf(sourceDescriptor.value)===originalObject.prototype&&sourceDescriptor.value.constructor===sourceOwner&&new sourceOwner().value===37,'ordinary-source-function-creation-realm');
 const marker={},proxy=new Proxy(target,{get(owner:any,key:any):any{if(key==='prototype'){collect();return marker;}return Reflect.get(owner,key);}});
 const custom=Reflect.construct(a.Function,['return 37;'],proxy);
 check(Object.getPrototypeOf(custom)===marker&&Object.getPrototypeOf(custom.prototype)===originalObject.prototype&&custom()===37,'actual-newtarget-and-own-prototype-realms');
 const replacement={};Reflect.defineProperty(custom,'prototype',{value:replacement});collect();
 check(custom.prototype===replacement&&Object.getPrototypeOf(new custom())===replacement,'retained-own-prototype-replacement');
 const untouched=a.Function('return 37;');a.Object=17;a.Function=17;
 check(Object.getPrototypeOf(untouched.prototype)===originalObject.prototype&&untouched.prototype.constructor===untouched,'captured-creation-intrinsics');a.Object=originalObject;a.Function=originalFunction;
 let graph:any=null;for(let depth=0;depth<2048;depth++)graph={owner:a.Function('return 37;'),next:graph};collect();
 while(graph!==null){const owner=graph.owner;if(Object.getPrototypeOf(owner.prototype)!==originalObject.prototype||owner.prototype.constructor!==owner||owner()!==37)throw 'retained owner';graph=graph.next;}
 check(true,'deep-retained-function-realm-graph');
 check(Object.getPrototypeOf({})===Object.prototype&&Object.getPrototypeOf(function Local(){}.prototype)===Object.prototype,'reader-realm-restored');
 `;
}

test('Function own prototypes retain creation Realm across readers, descriptors and construction',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-function-prototype-realm-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
 try{
  const referenceFile=path.join(temporary,'reference.js');await fs.writeFile(referenceFile,erase(subject(true)));
  const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");globalThis.print=(value)=>fs.writeSync(1,String(value)+"\\n");globalThis.$262={createRealm(){return{global:vm.runInNewContext("globalThis")};}};vm.runInThisContext(fs.readFileSync(process.argv[1],"utf8"));',referenceFile],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const expected=reference.stdout.toString().trimEnd().split('\n');expect(expected.at(-1)).toBe('reader-realm-restored:true');
  for(const typed of [true,false])for(const noGc of [false,true]){
   const directory=path.join(temporary,`${typed}-${noGc}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.js'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(noGc);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),test262Observation:{kind:'test262-native-observation',scenarioId:'property/function-prototype-realm.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,noGc,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({typed,noGc,exitCode:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation).toMatchObject({kind:'normal'});expect((observation.stdout??'').trimEnd().split('\n')).toEqual(expected);
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},360_000);

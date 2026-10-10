import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

const methods=Object.getOwnPropertyNames(Math).filter(name=>typeof (Math as any)[name]==='function').map(name=>[name,(Math as any)[name].length]);
const constants=Object.getOwnPropertyNames(Math).filter(name=>typeof (Math as any)[name]==='number').map(name=>[name,(Math as any)[name]]);
function subject(profile:boolean,noGc:boolean,interleave:boolean):string {
 return `// @ts-nocheck
 export {};
 function emit(value:any):void{${profile?'(globalThis as any).print':'console.log'}(value);}
 function check(value:boolean,label:string):void{if(!value)throw label;emit(label+':true');}
 function collect():void{${profile&&!noGc?'(globalThis as any).$262.gc();':''}}
 const math=Math,marker={token:41},poison={[Symbol.toPrimitive](){throw marker;},valueOf(){throw marker;}},events:any[]=[];
 check(typeof math==='object'&&Object.getPrototypeOf(math)===Object.prototype&&!Object.hasOwn(math,'prototype'),'math-object-owner');
 const globalDescriptor=Object.getOwnPropertyDescriptor(globalThis,'Math');check(globalDescriptor.value===math&&globalDescriptor.writable&&!globalDescriptor.enumerable&&globalDescriptor.configurable,'global-math-descriptor');
 for(const operation of [()=>math(),()=>new math()]){let caught:any;try{operation();}catch(error){caught=error;}check(caught instanceof TypeError,'math-non-callable-non-constructible');}
 const names:any[]=[];
 for(const [name,length] of ${JSON.stringify(methods)}){
  names.push(name);const descriptor=Object.getOwnPropertyDescriptor(math,name),operation=descriptor.value;
  check(descriptor.writable&&!descriptor.enumerable&&descriptor.configurable&&typeof operation==='function'&&operation.name===name&&operation.length===length&&!Object.hasOwn(operation,'prototype')&&Object.getPrototypeOf(operation)===Function.prototype,'intrinsic-descriptor-'+name);
  let caught:any;try{Reflect.construct(operation,[]);}catch(error){caught=error;}check(caught instanceof TypeError,'intrinsic-call-only-'+name);
 }
 for(const [name,value] of ${JSON.stringify(constants)}){
  names.push(name);const descriptor=Object.getOwnPropertyDescriptor(math,name);
  check(Object.is(descriptor.value,value)&&!descriptor.writable&&!descriptor.enumerable&&!descriptor.configurable&&!Reflect.set(math,name,marker)&&!Reflect.deleteProperty(math,name),'constant-descriptor-'+name);
 }
 check(Object.getOwnPropertyNames(math).sort().join('|')===names.sort().join('|'),'intrinsic-own-string-key-set');
 const tag=Object.getOwnPropertyDescriptor(math,Symbol.toStringTag);
 check(tag.value==='Math'&&!tag.writable&&!tag.enumerable&&tag.configurable&&Object.prototype.toString.call(math)==='[object Math]','math-to-string-tag');
 check(!Reflect.set(math,Symbol.toStringTag,'Changed'),'math-tag-write-rejected');
 Object.defineProperty(math,Symbol.toStringTag,{value:'Changed'});check(Object.prototype.toString.call(math)==='[object Changed]','math-tag-redefinition');
 check(Reflect.deleteProperty(math,Symbol.toStringTag)&&Object.prototype.toString.call(math)==='[object Object]','math-tag-deletion');Object.defineProperty(math,Symbol.toStringTag,tag);
 const random=math.random,bins=[0,0,0,0,0,0,0,0];
 for(let index=0;index<4096;index++){const value=index%2?Math.random(poison):Reflect.apply(random,marker,[poison]);if(!(value>=0&&value<1&&!Object.is(value,-0)))throw 'random-range';bins[Math.floor(value*8)]++;}
 check(bins.every(value=>value>256&&value<768),'random-range-and-distribution-sanity');
 let owner:any={operation:random};for(let depth=0;depth<2048;depth++)owner={next:owner};collect();for(let depth=0;depth<2048;depth++)owner=owner.next;const retained=owner.operation.call(marker,poison);check(retained>=0&&retained<1,'retained-math-owner-graph-stress');
 ${profile?`
 const globals=[globalThis,$262.createRealm().global,$262.createRealm().global],streams:any[]=[];
 for(const global of globals){const namespace=global.Math;check(namespace!==undefined&&namespace[Symbol.toStringTag]==='Math'&&Object.getPrototypeOf(namespace)===global.Object.prototype&&Object.getPrototypeOf(namespace.random)===global.Function.prototype,'math-creation-realm-metadata');streams.push([]);}
 const operations=globals.map(global=>global.Math.random);
 check(operations[0]!==operations[1]&&operations[1]!==operations[2],'random-function-realm-identity');
 if(${interleave}){for(let index=0;index<128;index++)for(let realm=0;realm<operations.length;realm++){if(index%13===0)collect();streams[realm].push(operations[realm].call(marker,poison));}}
 else{for(let realm=0;realm<operations.length;realm++)for(let index=0;index<128;index++){if(index%13===0)collect();streams[realm].push(operations[realm].call(marker,poison));}}
 check(streams.every(values=>values.every(value=>value>=0&&value<1&&!Object.is(value,-0)))&&new Set(streams.map(values=>JSON.stringify(values))).size===streams.length,'distinct-realm-streams');
 emit('sequence:'+JSON.stringify(streams));
 globals[1].Math.random=function(){return marker;};check(globals[1].Math.random()===marker&&globals[0].Math.random()!==marker&&operations[1]()!==marker,'realm-descriptor-mutation-isolated');
 `:''}
 Object.defineProperty(math,'random',{configurable:true,get(){events.push('get');collect();return function(...actual:any[]){events.push('call');collect();return [this,actual];};}});
 const changed=Math.random((events.push('argument'),marker));check(events.join('|')==='get|argument|call'&&changed[0]===math&&changed[1][0]===marker,'mutable-random-descriptor-actual-order');
 async function delayed():Promise<any>{return Math.random(await Promise.resolve(marker));}const pending=delayed();Object.defineProperty(math,'random',{value:random,writable:true,enumerable:false,configurable:true});
 (globalThis as any).Math={random(){return marker;}};check(Math.random()===marker&&typeof Math==='object','mutable-math-global-owner');(globalThis as any).Math=math;
 async function observe():Promise<void>{const value=await pending;collect();check(value[0]===math&&value[1][0]===marker,'saved-random-callee-through-suspension');}observe();
 `;
}

test('Math descriptors and random state belong to one ordinary Realm owner',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-math-intrinsic-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try {
  const expected=new Map<boolean,string[]>();
  for(const profile of [false,true]) {
   const referenceFile=path.join(temporary,`reference-${profile}.mjs`);await fs.writeFile(referenceFile,erase(subject(profile,true,false)));
   const reference=Bun.spawnSync([process.execPath,'-e','const fs=require("node:fs"),vm=require("node:vm");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");globalThis.print=console.log;globalThis.$262={global:globalThis,createRealm(){return {global:vm.runInNewContext("globalThis")};}};import(process.argv[1]);',referenceFile],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const lines=reference.stdout.toString().trimEnd().split('\n').filter(line=>!line.startsWith('sequence:'));expect(lines.at(-1)).toBe('saved-random-callee-through-suspension:true');expected.set(profile,lines);
  }
  for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]) {
   const scheduledStreams:string[]=[];
   for(const interleave of profile?[false,true]:[false]) {
    const directory=path.join(temporary,`${typed}-${profile}-${noGc}-${interleave}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
    const source=subject(profile,noGc,interleave);await fs.writeFile(entry,typed?source:erase(source));
    const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),moduleRoots:[entry],initializationEntries:[entry],...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/math-intrinsic-owner.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
    expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
    const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
    expect({typed,profile,noGc,interleave,exitCode:native.exitCode,stderr:native.stderr.toString(),stdout:native.exitCode?native.stdout.toString():''}).toEqual({typed,profile,noGc,interleave,exitCode:0,stderr:'',stdout:''});
    const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:'normal'});
    const lines=(observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n');expect(lines.filter(line=>!line.startsWith('sequence:'))).toEqual(expected.get(profile)!);
    if(profile){const sequence=lines.find(line=>line.startsWith('sequence:'));expect(sequence).toBeDefined();scheduledStreams.push(sequence!);}
   }
   // A schedule permutation may not change any creation Realm's subsequence.
   // This metamorphic expectation does not reproduce the PRNG implementation.
   if(profile)expect(scheduledStreams[0]).toBe(scheduledStreams[1]);
  }
 } finally {await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

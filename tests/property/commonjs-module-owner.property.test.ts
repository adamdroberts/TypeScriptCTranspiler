import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function sources(strict:boolean):Map<string,string>{
 const directive=strict?'"use strict";':'';
 return new Map([
 ['value.cjs',`${directive}
 const original=exports,initialThis=this;let current=1;
 function hoisted(value){return value+current;}
 original.phase='initial';globalThis.ownerTrace+='V;';
 const local=require('./local.cjs'),symbol=local.symbol;
 const empty=[],emptyAlias=empty,list=[...emptyAlias,...emptyAlias,'./local.cjs',17,undefined];
 const loaded=[require(...emptyAlias,...emptyAlias,...list),require.call(...[],...[{token:41}],...list),require.apply(...[],...[null,list]),Reflect.apply(...[require,undefined,list])];
 const actualRequireProjection=loaded.every(value=>value===local)&&require.length===1&&require.name==='require';
 const target={default:function greet(value){return value+current;},method:function(...actual){globalThis.ownerCollect();return this===target&&actual.length===3&&actual[0]===local.marker&&actual[1]===undefined&&actual[2]===local.marker;}};
 const originalAssign=Object.assign;let activations=0;
 Object.assign=function(...actual){activations++;globalThis.ownerTrace+='A;';globalThis.ownerCollect();return originalAssign(...actual);};
 module.exports=Object.assign(target,local,{original,initialThis,hoisted,actualRequireProjection,set(value){current=value;},activations(){return activations;}});
 Object.assign=originalAssign;
 Object.defineProperty(module.exports,'fresh',{enumerable:true,get(){globalThis.ownerTrace+='G;';globalThis.ownerCollect();return {token:current};}});
 Object.defineProperty(module.exports,'hidden',{value:local.marker});
 module.exports[symbol]=local.marker;
 let retained={value:module.exports};for(let depth=0;depth<2048;depth++)retained={next:retained};module.exports.retained=retained;
 original.detached=true;
 `],
 ['local.cjs',`${directive}globalThis.ownerTrace+='L;';exports.marker={token:17};exports.symbol=Symbol('owner');`],
 ['cycle-a.cjs',`${directive}exports.phase='initial';globalThis.ownerTrace+='CA;';const peer=require('./cycle-b.cjs');module.exports={peer,initial:exports};`],
 ['cycle-b.cjs',`${directive}globalThis.ownerTrace+='CB;';const peer=require('./cycle-a.cjs');exports.peer=peer;exports.phase=peer.phase;`],
 ['lazy.cjs',`${directive}globalThis.ownerTrace+='Z;';module.exports={token:19};`],
 ['retry.cjs',`${directive}globalThis.ownerRuns++;exports.run=globalThis.ownerRuns;if(globalThis.ownerRuns===1)throw globalThis.ownerMarker;module.exports={run:globalThis.ownerRuns};`],
 ['vars.cjs',`${directive}var exports;var module;var require;var __filename;var __dirname;const original=exports,saved=require;require=function(...actual){return [globalThis.ownerMarker,actual.length];};exports.mutable=require('ignored',undefined,17);require=saved;exports.local=saved('./local.cjs');exports.loadedDuring=module.loaded;exports.record=module;exports.pathsAgree=module.filename===__filename&&module.path===__dirname;exports.original=original;`],
 ['shadow.cjs',`${directive}function require(value){return globalThis.ownerMarker;}module.exports=require('./local.cjs');`],
 ['typed-owner.ts',`// @ts-nocheck\n${directive}module.exports.value=globalThis.ownerMarker;module.exports.original=exports;module.exports.receiver=this;exports.read=()=>globalThis.ownerMarker;`],
 ['wrapper.cjs',`${directive}const original=exports,record=module;module={exports:{token:23}};exports={token:29};original.read=()=>[module.exports.token,exports.token,record.exports===original,this===original];`],
 ]);
}
function subject(profile:boolean,noGc:boolean):string{return `// @ts-nocheck
 export {};
 function emit(value:any):void{${profile?'(globalThis as any).print':'console.log'}(value);}
 function check(value:boolean,label:string):void{if(!value)throw label;emit(label+':true');}
 (globalThis as any).ownerCollect=()=>{${profile&&!noGc?'(globalThis as any).$262.gc();':''}};
 (globalThis as any).ownerTrace='';(globalThis as any).ownerRuns=0;(globalThis as any).ownerMarker={token:31};
 if(false)require('./lazy.cjs');check((globalThis as any).ownerTrace==='','lazy-discovery-without-evaluation');
 const value=require('./value.cjs');check((globalThis as any).ownerTrace==='V;L;A;','require-source-order-and-mutable-callee');
 check(value===require('./value.cjs')&&value.activations()===1,'cached-actual-export-owner');
 let ignored=0;check(require('./value.cjs',++ignored,value.marker)===value&&ignored===1,'require-ignored-actual-effects');
 check(value.actualRequireProjection,'shared-require-actual-list-projection');
 check(value.original!==value&&value.original===value.initialThis&&value.original.detached,'original-exports-and-wrapper-this');
 check(value.default(4)===5&&value.hoisted(4)===5,'callable-owner-and-hoisted-binding');value.set(7);check(value.default(4)===11&&value.hoisted(4)===11,'retained-live-source-cell');
 check(value.method(value.marker,undefined,value.marker),'member-receiver-and-actual-list');
 const own=Reflect.ownKeys(value),descriptor=Object.getOwnPropertyDescriptor(value,'hidden');
 check(own.includes(value.symbol)&&value[value.symbol]===value.marker&&descriptor.value===value.marker&&!descriptor.enumerable,'actual-symbol-and-descriptor-owner');
 const copied=Object.assign({},value);check(copied.fresh.token===7&&(globalThis as any).ownerTrace==='V;L;A;G;','actual-getter-copy-effects');
 value.default=function(...actual:any[]):any{return actual.length;};check(require('./value.cjs').default(1,2,3)===3,'require-observes-member-replacement');
 let retained=value.retained;for(let depth=0;depth<2048;depth++)retained=retained.next;check(retained.value===value,'retained-export-owner-graph-stress');
 const cycle=require('./cycle-a.cjs');emit('cycle:'+ (cycle.peer===require('./cycle-b.cjs'))+':'+(cycle.peer.peer===cycle.initial)+':'+cycle.peer.phase);check(cycle.peer===require('./cycle-b.cjs')&&cycle.peer.peer===cycle.initial&&cycle.peer.phase==='initial','cycle-publishes-original-partial-owner');
 check((globalThis as any).ownerTrace==='V;L;A;G;CA;CB;','cycle-evaluation-order');
 try{require('./retry.cjs');throw 'missing';}catch(error){check(error===(globalThis as any).ownerMarker,'require-abrupt-identity');}
 const retried=require('./retry.cjs');check(retried.run===2&&retried===require('./retry.cjs')&&(globalThis as any).ownerRuns===2,'failed-require-retries-and-success-caches');
 const vars=require('./vars.cjs');check(vars===vars.original&&vars.mutable[0]===(globalThis as any).ownerMarker&&vars.mutable[1]===3&&vars.local.marker===value.marker&&!vars.loadedDuring&&vars.record.loaded&&vars.pathsAgree,'wrapper-var-redeclarations-and-mutable-require');
 check(require('./shadow.cjs')===(globalThis as any).ownerMarker,'same-name-source-function-shadows-wrapper');
 const typedOwner=require('./typed-owner.ts');check(typedOwner.value===(globalThis as any).ownerMarker&&typedOwner.original===typedOwner&&typedOwner.receiver===typedOwner&&typedOwner.read()===(globalThis as any).ownerMarker,'required-script-source-shares-commonjs-record');
 const wrapper=require('./wrapper.cjs'),observed=wrapper.read();check(observed[0]===23&&observed[1]===29&&observed[2]&&observed[3],'mutable-wrapper-bindings-and-published-record');
 const lazy=require('./lazy.cjs');check(lazy===require('./lazy.cjs')&&(globalThis as any).ownerTrace==='V;L;A;G;CA;CB;Z;','late-actual-require-evaluation');
 async function suspended():Promise<void>{const owner=require('./value.cjs'),callee=owner.method;const first=owner.marker;await Promise.resolve();check(callee.call(owner,first,undefined,owner.marker),'retained-module-callee-through-suspension');}suspended();
 `;}

test('CommonJS projects actual source values from one retained cached module record',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-commonjs-module-owner-'));
 const erase=(source:string,module:ts.ModuleKind)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module}}).outputText;
 try{
  for(const strict of [false,true]){
   const referenceDirectory=path.join(temporary,`reference-${strict}`);await fs.mkdir(referenceDirectory);
   for(const [name,source] of sources(strict))await fs.writeFile(path.join(referenceDirectory,name),source);
   const referenceFile=path.join(referenceDirectory,'main.cjs');await fs.writeFile(referenceFile,erase(subject(false,true),ts.ModuleKind.CommonJS));
   const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");require(process.argv[1]);',referenceFile],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const expected=reference.stdout.toString().trimEnd().split('\n');expect(expected.at(-1)).toBe('retained-module-callee-through-suspension:true');
   for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]){
    const directory=path.join(temporary,`${strict}-${typed}-${profile}-${noGc}`);await fs.mkdir(directory);
    for(const [name,source] of sources(strict))await fs.writeFile(path.join(directory,name),source);
    const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
    await fs.writeFile(entry,typed?subject(profile,noGc):erase(subject(profile,noGc),ts.ModuleKind.ESNext));
    const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),moduleRoots:[entry],initializationEntries:[entry],
     ...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/commonjs-module-owner.js#'+(strict?'strict':'sloppy'),setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
    expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
    const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
    expect({strict,typed,profile,noGc,exitCode:native.exitCode,stderr:native.stderr.toString(),stdout:native.exitCode?native.stdout.toString():''}).toEqual({strict,typed,profile,noGc,exitCode:0,stderr:'',stdout:''});const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:'normal'});
    expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')).toEqual(expected);
   }
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

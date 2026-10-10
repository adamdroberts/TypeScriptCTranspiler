import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(profile:boolean,noGc:boolean,stress:boolean):string {
 const writes=['Native=null','Native+=1','Native++','++Native','[Native]=[null]','({value:Native}={value:null})'].map((expression,index)=>({name:`write${index}`,body:`static write${index}():any{try{${expression};}catch(error){return error instanceof TypeError;}return false;}`}));
 const methods=Array.from({length:stress?512:8},(_,index)=>`[retainedKey(${index})]():any{return Native;}`).join('\n');
 return `// @ts-nocheck
 const host=globalThis;
 function output(value:any):void{${profile?'host.print':'console.log'}(value);}
 function collect():void{${profile&&!noGc?'host.$262.gc();':''}}
 function check(value:boolean,label:string):void{if(!value)throw label;output(label+':true');}
 const events:any[]=[],keys:any[]=[],marker=Symbol('replacement');let escaped:any;
 function outer():any{return Native;}
 function key(read:any):any{escaped=read;let inner=false,outerTDZ=false;try{read();}catch(error){inner=error instanceof ReferenceError;}try{outer();}catch(error){outerTDZ=error instanceof ReferenceError;}events.push(inner&&outerTDZ);collect();return Symbol('member');}
 function retainedKey(index:number):any{collect();const key=Symbol('retained-'+index);keys.push(key);return key;}
 class Native {
  static original:any=Native;
  static fromBlock:any;
  static {Native.fromBlock=()=>Native;}
  owner:any=Native;
  deferred:any=()=>Native;
  constructor(input:any=Native){events.push(input===Native);}
  [key(()=>Native)]():any{return Native;}
  static self():any{return Native;}
  static type():string{return typeof Native;}
  get self():any{return Native;}
  static closure():any{return ()=>Native;}
  static async later():Promise<any>{await Promise.resolve(0);collect();return Native;}
  static *sequence():any{yield Native;collect();return Native;}
  static async *asyncSequence():any{yield Native;collect();return Native;}
  ${writes.map(write=>write.body).join('\n')}
  ${methods}
 }
 const Saved:any=Native;Native=marker;
 const owner:any=new Saved(),read=Saved.closure();collect();
 let valid=Native===marker&&Saved.self()===Saved&&Saved.type()==='function'&&Saved.original===Saved&&Saved.fromBlock()===Saved&&owner.owner===Saved&&owner.deferred()===Saved&&owner.self===Saved&&read()===Saved&&escaped()===Saved&&events.every(value=>value);
 for(const name of ${JSON.stringify(writes.map(write=>write.name))})valid=valid&&Saved[name]();
 check(valid,'native-class-inner-name-and-mutable-outer');
 function make():any{class Local {static self():any{return Local;}static write():any{try{Local=null;}catch(error){return error instanceof TypeError;}return false;}}const Saved=Local;Local=marker;return [Saved,Saved.self()===Saved&&Saved.write()&&Local===marker];}
 const local=make();check(local[1]&&local[0]!==make()[0],'shared-dynamic-class-name-environment');
 async function main():Promise<void>{
  check(await Saved.later()===Saved,'native-class-name-after-await');
  const sequence=Saved.sequence();check(sequence.next().value===Saved&&sequence.next().value===Saved,'native-class-name-after-yield');
  const asyncSequence=Saved.asyncSequence();const first=await asyncSequence.next(),last=await asyncSequence.next();check(first.value===Saved&&last.value===Saved,'native-class-name-after-async-yield');
  let node:any={owner,keys,Saved};for(let depth=0;depth<${stress?8192:8};depth++)node={previous:node};collect();for(let depth=0;depth<${stress?8192:8};depth++)node=node.previous;
  valid=true;for(const key of node.keys)valid=valid&&node.owner[key]()===node.Saved;
  check(valid,'deep-native-class-name-owner-graph');
 }main();
 `;
}

test('Native and dynamic class names share immutable retained environment cells',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-native-class-name-binding-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try{
  const plans=[true,false].flatMap(typed=>[false,true].flatMap(profile=>[false,true].map(noGc=>({typed,profile,noGc,stress:false}))));plans.push({typed:true,profile:true,noGc:false,stress:true});
  const expected=new Map<string,string[]>();
  for(const key of new Set(plans.map(plan=>`${plan.profile}-${plan.stress}-${plan.typed}`))){
   const [profile,stress]=key.split('-').map(value=>value==='true');
   const entry=path.join(temporary,`reference-${key}.mjs`);await fs.writeFile(entry,erase(subject(profile!,true,stress!)));
   const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");globalThis.print=console.log;import(process.argv[1]);',entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const lines=reference.stdout.toString().trimEnd().split('\n');expect(lines.at(-1)).toBe('deep-native-class-name-owner-graph:true');expected.set(key,lines);
  }
  for(const {typed,profile,noGc,stress} of plans){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}-${stress}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(profile,noGc,stress);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/native-class-name-binding.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,stress,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({typed,profile,noGc,stress,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect({typed,profile,noGc,stress,...observation}).toMatchObject({typed,profile,noGc,stress,kind:'normal',scenarioId:'property/native-class-name-binding.js#module'});
   expect({typed,profile,noGc,stress,lines:(observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')}).toEqual({typed,profile,noGc,stress,lines:expected.get(`${profile}-${stress}-${typed}`)!});
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

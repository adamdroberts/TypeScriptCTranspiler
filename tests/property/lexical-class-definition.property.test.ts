import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(profile:boolean,noGc:boolean,stress:boolean):string {
 const declarations=['function','block','switch'].map((placement,index)=>{
  const declaration=`class Local { [key](input:any=label):any{return input;}get current():any{return label;}static self():any{return Local;}static immutable():any{try{Local=17;}catch(error){return error instanceof TypeError;}return false;} }const saved=Local;Local=Symbol('replacement');return [saved,saved.self()===saved,saved.immutable()];`;
  return `function make${index}(key:any,label:any):any{${placement==='block'?'{'+declaration+'}':placement==='switch'?'switch(1){case 1:'+declaration+'}':declaration}}`;
 }).join('\n');
 const count=stress?512:6;
 const deep=Array.from({length:count},(_,index)=>`class Owner${index} { [retainedKey(${index})](input:any=label):any{return input;}static self():any{return Owner${index};} }nodes.push(Owner${index});`).join('\n');
 return `// @ts-nocheck
 const host=globalThis;
 function output(value:any):void{${profile?'host.print':'console.log'}(value);}
 function collect():void{${profile&&!noGc?'host.$262.gc();':''}}
 function check(value:boolean,label:string):void{if(!value)throw label;output(label+':true');}
 ${declarations}
 const factories:any[]=[make0,make1,make2],keys:any[]=['',7,Symbol('member')],label=Symbol('captured');let valid=true;
 for(let place=0;place<factories.length;place++)for(let index=0;index<keys.length;index++){
  const result=factories[place](keys[index],label),Constructor:any=result[0],owner=new Constructor(),again=factories[place](keys[index],Symbol('other'));collect();
  const descriptor=Object.getOwnPropertyDescriptor(Constructor.prototype,keys[index]);
  valid=valid&&result[1]&&result[2]&&Constructor!==again[0]&&Constructor.name==='Local'&&owner[keys[index]]()===label&&owner.current===label&&descriptor.value===Constructor.prototype[keys[index]]&&descriptor.writable&&!descriptor.enumerable&&descriptor.configurable;
 }
 check(valid,'lexical-class-scope-captures-and-inner-name');
 function expression(label:any):any{return class Named {read():any{return label;}static self():any{return Named;}static immutable():any{try{Named=17;}catch(error){return error instanceof TypeError;}return false;} };}
 const Named=expression(label),named=new Named();collect();check(Named.self()===Named&&Named.immutable()&&named.read()===label,'named-expression-inner-binding');
 let early=true;
 {try{Before;}catch(error){early=early&&error instanceof ReferenceError;}try{typeof Before;}catch(error){early=early&&error instanceof ReferenceError;}const read=()=>Before;try{read();}catch(error){early=early&&error instanceof ReferenceError;}class Before {static self():any{return Before;}}check(early&&read()===Before&&Before.self()===Before,'class-declaration-tdz-and-forward-closure');}
 let escaped:any,identity=Symbol('abrupt'),caught:any;
 const keyFailure={ [Symbol.toPrimitive](){throw identity;}};
 try{escaped=()=>Failed;class Failed {[keyFailure](){}};}catch(error){caught=error;}
 let retainedTdz=false;try{escaped();}catch(error){retainedTdz=error instanceof ReferenceError;}
 check(caught===identity&&retainedTdz,'abrupt-definition-retains-outer-tdz');
 let selfTdz=false;try{const Unused=class Inside {[Inside]() {}};}catch(error){selfTdz=error instanceof ReferenceError;}
 check(selfTdz,'inner-name-uninitialized-during-key-evaluation');
 let innerRead:any;
 {class Inner {[((innerRead=()=>Inner),'key')]() {}}collect();check(innerRead()===Inner,'computed-key-closure-retains-initialized-inner-name');}
 let failedInnerRead:any;
 try{class Inner {[((failedInnerRead=()=>Inner),keyFailure)]() {}};}catch(error){caught=error;}
 let failedInnerTdz=false;try{failedInnerRead();}catch(error){failedInnerTdz=error instanceof ReferenceError;}
 check(caught===identity&&failedInnerTdz,'abrupt-key-closure-retains-inner-tdz');

 let later=0,protectedKey=true;
 try{class Unused {static get ['prototype'](){return 1;}[later++](){}};}catch(error){protectedKey=error instanceof TypeError;}
 check(protectedKey&&later===0,'unused-local-class-protected-definition');
 const repeated:any[]=[];
 for(let index=0;index<4;index++){class Iteration {read():any{return index;}static self():any{return Iteration;}}repeated.push(Iteration);}
 valid=true;for(let index=0;index<repeated.length;index++){const Constructor:any=repeated[index],owner=new Constructor();collect();valid=valid&&owner.read()===index&&Constructor.self()===Constructor&&(index===0||Constructor!==repeated[index-1]);}
 check(valid,'fresh-loop-class-binding');
 function* resumed(label:any):any{yield 1;yield expression(label);}
 const iterator=resumed(label);iterator.next();const Resumed:any=iterator.next().value,resumedOwner=new Resumed();collect();check(Resumed.self()===Resumed&&resumedOwner.read()===label,'resumed-generator-class-binding');
 const retainedKeys:any[]=[];
 function retainedKey(index:number):any{collect();const key=Symbol('retained-'+index);retainedKeys.push(key);return key;}
 function deep(label:any):any{const nodes:any[]=[];${deep}return nodes;}
 const owners=deep(label);let chain:any={owners,keys:retainedKeys};for(let depth=0;depth<${stress?8192:8};depth++)chain={previous:chain};collect();for(let depth=0;depth<${stress?8192:8};depth++)chain=chain.previous;
 valid=true;for(let index=0;index<chain.owners.length;index++){const Constructor:any=chain.owners[index],owner=new Constructor();collect();valid=valid&&Constructor.self()===Constructor&&owner[chain.keys[index]]()===label;}
 check(valid,'deep-lexical-class-owner-graph');
 `;
}

test('Lexical class definitions retain scope and immutable inner names',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-lexical-class-definition-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try{
  const plans=[true,false].flatMap(typed=>[false,true].flatMap(profile=>[false,true].map(noGc=>({typed,profile,noGc,stress:false}))));plans.push({typed:true,profile:true,noGc:false,stress:true});
  const expected=new Map<string,string[]>();
  for(const key of new Set(plans.map(plan=>`${plan.profile}-${plan.stress}-${plan.typed}`))){
   const [profile,stress]=key.split('-').map(value=>value==='true');
   const entry=path.join(temporary,`reference-${key}.mjs`);await fs.writeFile(entry,erase(subject(profile!,true,stress!)));
   const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");globalThis.print=console.log;import(process.argv[1]);',entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const lines=reference.stdout.toString().trimEnd().split('\n');expect(lines.at(-1)).toBe('deep-lexical-class-owner-graph:true');expected.set(key,lines);
  }
  for(const {typed,profile,noGc,stress} of plans){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}-${stress}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(profile,noGc,stress);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/lexical-class-definition.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,stress,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({typed,profile,noGc,stress,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect({typed,profile,noGc,stress,...observation}).toMatchObject({typed,profile,noGc,stress,kind:'normal',scenarioId:'property/lexical-class-definition.js#module'});
   expect({typed,profile,noGc,stress,lines:(observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')}).toEqual({typed,profile,noGc,stress,lines:expected.get(`${profile}-${stress}-${typed}`)!});
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

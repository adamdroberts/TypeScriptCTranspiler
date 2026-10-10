import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(profile:boolean,noGc:boolean,stress:boolean):string {
 const expressions=['function(value:number=1){}','()=>0','function*(value:number=1){yield value;}','async function(value:number=1){}','async function*(value:number=1){yield value;}','class {static observed():any{return this.name;}}'];
 const declarations=expressions.map((expression,index)=>`class Names${index} {"":any=${expression};with_$:any=${expression};"unicode_λ":any=${expression};"2":any=${expression};static stored:any=${expression};}`).join('\n');
 return `// @ts-nocheck
 const host=globalThis;
 function output(value:any):void{${profile?'host.print':'console.log'}(value);}
 function collect():void{${profile&&!noGc?'host.$262.gc();':''}}
 function check(value:boolean,label:string):void{if(!value)throw label;output(label+':true');}
 function reference():void{}
 ${declarations}
 const constructors:any[]=[${expressions.map((_,index)=>'Names'+index).join(',')}];
 const keys:string[]=['','with_$','unicode_λ','2'];
 for(let kind=0;kind<constructors.length;kind++){
  const Constructor=constructors[kind],owner=new Constructor();collect();
  for(let keyIndex=0;keyIndex<keys.length;keyIndex++){
   const key=keys[keyIndex],value=owner[key],descriptor=Object.getOwnPropertyDescriptor(value,'name');
   check(value.name===key&&descriptor.value===key&&!descriptor.writable&&!descriptor.enumerable&&descriptor.configurable,'field-callable-name-'+kind+'-'+keyIndex);
  }
  check(Constructor.stored.name==='stored','static-field-callable-name-'+kind);
 }
 const classOwner=new Names5();check(classOwner.with_$.observed()==='with_$'&&Names5.stored.observed()==='stored','anonymous-class-name-before-member-call');
 class Preserved {named:any=function explicit(){};aliased:any=reference;}
 const preserved=new Preserved();check(preserved.named.name==='explicit'&&preserved.aliased===reference&&preserved.aliased.name==='reference','explicit-and-reference-names-preserved');
 const result=new Names1().with_$;let node:any={value:result};for(let depth=0;depth<${stress?8192:8};depth++)node={previous:node};collect();for(let depth=0;depth<${stress?8192:8};depth++)node=node.previous;
 check(node.value===result&&node.value.name==='with_$','deep-field-name-owner-graph');
 `;
}

test('Field callable names follow the shared source syntax projection',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-field-callable-name-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try{
  const plans=[true,false].flatMap(typed=>[false,true].flatMap(profile=>[false,true].map(noGc=>({typed,profile,noGc,stress:false}))));plans.push({typed:true,profile:true,noGc:false,stress:true});
  const expected=new Map<string,string[]>();
  for(const key of new Set(plans.map(plan=>`${plan.profile}-${plan.stress}-${plan.typed}`))){
   const [profile,stress]=key.split('-').map(value=>value==='true');
   const entry=path.join(temporary,`reference-${key}.mjs`);await fs.writeFile(entry,erase(subject(profile!,true,stress!)));
   const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");globalThis.print=console.log;import(process.argv[1]);',entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const lines=reference.stdout.toString().trimEnd().split('\n');expect(lines.at(-1)).toBe('deep-field-name-owner-graph:true');expected.set(key,lines);
  }
  for(const {typed,profile,noGc,stress} of plans){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}-${stress}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(profile,noGc,stress);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/field-callable-name.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,stress,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({typed,profile,noGc,stress,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect({typed,profile,noGc,stress,...observation}).toMatchObject({typed,profile,noGc,stress,kind:'normal',scenarioId:'property/field-callable-name.js#module'});
   expect({typed,profile,noGc,stress,lines:(observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')}).toEqual({typed,profile,noGc,stress,lines:expected.get(`${profile}-${stress}-${typed}`)!});
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

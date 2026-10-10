import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(profile:boolean,noGc:boolean,stress:boolean):string {
 const keys=['','with_$','unicode_λ','2'];
 return `// @ts-nocheck
 const host=globalThis;
 function output(value:any):void{${profile?'host.print':'console.log'}(value);}
 function collect():void{${profile&&!noGc?'host.$262.gc();':''}}
 function check(value:boolean,label:string):void{if(!value)throw label;output(label+':true');}
 function fresh():any{return{label:'fresh:'+String(7)};}
 function retained():any{let node:any={value:'leaf:'+String(7)};for(let depth=0;depth<${stress?8192:8};depth++)node={previous:node};return node;}
 class Presence {
  first:any=[this.later,Object.hasOwn(this,'later'),Object.hasOwn(this,'first')];
  reader:()=>any=()=>this.later;
  later:number=fresh() as any;
  empty:number;
  self:any=this;
  target:any=new.target;
 }
 const owner=new Presence();collect();
 check(owner.first[0]===undefined&&!owner.first[1]&&!owner.first[2],'ordered-field-presence');
 check(owner.reader()===owner.later&&owner.self===owner&&owner.target===undefined,'field-this-and-lexical-capture');
 const empty=Object.getOwnPropertyDescriptor(owner,'empty'),later=Object.getOwnPropertyDescriptor(owner,'later');
 check(empty.value===undefined&&empty.writable&&empty.enumerable&&empty.configurable&&later.value===owner.later&&later.writable&&later.enumerable&&later.configurable,'field-data-descriptors');
 const replacement=Symbol('replacement');owner.later=replacement;collect();check(owner.reader()===replacement,'field-owner-write');
 let trace:string[]=[];
 class Parent {get value():any{trace.push('get');return'inherited';}set value(input:any){trace.push('set');}}
 class Child extends Parent {value:any=this.value;constructor(){super();}}
 const child=new Child();check(child.value==='inherited'&&trace.join('|')==='get'&&Object.hasOwn(child,'value'),'field-define-bypasses-inherited-setter');
 trace=[];
 class Base {base:any=(trace.push('base-field'),fresh());constructor(){trace.push('base-body');}}
 class Derived extends Base {own:any=(trace.push('derived-field'),this.base);constructor(){trace.push('before-super');super();trace.push('derived-body');}}
 const derived=new Derived();check(derived.own===derived.base&&trace.join('|')==='before-super|base-field|base-body|derived-field|derived-body','derived-field-initialization-order');
 trace=[];class Implicit extends Base {own:any=(trace.push('implicit-field'),this.base);}
 const implicit=new Implicit();check(implicit.own===implicit.base&&trace.join('|')==='base-field|base-body|implicit-field','implicit-derived-field-order');
 const original=fresh(),next=fresh();
 class Duplicate {value:any=original;observed:any=this.value;value:any=next;}
 const duplicate=new Duplicate();check(duplicate.observed===original&&duplicate.value===next&&Object.keys(duplicate).join('|')==='value|observed','repeated-field-definition-order');
 let published:any;
 class Abrupt {first:any=(published=this,Object.defineProperty(this,'later',{value:original,writable:false,configurable:false}),true);later:any=next;}
 let abrupt=false;try{new Abrupt();}catch(error){abrupt=error instanceof TypeError;}
 check(abrupt&&published.later===original&&Object.hasOwn(published,'first'),'field-definition-abrupt-completion');
 class Keys {${keys.map(key=>`${JSON.stringify(key)}:any=fresh();`).join('\n')}}
 const keyed=new Keys();${keys.map((key,index)=>`check(Object.hasOwn(keyed,${JSON.stringify(key)})&&Object.getOwnPropertyDescriptor(keyed,${JSON.stringify(key)}).value.label==='fresh:7','field-key-${index}');`).join('\n')}
 class Retained {graph:any=retained();read:()=>any=()=>this.graph;}
 const saved=new Retained().read;collect();let node:any=saved();for(let depth=0;depth<${stress?8192:8};depth++)node=node.previous;
 check(node.value==='leaf:7','deep-field-owner-graph');
 `;
}

test('Source class field definitions follow one ordered owner plan',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-class-field-definition-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try{
  const plans=[true,false].flatMap(typed=>[false,true].flatMap(profile=>[false,true].map(noGc=>({typed,profile,noGc,stress:false}))));plans.push({typed:true,profile:true,noGc:false,stress:true});
  const expected=new Map<string,string[]>();
  for(const key of new Set(plans.map(plan=>`${plan.profile}-${plan.stress}-${plan.typed}`))){
   const [profile,stress]=key.split('-').map(value=>value==='true');
   const entry=path.join(temporary,`reference-${key}.mjs`);await fs.writeFile(entry,erase(subject(profile!,true,stress!)));
   const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");globalThis.print=console.log;import(process.argv[1]);',entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const lines=reference.stdout.toString().trimEnd().split('\n');expect(lines.at(-1)).toBe('deep-field-owner-graph:true');expected.set(key,lines);
  }
  for(const {typed,profile,noGc,stress} of plans){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}-${stress}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(profile,noGc,stress);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/class-field-definition.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,stress,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({typed,profile,noGc,stress,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect({typed,profile,noGc,stress,...observation}).toMatchObject({typed,profile,noGc,stress,kind:'normal',scenarioId:'property/class-field-definition.js#module'});
   expect({typed,profile,noGc,stress,lines:(observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')}).toEqual({typed,profile,noGc,stress,lines:expected.get(`${profile}-${stress}-${typed}`)!});
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

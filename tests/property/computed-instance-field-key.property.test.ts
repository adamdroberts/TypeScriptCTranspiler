import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(profile:boolean,noGc:boolean,stress:boolean):string {
 const expressions=['function(value:number=1){}','()=>0','function*(value:number=1){yield value;}','async function(value:number=1){}','async function*(value:number=1){yield value;}','class {static observed():any{return this.name;}}'];
 const declarations=expressions.map((expression,index)=>`class Names${index} {${Array.from({length:10},(_,key)=>`[inputs[${key}]]:any=${expression};`).join('')}}`).join('\n');
 const depth=stress?512:8;
 return `// @ts-nocheck
 const host=globalThis;
 function output(value:any):void{${profile?'host.print':'console.log'}(value);}
 function collect():void{${profile&&!noGc?'host.$262.gc();':''}}
 function check(value:boolean,label:string):void{if(!value)throw label;output(label+':true');}
 let conversions=0;
 const described=Symbol('field'),empty=Symbol(''),absent=Symbol();
 const converted={get [Symbol.toPrimitive](){conversions++;return function(hint:string){if(hint!=='string')throw 'hint';return 'converted';};}};
 const inputs:any[]=['',7,null,undefined,true,19n,described,empty,absent,converted];
 const keys:any[]=['','7','null','undefined','true','19',described,empty,absent,'converted'];
 const names:string[]=['','7','null','undefined','true','19','[field]','[]','','converted'];
 ${declarations}
 const constructors:any[]=[${expressions.map((_,index)=>'Names'+index).join(',')}];collect();
 let valid=true;
 for(let kind=0;kind<constructors.length;kind++){
  const owner=new constructors[kind](),another=new constructors[kind]();collect();
  valid=valid&&Reflect.ownKeys(owner).length===keys.length;
  for(let keyIndex=0;keyIndex<keys.length;keyIndex++){
   const value=owner[keys[keyIndex]],descriptor=Object.getOwnPropertyDescriptor(value,'name'),field=Object.getOwnPropertyDescriptor(owner,keys[keyIndex]);
   valid=valid&&value!==another[keys[keyIndex]]&&value.name===names[keyIndex]&&descriptor.value===names[keyIndex]&&!descriptor.writable&&!descriptor.enumerable&&descriptor.configurable&&field.value===value&&field.writable&&field.enumerable&&field.configurable;
  }
 }
 check(valid,'instance-key-values-names-and-descriptors');
 check(conversions===constructors.length,'keys-coerce-once-before-instance-creation');
 const classOwner=new Names5();check(classOwner[described].observed()==='[field]'&&classOwner[7].observed()==='7','actual-key-anonymous-class-name');
 function reference():void{}
 class Preserved {[described]:any=function explicit(){};[empty]:any=reference;['notAnonymous']:any=(0,()=>0);}
 const preserved=new Preserved();check(preserved[described].name==='explicit'&&preserved[empty]===reference&&preserved[empty].name==='reference'&&preserved.notAnonymous.name==='','explicit-reference-and-expression-names-preserved');
 let events:string[]=[];
 function key(label:string,value:any):any{events.push(label);collect();return value;}
 function value(label:string):any{events.push(label);return label;}
 class Order {
  [key('first-key','first')]:any=value('first-value');
  [key('method-key','method')](){return this.first;}
  static [key('static-key','stored')]:any=value('static-value');
  [key('second-key','second')]:any=value('second-value');
  constructor(){events.push('body');}
 }
 check(events.join(',')==='first-key,method-key,static-key,second-key,static-value','all-keys-before-field-values');
 const ordered=new Order();check(ordered.method()==='first-value'&&events.join(',')==='first-key,method-key,static-key,second-key,static-value,first-value,second-value,body','instance-values-before-constructor-body');
 let alias:any='before';class Aliased {[alias]:any=()=>0;[alias='after']:any=()=>0;}
 alias='mutated';const aliased=new Aliased();check(aliased.before.name==='before'&&aliased.after.name==='after'&&!Object.hasOwn(aliased,'mutated'),'evaluated-keys-survive-later-mutation');
 const absentKey=Symbol('absent');class Uninitialized {[absentKey]:number;}
 const uninitialized=new Uninitialized(),missing=Object.getOwnPropertyDescriptor(uninitialized,absentKey);check(missing.value===undefined&&missing.writable&&missing.enumerable&&missing.configurable,'computed-uninitialized-field');
 const sharedKey=Symbol('shared'),first={label:'first'},next={label:'next'},replacement=Symbol('replacement');
 class Duplicate {[sharedKey]:any=first;observed:any=this[sharedKey];[sharedKey]:any=next;plain:any=first;['plain']:any=next;read:()=>any=()=>this[sharedKey];}
 const duplicate=new Duplicate();check(duplicate.observed===first&&duplicate[sharedKey]===next&&duplicate.plain===next,'repeated-actual-key-definition');duplicate[sharedKey]=replacement;collect();check(duplicate.read()===replacement,'computed-field-alias-write');
 const inheritedKey=Symbol('inherited');let gets=0,sets=0;
 class Parent {get [inheritedKey]():any{gets++;return first;}set [inheritedKey](input:any){sets++;}}
 class Child extends Parent {[inheritedKey]:any=this[inheritedKey];constructor(){super();}}
 const child=new Child();check(child[inheritedKey]===first&&gets===1&&sets===0&&Object.hasOwn(child,inheritedKey),'computed-definition-bypasses-inherited-setter');
 const baseKey=Symbol('base'),ownKey=Symbol('own');events=[];
 class Base {[baseKey]:any=(events.push('base-field'),first);constructor(){events.push('base-body');}}
 class Derived extends Base {[ownKey]:any=(events.push('own-field'),this[baseKey]);constructor(){super();events.push('own-body');}observed():any{return this[ownKey];}}
 const derived=new Derived();check(derived.observed()===first&&events.join(',')==='base-field,base-body,own-field,own-body','derived-computed-field-layout');
 let published:any;const abruptKey=Symbol('abrupt');
 class Abrupt {first:any=(published=this,Object.defineProperty(this,abruptKey,{value:first,writable:false,configurable:false}),true);[abruptKey]:any=next;}
 let abrupt=false;try{new Abrupt();}catch(error){abrupt=error instanceof TypeError;}
 check(abrupt&&published[abruptKey]===first&&Object.hasOwn(published,'first'),'computed-field-definition-abrupt-completion');
 const clone={...duplicate};check(clone.plain===next&&clone[sharedKey]===replacement&&Object.getPrototypeOf(clone)===Object.prototype,'computed-fields-spread-as-ordinary-values');
 const retainedKeys:any[]=[];
 function retainedKey(index:number):any{collect();const result=Symbol('retained-'+index);retainedKeys.push(result);return result;}
 class Deep {_class_field_storage0:any='reserved';_class_field_storage1:any='reserved-next';${Array.from({length:depth},(_,index)=>`[retainedKey(${index})]:any=()=>${index};`).join('')}}
 const retained=new Deep();let node:any={owner:retained,keys:retainedKeys};for(let depth=0;depth<${stress?8192:8};depth++)node={previous:node};collect();for(let depth=0;depth<${stress?8192:8};depth++)node=node.previous;
 valid=node.owner._class_field_storage0==='reserved'&&node.owner._class_field_storage1==='reserved-next'&&Reflect.ownKeys(node.owner).length===node.keys.length+2;
 for(let index=0;index<node.keys.length;index++){const fn=node.owner[node.keys[index]];valid=valid&&fn.name==='[retained-'+index+']'&&fn()===index;}
 check(valid,'deep-computed-instance-field-owner-graph');
 `;
}

test('Computed instance fields use declaration-owned retained value cells',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-computed-instance-field-key-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try{
  const plans=[true,false].flatMap(typed=>[false,true].flatMap(profile=>[false,true].map(noGc=>({typed,profile,noGc,stress:false}))));plans.push({typed:true,profile:true,noGc:false,stress:true});
  const expected=new Map<string,string[]>();
  for(const key of new Set(plans.map(plan=>`${plan.profile}-${plan.stress}-${plan.typed}`))){
   const [profile,stress]=key.split('-').map(value=>value==='true');
   const entry=path.join(temporary,`reference-${key}.mjs`);await fs.writeFile(entry,erase(subject(profile!,true,stress!)));
   const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");globalThis.print=console.log;import(process.argv[1]);',entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const lines=reference.stdout.toString().trimEnd().split('\n');expect(lines.at(-1)).toBe('deep-computed-instance-field-owner-graph:true');expected.set(key,lines);
  }
  for(const {typed,profile,noGc,stress} of plans){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}-${stress}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(profile,noGc,stress);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/computed-instance-field-key.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,stress,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({typed,profile,noGc,stress,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect({typed,profile,noGc,stress,...observation}).toMatchObject({typed,profile,noGc,stress,kind:'normal',scenarioId:'property/computed-instance-field-key.js#module'});
   expect({typed,profile,noGc,stress,lines:(observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')}).toEqual({typed,profile,noGc,stress,lines:expected.get(`${profile}-${stress}-${typed}`)!});
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

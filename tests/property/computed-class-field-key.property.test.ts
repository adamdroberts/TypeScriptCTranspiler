import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(profile:boolean,noGc:boolean,stress:boolean):string {
 const expressions=['function(value:number=1){}','()=>0','function*(value:number=1){yield value;}','async function(value:number=1){}','async function*(value:number=1){yield value;}','class {static observed():any{return this.name;}}'];
 const declarations=expressions.map((expression,index)=>`class Names${index} {${Array.from({length:10},(_,key)=>`static [inputs[${key}]]:any=${expression};`).join('')}}`).join('\n');
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
 check(conversions===constructors.length,'key-coercion-once');
 let valid=true;
 for(let kind=0;kind<constructors.length;kind++){
  for(let keyIndex=0;keyIndex<keys.length;keyIndex++){
   const value=constructors[kind][keys[keyIndex]],descriptor=Object.getOwnPropertyDescriptor(value,'name');
   valid=valid&&value.name===names[keyIndex]&&descriptor.value===names[keyIndex]&&!descriptor.writable&&!descriptor.enumerable&&descriptor.configurable;
  }
 }
 check(valid,'actual-key-callable-names-and-descriptors');
 check(Names5[described].observed()==='[field]'&&Names5[7].observed()==='7','actual-key-anonymous-class-name');
 function reference():void{}
 class Preserved {static [described]:any=function explicit(){};static [empty]:any=reference;static ['notAnonymous']:any=(0,()=>0);}
 check(Preserved[described].name==='explicit'&&Preserved[empty]===reference&&Preserved[empty].name==='reference'&&Preserved.notAnonymous.name==='','explicit-reference-and-expression-names-preserved');
 let events:string[]=[];
 function key(label:string,value:any):any{events.push(label);collect();return value;}
 function value(label:string):any{events.push(label);return label;}
 class Order {
  static [key('first-key','first')]:any=value('first-value');
  [key('method-key','method')](){}
  static {events.push('block');}
  static [key('second-key','second')]:any=value('second-value');
  get [key('getter-key','getter')](){return 1;}
 }
 check(events.join(',')==='first-key,method-key,second-key,getter-key,first-value,block,second-value','all-keys-before-static-values');
 let alias:any='before';
 class Aliased {static [alias]:any=()=>0;static mutate:any=(alias='after');static [alias]:any=()=>0;}
 check(Aliased.before.name==='before'&&!Object.hasOwn(Aliased,'after'),'evaluated-key-survives-later-mutation');
 const retainedKeys:any[]=[];
 function retainedKey(index:number):any{collect();const result=Symbol('retained-'+index);retainedKeys.push(result);return result;}
 class Deep {${Array.from({length:depth},(_,index)=>`static [retainedKey(${index})]:any=()=>${index};`).join('')}}
 let node:any={owner:Deep,keys:retainedKeys};for(let depth=0;depth<${stress?8192:8};depth++)node={previous:node};collect();for(let depth=0;depth<${stress?8192:8};depth++)node=node.previous;
 valid=true;for(let index=0;index<node.keys.length;index++){const fn=node.owner[node.keys[index]];valid=valid&&fn.name==='[retained-'+index+']'&&fn()===index;}
 check(valid,'deep-computed-key-owner-graph');
 `;
}

test('Computed class fields share the ordered evaluated key plan',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-computed-class-field-key-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try{
  const plans=[true,false].flatMap(typed=>[false,true].flatMap(profile=>[false,true].map(noGc=>({typed,profile,noGc,stress:false}))));plans.push({typed:true,profile:true,noGc:false,stress:true});
  const expected=new Map<string,string[]>();
  for(const key of new Set(plans.map(plan=>`${plan.profile}-${plan.stress}-${plan.typed}`))){
   const [profile,stress]=key.split('-').map(value=>value==='true');
   const entry=path.join(temporary,`reference-${key}.mjs`);await fs.writeFile(entry,erase(subject(profile!,true,stress!)));
   const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");globalThis.print=console.log;import(process.argv[1]);',entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const lines=reference.stdout.toString().trimEnd().split('\n');expect(lines.at(-1)).toBe('deep-computed-key-owner-graph:true');expected.set(key,lines);
  }
  for(const {typed,profile,noGc,stress} of plans){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}-${stress}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(profile,noGc,stress);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/computed-class-field-key.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,stress,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({typed,profile,noGc,stress,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect({typed,profile,noGc,stress,...observation}).toMatchObject({typed,profile,noGc,stress,kind:'normal',scenarioId:'property/computed-class-field-key.js#module'});
   expect({typed,profile,noGc,stress,lines:(observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')}).toEqual({typed,profile,noGc,stress,lines:expected.get(`${profile}-${stress}-${typed}`)!});
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

test('Abrupt computed field keys stop the ordered class definition',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-computed-field-key-abrupt-'));
 const source=`const host=globalThis;
 const key={ [Symbol.toPrimitive](){host.print('convert');throw new TypeError('key-stop');}};
 class Abrupt {static [key]:any=host.print('value');static [host.print('later')]:any=1;}
 host.print('completed');`;
 const erase=(value:string)=>ts.transpileModule(value,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try{
  const reference=Bun.spawnSync(['node','-e','globalThis.print=value=>require("node:fs").writeSync(1,String(value)+"\\n");'+erase(source)],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect(reference.exitCode).toBe(1);expect(reference.stdout.toString()).toBe('convert\n');expect(reference.stderr.toString()).toContain('TypeError: key-stop');
  for(const typed of [true,false])for(const noGc of [false,true]){
   const directory=path.join(temporary,`${typed}-${noGc}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   await fs.writeFile(entry,typed?'// @ts-nocheck\n'+source:erase(source));
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),test262Observation:{kind:'test262-native-observation',scenarioId:'property/computed-field-key-abrupt.js#module',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
   expect(parseHostObservation(JSON.parse(native.stdout.toString()))).toMatchObject({kind:'throw',phase:'runtime',errorConstructor:'TypeError',stdout:'convert\n'});
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

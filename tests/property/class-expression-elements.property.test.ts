import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(profile:boolean,noGc:boolean,stress:boolean):string {
 const methodKinds=['','*','async ','async *'];
 const declarations=methodKinds.map((kind,index)=>`function make${index}(key:any,label:any):any{return class {${kind}[key](input:any=label):any{${kind.includes('*')?'yield input;':'return input;'}}static ${kind}[key](input:any=label):any{${kind.includes('*')?'yield input;':'return input;'}}};}`).join('\n');
 const depth=stress?512:8;
 return `// @ts-nocheck
 const host=globalThis;
 function output(value:any):void{${profile?'host.print':'console.log'}(value);}
 function collect():void{${profile&&!noGc?'host.$262.gc();':''}}
 function check(value:boolean,label:string):void{if(!value)throw label;output(label+':true');}
 ${declarations}
 const described=Symbol('method'),empty=Symbol(''),absent=Symbol(),factories:any[]=[make0,make1,make2,make3];
 const keys:any[]=['','unicode_λ',7,described,empty,absent];
 const names:string[]=['','unicode_λ','7','[method]','[]',''];let valid=true;
 for(let kind=0;kind<factories.length;kind++)for(let index=0;index<keys.length;index++){
  const Constructor=factories[kind](keys[index],'captured'),again=factories[kind](keys[index],'other');collect();
  const prototype=Constructor.prototype,member=prototype[keys[index]],staticMember=Constructor[keys[index]],descriptor=Object.getOwnPropertyDescriptor(prototype,keys[index]);
  valid=valid&&Constructor!==again&&member!==again.prototype[keys[index]]&&member.name===names[index]&&staticMember.name===names[index]&&member.length===0&&descriptor.value===member&&descriptor.writable&&!descriptor.enumerable&&descriptor.configurable;
 }
 check(valid,'expression-method-kinds-keys-and-descriptors');
 const callableKey=Symbol('callable'),Left=make0(callableKey,Symbol('left')),Right=make0(callableKey,Symbol('right'));
 const left=new Left(),right=new Right();const leftValue=left[callableKey](),rightValue=right[callableKey]();check(leftValue!==rightValue&&typeof leftValue==='symbol'&&left[callableKey](rightValue)===rightValue,'fresh-expression-capture-and-actual-formals');
 const generated=new (make1(callableKey,leftValue))();check(generated[callableKey]().next().value===leftValue,'computed-generator-method');
 function accessors(key:any,label:any):any{return class {get [key]():any{return this;}set [key](value:any){this.stored=value;}static get [key]():any{return this;}static set [key](value:any){this.stored=value;}label():any{return label;}};}
 for(let index=0;index<keys.length;index++){
  const key=keys[index],Constructor=accessors(key,'retained'),owner=new Constructor(),descriptor=Object.getOwnPropertyDescriptor(Constructor.prototype,key),staticDescriptor=Object.getOwnPropertyDescriptor(Constructor,key);
  owner[key]=leftValue;Constructor[key]=rightValue;collect();
  check(owner[key]===owner&&owner.stored===leftValue&&Constructor[key]===Constructor&&Constructor.stored===rightValue&&owner.label()==='retained'&&descriptor.get.name==='get '+names[index]&&descriptor.set.name==='set '+names[index]&&!descriptor.enumerable&&descriptor.configurable&&staticDescriptor.get.name==='get '+names[index]&&Reflect.apply(descriptor.get,17,[])===17,'expression-accessor-'+index);
 }
 let events:string[]=[];
 function key(label:string,value:any):any{events.push(label);collect();return value;}
 const Ordered=class {[key('method',described)](){return 1;}static get [key('static','observed')](){return this;}set [key('setter',described)](value:any){this.stored=value;}get [key('getter',described)](){return this.stored;}};
 const ordered=new Ordered();ordered[described]=leftValue;check(events.join(',')==='method,static,setter,getter'&&ordered[described]===leftValue&&Ordered.observed===Ordered,'ordered-key-definition-and-accessor-merge');
 let conversions=0;
 const converting={get [Symbol.toPrimitive](){conversions++;return function(hint:string){if(hint!=='string')throw 'hint';collect();return Symbol('converted-'+conversions);};}};
 const First=make0(converting,leftValue),Second=make0(converting,rightValue),firstKeys=Object.getOwnPropertySymbols(First.prototype),secondKeys=Object.getOwnPropertySymbols(Second.prototype);collect();
 check(conversions===4&&firstKeys[0]!==secondKeys[0]&&First.prototype[firstKeys[0]].name==='[converted-1]'&&Second.prototype[secondKeys[0]].name==='[converted-3]','per-evaluation-key-carriers');
 const stopped=Symbol('stopped');events=[];
 const abrupt={ [Symbol.toPrimitive](){events.push('convert');throw stopped;}};
 let caught:any;try{const Rejected=class {[abrupt](){}[key('later','later')](){}};}catch(error){caught=error;}
 check(caught===stopped&&events.join(',')==='convert','abrupt-key-stops-expression-definition');
 let protectedKeys=true;
 try{const Rejected=class {static ['prototype'](){}};protectedKeys=false;}catch(error){protectedKeys=protectedKeys&&error instanceof TypeError;}
 try{const Rejected=class {static get ['prototype'](){return 1;}};protectedKeys=false;}catch(error){protectedKeys=protectedKeys&&error instanceof TypeError;}
 try{const Rejected=class {static set ['prototype'](value:any){}};protectedKeys=false;}catch(error){protectedKeys=protectedKeys&&error instanceof TypeError;}
 check(protectedKeys,'protected-constructor-property-definitions-throw');
 const retainedKeys:any[]=[];
 function retainedKey(index:number):any{collect();const result=Symbol('retained-'+index);retainedKeys.push(result);return result;}
 function deep(label:any):any{return class {${Array.from({length:depth},(_,index)=>`[retainedKey(${index})](input:any=label):any{return input;}`).join('')}};}
 const Deep=deep(leftValue),retained=new Deep();let node:any={owner:retained,keys:retainedKeys};for(let depth=0;depth<${stress?8192:8};depth++)node={previous:node};collect();for(let depth=0;depth<${stress?8192:8};depth++)node=node.previous;
 valid=true;for(let index=0;index<node.keys.length;index++){const fn=node.owner[node.keys[index]];valid=valid&&fn.name==='[retained-'+index+']'&&fn()===leftValue;}
 check(valid,'deep-class-expression-element-owner-graph');
 `;
}

test('Class declarations and expressions share ordered element definition',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-class-expression-elements-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try{
  const plans=[true,false].flatMap(typed=>[false,true].flatMap(profile=>[false,true].map(noGc=>({typed,profile,noGc,stress:false}))));plans.push({typed:true,profile:true,noGc:false,stress:true});
  const expected=new Map<string,string[]>();
  for(const key of new Set(plans.map(plan=>`${plan.profile}-${plan.stress}-${plan.typed}`))){
   const [profile,stress]=key.split('-').map(value=>value==='true');
   const entry=path.join(temporary,`reference-${key}.mjs`);await fs.writeFile(entry,erase(subject(profile!,true,stress!)));
   const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");globalThis.print=console.log;import(process.argv[1]);',entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const lines=reference.stdout.toString().trimEnd().split('\n');expect(lines.at(-1)).toBe('deep-class-expression-element-owner-graph:true');expected.set(key,lines);
  }
  for(const {typed,profile,noGc,stress} of plans){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}-${stress}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(profile,noGc,stress);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/class-expression-elements.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,stress,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({typed,profile,noGc,stress,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect({typed,profile,noGc,stress,...observation}).toMatchObject({typed,profile,noGc,stress,kind:'normal',scenarioId:'property/class-expression-elements.js#module'});
   expect({typed,profile,noGc,stress,lines:(observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')}).toEqual({typed,profile,noGc,stress,lines:expected.get(`${profile}-${stress}-${typed}`)!});
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

test('Protected class constructor descriptors preserve abrupt definition',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-class-element-abrupt-'));
 const source=`const host=globalThis;host.print('before');class Unused {static get ['prototype'](){return 1;}}host.print('after');`;
 try{
  const reference=Bun.spawnSync(['node','-e','globalThis.print=value=>require("node:fs").writeSync(1,String(value)+"\\n");'+source],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect(reference.exitCode).toBe(1);expect(reference.stdout.toString()).toBe('before\n');expect(reference.stderr.toString()).toContain('TypeError');
  for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const input=profile?source:source.replaceAll('host.print','console.log');await fs.writeFile(entry,typed?'// @ts-nocheck\n'+input:input);
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/class-element-abrupt.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   if(profile){expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});expect(parseHostObservation(JSON.parse(native.stdout.toString()))).toMatchObject({kind:'throw',phase:'runtime',errorConstructor:'TypeError',stdout:'before\n'});}
   else{expect(native.exitCode).toBe(1);expect(native.stdout.toString()).toBe('before\n');expect(native.stderr.toString()).toContain('TypeError');}
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

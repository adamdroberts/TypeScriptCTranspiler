import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(profile:boolean,noGc:boolean,stress:boolean):string {
 const protocols=['async','generator','async-generator'],placements=['body','block','switch'],forms=['declaration','named-expression','anonymous-expression'];
 const factories=protocols.flatMap((protocol,p)=>placements.flatMap((placement,b)=>forms.map((form,f)=>{
  const name=`make${p}${b}${f}`,inner=form==='declaration'?'Local':form==='named-expression'?'Named':null;
  const members=`[key](input:any=label):any{return input;}get current():any{return label;}static self():any{return ${inner??'this'};}static immutable():any{${inner?`try{${inner}=17;}catch(error){return error instanceof TypeError;}return false;`:'return true;'}}static async later():Promise<any>{await Promise.resolve(0);collect();return ${inner??'this'};} *sequence():any{yield label;collect();return label;}`;
  const definition=form==='declaration'?`class Local {${members}}const saved=Local;Local=Symbol('replacement');`:`let Constructor:any=class ${inner??''} {${members}};const saved=Constructor;Constructor=Symbol('replacement');`;
  const result=protocol==='async'?'return saved;':'yield saved;';const body=definition+result;
  return `${p===0?'async function':p===1?'function*':'async function*'} ${name}(key:any,label:any):any{${p===0?'await Promise.resolve(0);':'yield "pause";'}${placement==='block'?'{'+body+'}':placement==='switch'?'switch(1){case 1:'+body+'}':body}}`;
 }))).join('\n');
 const formals=protocols.map((protocol,index)=>`${index===0?'async function':index===1?'function*':'async function*'} formal${index}([cls=class {read():any{return value;}async later():Promise<any>{await Promise.resolve(0);collect();return value;}},explicit=class X {},override=class {static name(){}}],{owner:{value}},...tail:any[]):any{${protocol==='async'?'await Promise.resolve(0);':'yield "pause";'}const read=()=>[value,tail];${protocol==='async'?'return':'yield'} [cls,explicit,override,value,tail,read];}`).join('\n');
 const depth=stress?512:8,nesting=stress?256:2,binding='{next:'.repeat(nesting)+'label'+'}'.repeat(nesting);
 return `// @ts-nocheck
 export {};
 const host=globalThis;
 function output(value:any):void{${profile?'host.print':'console.log'}(value);}
 function collect():void{${profile&&!noGc?'host.$262.gc();':''}}
 function check(value:boolean,label:string):void{if(!value)throw label;output(label+':true');}
 ${factories}
 ${formals}
 const factories:any[]=[${protocols.flatMap((protocol,p)=>placements.flatMap((_,b)=>forms.map((_,f)=>`{protocol:'${protocol}',factory:make${p}${b}${f}}`))).join(',')}];
 function* forward(label:any):any{const read=()=>Later;yield read;class Later {read():any{return label;}static self():any{return Later;}}yield Later;}
 async function abrupt(key:any):Promise<any>{await Promise.resolve(0);class Failed {[((innerRead=()=>Failed),key)](){}}return Failed;}
 async function protectedDefinition():Promise<any>{await Promise.resolve(0);class Unused {static get ['prototype'](){return 1;}[laterKeys++](){}}return Unused;}
 async function* repeated(label:any):any{for(let index=0;index<4;index++){await Promise.resolve(0);class Iteration {read():any{return index;}static self():any{return Iteration;}static async later():Promise<any>{await Promise.resolve(0);return Iteration;}}yield Iteration;}}
 let innerRead:any,laterKeys=0;const retainedKeys:any[]=[];
 function retainedKey(index:number):any{collect();const key=Symbol('retained-'+index);retainedKeys.push(key);return key;}
 async function deep(${binding}:any):Promise<any>{await Promise.resolve(0);class Deep {${Array.from({length:depth},(_,index)=>`[retainedKey(${index})](input:any=label):any{return input;}`).join('')}static self():any{return Deep;}static async later():Promise<any>{await Promise.resolve(0);collect();return Deep;}}const saved=Deep;Deep=Symbol('replacement');await Promise.resolve(0);collect();return saved;}
 async function verify():Promise<void>{
  const key=Symbol('member'),label=Symbol('captured');let valid=true;
  for(let index=0;index<factories.length;index++){
   const {protocol,factory}=factories[index],activation=factory(key,label);let Constructor:any;
   if(protocol==='async')Constructor=await activation;else if(protocol==='generator'){check(activation.next().value==='pause','generator-pause');Constructor=activation.next().value;}else{check((await activation.next()).value==='pause','async-generator-pause');Constructor=(await activation.next()).value;}
   const owner=new Constructor(),descriptor=Object.getOwnPropertyDescriptor(Constructor.prototype,key);collect();
   valid=valid&&Constructor.self()===Constructor&&Constructor.immutable()&&owner[key]()===label&&owner.current===label&&descriptor.value.name==='[member]'&&descriptor.writable&&!descriptor.enumerable&&descriptor.configurable;
   check(await Constructor.later()===Constructor,'method-continuation-retains-inner-name');const iterator=owner.sequence();check(iterator.next().value===label&&iterator.next().value===label,'member-generator-captures-active-value');
  }
  check(valid,'resumed-class-forms-and-scope-cells');
  const formals:any[]=[{protocol:'async',factory:formal0},{protocol:'generator',factory:formal1},{protocol:'async-generator',factory:formal2}];
  for(const {protocol,factory} of formals){const activation=factory([],{owner:{value:label}},key,label);let actual:any;if(protocol==='async')actual=await activation;else if(protocol==='generator'){activation.next();actual=activation.next().value;}else{await activation.next();actual=(await activation.next()).value;}const Constructor:any=actual[0],owner=new Constructor();collect();const observed=actual[5]();check(Constructor.name==='cls'&&actual[1].name==='X'&&typeof actual[2].name==='function'&&actual[3]===label&&actual[4][0]===key&&actual[4][1]===label&&observed[0]===label&&observed[1]===actual[4]&&owner.read()===label&&await owner.later()===label,'resumed-pattern-formals-and-default-class-captures');}

  const before=forward(label),read=before.next().value;let tdz=false;try{read();}catch(error){tdz=error instanceof ReferenceError;}const Later:any=before.next().value,late=new Later();collect();check(tdz&&read()===Later&&Later.self()===Later&&late.read()===label,'resumed-class-forward-tdz');
  const marker=Symbol('abrupt'),keyFailure={ [Symbol.toPrimitive](){throw marker;}};let caught:any;try{await abrupt(keyFailure);}catch(error){caught=error;}let innerTdz=false;try{innerRead();}catch(error){innerTdz=error instanceof ReferenceError;}check(caught===marker&&innerTdz,'resumed-abrupt-definition-inner-tdz');
  let protectedKey=false;try{await protectedDefinition();}catch(error){protectedKey=error instanceof TypeError;}check(protectedKey&&laterKeys===0,'resumed-unused-protected-definition');
  const sequence=repeated(label),owners:any[]=[];for(let index=0;index<4;index++){const Constructor:any=(await sequence.next()).value,owner=new Constructor();owners.push(Constructor);collect();check(owner.read()===index&&Constructor.self()===Constructor&&await Constructor.later()===Constructor&&(index===0||Constructor!==owners[index-1]),'resumed-loop-class-fresh-cell');}
  let parameter:any=label;for(let depth=0;depth<${nesting};depth++)parameter={next:parameter};const Deep:any=await deep(parameter),retained=new Deep();let chain:any={owner:retained,Constructor:Deep,keys:retainedKeys};for(let depth=0;depth<${stress?8192:8};depth++)chain={previous:chain};await Promise.resolve(0);collect();for(let depth=0;depth<${stress?8192:8};depth++)chain=chain.previous;
  valid=chain.Constructor.self()===chain.Constructor&&await chain.Constructor.later()===chain.Constructor;for(let index=0;index<chain.keys.length;index++){const method=chain.owner[chain.keys[index]];valid=valid&&method()===label&&method.name==='[retained-'+index+']';}check(valid,'deep-resumed-class-owner-graph');
 }
 verify().catch((error:any)=>{output('failure:'+String(error));throw error;});
 `;
}

test('Resumed class definitions retain scope and immutable inner names',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-resumed-class-definition-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try{
  const plans=[true,false].flatMap(typed=>[false,true].flatMap(profile=>[false,true].map(noGc=>({typed,profile,noGc,stress:false}))));plans.push({typed:true,profile:true,noGc:false,stress:true});
  const expected=new Map<string,string[]>();
  for(const key of new Set(plans.map(plan=>`${plan.profile}-${plan.stress}-${plan.typed}`))){
   const [profile,stress]=key.split('-').map(value=>value==='true');
   const entry=path.join(temporary,`reference-${key}.mjs`);await fs.writeFile(entry,erase(subject(profile!,true,stress!)));
   const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");globalThis.print=console.log;import(process.argv[1]);',entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const lines=reference.stdout.toString().trimEnd().split('\n');expect(lines.at(-1)).toBe('deep-resumed-class-owner-graph:true');expected.set(key,lines);
  }
  for(const {typed,profile,noGc,stress} of plans){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}-${stress}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(profile,noGc,stress);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/resumed-class-definition.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,stress,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({typed,profile,noGc,stress,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect({typed,profile,noGc,stress,...observation}).toMatchObject({typed,profile,noGc,stress,kind:'normal',scenarioId:'property/resumed-class-definition.js#module'});
   expect({typed,profile,noGc,stress,lines:(observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')}).toEqual({typed,profile,noGc,stress,lines:expected.get(`${profile}-${stress}-${typed}`)!});
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

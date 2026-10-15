import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(profile:boolean,noGc:boolean,stress:boolean):string {
 const protocols=['plain','async','generator','async-generator'],forms=['declaration','named-expression','anonymous-expression'];
 const factories=protocols.flatMap(protocol=>forms.map(form=>{
  const name=`make_${protocol.replaceAll('-','_')}_${form.replaceAll('-','_')}`,inner=form==='declaration'?'Local':form==='named-expression'?'Named':'this';
  const members=`[key]=value;uninitialized:any;deferred=()=>[this,new.target,value];static original=${inner};static {this.fromBlock=value;}static reader=()=>${inner};read():any{return this[key];}`;
  const definition=form==='declaration'?`class Local {${members}}const Saved=Local;Local=Symbol('outer');`:`const Saved=class ${form==='named-expression'?'Named':''} {${members}};`;
  return {protocol,name,source:`${protocol==='plain'?'function':protocol==='async'?'async function':protocol==='generator'?'function*':'async function*'} ${name}(key:any,value:any):any{${protocol==='plain'?'':protocol==='async'?'await Promise.resolve(0);':'yield "pause";'}${definition}${protocol==='plain'||protocol==='async'?'return':'yield'} Saved;}`};
 }));
 return `// @ts-nocheck
 const host=globalThis;
 function output(value:any):void{${profile?'host.print':'console.log'}(value);}
 function collect():void{${profile&&!noGc?'host.$262.gc();':''}}
 function check(value:boolean,label:string):void{if(!value)throw label;output(label+':true');}
 ${factories.map(factory=>factory.source).join('\n')}
 const factories:any[]=[${factories.map(factory=>`{protocol:'${factory.protocol}',factory:${factory.name}}`).join(',')}];
 const label=Symbol('label'),key=Symbol('member'),events:any[]=[];let valid=true;
 function namedKey(name:any):any{events.push('key');collect();return name;}
 function initializer(value:any):any{events.push('initializer');collect();return value;}
 function ordered(value:any):any{return class Named {
  [namedKey(key)]=initializer(value);
  static [namedKey('first')]=initializer(value);
  static {events.push('block');this.same=Named;var local=Symbol('block');this.blockRead=()=>local;}
  [namedKey(key)]=initializer(label);
  static {events.push('second-block');this.localType=typeof local;}
  static [namedKey('last')]=initializer(value);
  before=this.after;
  after=value;
  ['__proto__']=value;
  [namedKey(Symbol.for('callable'))]=()=>value;
  static [namedKey(Symbol.for('static-callable'))]=function(){};
  [namedKey(Symbol.for('class'))]=class {static observed=this.name;};
  overridden=class {static name(){return value;}};
  read():any{return this[key];}
 };}
 const Ordered:any=ordered(label);const firstInitializer=events.indexOf('initializer');check(firstInitializer>0&&events.slice(0,firstInitializer).every(value=>value==='key')&&events.slice(firstInitializer).join(',')==='initializer,block,second-block,initializer','all-keys-before-ordered-static-initialization');
 const blockValue=Ordered.blockRead();events.length=0;const first:any=new Ordered(),second:any=new Ordered();collect();
 const descriptor=Object.getOwnPropertyDescriptor(first,key),callable=first[Symbol.for('callable')];
 check(events.join(',')==='initializer,initializer,initializer,initializer'&&first!==second&&first[key]===label&&descriptor.value===label&&descriptor.writable&&descriptor.enumerable&&descriptor.configurable&&first.before===undefined&&first.after===label&&Object.hasOwn(first,'__proto__')&&first.__proto__===label&&Object.getPrototypeOf(first)===Ordered.prototype&&callable.name==='[callable]'&&callable()===label&&Ordered[Symbol.for('static-callable')].name==='[static-callable]'&&first[Symbol.for('class')].name==='[class]'&&first[Symbol.for('class')].observed==='[class]'&&first.overridden.name()===label&&Ordered.same===Ordered&&Ordered.localType==='undefined'&&Ordered.blockRead()===blockValue,'instance-list-replay-descriptors-names-and-block-scope');
 const stopped=Symbol('stopped');let caught:any,escaped:any,steps:any[]=[];
 try{const Rejected=class Named {static first=(()=>{steps.push('first');escaped=()=>Named;throw stopped;})();static {steps.push('later');}static last=steps.push('last');};}catch(error){caught=error;}
 check(caught===stopped&&steps.join(',')==='first'&&typeof escaped()==='function','abrupt-static-initializer-keeps-initialized-inner-binding');
 steps=[];caught=undefined;
 const Throwing:any=class {first=steps.push('first');failure=(()=>{throw stopped;})();later=steps.push('later');};try{new Throwing();}catch(error){caught=error;}
 check(caught===stopped&&steps.join(',')==='first','abrupt-instance-initializer-stops-list');
 function transientOwner(value:any):any{return class {[Symbol('transient')]=()=>value;static {collect();}};}const Transient:any=transientOwner(label);collect();const transient:any=new Transient(),transientKeys=Object.getOwnPropertySymbols(transient);check(transientKeys.length===1&&transient[transientKeys[0]].name==='[transient]'&&transient[transientKeys[0]]()===label,'retained-key-without-an-external-symbol-owner');
 const retainedKeys:any[]=[];
 function retainedKey(index:number):any{collect();const result=Symbol('retained-'+index);retainedKeys.push(result);return result;}
 function deep(value:any):any{return class Deep {${Array.from({length:stress?512:8},(_,index)=>`[retainedKey(${index})]=()=>[Deep,this,value];`).join('\n')}};}
 async function main():Promise<void>{
  for(const row of factories){let Constructor:any;if(row.protocol==='plain')Constructor=row.factory(key,label);else if(row.protocol==='async')Constructor=await row.factory(key,label);else if(row.protocol==='generator'){const iterator=row.factory(key,label);iterator.next();Constructor=iterator.next().value;}else{const iterator=row.factory(key,label);await iterator.next();Constructor=(await iterator.next()).value;}
   const owner:any=new Constructor(),deferred=owner.deferred();collect();
   valid=valid&&owner.read()===label&&Object.hasOwn(owner,'uninitialized')&&owner.uninitialized===undefined&&Constructor.original===Constructor&&Constructor.reader()===Constructor&&Constructor.fromBlock===label&&deferred[0]===owner&&deferred[1]===undefined&&deferred[2]===label;
  }
  check(valid,'dynamic-fields-captures-and-suspending-factories');
  const Deep:any=deep(label),owner:any=new Deep();let node:any={owner,keys:retainedKeys,Deep};for(let depth=0;depth<${stress?8192:8};depth++)node={previous:node};collect();for(let depth=0;depth<${stress?8192:8};depth++)node=node.previous;
  valid=true;for(const key of node.keys){const result=node.owner[key]();valid=valid&&result[0]===node.Deep&&result[1]===node.owner&&result[2]===label;}
  check(valid,'deep-dynamic-class-element-owner-graph');
 }main();
 `;
}

test('Dynamic class initialization uses one retained ordered element list',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-dynamic-class-initialization-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try{
  const plans=[true,false].flatMap(typed=>[false,true].flatMap(profile=>[false,true].map(noGc=>({typed,profile,noGc,stress:false}))));plans.push({typed:true,profile:true,noGc:false,stress:true});
  const expected=new Map<string,string[]>();
  for(const key of new Set(plans.map(plan=>`${plan.profile}-${plan.stress}-${plan.typed}`))){
   const [profile,stress]=key.split('-').map(value=>value==='true');
   const entry=path.join(temporary,`reference-${key}.mjs`);await fs.writeFile(entry,erase(subject(profile!,true,stress!)));
   const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");globalThis.print=console.log;import(process.argv[1]);',entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const lines=reference.stdout.toString().trimEnd().split('\n');expect(lines.at(-1)).toBe('deep-dynamic-class-element-owner-graph:true');expected.set(key,lines);
  }
  for(const {typed,profile,noGc,stress} of plans){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}-${stress}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(profile,noGc,stress);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/dynamic-class-initialization.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,stress,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({typed,profile,noGc,stress,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect({typed,profile,noGc,stress,...observation}).toMatchObject({typed,profile,noGc,stress,kind:'normal',scenarioId:'property/dynamic-class-initialization.js#module'});
   expect({typed,profile,noGc,stress,lines:(observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')}).toEqual({typed,profile,noGc,stress,lines:expected.get(`${profile}-${stress}-${typed}`)!});
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

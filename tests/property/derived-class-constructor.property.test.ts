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
  const name=`make_${protocol.replaceAll('-','_')}_${form.replaceAll('-','_')}`,inner=form==='declaration'?'Local':form==='named-expression'?'Named':'new.target';
  const members=`field=(events.push('derived-field'),label);constructor([value=label]:any[]=[],...tail:any[]){const reader=()=>[this,new.target,${inner},arguments];super(value,...tail);events.push('derived-body');this.reader=reader;this.inner=${inner};this.superReader=()=>super.read();}`;
  const definition=form==='declaration'?`class Local extends Base {${members}}const Saved=Local;Local=Symbol('outer');`:`const Saved=class ${form==='named-expression'?'Named':''} extends Base {${members}};`;
  return {protocol,name,source:`${protocol==='plain'?'function':protocol==='async'?'async function':protocol==='generator'?'function*':'async function*'} ${name}(Base:any,label:any):any{${protocol==='plain'?'':protocol==='async'?'await Promise.resolve(0);':'yield "pause";'}${definition}${protocol==='plain'||protocol==='async'?'return':'yield'} Saved;}`};
 }));
 return `// @ts-nocheck
 "use strict";
 const host=globalThis;function output(value:any):void{${profile?'host.print':'console.log'}(value)}
 function collect():void{${profile&&!noGc?'host.$262.gc();':''}}
 function check(value:any,label:string):void{if(!value)throw label;output(label+':true')}
 const events:any[]=[];
 function makeBase():any{return class Base{base=(events.push('base-field'),1);constructor(value:any,...tail:any[]){events.push('base-body');this.value=value;this.tail=tail;this.target=new.target}read(){return this.value}}}
 ${factories.map(row=>row.source).join('\n')}
 const factories:any[]=[${factories.map(row=>`{protocol:'${row.protocol}',factory:${row.name}}`).join(',')}];
 class NativeBase {base=1;value:any;observed:any;constructor(value:any){this.value=value;this.observed=Object.getPrototypeOf(this)}}
 async function main():Promise<void>{
 const label=Symbol('retained-label'),Base=makeBase();
 for(const row of factories){let Derived:any;if(row.protocol==='plain')Derived=row.factory(Base,label);else if(row.protocol==='async')Derived=await row.factory(Base,label);else{const iterator=row.factory(Base,label);const first=row.protocol==='generator'?iterator.next():await iterator.next();const last=row.protocol==='generator'?iterator.next():await iterator.next();Derived=last.value;}
  events.length=0;const owner=new Derived(undefined,7,8),read=owner.reader();collect();
  check(owner.value===label&&owner.field===label&&owner.base===1&&owner.tail.join(',')==='7,8'&&owner.target===Derived&&read[0]===owner&&read[1]===Derived&&read[2]===Derived&&read[3].length===3&&owner.superReader()===label&&events.join(',')==='base-field,base-body,derived-field,derived-body','derived-formals-'+row.protocol);
  check(Object.getPrototypeOf(Derived)===Base&&Object.getPrototypeOf(Derived.prototype)===Base.prototype&&owner instanceof Base&&owner instanceof Derived,'heritage-prototypes-'+row.protocol);
 }
 function makeDefault(Base:any):any{return class extends Base{extra=3}}
 const Default=makeDefault(Base),defaultOwner=new Default(label,4,5);check(defaultOwner.value===label&&defaultOwner.tail.join(',')==='4,5'&&defaultOwner.extra===3&&Default.length===0,'default-derived-actual-list');
 const NativeDerived=makeDefault(NativeBase),native=new NativeDerived(11);check(native.value===11&&native.extra===3&&native.observed===NativeDerived.prototype&&native instanceof NativeDerived,'native-base-actual-receiver');
 const ArrayDerived=makeDefault(Array),array=new ArrayDerived(label,2);check(Array.isArray(array)&&array.length===2&&array[0]===label&&array.extra===3&&array instanceof ArrayDerived,'exotic-array-base');
 const MapDerived=makeDefault(Map),map=new MapDerived([['key',label]]);check(map.get('key')===label&&map.extra===3&&map instanceof MapDerived,'exotic-map-base');
 const PromiseDerived=makeDefault(Promise),promise=new PromiseDerived((resolve:any)=>resolve(23));const promised=await promise;check(promised===23&&promise.extra===3&&promise instanceof PromiseDerived,'exotic-promise-base');
 const ProxyDerived=makeDefault(new Proxy(Base,{})),proxied=new ProxyDerived(label);check(proxied.value===label&&proxied.target===ProxyDerived&&proxied.extra===3&&proxied instanceof ProxyDerived,'proxy-super-constructor');
 function Alternate():void{}const alternate=Reflect.construct(Default,[label],Alternate);check(Object.getPrototypeOf(alternate)===Alternate.prototype&&alternate.target===Alternate&&alternate.extra===3,'alternate-new-target');
 const parentEffects:any[]=[];let observedTarget:any;
 function replacement(value:any):void{parentEffects.push('replacement');observedTarget=new.target;this.value=value}
 Object.setPrototypeOf(Default,replacement);const replaced=new Default(13);check(replaced.value===13&&replaced.extra===3&&observedTarget===Default&&parentEffects.join(',')==='replacement','live-super-constructor');
 Object.setPrototypeOf(Default,{});let nonConstructor=false;try{new Default((parentEffects.push('argument'),1))}catch(e){nonConstructor=e instanceof TypeError}check(nonConstructor&&parentEffects.at(-1)==='argument','super-validation-after-arguments');
 for(const value of [undefined,1,Symbol('bad'),{},()=>0]){let error=false;try{const bad=class extends value {}}catch(e){error=e instanceof TypeError}check(error,'invalid-heritage')}
 let prototypeError=false;function Invalid():void{}Object.defineProperty(Invalid,'prototype',{value:1});try{const bad=class extends Invalid {}}catch(e){prototypeError=e instanceof TypeError}check(prototypeError,'invalid-superclass-prototype');
 let innerTdz=false;try{const bad=class Inner extends Inner {}}catch(e){innerTdz=e instanceof ReferenceError}check(innerTdz,'heritage-inner-name-tdz');
 function makeReturn(value:any,initialize:boolean):any{return class extends Base {field=4;constructor(){if(initialize)super(2);return value}}}
 for(const initialized of [false,true])for(const returned of [{marker:1},[],function(){}]){const Returning=makeReturn(returned,initialized);check(new Returning()===returned,'derived-object-return')}
 for(const returned of [null,true,1,1n,'text',Symbol('primitive')]){const Returning=makeReturn(returned,true);let error=false;try{new Returning()}catch(e){error=e instanceof TypeError}check(error,'derived-primitive-return')}
 const Missing=makeReturn(undefined,false);let missing=false;try{new Missing()}catch(e){missing=e instanceof ReferenceError}check(missing,'undefined-without-super');
 function makeEarly(Base:any):any{return class extends Base {constructor(value:any=this){super(value)}}}let early=false;try{new (makeEarly(Base))()}catch(e){early=e instanceof ReferenceError}check(early,'parameter-this-before-super');
 function makeDuplicate(Base:any):any{return class extends Base {field=(events.push('duplicate-field'),1);constructor(){super(1);super(2)}}}events.length=0;let duplicate=false;try{new (makeDuplicate(Base))()}catch(e){duplicate=e instanceof ReferenceError}check(duplicate&&events.join(',')==='base-field,base-body,duplicate-field,base-field,base-body','duplicate-super-after-base-effects');
 function makeNull():any{return class extends null {constructor(){return {marker:1}}}}const Null=makeNull();check(Object.getPrototypeOf(Null.prototype)===null&&new Null().marker===1,'null-heritage-explicit-object');
 const NullDefault=class extends null {};let nullDefault=false;try{new NullDefault()}catch(e){nullDefault=e instanceof TypeError}check(nullDefault,'null-heritage-default-error');
 function makeDeferred(Base:any):any{return class Deferred extends Base {field=6;constructor(){const read=()=>this;const initialize=async()=>{await Promise.resolve(0);super(await Promise.resolve(19));return read()};return {read,initialize}}}}
 const Deferred=makeDeferred(Base),deferred=new Deferred();let unbound=false;try{deferred.read()}catch(e){unbound=e instanceof ReferenceError}const later=await deferred.initialize();collect();check(unbound&&later.value===19&&later.field===6&&deferred.read()===later,'retained-uninitialized-this');
 function makeLayer(Parent:any,index:any):any{return class Layer extends Parent {level=index;reader=()=>this}}
 let Deep:any=Base;for(let i=0;i<${stress?256:2};i++)Deep=makeLayer(Deep,i);let owner:any={Deep,instance:new Deep(label)};for(let i=0;i<${stress?8192:2};i++)owner={owner};collect();for(let i=0;i<${stress?8192:2};i++)owner=owner.owner;
 check(owner.instance.value===label&&owner.instance.level===${stress?255:1}&&owner.instance.reader()===owner.instance&&owner.instance instanceof owner.Deep&&owner.instance.target===owner.Deep,'deep-derived-constructor-owner-graph');
 }main();
 `;
}

test('Derived classes share heritage and retained constructor Environment Records',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-derived-class-constructor-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try{
  const plans=[true,false].flatMap(typed=>[false,true].flatMap(profile=>[false,true].map(noGc=>({typed,profile,noGc,stress:false}))));plans.push({typed:true,profile:true,noGc:false,stress:true});
  const expected=new Map<string,string[]>();
  for(const key of new Set(plans.map(plan=>`${plan.profile}-${plan.stress}-${plan.typed}`))){
   const [profile,stress]=key.split('-').map(value=>value==='true');
   const entry=path.join(temporary,`reference-${key}.mjs`);await fs.writeFile(entry,erase(subject(profile!,true,stress!)));
   const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");globalThis.print=console.log;import(process.argv[1]);',entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const lines=reference.stdout.toString().trimEnd().split('\n');expect(lines.at(-1)).toBe('deep-derived-constructor-owner-graph:true');expected.set(key,lines);
  }
  for(const {typed,profile,noGc,stress} of plans){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}-${stress}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(profile,noGc,stress);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/derived-class-constructor.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,stress,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({typed,profile,noGc,stress,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect({typed,profile,noGc,stress,...observation}).toMatchObject({typed,profile,noGc,stress,kind:'normal',scenarioId:'property/derived-class-constructor.js#module'});
   expect({typed,profile,noGc,stress,lines:(observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')}).toEqual({typed,profile,noGc,stress,lines:expected.get(`${profile}-${stress}-${typed}`)!});
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

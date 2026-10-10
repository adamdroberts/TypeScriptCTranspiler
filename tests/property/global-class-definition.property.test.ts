import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(profile:boolean,collect:boolean,stress:boolean):string {
 return `"use strict";
 const host=globalThis;function output(value){${profile?'host.print':'console.log'}(value)}
 function check(value,label){if(!value)throw label;output(label+':true')}
 function gc(){${collect?'host.$262.gc();':''}}
 const events=[],key=Symbol('field'),label=Symbol('label');
 class Base {base=(events.push('base-field'),label);constructor(value,...tail){events.push('base-body');this.value=value;this.tail=tail;this.target=new.target;this.observed=Object.getPrototypeOf(this)}read(){return this.value}}
 class Derived extends Base {static [key]=Derived;static {events.push('static')}[key]=(events.push('derived-field'),label);constructor([value=label]=[],...tail){const reader=()=>[this,new.target,Derived,arguments];super(value,...tail);events.push('derived-body');this.reader=reader}read(){return super.read()}get item(){return this.value}set item(value){this.value=value}}
 const Saved=Derived;Derived=Symbol('outer');gc();
 const owner=new Saved([],1,2),reader=owner.reader();
 check(owner[key]===label&&owner.value===label&&owner.tail.join(',')==='1,2'&&reader[0]===owner&&reader[1]===Saved&&reader[2]===Saved&&reader[3].length===3&&Saved[key]===Saved,'bindings-and-activation');
 check(events.join(',')==='static,base-field,base-body,derived-field,derived-body'&&owner.observed===Saved.prototype&&owner instanceof Base&&Object.getPrototypeOf(Saved)===Base,'element-order-and-prototypes');
 owner.item=17;const borrowed={value:23};check(owner.item===17&&owner.read()===17&&Saved.prototype.read.call(borrowed)===23,'method-home-and-receiver');
 class Forward extends Base {}
 for(const values of [[],[1],[1,2,3,4,5]]){const result=new Forward(...values);check(result.value===values[0]&&result.tail.join(',')===values.slice(1).join(','),'default-actual-list')}
 class ObjectReturn extends Base {constructor(){return {returned:true}}}
 class PrimitiveReturn extends Base {constructor(){return 1}}
 class Unbound extends Base {constructor(){return undefined}}
 class EarlyThis extends Base {constructor(value=this){super(value)}}
 check(new ObjectReturn().returned,'object-return');
 for(const [Ctor,ErrorType] of [[PrimitiveReturn,TypeError],[Unbound,ReferenceError],[EarlyThis,ReferenceError]]){let caught=false;try{new Ctor()}catch(error){caught=error instanceof ErrorType}check(caught,'constructor-abrupt')}
 function Alternate(){}const alternate=Reflect.construct(Saved,[[31]],Alternate);check(alternate.value===31&&Object.getPrototypeOf(alternate)===Alternate.prototype&&alternate.reader()[1]===Alternate,'actual-new-target');
 let escaped;class Escaped extends Base {constructor(){escaped=()=>super(37);return {placeholder:true}}}new Escaped();gc();check(escaped().value===37,'escaped-constructor-environment');
 ${stress?Array.from({length:256},(_,index)=>`class Deep${index} extends ${index?'Deep'+(index-1):'Base'} {field${index}=label}`).join('\n')+'\nconst deep=new Deep255(41);for(let index=0;index<256;index++)if(deep["field"+index]!==label)throw index;gc();check(deep.value===41&&deep.field255===label,"deep-class-definition-owner-graph");':''}
 `;
}

test('global declarations share class definition semantics across source records',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-global-class-'));
 try {
  const plans=['script','module','commonjs'].flatMap(mode=>[false,true].map(noGc=>({mode,noGc,stress:false})));
  plans.push({mode:'script',noGc:false,stress:true});
  for(const {mode,noGc,stress} of plans){
   const profile=mode==='script',directory=path.join(temporary,`${mode}-${noGc}-${stress}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='module'?'main.mjs':mode==='commonjs'?'main.cjs':'main.js'),output=path.join(directory,'program');
   const source=subject(profile,profile&&!noGc,stress);await fs.writeFile(entry,source);
   const oracle=Bun.spawnSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");globalThis.print=console.log;globalThis.$262={gc(){}};if(process.argv[2]==="script")vm.runInThisContext(fs.readFileSync(process.argv[1],"utf8"));else import(process.argv[1]);',entry,mode],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({mode,stress,exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({mode,stress,exitCode:0,stderr:''});
   const diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/global-class-definition.js#strict',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({mode,noGc,stress,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({mode,noGc,stress,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({mode,noGc,stress,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({mode,noGc,stress,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
   if(observation)expect(observation).toMatchObject({kind:'normal',scenarioId:'property/global-class-definition.js#strict'});
   expect({mode,noGc,stress,stdout:observation?observation.stdout:native.stdout.toString()}).toEqual({mode,noGc,stress,stdout:oracle.stdout.toString()});
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

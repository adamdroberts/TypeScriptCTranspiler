import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(profile:boolean,collect:boolean,stress:boolean):string {
 const protocols=['async','generator','async-generator'],forms=['declaration','named-expression','anonymous-expression'];
 const suspend=(protocol:string,source:string)=>protocol==='async'?`await Promise.resolve(${source})`:protocol==='generator'?`yield ${source}`:`await (yield ${source})`;
 const factories=protocols.flatMap(protocol=>forms.map(form=>{
  const name=`make_${protocol.replaceAll('-','_')}_${form.replaceAll('-','_')}`,inner=form==='declaration'?'Local':form==='named-expression'?'Named':'Ctor';
  const members=`[${suspend(protocol,`key('method',keys[0],()=>${inner})`)}](){return [${inner},label,super.read()]}static [${suspend(protocol,`key('static',keys[1],()=>${inner})`)}](){return ${inner}}[${suspend(protocol,`key('field',keys[2],()=>${inner})`)}]=(events.push('instance'),label);static [${suspend(protocol,`key('static-field',keys[3],()=>${inner})`)}]=(events.push('static-field'),${form==='anonymous-expression'?'label':inner});static {events.push('static-block')}constructor(value=label){super(value);this.inner=()=>${inner}}`;
  const definition=form==='declaration'?`class Local extends (${suspend(protocol,'Base')}) {${members}}const Ctor=Local;Local=Symbol('outer');`:`const Ctor=class ${form==='named-expression'?'Named':''} extends (${suspend(protocol,'Base')}) {${members}};`;
  return {protocol,form,name,source:`${protocol==='async'?'async function':protocol==='generator'?'function*':'async function*'} ${name}(Base:any,label:any,keys:any[]):any{const readers:any[]=[];function key(tag:any,value:any,reader:any):any{events.push(tag);let tdz=false;try{reader()}catch(error){tdz=error instanceof ReferenceError}if(!tdz)throw 'class-name-tdz';readers.push(reader);return {[Symbol.toPrimitive](){events.push('coerce-'+tag);return value}}}${definition}return {Ctor,readers}}`};
 }));
 return `// @ts-nocheck
 "use strict";const host=globalThis;function output(value:any):void{${profile?'host.print':'console.log'}(value)}function gc():void{${collect?'host.$262.gc();':''}}function check(value:any,label:any):void{if(!value)throw label;output(label+':true')}
 const events:any[]=[];function makeBase():any{return class Base{constructor(value:any){this.value=value;this.target=new.target}read(){return this.value}}}
 ${factories.map(row=>row.source).join('\n')}
 const factories:any[]=[${factories.map(row=>`{protocol:'${row.protocol}',form:'${row.form}',factory:${row.name}}`).join(',')}];
 async function obtain(row:any,Base:any,label:any,keys:any[]):Promise<any>{if(row.protocol==='async')return row.factory(Base,label,keys);const iterator=row.factory(Base,label,keys);let step=await iterator.next();while(!step.done){gc();step=await iterator.next(step.value)}return step.value}
 async function main():Promise<void>{
 const Base=makeBase(),label=Symbol('retained'),keys=[Symbol('method'),Symbol('static'),Symbol('field'),Symbol('static-field')];
 for(const row of factories){events.length=0;const {Ctor,readers}=await obtain(row,Base,label,keys);gc();const owner=new Ctor();const read=owner[keys[0]]();check(read[0]===Ctor&&read[1]===label&&read[2]===label&&owner.inner()===Ctor&&readers.every(reader=>reader()===Ctor)&&Ctor[keys[1]]()===Ctor&&owner[keys[2]]===label&&Ctor[keys[3]]===(row.form==='anonymous-expression'?label:Ctor),'retained-class-bindings');check(events.join(',')==='method,coerce-method,static,coerce-static,field,coerce-field,static-field,coerce-static-field,static-field,static-block,instance'&&Object.getPrototypeOf(Ctor)===Base&&owner instanceof Base&&owner.target===Ctor,'ordered-definition-stages')}
 let escaped:any;async function abrupt():Promise<any>{try{class Unfinished{[await Promise.resolve((escaped=()=>Unfinished,'first'))](){return 1}[await Promise.reject(label)](){return 2}static {events.push('unexpected-static')}}}finally{events.push('definition-finally')}}
 events.length=0;let rejected=false;try{await abrupt()}catch(error){rejected=error===label}gc();let uninitialized=false;try{escaped()}catch(error){uninitialized=error instanceof ReferenceError}check(rejected&&uninitialized&&events.join(',')==='definition-finally','abrupt-definition-and-inner-tdz');
 let exposed:any;function* abandon():any{class Unfinished{[yield (exposed=()=>Unfinished,'pause')](){return 1}static {events.push('unexpected-static')}}return Unfinished}
 const iterator=abandon();iterator.next();iterator.return(0);gc();let abandoned=false;try{exposed()}catch(error){abandoned=error instanceof ReferenceError}check(abandoned&&events.join(',')==='definition-finally','abandoned-definition-owner');
 ${stress?`function* deep():any{return class Deep {${Array.from({length:256},(_,index)=>`[yield ${index}](){return [Deep,label]}`).join('\n')}}}const deepIterator=deep();let deepStep=deepIterator.next();while(!deepStep.done){gc();deepStep=deepIterator.next(deepStep.value)}const Deep=deepStep.value,owners:any[]=[];for(let index=0;index<8192;index++)owners.push(new Deep());gc();let retained=true;for(let index=0;index<256;index++){const read=owners[index][index]();retained&&=read[0]===Deep&&read[1]===label}check(retained&&owners[8191][255]()[0]===Deep,'deep-resumable-definition-owner-graph');`:`check(true,'deep-resumable-definition-owner-graph');`}
 }main();`;
}
function erase(source:string):string{return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText}

test('class definitions retain ordered stages and inner binding records through suspension',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-resumable-class-'));
 try {
  const plans=[true,false].flatMap(typed=>[true,false].flatMap(profile=>[false,true].map(noGc=>({typed,profile,noGc,stress:false}))));plans.push({typed:false,profile:true,noGc:false,stress:true});
  const expected=new Map<string,string>();
  for(const {profile,stress} of plans){const key=`${profile}-${stress}`;if(expected.has(key))continue;const entry=path.join(temporary,`reference-${key}.mjs`);await fs.writeFile(entry,erase(subject(profile,false,stress)));const oracle=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");globalThis.print=console.log;globalThis.$262={gc(){}};import(process.argv[1]);',entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exitCode:0,stderr:''});expected.set(key,oracle.stdout.toString())}
  for(const {typed,profile,noGc,stress} of plans){const directory=path.join(temporary,`${typed}-${profile}-${noGc}-${stress}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program');const source=subject(profile,profile&&!noGc,stress);await fs.writeFile(entry,typed?source:erase(source));const diagnostics:string[]=[];const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/resumable-class-definition.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});expect({typed,profile,noGc,stress,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({typed,profile,noGc,stress,exitCode:0,diagnostics:''});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});expect({typed,profile,noGc,stress,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({typed,profile,noGc,stress,exitCode:0,stderr:''});const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:'normal',scenarioId:'property/resumable-class-definition.js#module'});expect(observation?observation.stdout:native.stdout.toString()).toEqual(expected.get(`${profile}-${stress}`))}
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},600_000);

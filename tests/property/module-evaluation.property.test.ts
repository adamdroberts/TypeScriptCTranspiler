import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import ts from 'typescript';
import {compile} from '../../src/compile';
import {moduleHasTopLevelAwait} from '../../src/emit/module-evaluation';
import {parseHostObservation} from '../test262/protocol';

 test('HasTLA visits definition-time expressions and excludes retained bodies',()=>{
 const partitions=[
  ['export const value=await 1;',true],
  ['export class C extends (await base) {}',true],
  ['export class C {[await key]() {}}',true],
  ['export const object = {[await key]() {}};',true],
  ['export const object = {async method() {await value}};',false],
  ['export class C {async method(){await value}}',false],
  ['export class C {field=async()=>await value}',false],
  ['export async function f(){await value}',false],
  ['for await(const value of input) {}',true],
 ] as const;
 for(const [source,expected] of partitions)expect(moduleHasTopLevelAwait(ts.createSourceFile('subject.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS))).toBe(expected);
 });

function graph(extension:string,profile:boolean,collect:boolean,stress:boolean):Record<string,string>{
 const spec=(name:string)=>'./'+name+extension;
 const files:Record<string,string>={};
 files['shared']=`export const events=[];export const reason={identity:'reason'};export function check(value,label){if(!value)throw label;${profile?'print':'console.log'}(label+':true')}`;
 files['leaf']=`import {events} from '${spec('shared')}';events.push('leaf:start');await Promise.resolve();events.push('leaf:done');export let value=7;export function mutate(){value++}export default class {[await Promise.resolve('self')](){return this}}`;
 files['left']=`import {events} from '${spec('shared')}';import {value} from '${spec('leaf')}';events.push('left:'+value);await Promise.resolve();events.push('left:done');export const left=value;`;
 files['right']=`import {events} from '${spec('shared')}';import {value} from '${spec('leaf')}';import '././leaf${extension}';events.push('right:'+value);export const right=value;`;
 files['independent']=`import {events} from '${spec('shared')}';events.push('independent:start');await Promise.resolve();events.push('independent:done');export const ready=true;`;
 files['cycle-a']=`import {readB} from '${spec('cycle-b')}';export function readA(){return 'a'};await Promise.resolve();export const cycle=readB();`;
 files['cycle-b']=`import {readA} from '${spec('cycle-a')}';export function readB(){return readA()+'b'}`;
 files['async-a']=`import {readB} from '${spec('async-b')}';export function readA(){return 'a'};await Promise.resolve();export const cycle=readB();`;
 files['async-b']=`import {readA} from '${spec('async-a')}';export function readB(){return readA()+'b'};await Promise.resolve();`;
 files['failure']=`import {events,reason} from '${spec('shared')}';events.push('failure:start');await Promise.reject(reason);events.push('failure:unreachable');`;
 files['failed-parent']=`import '${spec('failure')}';import {events} from '${spec('shared')}';events.push('failed-parent:unreachable');`;
 files['sync-throw']=`import '${spec('late')}';import {reason} from '${spec('shared')}';throw reason;`;
 files['early-throw']=`import {reason} from '${spec('shared')}';throw reason;await Promise.resolve();`;
 files['failed-cycle-a']=`import '${spec('failed-cycle-b')}';await Promise.resolve();`;
 files['failed-cycle-b']=`import '${spec('failed-cycle-a')}';import {reason} from '${spec('shared')}';await Promise.reject(reason);`;
 files['late']=`import {events} from '${spec('shared')}';events.push('late:start');await Promise.resolve();events.push('late:done');export const ready=true;`;
 files['then']=`await Promise.resolve();export function then(resolve){resolve('assimilated')}`;
 let deep='';
 if(stress){for(let index=0;index<256;index++)files['deep-'+index]=(index<255?`import {depth as previous} from '${spec('deep-'+(index+1))}';`:'const previous=0;')+`await Promise.resolve();export const depth=previous+1;`;deep=`const deep=await import('${spec('deep-0')}');check(deep.depth===256,'deep-module-record-graph');`;}
 files['main']=`import Base,{value,mutate} from '${spec('leaf')}';import {left} from '${spec('left')}';import {right} from '${spec('right')}';import {ready} from '${spec('independent')}';import {events,reason,check} from '${spec('shared')}';import {cycle} from '${spec('cycle-a')}';import {cycle as asyncCycle} from '${spec('async-a')}';
 events.push('main:start');check(left===7&&right===7&&ready&&cycle==='ab'&&asyncCycle==='ab','dependencies');
 class Derived extends (await Promise.resolve(Base)){[await Promise.resolve('read')](){return value}}
 const owner=new Derived();check(owner.self()===owner&&owner instanceof Base,'awaited-class-definition');
 const object={[await Promise.resolve('read')](){return value}};const namespace=await import('${spec('leaf')}');mutate();check(namespace.value===8&&owner.read()===8&&object.read()===8,'live-bindings');
 ${collect?'globalThis.$262.gc();':''}
 const imports=await Promise.all([import('${spec('late')}'),import('${spec('late')}')]);check(imports[0]===imports[1]&&imports[0].ready,'shared-completion-namespace');
 for(let index=0;index<2;index++){try{await import('${spec('failed-parent')}');throw 'missing rejection'}catch(error){check(error===reason,'rejection-identity')}}
 const rejected=[import('${spec('sync-throw')}'),import('${spec('early-throw')}'),import('${spec('failed-cycle-a')}')];for(const completion of rejected){try{await completion;throw 'missing rejection'}catch(error){check(error===reason,'completion-rejection')}}
 const assimilated=await import('${spec('then')}');check(assimilated==='assimilated','namespace-then-assimilation');
 ${deep}
 check(events.filter(value=>value==='leaf:start').length===1&&events.filter(value=>value==='late:start').length===1&&!events.some(value=>value.includes('unreachable')),'execute-once');
 ${profile?'print':'console.log'}(events.join(','));`;
 return Object.fromEntries(Object.entries(files).map(([name,source])=>[name+extension,source]));
}

test('Module Record graph matches an independent Node evaluation oracle',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-module-evaluation-'));
 try{
 const plans=['javascript','typed'].flatMap(mode=>[false,true].map(noGc=>({mode,noGc,profile:false,stress:false})));
 plans.push({mode:'javascript',noGc:false,profile:true,stress:false},{mode:'javascript',noGc:true,profile:true,stress:false},{mode:'javascript',noGc:false,profile:false,stress:true});
 for(const {mode,noGc,profile,stress} of plans){
  const directory=path.join(temporary,`${mode}-${noGc}-${profile}-${stress}`);await fs.mkdir(directory);
  const extension=mode==='typed'?'.ts':'.mjs';const sources=graph(extension,profile,profile&&!noGc,stress);
  for(const [name,source] of Object.entries(sources))await fs.writeFile(path.join(directory,name),(extension==='.ts'?'// @ts-nocheck\n':'')+source);
  const oracleDirectory=path.join(directory,'oracle');await fs.mkdir(oracleDirectory);
  for(const [name,source] of Object.entries(graph('.mjs',false,false,stress)))await fs.writeFile(path.join(oracleDirectory,name),source);
  const oracle=Bun.spawnSync([process.env.TSC2C_NODE??'node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");import(process.argv[1]);',path.join(oracleDirectory,'main.mjs')],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  const entry=path.join(directory,'main'+extension),output=path.join(directory,'program'),diagnostics:string[]=[];
  const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/module-evaluation.mjs#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
  expect({mode,noGc,profile,stress,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({mode,noGc,profile,stress,exitCode:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
  expect({mode,noGc,profile,stress,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({mode,noGc,profile,stress,exitCode:0,stderr:''});
  const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
  if(observation)expect(observation.kind).toBe('normal');
  expect({mode,noGc,profile,stress,stdout:observation?observation.stdout:native.stdout.toString()}).toEqual({mode,noGc,profile,stress,stdout:oracle.stdout.toString()});
 }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

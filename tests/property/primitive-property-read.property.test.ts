import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {primitivePropertyReadInput} from '../e2e/generated-cases';

const source=`export {};let trace='';const marker={};
const domains:any[]=[1,'value',true,17n,Symbol('value')];
for(const value of domains){const prototype=Object.getPrototypeOf(Object(value));Object.defineProperty(prototype,'probe',{configurable:true,get:function(){'use strict';trace+=typeof this+':'+(this===value)+'|';return 19;}});console.log('get',typeof value,value.probe,trace);delete prototype.probe;trace='';}
const prototype=String.prototype as any;Object.defineProperty(prototype,'literal',{configurable:true,get:function(){'use strict';trace=typeof this+':'+(this==='text');return marker;}});console.log('literal',('text' as any).literal===marker,trace);delete prototype.literal;
const inherited=Object.getPrototypeOf(prototype);Object.setPrototypeOf(prototype,{get literal(){'use strict';return this==='text'?23:0}});console.log('inherited',('text' as any).literal);Object.setPrototypeOf(prototype,inherited);
prototype.literal=29;console.log('mutable',('text' as any).literal);prototype.literal=31;console.log('changed',('text' as any).literal);delete prototype.literal;console.log('missing',('text' as any).literal===undefined);
console.log('own',('ab' as any).length,('ab' as any)[0],('ab' as any)[2]===undefined);
Object.defineProperty(prototype,'abrupt',{get(){throw marker},configurable:true});try{('text' as any).abrupt}catch(error){console.log('abrupt',error===marker)}delete prototype.abrupt;
const symbol=Symbol('read');prototype[symbol]=37;console.log('symbol',('text' as any)[symbol]);delete prototype[symbol];
let calls=0;function receiver():string{calls++;return 'text'}prototype.literal=41;console.log('once',(receiver() as any).literal,calls);delete prototype.literal;
console.log('length use','abcd'.length+1,'ab'.slice(0,1));`;

test('primitive property reads preserve actual prototype receivers and String own properties',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-primitive-read-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const input=source+'\n'+primitivePropertyReadInput(typed&&!noGc?4096:3),program=ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}.mjs`);await writeFile(oracle,program);const node=nodeReferenceSync(['node',oracle],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'mts':'mjs'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?input:program);
  const result=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:message=>diagnostics.push(message)});expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:node.stdout.toString()});
 }
 }finally{await rm(root,{recursive:true,force:true})}
},900000);

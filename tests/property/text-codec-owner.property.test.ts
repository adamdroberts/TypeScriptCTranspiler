import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(collect:boolean):string{return `'use strict';
function check(value,label){if(!value)throw label}
const encoder=new TextEncoder(),decoder=new TextDecoder();
check(Object.getPrototypeOf(encoder)===TextEncoder.prototype&&Object.getPrototypeOf(decoder)===TextDecoder.prototype,'owners');
for(const ctor of [TextEncoder,TextDecoder]){check(ctor.length===0,'constructor-length');const descriptor=Object.getOwnPropertyDescriptor(ctor,'prototype');check(!descriptor.writable&&!descriptor.enumerable&&!descriptor.configurable,'constructor-prototype');console.log('owner',ctor.name,ctor.length,Object.prototype.toString.call(new ctor()))}
for(const [ctor,names] of [[TextEncoder,['encoding','encode']],[TextDecoder,['decode','encoding','fatal','ignoreBOM']]])for(const name of names){const descriptor=Object.getOwnPropertyDescriptor(ctor.prototype,name),fn=descriptor.get||descriptor.value;console.log('member',ctor.name,name,fn.name,fn.length,descriptor.enumerable,descriptor.configurable)}
for(const value of [undefined,null,true,17,'','AZ','😊','\\ud800']){const bytes=encoder.encode(value);console.log('roundtrip',String(value),Array.from(bytes).join(','),decoder.decode(bytes))}
for(const bytes of [[239,187,191,65],[192,175],[237,160,128],[240,159],[255,65]]){const text=decoder.decode(Buffer.from(bytes));console.log('decode-bytes',bytes.join(','),text,text.length)}
let trace='';const bytes=encoder.encode({toString(){trace+='convert';return 'AZ'}},trace+='extra');check(trace==='extraconvert','argument-before-conversion');check(decoder.decode(bytes)==='AZ','converted');
let brandTrace='',rejected=false;try{TextEncoder.prototype.encode.call(new Proxy(encoder,{}),{toString(){brandTrace+='convert';return 'x'}})}catch(error){rejected=error instanceof TypeError}check(rejected&&brandTrace==='','brand-before-conversion');
const buffer=new ArrayBuffer(2,{maxByteLength:4}),view=new DataView(buffer);view.setUint8(0,65);view.setUint8(1,90);check(decoder.decode(buffer)==='AZ'&&decoder.decode(view)==='AZ','byte-witness');buffer.resize(1);check(decoder.decode(view)==='A','resized-witness');
buffer.resize(2);view.setUint8(1,90);check(decoder.decode(view,{get stream(){buffer.resize(1);return false}})==='A','options-before-witness');
let optionsTrace='';const defaultDecoder=new TextDecoder('utf-8',{get fatal(){optionsTrace+='f';return false},get ignoreBOM(){optionsTrace+='b';return false}});check(!defaultDecoder.fatal&&!defaultDecoder.ignoreBOM,'constructor-options');
const saved=TextEncoder.prototype.encode;TextEncoder.prototype.encode=function(){return 'mutable'};check(encoder.encode('x')==='mutable','mutable-method');TextEncoder.prototype.encode=saved;
let invalidTrace='',invalidRejected=false;try{new TextDecoder({toString(){invalidTrace+='l';return 'not-an-encoding'}},{get fatal(){invalidTrace+='f';return false}})}catch(error){invalidRejected=error instanceof RangeError}check(invalidRejected&&invalidTrace==='l','label-before-options');
class Derived extends TextEncoder{}const derived=new Derived();check(Object.getPrototypeOf(derived)===Derived.prototype&&decoder.decode(derived.encode('derived'))==='derived','derived');
let chain=null;for(let index=0;index<4096;++index){chain={encoder:new TextEncoder(),decoder:new TextDecoder(),index,next:chain}}
__COLLECT__
queueMicrotask(()=>{let visited=0;while(chain){const value='owner'+chain.index;check(chain.decoder.decode(chain.encoder.encode(value))===value,'retained-codec');chain=chain.next;visited++}check(visited===4096,'retained-graph');console.log('retained',visited)});
`.replace("__COLLECT__",collect?"$262.gc();":"")}

test('UTF-8 codec owners retain ordinary methods and byte-source witnesses',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-text-codec-owner-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false));
  const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile&&!noGc));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'text-codec-owner.ts#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
   if(observation)expect({noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({noGc,kind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

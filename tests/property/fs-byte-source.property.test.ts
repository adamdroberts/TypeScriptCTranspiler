import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {generateE2eCaseSource} from '../e2e/generated-cases';

function subject(file:string,width:number):string {
 return `import {writeFileSync,openSync,closeSync,readSync,rmSync,fsyncSync,fdatasyncSync,ftruncateSync} from 'node:fs';
 const file=${JSON.stringify(file)};writeFileSync(file,'ABCDEFGH');const fd=openSync(file,'r+');
 const buffer=Buffer.alloc(4);console.log('buffer',readSync(fd,buffer,0,4,1n),buffer.toString());
 const backing=new ArrayBuffer(8);const typed=new Uint16Array(backing,2,2);
 console.log('typed',readSync(fd,typed,0,4,1),new TextDecoder().decode(typed),new Uint8Array(backing).join(','));
 const dataBacking=new ArrayBuffer(6);const view=new DataView(dataBacking,1,3);
 console.log('view',readSync(fd,view,{offset:0,length:3,position:2}),new TextDecoder().decode(view));
 const shared=new SharedArrayBuffer(6);const sharedView=new Uint8Array(shared,1,3);
 console.log('shared',readSync(fd,sharedView,0,3,3),new TextDecoder().decode(sharedView));
 const trace=[];const options={get offset(){trace.push('offset');return 0},get length(){trace.push('length');return 2},get position(){trace.push('position');return 1n}};
 const actuals=Array.from({length:${width}},(_,index)=>{trace.push('actual');return index});
 console.log('options',readSync(fd,buffer,options,...actuals),trace.length,trace.slice(-3).join(','));
 let inheritedReceiver;const inherited=Object.create({get offset(){inheritedReceiver=this;return 0},get length(){return 1},get position(){return 0}});
 console.log('inherited',readSync(fd,buffer,inherited),inheritedReceiver===inherited);
 let effect=0;try{readSync(fd,{},(effect++,0),1,0,effect++)}catch(error){console.log('invalid-buffer',error.name,effect)}
 const marker={};let stopped=[];try{readSync(fd,buffer,{get offset(){stopped.push('offset');throw marker},get length(){stopped.push('length');return 1},get position(){stopped.push('position');return 0}})}catch(error){console.log('abrupt',error===marker,stopped.join(','))}
 const validation=[];try{readSync(fd,buffer,{get offset(){validation.push('offset');return 'bad'},get length(){validation.push('length');return 1},get position(){validation.push('position');return 0}})}catch(error){console.log('validation',error.name,validation.join(','))}
 const conversion=[];try{readSync(fd,buffer,{get offset(){conversion.push('offset');return {valueOf(){conversion.push('valueOf');return 0}}},get position(){conversion.push('position');return 0}})}catch(error){console.log('default-length',error.name,conversion.join(','))}
 console.log('zero',readSync(-1,Buffer.alloc(0),0,0,0));
 const resizable=new ArrayBuffer(8,{maxByteLength:8});const fixed=new Uint8Array(resizable,2,4);const shrink=[];
 try{readSync(fd,fixed,{get offset(){shrink.push('offset');return 0},get length(){shrink.push('length');return 1},get position(){shrink.push('position');resizable.resize(1);return 0}})}catch(error){console.log('shrink',error.name,shrink.join(','))}
 const codec=[];try{new TextDecoder().decode(17,{get stream(){codec.push('stream');return false}})}catch(error){console.log('codec-abrupt',error.name,codec.join(','))}
 try{readSync(fd,new ArrayBuffer(4),0,1,0)}catch(error){console.log('raw-buffer',error.name)}
 const emptyBacking=new ArrayBuffer(4);const emptyView=new Uint8Array(emptyBacking);emptyBacking.transfer();
 console.log('detached-zero',readSync(fd,emptyView,0,0,0));
 const publicBuffer=Buffer.alloc(4),publicTrace=[];
 Object.defineProperty(publicBuffer,'byteLength',{configurable:true,get(){publicTrace.push('length');return {valueOf(){publicTrace.push('convert');return 4n}}}});
 console.log('public-length',readSync(fd,publicBuffer,0,1,0),publicTrace.join(','));
 const defaults=[];Object.defineProperty(publicBuffer,'byteLength',{configurable:true,get(){defaults.push('bytes');return 4n}});
 try{readSync(fd,publicBuffer,{get offset(){defaults.push('offset');return 0n},get position(){defaults.push('position');return 0}})}catch(error){console.log('numeric-default',error.name,defaults.join(','))}
 for(const value of [-1,NaN,1.5,'bad'])try{readSync(value,buffer,0,1,0)}catch(error){console.log('fd',error.name)}
 fsyncSync(fd,++effect);fdatasyncSync(fd,++effect);ftruncateSync(fd,4,++effect);console.log('descriptor',effect);
 try{fsyncSync(-1,++effect)}catch(error){console.log('descriptor-abrupt',error.name,effect)}
 closeSync(fd);rmSync(file);
 `;
}

test('filesystem reads consume retained byte views and complete actual Lists against Node',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-fs-byte-source-'));
 try{for(const typed of [false,true])for(const noGc of [false,true]){
  const directory=path.join(temporary,`${typed}-${noGc}`);await fs.mkdir(directory);
  const stress=!typed&&!noGc?generateE2eCaseSource('{\"generator\":\"fs-read-actual-list-width\",\"width\":512}','property/fs_read_actual_list_width'):'';
  const program=subject(path.join(directory,'data'),3)+stress;
  const oracle=path.join(directory,'oracle.mjs');await fs.writeFile(oracle,program);
  const node=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=path.join(directory,typed?'main.ts':'main.mjs');await fs.writeFile(entry,(typed?'// @ts-nocheck\n':'')+program);
  const output=path.join(directory,'program'),diagnostics:string[]=[];
  const built=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,code:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({typed,noGc,code:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({typed,noGc,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({typed,noGc,code:0,stderr:'',stdout:node.stdout.toString()});
 }}finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

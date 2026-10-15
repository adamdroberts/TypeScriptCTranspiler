import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';

function subject(owner:string):string {
 return `import ordinary from 'util';
 import * as namespace from 'node:util';
 import {TextEncoder as Encoder,TextDecoder as Decoder} from 'node:util';
 import {format as formatValue,types as predicates} from 'util';
 import {Owner} from '${owner}';
 async function verify(){
  console.log('identity',Encoder===TextEncoder,Decoder===TextDecoder,namespace.TextEncoder===Encoder,ordinary.TextDecoder===Decoder);
  console.log('namespace',Object.getPrototypeOf(namespace)===null,Object.prototype.toString.call(namespace));
  const descriptor=Object.getOwnPropertyDescriptor(namespace,'TextEncoder');
  console.log('descriptor',descriptor.writable,descriptor.enumerable,descriptor.configurable);
  let effect=0;const encoder=new Encoder(effect++);const decoder=new Decoder('utf-8',(effect++,{}));
  const bytes=encoder.encode('Hi');await Promise.resolve();
  console.log('codec',bytes.length,bytes[1],decoder.decode(bytes),effect);
  const forwarded=new Owner();console.log('forwarded',forwarded.encode('trip').length);
  const formatter=formatValue.bind(ordinary);
  console.log('format',formatter(...['%s:%d','x',17]),formatValue(),namespace.format===formatValue,ordinary.types===predicates);
  console.log('types',predicates.isDate(new Date()),predicates.isDate(),namespace.types.isArrayBufferView(new Uint8Array(2)),predicates.isTypedArray(new Uint16Array(2)),Reflect.apply(predicates.isDate,null,[new Date()]));
  const originalFormat=ordinary.format;ordinary.format=function(...values){return 'changed'+values.length};
  console.log('format-write',ordinary.format(1,2),namespace.format===originalFormat);ordinary.format=originalFormat;
  const captured=Encoder;const saved=globalThis.TextEncoder;
  globalThis.TextEncoder=class Replacement{};
  console.log('retained',new captured().encode('ok').length,namespace.TextEncoder===captured,ordinary.TextEncoder===captured);
  globalThis.TextEncoder=saved;
  class Source {encode(){return {length:37}}}
  function shadow(TextEncoder){return new TextEncoder().encode('x').length}
  console.log('shadow',shadow(Source));
  const original=ordinary.TextEncoder;ordinary.TextEncoder=Source;
  console.log('default-write',new ordinary.TextEncoder().encode('x').length,namespace.TextEncoder===original);
  ordinary.TextEncoder=original;
 }
 verify().catch(error=>{console.log('failure',String(error));throw error});`;
}

test('util text-codec imports share native constructor owners across references and source graphs',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-util-text-codec-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const directory=path.join(temporary,`${typed}-${noGc}`);await fs.mkdir(directory);
  const extension=typed?'.ts':'.mjs',depth=typed&&!noGc?128:2;
  for(let index=0;index<depth;index++){
   const next=index+1<depth?`export {Owner} from './owner-${index+1}${extension}';`:"import {TextEncoder} from 'util';export const Owner=TextEncoder;";
   const reference=index+1<depth?`export {Owner} from './reference-${index+1}.mjs';`:next;
   await fs.writeFile(path.join(directory,`owner-${index}${extension}`),(typed?'// @ts-nocheck\n':'')+next);
   await fs.writeFile(path.join(directory,`reference-${index}.mjs`),reference);
  }
  const oracle=path.join(directory,'reference.mjs');await fs.writeFile(oracle,subject('./reference-0.mjs'));
  const node=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=path.join(directory,'main'+extension);await fs.writeFile(entry,(typed?'// @ts-nocheck\n':'')+subject('./owner-0'+extension));
  const output=path.join(directory,'program'),diagnostics:string[]=[];
  const built=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,code:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({typed,noGc,code:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:node.stdout.toString()});
 }}finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

test('unrepresented util exports retain the stable native-owner diagnostic',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-util-owner-diagnostic-'));
 try{
  const entry=path.join(directory,'main.ts'),diagnostics:string[]=[];
  await fs.writeFile(entry,"// @ts-nocheck\nimport {promisify as unavailable} from 'node:util';console.log(unavailable);");
  const result=await compile({entry,output:path.join(directory,'program'),emitCOnly:true,diagnosticWriter:message=>diagnostics.push(message)});
  expect(result.exitCode).toBe(3);
  expect(diagnostics.join('')).toContain('ambient host export requires an ordinary runtime owner');
 }finally{await fs.rm(directory,{recursive:true,force:true})}
});

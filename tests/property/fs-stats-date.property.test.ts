import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
const source=String.raw`
const stats:any=fs.statSync('package.json');
const prototype:any=Object.getPrototypeOf(stats);
for(const name of ['atime','mtime','ctime','birthtime']){
 const descriptor:any=Object.getOwnPropertyDescriptor(prototype,name);
 console.log('descriptor',name,descriptor.enumerable,descriptor.configurable,descriptor.get.name,descriptor.get.length,descriptor.set.name,descriptor.set.length);
 let trace='';const receiver:any={};Object.defineProperty(receiver,name+'Ms',{get(){trace+='G';return {valueOf(){trace+='N';return 0;}};}});
 const date:any=descriptor.get.call(receiver),published:any=Object.getOwnPropertyDescriptor(receiver,name);
 console.log('get',date.getTime(),trace,published.value===date,published.writable,published.enumerable,published.configurable);
 const marker:any={};const setter:any={};console.log('set',descriptor.set.call(setter,marker)===undefined,setter[name]===marker);
 for(const target of ['primitive',Object.freeze({}),null]){let error:any;try{descriptor.get.call(target);}catch(caught){error=caught;}console.log('get-error',error instanceof TypeError);error=undefined;try{descriptor.set.call(target,marker);}catch(caught){error=caught;}console.log('set-error',error instanceof TypeError);}
 const abrupt:any={};Object.defineProperty(abrupt,name+'Ms',{get(){throw marker;}});let error:any;try{descriptor.get.call(abrupt);}catch(caught){error=caught;}console.log('abrupt',error===marker,!Object.hasOwn(abrupt,name));
}
`;
test('Stats lazy dates share ordered construction and ordinary getter/setter publication',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-stats-date-'));
 try{
  const erased=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext}}).outputText,oracle=join(root,'oracle.cjs'),stdout=oracle+'.stdout';await writeFile(oracle,"const fs=require('node:fs');\n"+erased);
  const node=Bun.spawnSync(['node',oracle],{stdout:Bun.file(stdout),stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});const expected=await readFile(stdout,'utf8');expect(expected).toContain('get 0 GN true true true true\n');
  for(const typed of [true,false])for(const noGc of [false,true]){
   const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?source:erased);
   const result=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:m=>diagnostics.push(m)});expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(native.stdout.toString()).toBe(expected);
  }
 }finally{await rm(root,{recursive:true,force:true});}
},900000);

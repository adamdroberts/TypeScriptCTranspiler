import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
const subject=String.raw`
const stat=fs.statSync('package.json');
console.log('tag',stat.toString(),stat.toLocaleString(),String(stat),stat.valueOf()===stat);
stat.size=17;stat.mode=0;stat.atimeMs=0;
console.log('fields',stat.size,stat.mode,stat.isFile(),stat.atime.getTime(),stat.atime===stat.atime);
const own:any=Object.getOwnPropertyDescriptor(stat,'atime');console.log('date',own.value===stat.atime,own.writable,own.enumerable,own.configurable);
const dynamic:any=stat;dynamic.isFile=function():string{return 'replaced';};console.log('replace',stat.isFile());
const prototype:any=Object.getPrototypeOf(stat),read:any=Object.getPrototypeOf(stat).isDirectory;
const borrowed:any={mode:16384,_checkModeProperty:prototype._checkModeProperty};console.log('borrow',read.call(borrowed));
let trace='';const key:any={toString(){trace+='K';return 'size';}};dynamic[key]=23;console.log('computed',stat.size,trace);
Object.defineProperty(stat,'size',{get(){trace+='G';return 31;},configurable:true});console.log('getter',stat.size,trace);
const expected:any={};Object.defineProperty(stat,'mtimeMs',{get(){throw expected;},configurable:true});let caught:any;try{const value=stat.mtime;console.log(value);}catch(error){caught=error;}console.log('abrupt',caught===expected);
const names=Object.keys(stat);console.log('order',names.slice(0,10).join('|'));
let chain:any=null;
for(let index=0;index<512;index++){const value=fs.statSync('package.json');value.size=index;value.atimeMs=index;chain={value,previous:chain};}
let ordered=true;
for(let index=511;index>=0;index--){ordered=ordered&&chain.value.size===index&&chain.value.atime.getTime()===index&&chain.value.atime===chain.value.atime;chain=chain.previous;}
console.log('retained',ordered&&chain===null);

`;
test('Stats typed and erased consumers share ordinary mutable fields, methods and lazy date owners',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-stats-owner-'));
 try{
  const erased=ts.transpileModule(subject,{compilerOptions:{target:ts.ScriptTarget.ESNext}}).outputText,oracle=join(root,'oracle.cjs'),stdout=oracle+'.stdout';await writeFile(oracle,"const fs=require('node:fs');\n"+erased);
  const node=Bun.spawnSync(['node',oracle],{stdout:Bun.file(stdout),stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});const expected=await readFile(stdout,'utf8');expect(expected).toContain('fields 17 0 false 0 true\n');expect(expected).toContain('abrupt true\n');
  for(const typed of [true,false])for(const noGc of [false,true]){
   const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?subject:erased);
   const result=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:m=>diagnostics.push(m)});expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(native.stdout.toString()).toBe(expected);
  }
 }finally{await rm(root,{recursive:true,force:true});}
},900000);

import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';

const source=String.raw`
function wrap(value:any):any{return Object(value);}
const inputs:any[]=['', 'x', 'xy', '\uD83D\uDE00', 7, true, 11n, Symbol('owner')];
for(const input of inputs){
 const first:any=wrap(input),second:any=wrap(input);
 console.log('box',typeof input,first!==second,Object.is(first.valueOf(),input),Object.keys(first).join('|'));
 if(typeof input==='string'){
  const descriptors:any=Object.getOwnPropertyDescriptors(first);
  console.log('string',first.length,first[0]===input[0],descriptors.length.value,descriptors.length.writable,descriptors.length.enumerable,descriptors.length.configurable);
  if(input.length){const d:any=descriptors['0'];console.log('index',d.value===input[0],d.writable,d.enumerable,d.configurable,Reflect.set(first,'0','changed'));}
 }
 first.extra='one';second.extra='two';console.log('mutable',first.extra,second.extra);
}
const payload:any={};console.log('identity',wrap(payload)===payload,wrap(payload)===wrap(payload));
const wide:string='x'.repeat(4096);let graph:any=null;
for(let index=0;index<256;index++)graph={value:wrap(wide),previous:graph};
let retained=true;
for(let index=255;index>=0;index--){retained=retained&&graph.value.length===wide.length&&graph.value[4095]==='x';graph=graph.previous;}
console.log('retained',retained&&graph===null);
`;
test('primitive wrapper source owners retain all observed finite String fields',()=>{
 for(const text of ['', '7', '11', '\uD83D\uDE00']){
  const subject=`function wrap(value){return Object(value)};const first=wrap(${JSON.stringify(text)}),second=wrap(${JSON.stringify(text)});eval(first[0]);eval(second.valueOf());`;
  const graph=finiteEvalScriptSourceGraph([{path:'main.js',source:subject}]);expect({text,error:graph.error}).toEqual({text,error:null});
  expect(graph.directEvalSources.map(entry=>entry.source)).toContain(text);
 }
});
test('primitive wrapper actual-input views preserve Node identity, immutable UTF-16 fields and retained owners',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-box-owner-source-'));
 try{
  const erased=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext}}).outputText,oracle=join(root,'oracle.cjs'),stdout=oracle+'.stdout';await writeFile(oracle,erased);
  const node=Bun.spawnSync(['node',oracle],{stdout:Bun.file(stdout),stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});const expected=await readFile(stdout,'utf8');expect(expected).toContain('retained true\n');
  for(const typed of [true,false])for(const noGc of [false,true]){
   const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?source:erased);
   const built=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:m=>diagnostics.push(m)});expect({typed,noGc,code:built.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(native.stdout.toString()).toBe(expected);
  }
 }finally{await rm(root,{recursive:true,force:true});}
},900000);

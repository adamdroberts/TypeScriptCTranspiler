import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';

const source=String.raw`
let trace='';function mark(label:string):void{trace+=label;}
const values:any[]=[null,undefined,17,'text',false,{},Symbol('source'),1n];
for(const value of values){trace='';const actual:any=(mark('L'),value);console.log('value',Object.is(actual,value),trace);}
trace='';const nullValue:any=(mark('N'),null),undefinedValue:any=(mark('U'),undefined);
console.log('nullish',nullValue===null,undefinedValue===undefined,trace);
const marker:any={};trace='';try{const result:any=((():void=>{throw marker;})(),mark('unreachable'));console.log(result);}catch(error){console.log('abrupt',error===marker,trace);}
async function pending():Promise<void>{const value:any=(await Promise.resolve(1),null);console.log('await',value===null);}
pending();
function* producer():Generator<number,any,any>{return (yield 1,null);}
const iterator=producer();iterator.next();console.log('yield',iterator.next().value===null);
`;
test('comma expression returns the actual right Value after ordered normal or abrupt left evaluation',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-comma-value-'));
 try{
  const erased=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext}}).outputText,oracle=join(root,'oracle.js'),stdout=oracle+'.stdout';await writeFile(oracle,erased);
  const reference=Bun.spawnSync(['node',oracle],{stdout:Bun.file(stdout),stderr:'pipe',timeout:120000});expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});const expected=await readFile(stdout,'utf8');expect(expected).toContain('nullish true true NU\n');
  for(const typed of [true,false])for(const noGc of [false,true]){
   const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?source:erased);
   const result=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:message=>diagnostics.push(message)});expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(native.stdout.toString()).toBe(expected);
  }
 }finally{await rm(root,{recursive:true,force:true});}
},900000);

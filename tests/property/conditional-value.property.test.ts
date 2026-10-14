import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
const source=String.raw`
const object:any={},symbol:any=Symbol('value');
const selectedArray:number[]=true?[17]:[19];const otherArray:string[]=false?['unused']:['actual'];
const callable:any=true?((value:number):number=>value+1):((value:number):number=>value-1);
console.log('native-arms',selectedArray[0],otherArray[0],callable(23));
const values:any[]=[null,undefined,-0,0,NaN,17,'text',false,object,symbol,1n];
function selected(condition:boolean,left:any,right:any):any{return condition?left:right;}
for(const value of values)for(const condition of [false,true]){const result:any=selected(condition,value,value);console.log('value',Object.is(result,value));}
console.log('static-nullish',(false?true:null)===null,(true?null:true)===null,(true?undefined:true)===undefined,(false?true:undefined)===undefined);
for(const condition of [false,true]){const result:any=condition?null:undefined;console.log('nullish',result===null,result===undefined);}
let trace='';function mark(label:string,value:any):any{trace+=label;return value;}
for(const condition of [false,true]){trace='';const result:any=mark('C',condition)?mark('T',object):mark('F',symbol);console.log('lazy',trace,Object.is(result,condition?object:symbol));}
const marker:any={};let caught:any;try{const result:any=((():boolean=>{throw marker;})())?mark('unreachable',1):mark('unreachable',2);console.log(result);}catch(error){caught=error;}console.log('abrupt',caught===marker);
async function pending():Promise<void>{const result:any=(await Promise.resolve(true))?null:undefined;console.log('await',result===null);}
pending();
function* producer():Generator<boolean,any,any>{return (yield true)?null:undefined;}
const iterator=producer();iterator.next();console.log('yield',iterator.next(true).value===null);
`;
test('conditional expressions preserve selected source Values and lazy effects',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-conditional-value-'));
 try{
  const erased=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext}}).outputText,oracle=join(root,'oracle.cjs'),stdout=oracle+'.stdout';await writeFile(oracle,erased);
  const node=Bun.spawnSync(['node',oracle],{stdout:Bun.file(stdout),stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});const expected=await readFile(stdout,'utf8');expect(expected).toContain('static-nullish true true true true\n');
  for(const typed of [true,false])for(const noGc of [false,true]){
   const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?source:erased);
   const result=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:m=>diagnostics.push(m)});expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(native.stdout.toString()).toBe(expected);
  }
 }finally{await rm(root,{recursive:true,force:true});}
},900000);

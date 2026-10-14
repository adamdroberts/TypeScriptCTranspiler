import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';

const subject=String.raw`
function observeVars(flag: boolean): void {
 console.log('before',typeof item);
 {var item: any;var item: any;}
 if(flag){var item: any='first';}else{var item: any=17;}
 var item: any; console.log('retained',item);
 var item: any=(console.log('initializer'),null);var item: any;
 console.log('last',item===null);
}
observeVars(false);observeVars(true);
function parameter(value: any): any {var value: any;{var value: any;}return value;}
console.log('parameter',parameter(23));
function arrayOwner():void{var items:number[]=[1];console.log('array',items[0]);}
class Payload {value:number=5;}
function classOwner():void{var item:Payload=new Payload();console.log('class',item.value);}
arrayOwner();classOwner();
function pattern(): any {var item: any;{var [item]: [any]=[31];}var item: any;return item;}
console.log('pattern',pattern());
function closure(): any {var item: any=37;const read=():any=>item;{var item: any=41;}return read;}
console.log('closure',closure()());
async function asyncOwner(): Promise<any> {var item: any=43;await Promise.resolve();{var item: any=47;}var item: any;return item;}
asyncOwner().then((value:any):void=>console.log('async',value));
function deep(): any {DEEP return retained;}
console.log('deep',deep());
`;
const deep=Array.from({length:512},()=>'{var retained: any;').join('')+'var retained: any=53;'+ '}'.repeat(512);
const source=subject.replace('DEEP',deep);

test('function var declarations reuse one retained binding through hoisting and ordinary writes',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-function-var-owner-'));
 try{
  const erased=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext}}).outputText,oracle=join(root,'oracle.js'),stdout=oracle+'.stdout';await writeFile(oracle,erased);
  const reference=Bun.spawnSync(['node',oracle],{stdout:Bun.file(stdout),stderr:'pipe',timeout:120000});expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});const expected=await readFile(stdout,'utf8');expect(expected).toContain('deep 53\n');
  for(const typed of [true,false])for(const noGc of [false,true]){
   const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?source:erased);
   const result=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:message=>diagnostics.push(message)});expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(native.stdout.toString()).toBe(expected);
  }
 }finally{await rm(root,{recursive:true,force:true});}
},900000);

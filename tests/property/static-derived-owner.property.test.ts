import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';

const source=String.raw`// @ts-nocheck
export {};
function check(value:any,label:string){if(!value)throw new Error(label);console.log(label,true)}
class Base {args:any;target:any;constructor(first:any,...rest:any[]){this.args=[first,...rest];this.target=new.target}read(){return this.args}}
class Derived extends Base {field='derived'}
const marker={},symbol=Symbol('actual'),actuals=[marker,undefined,symbol,17];const owner=Reflect.construct(Derived,actuals);
check(owner.args.length===actuals.length&&owner.args.every((v:any,i:number)=>v===actuals[i])&&owner.field==='derived'&&owner.target===Derived,'implicit-super-complete-actual-list');
function local(){const value=new Derived(marker,symbol);return value.args[0]===marker&&value.args[1]===symbol&&value.field==='derived'}check(local(),'canonical-local-construction');
check(Object.getPrototypeOf(Derived)===Base&&Object.getPrototypeOf(Derived.prototype)===Base.prototype&&owner instanceof Derived&&owner instanceof Base,'static-derived-prototype-owners');
class Explicit extends Base {constructor(...args:any[]){super(...args);this.field='explicit'}}
const explicit=new Explicit(marker,symbol,23);check(explicit.args[0]===marker&&explicit.args[1]===symbol&&explicit.args[2]===23&&explicit.field==='explicit','explicit-super-actual-list');
function Alternate(){}const alternate=Reflect.construct(Derived,[symbol],Alternate);check(alternate.args[0]===symbol&&alternate.target===Alternate&&Object.getPrototypeOf(alternate)===Alternate.prototype&&alternate.field==='derived','static-derived-alternate-target');
let called:any;function replacement(...args:any[]){called={args,target:new.target};return {replacement:true}}Object.setPrototypeOf(Derived,replacement);const replaced=new Derived(marker,symbol);check(replaced.replacement&&replaced.field==='derived'&&called.args[0]===marker&&called.args[1]===symbol&&called.target===Derived,'live-parent-and-object-return');Object.setPrototypeOf(Derived,Base);
let order='';Object.setPrototypeOf(Derived,{});let invalid=false;try{new Derived((order+='argument',marker))}catch(error){invalid=error instanceof TypeError}check(invalid&&order==='argument','parent-validation-after-actuals');Object.setPrototypeOf(Derived,Base);
const layers:any[]=[Derived];for(let index=0;index<512;index++){const Parent=layers[layers.length-1];layers.push(class extends Parent {level=index})}const Deep=layers[layers.length-1];const retained=new Deep(marker,symbol);check(retained.args[0]===marker&&retained.args[1]===symbol&&retained.level===511&&retained.target===Deep&&retained instanceof Derived,'one-deep-constructor-owner-graph');
`;

test('static derived declarations use retained constructor owners and actual Lists',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-static-derived-owner-'));
 try{
  const erased=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
  const reference=join(root,'reference.mjs');await writeFile(reference,erased);
  const node=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,args.map(String).join(" ")+"\\n");import(process.argv[1]);',reference],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});expect(node.stdout.toString().trimEnd().split('\n').at(-1)).toBe('one-deep-constructor-owner-graph true');
  for(const typed of [true,false])for(const noGc of [false,true]){
   const entry=join(root,`main-${typed}-${noGc}.${typed?'mts':'mjs'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?source:erased);
   const result=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:message=>diagnostics.push(message)});
   expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,noGc,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({typed,noGc,code:0,stderr:'',stdout:node.stdout.toString()});
  }
 }finally{await rm(root,{recursive:true,force:true})}
},600000);

import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* Receiver brands of native objects, compared against Node: Date.prototype
 * is an ordinary object without [[DateValue]]; a TypedArray construction
 * inherits from newTarget.prototype (so the analysis resolves eval sources
 * that flow through Object.getPrototypeOf(view).constructor); a method name
 * unknown to the emitter on a Number, Boolean or String receiver resolves
 * through the prototype chain at runtime; Atomics.waitAsync never resolves
 * "timed-out" before its timeout; an impossible ArrayBuffer size is a
 * RangeError with nothing written to stderr. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const typedArrays=['Int8Array','Uint8Array','Uint8ClampedArray','Int16Array','Uint16Array','Int32Array','Uint32Array','Float16Array','Float32Array','Float64Array','BigInt64Array','BigUint64Array'];
const dateMethods=['getTime','valueOf','getFullYear','getUTCMonth','getDay','getTimezoneOffset','setFullYear','setMilliseconds','setUTCHours','toString','toDateString','toISOString','toUTCString','toJSON','toLocaleString','getYear','setYear'];

function brandProgram(random:()=>number,typedArrays:readonly string[]):string{
 const lines=[`const report=(...values)=>console.log(values.join(' '));`];
 lines.push(`report('date-proto',typeof Date.prototype,Object.prototype.toString.call(Date.prototype),Object.getPrototypeOf(Date.prototype)===Object.prototype,Date.prototype instanceof Date);`);
 for(const method of dateMethods)lines.push(`try{Date.prototype.${method}(2000);report('${method}','no throw');}catch(error){report('${method}',error instanceof TypeError);}`);
 lines.push(`try{Date.prototype[Symbol.toPrimitive]('number');report('toPrimitive','no throw');}catch(error){report('toPrimitive',error instanceof TypeError);}`);
 lines.push(`report('date-instance',new Date(0).getTime(),Object.getPrototypeOf(new Date(0))===Date.prototype);`);
 for(const name of typedArrays){
  const length=Math.floor(random()*5);
  lines.push(`{const view=new ${name}(${length});const C=Object.getPrototypeOf(view).constructor;const again=new C(${length+1});
   report('${name}',C===${name},C.BYTES_PER_ELEMENT,C.name,again.length,Object.getPrototypeOf(again)===${name}.prototype,Object.getPrototypeOf(C.prototype)===Object.getPrototypeOf(Int8Array.prototype));
   class Sub extends C {}
   report('${name}-sub',Object.getPrototypeOf(new Sub(1))===Sub.prototype,new Sub(2) instanceof ${name});}`);
 }
 lines.push(`Number.prototype.split=String.prototype.split;Boolean.prototype.pieces=function(){return [String(this),this.valueOf()];};String.prototype.twice=function(){return this+this;};`);
 for(let index=0;index<12;index++){
  const value=(random()*1000).toFixed(Math.floor(random()*4));
  lines.push(`report('split',JSON.stringify((${value}).split(/\\./)),JSON.stringify((${value}).split('${Math.floor(random()*10)}')),JSON.stringify(${random()<0.5}.pieces()),'${value}'.twice());`);
 }
 lines.push(`for(const receiver of [1,true,'s']){try{receiver.missingMethod();report('missing','no throw');}catch(error){report('missing',typeof receiver,error instanceof TypeError);}}`);
 lines.push(`for(const size of [7*1125899906842624,9007199254740992-1]){try{new ArrayBuffer(size);report('buffer','allocated');}catch(error){report('buffer',error instanceof RangeError);}}`);
 lines.push(`(async()=>{const view=new Int32Array(new SharedArrayBuffer(16));
  for(const timeout of [${Array.from({length:6},()=>Math.floor(random()*30)+1).join(',')}]){
   const before=Date.now();const result=Atomics.waitAsync(view,0,0,timeout);const value=await result.value;
   report('wait',timeout,result.async,value,Date.now()-before>=timeout);}
  report('done');})();`);
 return lines.join('\n');
}

function stressProgram(depth:number):string{
 /* One deep chain of prototype/constructor hops through every TypedArray
  * construction keeps a single eval source finite. */
 let expression='Int32Array';
 for(let index=0;index<depth;index++)expression=`Object.getPrototypeOf(new (${expression})(1)).constructor`;
 return `const C=${expression};console.log(C===Int32Array,eval("'" + C.name + "'"),new C(3).length);`;
}

async function compare(name:string,source:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-brands-'));
 try{
  const entry=join(root,'main.mjs');await writeFile(entry,source);
  const node=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({name,code:node.exitCode,stderr:node.stderr.toString()}).toEqual({name,code:0,stderr:''});
  for(const noGc of [false,true]){
   const diagnostics:string[]=[],output=join(root,`program-${noGc}`);
   const built=await compile({entry,output,buildDir:join(root,`build-${noGc}`),noGc,diagnosticWriter:x=>diagnostics.push(x)});
   expect({name,noGc,code:built.exitCode,diagnostics}).toEqual({name,noGc,code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});
   expect({name,noGc,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({name,noGc,code:0,stderr:'',stdout:node.stdout.toString()});
  }
 }finally{await rm(root,{recursive:true,force:true});}
}

test('native receiver brands, TypedArray prototypes and unknown primitive methods match Node',async()=>{
 const probe=nodeReferenceSync(['node','-p','JSON.stringify(['+typedArrays.map(name=>`typeof ${name}`).join(',')+'])'],{stdout:'pipe',stderr:'pipe',timeout:60000});
 const present=(JSON.parse(probe.stdout.toString()) as string[]).map((kind,index)=>kind==='function'?typedArrays[index]!:null).filter((name):name is string=>name!==null);
 expect(present.length).toBeGreaterThanOrEqual(11);
 await compare('brands',brandProgram(rng(0xb4a7d),present));
},600_000);

test('one deep TypedArray constructor chain keeps its eval source finite',async()=>{
 await compare('stress',stressProgram(64));
},600_000);

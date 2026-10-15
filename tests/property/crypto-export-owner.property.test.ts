import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {cryptoExports} from '../../src/crypto-exports';

const source=String.raw`import ordinary from 'node:crypto';import * as namespace from 'crypto';import {pbkdf2Sync as derive,scryptSync as memory,randomFillSync as fill,timingSafeEqual as equal,getHashes,randomBytes,randomUUID} from 'node:crypto';
function check(value:any,label:string){if(!value)throw new Error(label);console.log(label,true)}
check(namespace.default===ordinary&&namespace.pbkdf2Sync===derive&&ordinary.randomFillSync===fill,'retained-export-identity');
for(const [key,name,length,prototype] of [['Hash','deprecated',2,true],['Hmac','deprecated',3,true],['createHash','createHash',2,true],['createHmac','createHmac',3,true],['getHashes','',0,false],['randomBytes','randomBytes',2,true],['randomFillSync','randomFillSync',1,true],['randomUUID','randomUUID',1,true],['timingSafeEqual','',0,false],['pbkdf2Sync','pbkdf2Sync',5,true],['scryptSync','scryptSync',3,true]] as const){const value=(ordinary as any)[key],d=Object.getOwnPropertyDescriptor(ordinary,key);check(value.name===name&&value.length===length&&Object.hasOwn(value,'prototype')===prototype&&d.value===value&&d.writable&&d.enumerable&&d.configurable,'metadata-'+key)}
let trace='';function mark(value:any){trace+='A';return value}const marker={};const saved=ordinary.pbkdf2Sync,prior=Object.getOwnPropertyDescriptor(ordinary,'pbkdf2Sync');Object.defineProperty(ordinary,'pbkdf2Sync',{get(){trace+='G';return function(this:any,...args:any[]){trace+='C';return {args,receiver:this}}},configurable:true});const replaced:any=ordinary.pbkdf2Sync(mark(marker),mark(marker),mark(2),mark(8),mark('sha256'),mark(marker));check(trace==='GAAAAAAC'&&replaced.args.length===6&&replaced.args[0]===marker&&replaced.args[5]===marker&&replaced.receiver===ordinary&&namespace.pbkdf2Sync===saved,'live-default-complete-actual-list');Object.defineProperty(ordinary,'pbkdf2Sync',prior);
const password=new Uint8Array([112,97,115,115]),saltBacking=new Uint8Array([9,115,97,108,116,9]),salt=new DataView(saltBacking.buffer,1,4);
console.log('derive',derive(password,salt,2,16,'sha256').toString('hex'),derive('pass',Buffer.from('salt'),2,16,'sha256').toString('hex'));
const defaults=memory('pass','salt',8);check(memory('pass','salt',8,{N:0,r:0,p:0,maxmem:0}).toString('hex')===defaults.toString('hex'),'zero-options-select-defaults');
const options:any=new Proxy({N:16,r:1,p:1,maxmem:1048576},{get(target:any,key:any,receiver:any){trace+=String(key)+'|';return Reflect.get(target,key,receiver)}});trace='';const derived=memory(password,salt,16,options);console.log('scrypt',derived.toString('hex'),trace);
const mutable=Buffer.from('pass');trace='';const changing:any={get N(){trace+='N';mutable[0]+=1;return 16},r:1,p:1,maxmem:1048576};console.log('mutated-input',memory(mutable,'salt',8,changing).toString('hex'),trace);
let caught:any;trace='';try{memory('pass','salt',8,{get N():number{trace+='N';throw marker}})}catch(error){caught=error}check(caught===marker&&trace==='N','option-abrupt-identity');
try{memory('pass','salt',8,{N:16,cost:16})}catch(error){console.log('alias-error',error instanceof Error,error instanceof Error?(error as any).code:typeof error)}
const backing=new ArrayBuffer(12),all=new Uint8Array(backing);all.fill(71);const view=new Uint16Array(backing,2,3);
Object.defineProperty(view,'byteLength',{get(){throw marker}});Object.defineProperty(view,'BYTES_PER_ELEMENT',{get(){throw marker}});
check(fill(view,1,1)===view&&all[0]===71&&all[1]===71&&all[2]===71&&all[3]===71&&all[6]===71&&all[11]===71,'actual-byte-view-range-and-owner');
check(fill(new SharedArrayBuffer(0)) instanceof SharedArrayBuffer&&randomBytes(0).length===0,'empty-byte-owner');
check(equal(new Uint8Array([1,2]),new DataView(new Uint8Array([1,2]).buffer))&&!equal(Buffer.from('a'),Buffer.from('b')),'byte-view-comparison');
for(const operation of [()=>derive('pass','salt',0,8,'sha256'),()=>derive('pass','salt',2,-1,'sha256'),()=>equal(Buffer.alloc(1),Buffer.alloc(2))]){let error:any;try{operation()}catch(value){error=value}check(error instanceof RangeError,'range-error-owner')}
for(const operation of [()=>derive({} as any,'salt',2,8,'sha256'),()=>fill({} as any),()=>randomUUID({disableEntropyCache:1} as any)]){let error:any;try{operation()}catch(value){error=value}check(error instanceof TypeError,'type-error-owner')}
const hashes=getHashes();check(Array.isArray(hashes)&&hashes.includes('sha256')&&hashes.every(value=>typeof value==='string'),'actual-hash-name-array');
const uuid=randomUUID({get disableEntropyCache(){trace+='U';return true}});check(uuid.length===36&&uuid[14]==='4'&&'89ab'.includes(uuid[19]),'uuid-owner-and-option');
function shadow(ordinary:any){return ordinary.pbkdf2Sync()}check(shadow({pbkdf2Sync(){return marker}})===marker,'lexical-host-shadow');
async function run(){const callee=derive;const result=Reflect.apply(callee,{},[await Promise.resolve('pass'),'salt',2,8,'sha256',marker]);console.log('suspended',result.toString('hex'));let graph:any={callee,data:result};for(let depth=0;depth<1024;depth++)graph={next:graph};await Promise.resolve(graph);for(let depth=0;depth<1024;depth++)graph=graph.next;check(graph.callee===derive&&graph.data===result&&graph.callee('pass','salt',2,8,'sha256').toString('hex')===result.toString('hex'),'deep-retained-export-owner-graph')}run();`;

test('crypto exported owners consume retained actual Lists and byte views against Node',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-crypto-export-owner-'));
 try{
  const erased=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
  const oracle=join(root,'reference.mjs');await writeFile(oracle,erased);
  const node=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(...v)=>fs.writeSync(1,v.map(String).join(" ")+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});expect(node.stdout.toString().trimEnd().split('\n').at(-1)).toBe('deep-retained-export-owner-graph true');
  for(const typed of [true,false])for(const noGc of [false,true]){
   const entry=join(root,`main-${typed}-${noGc}.${typed?'mts':'mjs'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?source:erased);
   const result=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:m=>diagnostics.push(m)});
   expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,noGc,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({typed,noGc,code:0,stderr:'',stdout:node.stdout.toString()});
  }
 }finally{await rm(root,{recursive:true,force:true})}
},900000);

test('declared crypto module exports match the canonical owner collection',async()=>{
 const declarations=await readFile(join(process.cwd(),'stdlib/lib.core.d.ts'),'utf8');
 const block=declarations.split('interface Crypto {')[1]!.split('declare module')[0]!;
 const names=new Set([...block.matchAll(/^\s+(\w+)(?:<[^\n]+>)?\(/gm)].map(match=>match[1]!));
 for(const match of block.matchAll(/^\s+(\w+):/gm))names.add(match[1]!);
 expect(names).toEqual(new Set(cryptoExports));
});

test('crypto entropy provider failure retains an Error completion without a fallback stream',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-crypto-provider-failure-'));
 try{
  const shim=join(root,'provider.c'),library=join(root,'provider.so');
  await writeFile(shim,'int RAND_bytes(unsigned char* data,int length){(void)data;(void)length;return 0;}\n');
  const linked=Bun.spawnSync(['gcc','-shared','-fPIC',shim,'-o',library],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({code:linked.exitCode,stderr:linked.stderr.toString()}).toEqual({code:0,stderr:''});
  const source=`import {randomBytes,randomFillSync,randomUUID} from 'node:crypto';
console.log('empty',randomBytes(0).length);const bytes=Buffer.alloc(8,77);
for(const operation of [()=>randomBytes(8),()=>randomFillSync(bytes),()=>randomUUID()]){let caught:any;try{operation()}catch(error){caught=error}console.log('provider',caught instanceof Error)}
console.log('retained',bytes[0]===77&&bytes[7]===77);`;
  for(const noGc of [false,true]){
   const entry=join(root,'main.ts'),output=join(root,'program-'+noGc),diagnostics:string[]=[];await writeFile(entry,source);
   const built=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:m=>diagnostics.push(m)});
   expect({noGc,code:built.exitCode,diagnostics}).toEqual({noGc,code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000,env:{...process.env,LD_PRELOAD:library}});
   expect({noGc,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({noGc,code:0,stderr:'',stdout:'empty 0\nprovider true\nprovider true\nprovider true\nretained true\n'});
  }
 }finally{await rm(root,{recursive:true,force:true})}
},600000);

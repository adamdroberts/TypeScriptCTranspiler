import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(collect:boolean):string{return `
import * as crypto from 'node:crypto';
import defaultCrypto,{Hash,Hmac,createHash as originalFactory} from 'node:crypto';
function check(value,label){if(!value)throw label}
const example=crypto.createHash('sha256'),mac=crypto.createHmac('sha256','key');
const proto=Object.getPrototypeOf(example),hmacProto=Object.getPrototypeOf(mac),Ctor=example.constructor;
check(Object.keys(example).join('|')==='_options'&&Object.getOwnPropertySymbols(example).map(symbol=>String(symbol)).join('|')==='Symbol(kHandle)|Symbol(kState)','instance-fields');
check(Reflect.ownKeys(proto).join('|')==='constructor|copy|_transform|_flush|update|digest','hash-prototype-members');
check(Reflect.ownKeys(hmacProto).join('|')==='constructor|update|digest|_flush|_transform','hmac-prototype-members');
check(proto.update===hmacProto.update&&proto._transform===hmacProto._transform&&proto.digest!==hmacProto.digest,'method-sharing');
for(const name of ['update','digest','copy']){const descriptor=Object.getOwnPropertyDescriptor(proto,name);check(descriptor.enumerable&&descriptor.writable&&descriptor.configurable&&descriptor.value.name===name,'method-descriptors')}
check(proto.update.length===2&&proto.digest.length===1&&proto.copy.length===1&&Object.hasOwn(proto.update,'prototype'),'method-metadata');
check(Ctor.name==='Hash'&&Ctor.length===2&&mac.constructor.name==='Hmac'&&mac.constructor.length===3,'constructor-metadata');
check(Ctor!==Hash&&mac.constructor!==Hmac&&Hash.name==='deprecated'&&Hmac.name==='deprecated'&&Hash.prototype===proto&&Hmac.prototype===hmacProto&&Object.getPrototypeOf(Hash)===Ctor&&Object.getPrototypeOf(Hmac)===mac.constructor&&crypto.createHash===originalFactory&&defaultCrypto.Hash===Hash,'module-original-owners');
defaultCrypto.createHash=function(){return 'mutated'};check(defaultCrypto.createHash()==='mutated'&&crypto.createHash===originalFactory,'mutable-default-immutable-namespace');defaultCrypto.createHash=originalFactory;
check(mac.constructor.call(mac,'sha256','replacement')===undefined,'hmac-reinitialize-receiver');
check(new Ctor('sha256') instanceof Ctor&&Ctor('sha256') instanceof Ctor,'constructor-call');
function Alternate(){}check(Object.getPrototypeOf(Reflect.construct(Ctor,['sha256'],Alternate))===Alternate.prototype,'new-target');
let wrong=false;try{proto.update.call({},'a')}catch(error){wrong=error instanceof TypeError}check(wrong,'wrong-receiver');
const proxy=new Proxy(example,{});check(proto.update.call(proxy,'abc')===proxy,'borrowed-proxy-update');
console.log('proxy',proto.digest.call(proxy,'hex'));
const retained=crypto.createHash('sha256');retained.update=function(){return 'mutated'};check(retained.update()==='mutated','method-mutation');
const copied=crypto.createHash('sha256').update('a'),copy=copied.copy();console.log('copy',copied.update('b').digest('hex'),copy.update('c').digest('hex'));
console.log('default',crypto.createHash('sha256').update('abc').digest().toString('hex'));
console.log('unknown',crypto.createHash('sha256').update('abc').digest('unknown').toString('hex'));
const storage=new ArrayBuffer(8),view=new DataView(storage,2,3);
console.log('view',crypto.createHash('sha256').update(view).digest('hex'),crypto.createHmac('sha256',view).update('abc').digest('hex'));
const stateSymbol=Object.getOwnPropertySymbols(mac).find(symbol=>String(symbol)==='Symbol(kState)'),finalizedSymbol=Object.getOwnPropertySymbols(mac[stateSymbol])[0];
let touched=false;const blocked={[stateSymbol]:{[finalizedSymbol]:true},get [Object.getOwnPropertySymbols(mac)[0]](){touched=true;throw 'handle-read'}};
let finalError=false;try{proto.update.call(blocked,'a')}catch(error){finalError=error instanceof Error&&error.code==='ERR_CRYPTO_HASH_FINALIZED'}check(finalError&&!touched,'finalized-before-handle');
check(hmacProto.digest.call(blocked,'hex')===''&&!touched,'finalized-hmac-before-handle');
const algorithms=['sha256','SHA256','sha3-256','blake2s256','sha512-256','ripemd160'];
const inputs=['','abc','\\ud800','é😀'];
for(const algorithm of algorithms)for(const input of inputs){
 const hash=crypto.createHash(algorithm);hash.update(input);console.log(algorithm,input.length,hash.digest('hex'));
 let hashFinal=false;try{hash.digest('hex')}catch(error){hashFinal=error instanceof Error&&error.code==='ERR_CRYPTO_HASH_FINALIZED'}check(hashFinal,'hash-finalized');
 let hashUpdate=false;try{hash.update('late')}catch(error){hashUpdate=error instanceof Error&&error.code==='ERR_CRYPTO_HASH_FINALIZED'}check(hashUpdate,'hash-update-finalized');
 const hmac=crypto.createHmac(algorithm,'');hmac.update(input);console.log(hmac.digest('base64'));check(hmac.digest('hex')==='','hmac-repeat');
 let hmacUpdate=false;try{hmac.update('late')}catch(error){hmacUpdate=error instanceof Error&&error.code==='ERR_CRYPTO_HASH_FINALIZED'}check(hmacUpdate,'hmac-update-finalized');
 const binary=crypto.createHmac(algorithm,Buffer.from([0,255,1]));binary.update(Buffer.from([255,0,127]));console.log(binary.digest('buffer').toString('hex'));check(binary.digest('buffer').length===0,'hmac-repeat-buffer');
}
const hashes=crypto.getHashes();check(Array.isArray(hashes)&&hashes.includes('sha3-256')&&hashes.includes('blake2s256'),'provider-availability');
check(hashes.every((name,index)=>typeof name==='string'&&hashes.indexOf(name)===index),'provider-uniqueness');
let invalid=false;try{crypto.createHash('not-a-digest')}catch(error){invalid=error instanceof Error}check(invalid,'invalid-algorithm');
class InputNode{data;hash;hmac;next=null;constructor(data){this.data=data;this.hash=crypto.createHash('sha256').update(data);this.hmac=crypto.createHmac('sha256','key').update(data)}}
let head=null,last=null;
for(let index=0;index<4096;index++){const node=new InputNode(String(index%17));if(last)last.next=node;else head=node;last=node}
const hash=crypto.createHash('sha3-256'),hmac=crypto.createHmac('sha3-256','key');
${collect?'$262.gc();':''}
let cursor=head;while(cursor){const input=String(cursor.data);hash.update(input);hmac.update(input);check(cursor.hash.digest('hex')===crypto.createHash('sha256').update(input).digest('hex')&&cursor.hmac.digest('hex')===crypto.createHmac('sha256','key').update(input).digest('hex'),'deep-owner-retention');cursor=cursor.next}
console.log('deep',hash.digest('hex'),hmac.digest('hex'));
console.log('digest state ok');
`}

test('Digest state follows algorithm lookup, byte input, and finalization partitions',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-crypto-state-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false));
  const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile&&!noGc));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'crypto-digest-state.ts#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
   if(observation)expect({noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({noGc,kind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

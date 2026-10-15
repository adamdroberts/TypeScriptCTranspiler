import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(collect:boolean):string{return `
function check(value,label){if(!value)throw label}
function outcome(callback){try{return callback()}catch(error){return error.name+':'+(error.code||'')}}
for(let seed=0;seed<17;seed++){
 const size=(seed*7)%11+0.75,fill=seed*29-17;
 const bytes=Buffer.alloc(size,fill);
 check(bytes.length===Math.trunc(size),'computed-size');
 for(const value of bytes)check(value===((fill%256)+256)%256,'computed-fill');
 check(Buffer.allocUnsafe(size).length===Math.trunc(size)&&Buffer.allocUnsafeSlow(size).length===Math.trunc(size),'unsafe-size');
}
for(const size of [undefined,null,true,'3',1n,Symbol('size'),{},NaN,Infinity,-1])console.log('invalid',typeof size,outcome(()=>Buffer.alloc(size)));
check(Buffer.alloc(0,Symbol('ignored')).length===0,'zero-fill-skipped');
check(Buffer.alloc(5,'ab').toString()==='ababa'&&Buffer.alloc(5,Buffer.from('ab')).toString()==='ababa','fill-pattern');
let trace='';function mark(label,value){trace+=label;return value}
console.log('argument-order',outcome(()=>Buffer.alloc(mark('size|','3'),mark('fill|',2),... [mark('encoding|','hex'),mark('extra|',7)])),trace);
trace='';const fill={valueOf(){trace+='convert|';return 65}};const converted=Buffer.alloc(mark('size|',2),mark('fill|',fill),mark('encoding|',undefined),mark('extra|',0));check(converted.toString()==='AA'&&trace==='size|fill|encoding|extra|convert|','conversion-after-arguments');
const parts=[Buffer.from('ab'),Buffer.from('cd')];
console.log('concat',Buffer.concat(parts).toString(),Buffer.concat(parts,3).toString(),Buffer.concat(parts,6).toString('hex'));
check(Buffer.concat([],Symbol('ignored')).length===0,'empty-concat-length-skipped');
console.log('concat-errors',outcome(()=>Buffer.concat({length:0})),outcome(()=>Buffer.concat([Buffer.from('a')],1.5)),outcome(()=>Buffer.concat([1],0)));
for(const requested of [undefined,1,4]){
 let reads=0;const list=[];Object.defineProperty(list,'0',{get(){reads++;return Buffer.from(reads===1?'ab':'c')},configurable:true});
 const result=Buffer.concat(list,requested);console.log('changed-list',String(requested),result.toString('hex'),reads);
}
let accesses='';const observed=new Proxy(parts,{get(target,key,receiver){accesses+=String(key)+'|';return Reflect.get(target,key,receiver)}});console.log('list-accesses',Buffer.concat(observed,3).toString(),accesses);
check(Buffer.isBuffer(parts[0])&&!Buffer.isBuffer({})&&Buffer.isEncoding('HEX')&&!Buffer.isEncoding(1),'static-predicates');
check(Buffer.compare(parts[0],parts[1])===-1&&Buffer.byteLength('💛')===4&&Buffer.byteLength(parts[0])===2,'static-results');
const backing=new ArrayBuffer(9),view=new DataView(backing,2,4);check(Buffer.byteLength(backing)===9&&Buffer.byteLength(view)===4,'byte-view-lengths');
for(const replacement of [Buffer.from('abcd'),1]){let reads=0;const list=[];Object.defineProperty(list,'0',{get(){reads++;return reads===1?Buffer.from('ab'):replacement},configurable:true});console.log('changed-invalid',outcome(()=>Buffer.concat(list)),reads)}
let chain=null;for(let depth=0;depth<4096;depth++)chain={bytes:Buffer.alloc(depth%3+1,depth%251),next:chain};
${collect?'$262.gc();':''}
const retained=[];let cursor=chain,depth=4095,total=0;while(cursor){check(cursor.bytes[0]===depth%251&&cursor.bytes.length===depth%3+1,'retained-buffer');total+=cursor.bytes.length;retained.push(cursor.bytes);cursor=cursor.next;depth--}
const joined=Buffer.concat(retained);check(depth===-1&&joined.length===total,'deep-retained-concat');console.log('buffer static arguments ok',joined.length);
`}

test('Buffer static calls use complete boxed argument Lists and canonical byte owners',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-buffer-statics-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false));
  const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile&&!noGc));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'buffer-static-arguments.ts#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
   if(observation)expect({noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({noGc,kind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

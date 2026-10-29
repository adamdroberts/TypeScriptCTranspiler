import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {compile} from '../../src/compile';

// Crypto counts and sizes reach OpenSSL int parameters. Every domain
// partition (in range, both bounds, just outside, non-integer, non-finite and
// separator-formatted large integers) must match Node's ERR_OUT_OF_RANGE
// validation before any native int conversion happens.
const domain=[0,1,16,1.5,-1,-0.5,2147483647,2147483648,4294967296,4294967297,2**33,-(2**33),2**53,NaN,Infinity,-Infinity];
const calls:Array<[string,string]>=[
 ['iterations','crypto.pbkdf2Sync("p","s",V,1,"sha256").length'],
 ['pbkdf2-keylen','crypto.pbkdf2Sync("p","s",1,V,"sha256").length'],
 ['scrypt-keylen','crypto.scryptSync("p","s",V,{N:2}).length'],
 ['randomBytes','crypto.randomBytes(V).length'],
];
// Successful huge allocations are outside the partition under test.
const admitted=(name:string,value:number)=>!(Number.isFinite(value)&&value>4096&&name!=='iterations');

test('crypto int32 counts and sizes match Node range validation',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-crypto-int-range-'));
 try{
  const lines=calls.flatMap(([name,call])=>domain.filter(value=>admitted(name,value)||!(value>=0&&value<=2147483647)).map(value=>
   `try { const V: number = ${Object.is(value,NaN)?'NaN':value===Infinity?'Infinity':value===-Infinity?'-Infinity':String(value)}; console.log(${JSON.stringify(name)}, V, ${name==='iterations'&&Number.isInteger(value)&&value>1000?'"skipped"':call}); } catch (e) { const error = e as any; console.log(${JSON.stringify(name)}, error.name, error.code, error.message); }`));
  const source='import * as crypto from "node:crypto";\n'+lines.join('\n')+'\n';
  for(const noGc of [false,true]){
   const directory=join(root,`gc-${!noGc}`);await Bun.write(join(directory,'.keep'),'');
   const entry=join(directory,'main.ts');await writeFile(entry,source);
   const node=Bun.spawnSync(['node',entry],{stdout:'pipe',stderr:'pipe'});
   expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
   expect(node.stdout.toString()).toContain('ERR_OUT_OF_RANGE');
   const output=join(directory,'native'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,code:result.exitCode,diagnostics}).toEqual({noGc,code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe'});
   expect({noGc,code:native.exitCode,stdout:native.stdout.toString()}).toEqual({noGc,code:0,stdout:node.stdout.toString()});
  }
 }finally{await rm(root,{recursive:true,force:true})}
},900000);

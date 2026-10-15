import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import ts from 'typescript';
import {compile} from '../../src/compile';
import {generateE2eCaseSource} from '../e2e/generated-cases';

const subject=`import * as namespace from 'node:os';import {userInfo} from 'node:os';
function consume(options:any,...extras:any[]):any{return userInfo(options,...extras)}
const baseline=consume(undefined);console.log('keys',Object.keys(baseline).join(','),Object.getPrototypeOf(baseline)===null);
for(const key of Object.keys(baseline)){const descriptor=Object.getOwnPropertyDescriptor(baseline,key)!;console.log('field',key,descriptor.writable,descriptor.enumerable,descriptor.configurable,'value' in descriptor)}
const saved=userInfo;console.log('owner',saved===namespace.userInfo,saved.name,saved.length,typeof saved.prototype,saved.prototype.constructor===saved);
console.log('stored',Reflect.apply(saved,{encoding:'buffer'},[{encoding:'buffer'}]).uid===baseline.uid);
let targetReads=0;function target(){};const newTarget=new Proxy(target,{get(owner,key,receiver){if(key==='prototype')targetReads++;return Reflect.get(owner,key,receiver)}});
const constructed=Reflect.construct(saved,[{encoding:'buffer'}],newTarget);console.log('construct',targetReads,Buffer.isBuffer(constructed.username),Object.getPrototypeOf(constructed)===Object.prototype);
const os={userInfo(){return {username:'shadow'}}};console.log('shadow',os.userInfo().username);

const ignored=function(){};Object.defineProperty(ignored,'encoding',{get(){throw new Error('function encoding read')}});
for(const value of [undefined,null,false,0,'text',17n,Symbol('option'),ignored]){const result=consume(value);console.log('non-object',typeof value,result.username===baseline.username,result.uid===baseline.uid,result.gid===baseline.gid)}
for(const encoding of [undefined,null,false,0,{},'unknown','UTF8','UTF-8','hex','HEX','base64','latin1','binary','ascii','buffer','BUFFER']){
 const result=consume({encoding});console.log('encoding',String(encoding),typeof result.username,Buffer.isBuffer(result.username),String(result.username),String(result.homedir),String(result.shell));
}
const array:any=[];array.encoding='buffer';console.log('array',Buffer.isBuffer(consume(array).username));
const boxed:any=new String('text');boxed.encoding='buffer';console.log('boxed',Buffer.isBuffer(consume(boxed).username));
const trace:string[]=[];let receiver:any;const inherited=Object.create({get encoding(){receiver=this;trace.push('encoding');return 'buffer'}});
const result=consume(inherited,...Array.from({length:7},()=>{trace.push('actual');return 0}));console.log('inherited',receiver===inherited,Buffer.isBuffer(result.username),trace.join(','));
const proxyTrace:string[]=[];const proxied=new Proxy({encoding:'hex'},{get(target,key,receiver){proxyTrace.push(String(key));return Reflect.get(target,key,receiver)}});
console.log('proxy',typeof consume(proxied).username,proxyTrace.join(','));
const unrelated={encoding:undefined,get other(){throw new Error('unrelated Get')}};console.log('unrelated',consume(unrelated).username===baseline.username);
const noConvert={encoding:{toString(){throw new Error('encoding converted')}}};console.log('conversion',consume(noConvert).username===baseline.username);
const marker={};let order='';try{consume({get encoding(){order+='g';throw marker}},(order+='a',0))}catch(error){console.log('abrupt',error===marker,order)}
console.log('void',consume(void (order+='v')).username===baseline.username,order);
let computedKey='encoding';console.log('computed',Buffer.isBuffer(consume({[computedKey]:'buffer'}).username));
let setterCount=0;Object.defineProperty(Object.prototype,'username',{set(){setterCount++},configurable:true});const ownResult=consume({});delete (Object.prototype as any).username;console.log('own-fields',setterCount,Object.hasOwn(ownResult,'username'));

`;

test('userInfo ordinary option Get and complete actual Lists agree with independent Node',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-user-info-options-'));
 try{for(const typed of [false,true])for(const noGc of [false,true]){
  const directory=path.join(temporary,`${typed}-${noGc}`);await fs.mkdir(directory);
  const stress=!typed&&!noGc?generateE2eCaseSource('{"generator":"os-user-info-option-depth","depth":4096}','property/os_user_info_option_depth'):'';
  const program=subject+stress,js=ts.transpileModule(program,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
  const oracle=path.join(directory,'oracle.mjs');await fs.writeFile(oracle,js);
  const node=nodeReferenceSync(['node',oracle],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=path.join(directory,typed?'main.ts':'main.mjs');await fs.writeFile(entry,typed?program:js);
  const output=path.join(directory,'program'),diagnostics:string[]=[];const built=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,code:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({typed,noGc,code:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({typed,noGc,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({typed,noGc,code:0,stderr:'',stdout:node.stdout.toString()});
 }}finally{await fs.rm(temporary,{recursive:true,force:true})}
},900000);

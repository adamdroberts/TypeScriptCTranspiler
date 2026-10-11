import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(collect:boolean):string{return `
function check(value,label){if(!value)throw label}
function ownNames(value){return Object.getOwnPropertyNames(value).filter(key=>key!=='stack').join('|')}
function ordinaryProperties(){
 for(const constructor of [Error,TypeError]){
  for(const message of [undefined,'']){const error=new constructor(message);check(ownNames(error)===(message===undefined?'':'message'),'message-presence')}
  const error=new constructor('before',{cause:undefined});
  check(ownNames(error)==='message|cause'&&Object.hasOwn(error,'cause'),'undefined-cause-presence');
  for(const key of Object.getOwnPropertyNames(error).filter(key=>key!=='stack')){const descriptor=Object.getOwnPropertyDescriptor(error,key);check(descriptor.writable&&!descriptor.enumerable&&descriptor.configurable,'own-property-attributes')}
  error.message='after';error.name='Renamed';check(error.toString()==='Renamed: after'&&String(error)==='Renamed: after','mutated-to-string');
  error.toString=()=> 'override';check(String(error)==='override','overridden-to-string');
  delete error.cause;check(!('cause' in error)&&!Object.hasOwn(error,'cause'),'deleted-cause');
  Object.defineProperty(error,'cause',{get(){return 'accessor'},configurable:true});check(error.cause==='accessor','cause-accessor');
 }
 const inherited=Object.create({cause:undefined}),error=new Error(undefined,inherited);check(ownNames(error)==='cause','inherited-cause');
 const aggregate=new AggregateError([],'many',{cause:undefined});check(ownNames(aggregate)==='message|cause|errors','aggregate-own-order');aggregate.errors=['replacement'];check(aggregate.errors[0]==='replacement','replaced-errors');
 const suppressed=new SuppressedError(undefined,undefined,undefined,{cause:'ignored'});check(ownNames(suppressed)==='error|suppressed','suppressed-presence');suppressed.error='primary';suppressed.suppressed='secondary';check(suppressed.error==='primary'&&suppressed.suppressed==='secondary','suppressed-mutation');
 let trace='';
 const receiver={get name(){trace+='n';return {toString(){trace+='N';return 'Custom'}}},get message(){trace+='m';return {toString(){trace+='M';return 'text'}}}};
 check(Error.prototype.toString.call(receiver)==='Custom: text'&&trace==='nNmM','to-string-access-order');
 for(const receiver of [undefined,null,1,'text',true,Symbol('x')]){let rejected=false;try{Error.prototype.toString.call(receiver)}catch(error){rejected=error instanceof TypeError}check(rejected,'to-string-receiver')}
 trace='';
 const message={toString(){trace+='message|';return 'many'}},options=new Proxy({cause:'root'},{has(target,key){trace+='has|';return Reflect.has(target,key)},get(target,key,receiver){trace+='get|';return Reflect.get(target,key,receiver)}}),iterable={[Symbol.iterator](){trace+='iterator|';return [1,2][Symbol.iterator]()}};
 const ordered=new AggregateError(iterable,message,options);check(trace==='message|has|get|iterator|'&&ordered.errors.join('|')==='1|2','aggregate-construction-order');
 class Derived extends Error{}const derived=new Derived('derived',{cause:'root'});check(derived instanceof Derived&&derived instanceof Error&&derived.cause==='root','derived-owner');
}
ordinaryProperties();
async function run(prefix){
 const cause=prefix+'cause';
 const ordinary=new Error(prefix+'ordinary',{cause});
 const aggregate=new AggregateError([prefix+'first',prefix+'second'],prefix+'aggregate',{cause});
 const primary={label:prefix+'primary'},secondary={label:prefix+'secondary'};
 const suppressed=new SuppressedError(primary,secondary,prefix+'suppressed');
 let chain=new Error('base');
 for(let depth=0;depth<4096;depth++)chain=new Error(String(depth),{cause:chain});
 await Promise.resolve();
 ${collect?'$262.gc();':''}
 check(ordinary.cause===cause&&aggregate.cause===cause,'suspended-cause');
 check(aggregate.errors.join('|')===prefix+'first|'+prefix+'second','aggregate-errors');
 check(suppressed.error===primary&&suppressed.suppressed===secondary,'suppressed-value-identities');
 let cursor=chain,depth=4095;while(cursor.cause!==undefined){check(cursor.message===String(depth),'deep-error-message');cursor=cursor.cause;depth--}check(depth===-1&&cursor.message==='base','deep-error-chain');
 const values=[{label:'object'},'string'+prefix,Symbol('value'),function retained(){return prefix},12345678901234567890n];
 for(const value of values){const error=new Error('partition',{cause:value}),many=new AggregateError([],'partition',{cause:value});check(error.cause===value&&many.cause===value,'value-kinds')}
 console.log('error values ok',prefix,aggregate.cause,depth);
}
run('retained-');
`}

test('Error payload values survive suspension and collection across source modes',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-error-values-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false));
  const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile&&!noGc));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'error-value-lifetime.ts#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
   if(observation)expect({noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({noGc,kind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

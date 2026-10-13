import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {generateE2eCaseSource} from '../e2e/generated-cases';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(depth:number,collect:boolean):string{return `
function check(value,label){if(!value)throw label;}
const foreign=$262.createRealm().global;
const methods=[Reflect.setPrototypeOf,foreign.Reflect.setPrototypeOf];
for(const method of methods){
 const expectedError=method===methods[0]?TypeError:foreign.TypeError;
 for(const primitive of [undefined,false,true,0,NaN,Infinity,-1,17n,'',Symbol('prototype')]){
  let trace='',target={};const original=Object.getPrototypeOf(target);
  const proxy=new Proxy(target,{setPrototypeOf(){trace+='trap';return true}});
  let caught;try{Reflect.apply(method,null,[proxy,primitive])}catch(error){caught=error}
  check(caught instanceof expectedError&&trace===''&&Object.getPrototypeOf(target)===original,'invalid-prototype-kind-order');
 }
 let trace='';const poison=new Proxy({},{get(){trace+='get';throw 'unexpected'},setPrototypeOf(){trace+='trap';throw 'unexpected'}});
 const callable=function(){};
 for(const prototype of [null,{},[],callable,poison]){
  const target={};check(Reflect.apply(method,null,[target,prototype])===true&&Object.getPrototypeOf(target)===prototype,'valid-prototype-identity');
 }
 check(trace==='','prototype-not-coerced');
 let called=false,caught;
 try{method(1,new Proxy({},{get(){called=true;throw 'unexpected'}}))}catch(error){caught=error}
 check(caught instanceof expectedError&&!called,'target-first');
 const target={},original=Object.getPrototypeOf(target);Object.preventExtensions(target);
 check(method(target,original)===true&&method(target,null)===false,'closed-target-result');
 const marker={};const abrupt=new Proxy({},{setPrototypeOf(){throw marker}});
 try{method(abrupt,null);throw 'accepted'}catch(error){check(error===marker,'trap-abrupt-identity')}
 print('prototype-validation:true');
}
let retained=null;
for(let index=0;index<${depth};index++){
 const method=methods[index%methods.length];let error;
 try{method({},17)}catch(caught){error=caught}
 retained={error,expected:method===methods[0]?TypeError:foreign.TypeError,next:retained};
}
${collect?'$262.gc();':''}
while(retained!==null){check(retained.error instanceof retained.expected,'retained-origin');retained=retained.next}
print('retained:true');
`;}

test('prototype validation shares actual exception owners and preserves call Realm and trap ordering',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-prototype-validation-'));
 try{for(const typed of [false,true])for(const noGc of [false,true]){
  const stress=!typed&&!noGc?generateE2eCaseSource('{"generator":"prototype-validation-depth","depth":4096}','property/prototype_validation_depth'):'';
  const source=subject(3,!noGc)+stress.replaceAll('console.log(', 'print('),reference=source.replace('$262.gc();','');
  const node=Bun.spawnSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");globalThis.print=value=>fs.writeSync(1,String(value)+"\\n");globalThis.$262={createRealm(){return {global:vm.runInNewContext("globalThis")}}};vm.runInThisContext(fs.readFileSync(0,"utf8"));'],{stdin:Buffer.from(reference),stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const directory=path.join(temporary,`${typed}-${noGc}`);await fs.mkdir(directory);
  const entry=path.join(directory,typed?'main.ts':'main.js'),output=path.join(directory,'program'),diagnostics:string[]=[];await fs.writeFile(entry,(typed?'// @ts-nocheck\n':'')+source);
  const built=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/prototype-validation#script',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({code:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({code:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString());
 }}finally{await fs.rm(temporary,{recursive:true,force:true})}
},600_000);

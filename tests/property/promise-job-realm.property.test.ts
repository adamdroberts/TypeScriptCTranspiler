import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';
import {promiseReactionInput} from '../e2e/generated-cases';

const subject=`const foreign:any=$262.createRealm().global,other:any=$262.createRealm().global;
function check(value:any,label:string):void{if(!value)throw label;(globalThis as any).print(label+':true')}
async function verify():Promise<void>{
 const revoked:any=Proxy.revocable(()=>1,{});revoked.revoke();
 for(const rejected of [false,true]){const source=rejected?Promise.reject(17):Promise.resolve(17);const pending=foreign.Promise.prototype.then.call(source,rejected?undefined:revoked.proxy,rejected?revoked.proxy:undefined);let error:any;try{await pending}catch(value){error=value}check(error?.constructor===foreign.TypeError,'settled-enqueue-Realm')}
 const capability:any=foreign.Promise.withResolvers();const pending=foreign.Promise.prototype.then.call(capability.promise,revoked.proxy);capability.resolve(19);let error:any;try{await pending}catch(value){error=value}check(error?.constructor===foreign.TypeError,'pending-settlement-Realm');
 const delayed:any=Proxy.revocable(()=>1,{}),later:any=other.Promise.withResolvers();const late=foreign.Promise.prototype.then.call(later.promise,delayed.proxy);delayed.revoke();later.resolve(21);try{await late}catch(value){error=value}check(error?.constructor===other.TypeError,'settlement-not-registration-Realm');
 const handle:any=Proxy.revocable(foreign.Function('return 23;'),{});const retained=other.Promise.prototype.then.call(Promise.resolve(23),handle.proxy);handle.revoke();try{await retained}catch(value){error=value}check(error?.constructor===foreign.TypeError,'handler-Realm-before-revocation');
 const thenable:any={then:revoked.proxy};try{await foreign.Promise.resolve(thenable)}catch(value){error=value}check(error?.constructor===foreign.TypeError,'thenable-fallback-Realm');
 const body:any=foreign.Function('throw new TypeError("body");');try{await Promise.resolve(29).then(body)}catch(value){error=value}check(error?.constructor===foreign.TypeError,'body-error-Realm');
 const marker={};check(await foreign.Promise.prototype.then.call(Promise.resolve(marker),undefined)===marker,'empty-fulfill-identity');try{await foreign.Promise.prototype.then.call(Promise.reject(marker),undefined,undefined)}catch(value){error=value}check(error===marker,'empty-reject-identity');
 check(Object.getPrototypeOf({})===Object.prototype,'caller-restored');
}verify().catch(error=>{throw error});`;

test('Promise jobs capture enqueue Realm and retain handler, argument and completion identity',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-promise-job-realm-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const source=subject+'\n'+promiseReactionInput(typed&&!noGc?2048:3),program=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}.js`);await writeFile(oracle,program);
  const node=Bun.spawnSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");globalThis.print=(value)=>fs.writeSync(1,String(value)+"\\n");globalThis.$262={createRealm(){return{global:vm.runInNewContext("globalThis")}}};vm.runInThisContext(fs.readFileSync(process.argv[1],"utf8"));',oracle],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?source:program);
  const result=await compile({entry,output,noGc,buildDir:output+'-build',initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/promise-job-realm.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(node.stdout.toString());
 }
 }finally{await rm(root,{recursive:true,force:true})}
},900000);

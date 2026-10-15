import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';
import {constructorCompletionInput} from '../e2e/generated-cases';

const subject=(node:boolean)=>`const foreign:any=$262.createRealm().global,caller:any=$262.createRealm().global;
function check(value:any,label:string):void{if(!value)throw label;(globalThis as any).print(label+':true')}
const missing:any=foreign.eval('(class extends Object{constructor(){}})'),primitive:any=foreign.eval('(class extends Object{constructor(){return 7}})'),body:any=foreign.eval('(class extends Object{constructor(){this.value=1}})'),thrown:any=foreign.eval('(class extends Object{constructor(){throw new ReferenceError("body")}})'),object:any=foreign.eval('(class extends Object{constructor(){return {value:17}}})'),initialized:any=foreign.eval('(class extends Object{constructor(){super();this.value=19}})'),base:any=foreign.eval('(class {constructor(){return 23}})');
for(const row of [{owner:missing,type:ReferenceError},{owner:primitive,type:TypeError}]){let error:any;try{new row.owner()}catch(value){error=value}check(error?.constructor===(row.type===ReferenceError&&${node}?foreign.ReferenceError:row.type),'caller-postbody-error');let otherError:any;try{caller.Reflect.construct(row.owner,[])}catch(value){otherError=value}check(otherError?.constructor===(row.type===TypeError?caller.TypeError:${node}?foreign.ReferenceError:caller.ReferenceError),'foreign-caller-postbody-error')}
for(const owner of [body,thrown]){let error:any;try{new owner()}catch(value){error=value}check(error?.constructor===foreign.ReferenceError,'body-error-Realm')}
const result:any=new object();check(result.value===17&&Object.getPrototypeOf(result)===foreign.Object.prototype,'object-return-identity');const ready:any=new initialized();check(ready.value===19&&ready instanceof initialized,'initialized-this');check(new base() instanceof base,'base-primitive-return');
check(Object.getPrototypeOf({})===Object.prototype,'caller-restored');`;

test('constructor completion checks use caller Realm while body abrupt values keep callee Realm',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-constructor-completion-realm-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const source=subject(false)+'\n'+constructorCompletionInput(typed&&!noGc?2048:3),program=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}.js`);await writeFile(oracle,ts.transpileModule(subject(true)+'\n'+constructorCompletionInput(typed&&!noGc?2048:3),{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText);
  const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");globalThis.print=(value)=>fs.writeSync(1,String(value)+"\\n");function realm(){const context=vm.createContext();const global=vm.runInContext("globalThis",context);const host={global,evalScript(source){return vm.runInContext(String(source),context)}};context.$262=host;return host}globalThis.$262={createRealm:realm};vm.runInThisContext(fs.readFileSync(process.argv[1],"utf8"));',oracle],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?source:program);
  const result=await compile({entry,output,noGc,buildDir:output+'-build',initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/constructor-completion-realm.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(node.stdout.toString());
 }
 }finally{await rm(root,{recursive:true,force:true})}
},900000);

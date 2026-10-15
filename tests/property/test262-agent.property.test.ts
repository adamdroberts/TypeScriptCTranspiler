import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {finiteEvalScriptSourceGraph,prepareNativeRequest} from '../test262/native-host';
import {parseHostObservation} from '../test262/protocol';
import {createHash} from 'node:crypto';

const worker=`var local=0;++local;
$262.agent.receiveBroadcast(async function(buffer,id){
 const a=new Int32Array(buffer);const old=Atomics.add(a,0,1);
 if(old===0)buffer.grow(32);
 while(a.length!==8)$262.agent.sleep(1);
 if(Object.getPrototypeOf(buffer)!==SharedArrayBuffer.prototype||buffer.marker!==undefined||a.length!==8||typeof parentTag!=='undefined'||local!==1||typeof $262.agent.start!=='undefined')throw new Error('agent isolation');
 $262.agent.report('sync:'+old+':'+String(id));
 if(Atomics.wait(a,1,0)!=='ok')throw new Error('blocking wait');
 const pending=Atomics.waitAsync(a,3,0);
 $262.agent.report('async:'+old);
 if(!pending.async||await pending.value!=='ok')throw new Error('async wait');
 $262.agent.report('done:'+old);$262.agent.leaving();
});`;
const retained=`for(var i=0;i<4096;++i)$262.agent.report('retained:'+i);$262.agent.leaving();`;
const progress="$262.agent.receiveBroadcast(async function(sab){await Promise.resolve();const a=new Int32Array(sab);a[0]=17;Atomics.store(a,1,23);sab.grow(32);$262.agent.report('progress');$262.agent.leaving();});";
function subject(){return `'use strict';
function check(v,m){if(!v)throw new Error(m)}
function report(){let value=null;while(value===null){value=$262.agent.getReport();if(value===null)$262.agent.sleep(1)}return value}
var parentTag=17;
const agent=$262.agent;
for(const [name,length] of [['start',1],['broadcast',2],['getReport',0],['sleep',1],['monotonicNow',0]]){
 const fn=agent[name];check(fn.name===name&&fn.length===length,'metadata');const d=Object.getOwnPropertyDescriptor(agent,name);check(d.writable&&d.enumerable&&d.configurable,'descriptor');let caught=false;try{Reflect.construct(fn,[])}catch(e){caught=e instanceof TypeError}check(caught,'nonconstructor');
}
check(agent.receiveBroadcast===undefined&&agent.report===undefined&&agent.leaving===undefined&&agent.getReport()===null,'parent role');
const before=agent.monotonicNow();agent.sleep(2);check(agent.monotonicNow()>=before,'monotonic');
const start=agent.start;const broadcast=agent.broadcast;
const progressSource=${JSON.stringify(progress)};
start(progressSource);
const progressBuffer=new SharedArrayBuffer(16,{maxByteLength:32});
const progressWords=new Int32Array(progressBuffer);
broadcast(progressBuffer);
// Busy polling must permit independent agents to progress without an
// explicit host sleep, Promise job boundary or blocking wait in the parent.
while(progressWords[0]!==17){}
while(Atomics.load(progressWords,1)!==23){}
while(progressWords.length!==8){}
check(report()==='progress','independent shared-memory progress');
const source=${JSON.stringify(worker)};
for(let n=0;n<5;++n){
 const shared=new SharedArrayBuffer(16,{maxByteLength:32});shared.marker=13;
 for(let j=0;j<n;++j)Reflect.apply(start,Symbol(),[source,'ignored']);
 const id=n%2?18446744073709551617n:4294967309;
 Reflect.apply(broadcast,Symbol(),[shared,id]);
 const words=new Int32Array(shared);const seen=[];
 for(let j=0;j<n;++j){const value=report();check(value.startsWith('sync:'),'sync report');const parts=value.split(':');check(parts[2]===String(n%2?id:13),'broadcast numeric value');seen.push(Number(parts[1]))}
 check(seen.sort((a,b)=>a-b).every((v,i)=>v===i),'contended old values');
 let notified=0;while(notified<n){notified+=Atomics.notify(words,1);if(notified<n)agent.sleep(1)}
 for(let j=0;j<n;++j)check(report().startsWith('async:'),'async report');
 notified=0;while(notified<n){notified+=Atomics.notify(words,3);if(notified<n)agent.sleep(1)}
 for(let j=0;j<n;++j)check(report().startsWith('done:'),'completion report');
 check(Atomics.load(words,0)===n&&words.length===(n?8:4),'shared clone/growth');
}
const chainSource=${JSON.stringify(retained)};start(chainSource);
for(let i=0;i<4096;++i)check(report()==='retained:'+i,'retained queue order');
check(agent.getReport()===null,'drained queue');console.log('agent lifecycle and shared waits',true);console.log('retained report graph',4096);
start(progressSource);broadcast(new SharedArrayBuffer(16,{maxByteLength:32}));
new Promise(function(resolve){
 function poll(){
  const value=agent.getReport();
  if(value===null)Promise.resolve().then(poll);
  else {check(value==='progress','independent job progress');resolve();}
 }
 poll();
}).then(function(){console.log('job queue progress',true)});
`}

test('Test262 agents share canonical source closure, mailbox lifecycle, Realm isolation and shared wait queues',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-test262-agent-'));
 try{
  const source=subject();const graph=finiteEvalScriptSourceGraph([{path:'main.js',source}]);
  expect(graph.error).toBeNull();expect(new Set(graph.agentSources)).toEqual(new Set([worker,retained,progress]));
  const fields=finiteEvalScriptSourceGraph([{path:'fields.js',source:'$262.agent.options={source:"$262.agent.leaving();"};const body=$262.agent.options.source;$262.createRealm().agent.start(body);'}]);
  expect(fields.error).toBeNull();expect(fields.agentSources).toEqual(['$262.agent.leaving();']);
  const absent=finiteEvalScriptSourceGraph([{path:'absent.js',source:'$262.agent.start(globalThis.unknownSource);'}]);expect(absent.agentSources).toEqual(['undefined']);
  const unknown=finiteEvalScriptSourceGraph([{path:'main.js',source:'$262.agent.start(readSource());'}]);expect(unknown.error).toContain('agent.start source is not a finite static string expression');
  const reference=path.join(root,'reference.js');await fs.writeFile(reference,source);
  const trace=path.join(root,'oracle.trace');const node=nodeReferenceSync(['node',path.resolve('tests/property/helpers/test262-agent-node.cjs'),reference],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,TSC2C_AGENT_ORACLE_TRACE:trace}});expect({code:node.exitCode,stderr:node.stderr.toString(),trace:node.exitCode?await fs.readFile(trace,'utf8'):''}).toEqual({code:0,stderr:'',trace:''});
  for(const noGc of [false,true])for(const typed of [false,true]){
   const directory=path.join(root,noGc+'-'+typed);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.js'),output=path.join(directory,'program');await fs.writeFile(entry,(typed?'// @ts-nocheck\n':'')+source);
   const diagnostics:string[]=[];const result=await compile({entry,output,buildDir:path.join(directory,'build'),noGc,isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'agent-property#script',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({code:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({code:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});expect({noGc,typed,code:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,typed,code:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');if(observation.kind==='normal')expect(observation.stdout).toBe(node.stdout.toString());
  }
  for(const [name,body,kind] of [
   ['sleep-teardown','$262.agent.start("$262.agent.sleep(Infinity);");console.log("sleep teardown");','normal'],
   ['async-rejection','$262.agent.start("$262.agent.receiveBroadcast(async function(){throw 17;});");$262.agent.broadcast(new SharedArrayBuffer(4));while(true){$262.agent.getReport();$262.agent.sleep(1);}','throw'],
  ] as const){
   const directory=path.join(root,name);await fs.mkdir(directory);const entry=path.join(directory,'main.js'),output=path.join(directory,'program');await fs.writeFile(entry,body);
   const diagnostics:string[]=[];const result=await compile({entry,output,buildDir:path.join(directory,'build'),isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:name+'#script',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({code:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({code:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({name,code:native.exitCode,stderr:native.stderr.toString()}).toEqual({name,code:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe(kind);
   if(observation.kind==='normal')expect(observation.stdout).toBe('sleep teardown\n');
   if(observation.kind==='throw')expect(observation.errorConstructor).toBe('Error');
  }
 }finally{await fs.rm(root,{recursive:true,force:true})}
},600_000);

test('Native host preparation preserves UTF-16 agent source code units',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-agent-source-'));
 try{
  const worker='var value="'+String.fromCharCode(0xd800)+'";$262.agent.report(value.charCodeAt(0));$262.agent.leaving();';
  const source='$262.agent.start('+JSON.stringify(worker)+');let value=null;while(value===null){value=$262.agent.getReport();if(value===null)$262.agent.sleep(1);}console.log(value);';
  const prepared=await prepareNativeRequest({protocolVersion:4,scenarioId:'raw-agent-source#raw',testPath:'test/raw-agent-source.js',moduleBasePath:'test',moduleFiles:[],mode:'raw',goal:'script',raw:true,setupScripts:[],testSource:source,testSourceSha256:createHash('sha256').update(source).digest('hex'),async:false,canBlock:null,timeoutMs:120_000,artifactDirectory:root});
  expect(prepared.kind).toBe('prepared-native');
  if(prepared.kind==='prepared-native'){
   const native=Bun.spawnSync([path.join(root,prepared.executablePath)],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');if(observation.kind==='normal')expect(observation.stdout).toBe('55296\n');
  }
 }finally{await fs.rm(root,{recursive:true,force:true})}
},600_000);

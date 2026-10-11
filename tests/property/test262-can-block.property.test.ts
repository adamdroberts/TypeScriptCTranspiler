import { expect, test } from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { compile } from '../../src/compile';
import { prepareNativeRequest } from '../test262/native-host';
import { parseHostObservation, type HostRequest } from '../test262/protocol';
import { runPreparedNative, makeTemporaryTreeRemovable } from '../test262/run';
import { buildEvidenceContainment } from '../test262/process-supervision';

const probe = `function probe() {
 const a=new Int32Array(new SharedArrayBuffer(8));
 try { return [Atomics.wait(a,0,0,0),Atomics.wait(a,0,1,0)].join('/'); }
 catch(error) { return error.constructor.name; }
} probe();`;
const worker = `$262.agent.receiveBroadcast(function(sab){
 const a=new Int32Array(sab);
 $262.agent.report([Atomics.wait(a,0,0,0),Atomics.wait(a,0,1,0)].join('/'));
 $262.agent.leaving();
});`;
const notifier = `$262.agent.receiveBroadcast(function(sab){
 const a=new Int32Array(sab);
 while(Atomics.notify(a,0,1)===0)$262.agent.sleep(1);
 $262.agent.report('notified');$262.agent.leaving();
});`;
const expectedFor = (policy: boolean | null) => policy !== false ? 'timed-out/not-equal' : 'TypeError';
function subject(policy: boolean | null, stress: boolean) {
 return `
function check(value) { if(!value)throw new Error('can-block policy invariant'); }
function report() { let value=null;while(value===null){value=$262.agent.getReport();if(value===null)$262.agent.sleep(1);}return value; }
${probe}
const expected=${JSON.stringify(expectedFor(policy))};
check(probe()===expected);
const a=new Int32Array(new SharedArrayBuffer(8));
const order=[];
let result;
try { result=Atomics.wait(a,{valueOf(){order.push('index');return 0;}},{valueOf(){order.push('value');return 1;}},{valueOf(){order.push('timeout');return 0;}}); }
catch(error) { result=error.constructor.name; }
check(order.join(',')==='index,value,timeout');
check(result===${JSON.stringify(policy !== false ? 'not-equal' : 'TypeError')});
const asynchronous=Atomics.waitAsync(a,0,0,0);
check(asynchronous.async===false&&asynchronous.value==='timed-out');
const realm=$262.createRealm();
check(realm.evalScript(${JSON.stringify(probe)})===expected);
check(probe()===expected);
if(${stress})for(let depth=0;depth<4096;++depth)check(realm.evalScript(${JSON.stringify(probe)})===expected);
$262.agent.start(${JSON.stringify(worker)});$262.agent.broadcast(a.buffer);
check(report()==='timed-out/not-equal');
if(${policy !== false}) {
 $262.agent.start(${JSON.stringify(notifier)});$262.agent.broadcast(a.buffer);
 check(Atomics.wait(a,0,0,Infinity)==='ok');check(report()==='notified');
}
console.log('agent policy',expected);
`;
}

test('Test262 blocking selection reaches the owning agent before every source goal', async () => {
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-can-block-'));
 try {
  // Node independently verifies the permitted-blocking semantic partition;
  // the nonblocking partition follows the pinned DoWait TypeError rule.
  const oracle=Bun.spawnSync(['node','-e',probe+'console.log(probe());'],{stdout:'pipe',stderr:'pipe'});
  expect({code:oracle.exitCode,stderr:oracle.stderr.toString(),stdout:oracle.stdout.toString()})
   .toEqual({code:0,stderr:'',stdout:'timed-out/not-equal\n'});
  for(const canBlock of [null,false,true]) {
   const name='noGC-'+String(canBlock),entry=path.join(root,name+'.js'),output=path.join(root,name);
   await fs.writeFile(entry,subject(canBlock,canBlock===true));
   const diagnostics:string[]=[];
   const compiled=await compile({entry,output,noGc:true,buildDir:output+'-build',
    test262Observation:{kind:'test262-native-observation',scenarioId:name,setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false,canBlock},
    diagnosticWriter:message=>diagnostics.push(message)});
   expect({code:compiled.exitCode,diagnostics:diagnostics.join('')}).toEqual({code:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));
   expect(observation.kind).toBe('normal');
   if(observation.kind==='normal')expect(observation.stdout).toBe('agent policy '+expectedFor(canBlock)+'\n');
  }
  const containment=await buildEvidenceContainment(path.join(root,'containment'),'gcc',process.env);
  // Mode is carried by the same request record as policy; startup has one
  // Boolean selection before harness, Script or Module evaluation.
  const scenarios=[{mode:'raw',canBlock:null},{mode:'sloppy',canBlock:true},{mode:'strict',canBlock:false},{mode:'module',canBlock:true}] as const;
  for(const {mode,canBlock} of scenarios) {
   const artifactDirectory=path.join(root,mode);await fs.mkdir(artifactDirectory);
   const testSource=(mode==='strict'?'"use strict";\n':'')+subject(canBlock,false)+(mode==='module'?'\nexport {};':'');
   const setup=probe+`if(probe()!==${JSON.stringify(expectedFor(canBlock))})throw new Error('setup policy invariant');`;
   const setupScripts=mode==='raw'?[]:[{path:'harness/policy.js',source:setup,sha256:createHash('sha256').update(setup).digest('hex')}];
   const request:HostRequest={protocolVersion:4,scenarioId:'policy#'+mode,testPath:'test/policy.js',moduleBasePath:'test',moduleFiles:[],mode,goal:mode==='module'?'module':'script',raw:mode==='raw',setupScripts,testSource,testSourceSha256:createHash('sha256').update(testSource).digest('hex'),async:false,canBlock,timeoutMs:120_000,artifactDirectory};
   const prepared=await prepareNativeRequest(request);expect(prepared.kind).toBe('prepared-native');
   if(prepared.kind!=='prepared-native')throw new Error(JSON.stringify(prepared));
   const result=await runPreparedNative(request,prepared,{id:request.scenarioId,async:false},120_000,process.env,'a'.repeat(64),containment);
   expect({status:result.status,kind:result.observation.kind}).toEqual({status:'pass',kind:'normal'});
   if(result.observation.kind==='normal')expect(result.observation.stdout).toBe('agent policy '+expectedFor(canBlock)+'\n');
  }
 } finally {await makeTemporaryTreeRemovable(root);await fs.rm(root,{recursive:true,force:true});}
},600_000);

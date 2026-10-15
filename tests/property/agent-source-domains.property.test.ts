import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {compile} from '../../src/compile';
import {finiteEvalScriptSourceGraph,prepareNativeRequest} from '../test262/native-host';
import {sourceAgentDomain} from '../../src/source-value-flow';
import {parseHostObservation} from '../test262/protocol';

const worker='globalThis.body=readSource();$262.agent.report("ok");$262.agent.leaving();';
const calls=['start(body)','start.apply(undefined,[body])','Reflect.apply(start,undefined,[...[body]])','start(...[...[body]])'];
test('execution domains and fresh actual Lists preserve finite sources while exposed aliases fail closed',()=>{
 for(const call of calls){
  const closed=finiteEvalScriptSourceGraph([{path:'main.js',source:`const body=${JSON.stringify(worker)};const start=$262.agent.start;for(let i=0;i<2;i++){${call};}`}]);
  expect(closed.error).toBeNull();expect(closed.agentSources).toEqual([worker]);
  const graph=finiteEvalScriptSourceGraph([{path:'main.js',source:`globalThis.body=${JSON.stringify(worker)};const start=$262.agent.start;for(let i=0;i<2;i++){opaque();${call};}`}]);
  const iterates=call.includes('...');
  if(iterates)expect(graph.error).toContain('agent.start source is not a finite static string expression');
  else{expect(graph.error).toBeNull();expect(graph.agentSources).toEqual([worker]);}
  const reference=`const fs=require('node:fs');const body='original';function start(value){fs.writeSync(1,value+'\\n');}function opaque(){Array.prototype[Symbol.iterator]=function*(){yield 'changed';};}for(let i=0;i<2;i++){opaque();${call};}`;
  const node=nodeReferenceSync(['node','-e',reference],{stdout:'pipe',stderr:'pipe'});
  expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  expect(node.stdout.toString()).toBe((iterates?'changed\n':'original\n').repeat(2));
 }
 for(const call of ['const args=[body];mutate(args);Reflect.apply(start,undefined,args);','Reflect.apply(start,undefined,[readSource()]);']){
  const graph=finiteEvalScriptSourceGraph([{path:'main.js',source:`const body=${JSON.stringify(worker)};const start=$262.agent.start;${call}`}]);
  expect(graph.error).toContain('agent.start source is not a finite static string expression');
 }
 const nonConstructor=finiteEvalScriptSourceGraph([{path:'main.js',source:'try{new $262.agent.start(readSource());}catch(e){}'}]);
 expect(nonConstructor.error).toBeNull();expect(nonConstructor.agentSources).toEqual([]);
 const inner='eval("var local=1;");(0,eval)("var indirect=1;");';
 const body=`$262.evalScript(${JSON.stringify(inner)});$262.agent.leaving();`;
 const graph=finiteEvalScriptSourceGraph([{path:'main.js',source:`$262.evalScript(${JSON.stringify(inner)});$262.agent.start(${JSON.stringify(body)});`}]);
 expect(graph.error).toBeNull();
 for(const entries of [graph.scriptSources,graph.directEvalSources,graph.indirectEvalSources])expect(new Set(entries.map(entry=>entry.domain??'main'))).toEqual(new Set(['main',sourceAgentDomain(body)]));
 const lists=[`const list0=[${JSON.stringify(worker)}];`];
 for(let index=1;index<512;index++)lists.push(`const list${index}=[...list${index-1}];`);
 const deep=lists.join('\n')+'Reflect.apply($262.agent.start,undefined,[...list511]);';
 const node=nodeReferenceSync(['node','-e','globalThis.$262={agent:{start:source=>require("node:fs").writeSync(1,source)}};'+deep],{stdout:'pipe',stderr:'pipe'});
 expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});expect(node.stdout.toString()).toBe(worker);
 const deepGraph=finiteEvalScriptSourceGraph([{path:'main.js',source:deep}]);expect(deepGraph.error).toBeNull();expect(deepGraph.agentSources).toEqual([worker]);
},1_200_000);

test('imported worker sources and nested eval/Function bodies retain their execution domain',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-agent-source-domains-'));
 try{
  for(const noGc of [false,true])for(const typed of [false,true]){
   const directory=join(root,noGc+'-'+typed);await mkdir(directory);
   const depth=typed&&!noGc?64:1;
   for(let index=0;index<depth;index++)await writeFile(join(directory,'node-'+index+'.mjs'),index+1<depth?`export {body} from './node-${index+1}.mjs';`:`export const body="worker";(0,eval)('globalThis.importedTag="module";');`);
   const nested='globalThis.result=Function("return globalThis.role;")();';
   const body=`import(${JSON.stringify(join(directory,'node-0.mjs'))}).then(function(module){globalThis.role=module.body;(0,eval)(${JSON.stringify(nested)});$262.agent.report(globalThis.result);$262.agent.leaving();});`;
   const call=calls[(Number(noGc)*2+Number(typed))]!;
   const source=`globalThis.role='parent';const start=$262.agent.start;const body=${JSON.stringify(body)};for(let i=0;i<2;i++){$262.agent.sleep(0);${call};}(0,eval)(${JSON.stringify(nested)});const reports=[];while(reports.length<2){const value=$262.agent.getReport();if(value===null)$262.agent.sleep(1);else reports.push(value);}console.log(globalThis.result+':'+reports.sort().join('|'));`;
   const reference=join(directory,'reference.js');await writeFile(reference,source);
   const node=nodeReferenceSync(['node','--no-warnings',resolve('tests/property/helpers/test262-agent-node.cjs'),reference],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});expect(node.stdout.toString()).toBe('parent:worker|worker\n');
   const entry=join(directory,typed?'main.ts':'main.js'),output=join(directory,'program');await writeFile(entry,(typed?'// @ts-nocheck\n':'')+source);
   const diagnostics:string[]=[];
   const result=await compile({entry,output,buildDir:join(directory,'build'),noGc,isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'agent-source-domains#script',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,typed,code:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,typed,code:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({noGc,typed,code:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,typed,code:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect({noGc,typed,observation}).toMatchObject({observation:{kind:'normal'}});if(observation.kind==='normal')expect(observation.stdout).toBe(node.stdout.toString());
   if(typed){
    const cliOutput=join(directory,'cli-program'),cli=await compile({entry,output:cliOutput,buildDir:join(directory,'cli-build'),noGc,diagnosticWriter:message=>diagnostics.push(message)});
    expect({noGc,code:cli.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,code:0,diagnostics:''});
    const execution=Bun.spawnSync([cliOutput],{stdout:'pipe',stderr:'pipe',timeout:120_000});
    expect({noGc,code:execution.exitCode,stderr:execution.stderr.toString()}).toEqual({noGc,code:0,stderr:''});expect(execution.stdout.toString()).toBe(node.stdout.toString());
   }
  }
 }finally{await rm(root,{recursive:true,force:true});}
},600_000);

test('native-host preparation preserves domain ownership for identical nested Script text',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-agent-prepared-domains-'));
 try{
  const nested='globalThis.result=Function("return globalThis.role;")();';
  const worker=`globalThis.role='worker';$262.evalScript(${JSON.stringify(nested)});$262.agent.report(globalThis.result);$262.agent.leaving();`;
  const source=`globalThis.role='parent';$262.agent.start(${JSON.stringify(worker)});$262.evalScript(${JSON.stringify(nested)});let report=null;while(report===null){report=$262.agent.getReport();if(report===null)$262.agent.sleep(1);}console.log(globalThis.result+':'+report);`;
  const reference=join(root,'reference.js');await writeFile(reference,source.replaceAll('$262.evalScript(', '(0,eval)('));
  const node=nodeReferenceSync(['node',resolve('tests/property/helpers/test262-agent-node.cjs'),reference],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});expect(node.stdout.toString()).toBe('parent:worker\n');
  const artifacts=join(root,'artifacts');await mkdir(artifacts);
  const prepared=await prepareNativeRequest({protocolVersion:4,scenarioId:'prepared-agent-domains#raw',testPath:'test/agent-domains.js',moduleBasePath:'test',moduleFiles:[],mode:'raw',goal:'script',raw:true,setupScripts:[],testSource:source,testSourceSha256:createHash('sha256').update(source).digest('hex'),async:false,canBlock:null,timeoutMs:120_000,artifactDirectory:artifacts});
  expect(prepared.kind).toBe('prepared-native');
  if(prepared.kind==='prepared-native'){
   const native=Bun.spawnSync([join(artifacts,prepared.executablePath)],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');if(observation.kind==='normal')expect(observation.stdout).toBe(node.stdout.toString());
  }
 }finally{await rm(root,{recursive:true,force:true});}
},600_000);

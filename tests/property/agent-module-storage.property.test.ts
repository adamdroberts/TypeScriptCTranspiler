import {expect,test} from "bun:test";
import {mkdtemp,mkdir,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";

async function sources(directory:string,depth:number,collect:boolean):Promise<string>{
 await writeFile(join(directory,'common.cjs'),"exports.value=0;exports.take=function(){return exports.value++;};\n");
 await writeFile(join(directory,'shared.mjs'),`import * as common from './common.cjs';export let value=0;export const metadata=import.meta;metadata.value=0;metadata.owner=globalThis.workerTag;export class Counter {static value=0;static take(){return this.value++;}};export function take(){const before=[value++,metadata.value++,Counter.take(),common.take()];return before.join(':');}`);
 for(let index=0;index<depth;index++)await writeFile(join(directory,'node-'+index+'.mjs'),index+1<depth?`export * as next from './node-${index+1}.mjs';export const metadata=import.meta;`:`export * as leaf from './shared.mjs';export const metadata=import.meta;`);
 const worker=`$262.agent.receiveBroadcast(async function(buffer,id){
  globalThis.workerTag='worker:'+id;
  const graph=await import(${JSON.stringify(join(directory,'node-0.mjs'))});
  let node=graph;for(let level=1;level<${depth};level++)node=node.next;
  const module=node.leaf;const again=await import(${JSON.stringify(join(directory,'shared.mjs'))});
  const marker={token:id};module.metadata.retained=marker;${collect?'$262.gc();':''}
  const own=module===again&&module.metadata.owner===globalThis.workerTag&&module.metadata.retained===marker&&Object.getPrototypeOf(module.Counter)===Function.prototype;
  const before=module.take(),after=module.take();
  $262.agent.report(String(id)+':'+String(own)+':'+before+':'+after);$262.agent.leaving();
 });`;
 return `const source=${JSON.stringify(worker)};
 function report(){let result=null;const deadline=$262.agent.monotonicNow()+10000;while(result===null&&$262.agent.monotonicNow()<deadline){result=$262.agent.getReport();if(result===null)$262.agent.sleep(1);}if(result===null)throw new Error('agent report deadline');return result;}
 // Sequential retirement and concurrently live agents exercise the same
 // source closure and Module storage; lifecycle never selects another plan.
 for(const id of [1,2]){$262.agent.start(source);$262.agent.broadcast(new SharedArrayBuffer(4),id);console.log(report());}
 $262.agent.start(source);$262.agent.start(source);$262.agent.broadcast(new SharedArrayBuffer(4),3);const reports=[report(),report()];reports.sort();for(const value of reports)console.log(value);
 `;
}
test('generated Module storage belongs to the semantic agent across imports, aliases and retirement',async()=>{
 const temporary=await mkdtemp(join(tmpdir(),'tsc2c-agent-module-storage-'));
 try{
  for(const typed of [false,true])for(const noGc of [false,true]){
   const directory=join(temporary,`${typed}-${noGc}`);await mkdir(directory);const source=await sources(directory,typed&&!noGc?64:3,!noGc);
   const reference=join(directory,'reference.js');await writeFile(reference,source.replace('$262.gc();',''));
   const node=Bun.spawnSync(['node','--disable-warning=ExperimentalWarning',resolve('tests/property/helpers/test262-agent-node.cjs'),reference],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exit:node.exitCode,stderr:node.stderr.toString()}).toEqual({exit:0,stderr:''});
   const entry=join(directory,typed?'main.ts':'main.js');await writeFile(entry,(typed?'// @ts-nocheck\n':'')+source);const output=join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,buildDir:join(directory,'build'),isolatedScriptRoots:[entry],initializationEntries:[entry],diagnosticWriter:message=>diagnostics.push(message),test262Observation:{kind:'test262-native-observation',scenarioId:'property/agent-module-storage#script',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false}});
   expect({exit:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exit:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exit:native.exitCode,stderr:native.stderr.toString()}).toEqual({exit:0,stderr:''});
   const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(node.stdout.toString());
  }
 }finally{await rm(temporary,{recursive:true,force:true});}
},900_000);

import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {compile} from '../../src/compile';import {parseHostObservation} from '../test262/protocol';
const forms=[(x:string)=>`(${x})`,(x:string)=>`(((${x})))`];
function source(noGc:boolean){
 const records=[];
 for(const group of forms){
  records.push(`{let calls=0;const object={value:7},alias=${group('object')};const number=${group('1+2')};if(number!==3||alias!==object)throw 'value';print('value:true');}`);
  records.push(`{let value=7;const old=${group('value')}++;${group('value')}+=2;if(old!==7||value!==10)throw 'binding';print('binding:true');}`);
  records.push(`{let trace='';const object={value:7};function base(){trace+='base|';return object;}function key(){trace+='key|';return 'value';}const old=${group('base()[key()]')}++;if(old!==7||object.value!==8||trace!=='base|key|')throw 'property';print('property:true');}`);
  records.push(`{if(typeof ${group('missingBinding')}!=='undefined')throw 'typeof';print('typeof:true');}`);
  records.push(`{let object={value:7};if(!delete ${group('object.value')}||'value' in object)throw 'delete';print('delete:true');}`);
  records.push(`{let caught=false;try{typeof ${group('later')};}catch(error){caught=error instanceof ReferenceError;}let later=7;if(!caught)throw 'tdz';print('tdz:true');}`);
  records.push(`{const object={method(){return this;}};if(${group('object.method')}()!==object)throw 'receiver';print('receiver:true');}`);
  records.push(`{function run(){let value=7;${group('eval')}('value=17');return value;}if(run()!==17)throw 'direct-eval';print('direct-eval:true');}`);
  records.push(`{let calls=0,object=null;try{${group('object?.method')}(calls++);}catch(error){if(!(error instanceof TypeError))throw error;}if(calls!==1)throw 'optional-boundary';print('optional-boundary:true');}`);
  records.push(`{const reason={marker:true};function fail(){throw reason;}try{${group('fail()')};throw 'unreachable';}catch(error){if(error!==reason)throw 'abrupt';}print('abrupt:true');}`);
 }
 return records.join('\n')+`\n${noGc?'':'$262.gc();'}`;
}
test('grouping Evaluation preserves values, References, receiver, direct eval and boundaries',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-grouping-evaluation-'));
 try{
  const entry=join(directory,'source.js');await writeFile(entry,source(true));
  const oracle=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});',entry],{stdout:'pipe',stderr:'pipe',timeout:60_000});expect({exit:oracle.exitCode,err:oracle.stderr.toString()}).toEqual({exit:0,err:''});
  for(const noGc of [false,true]){
   await writeFile(entry,source(noGc));const output=join(directory,'program-'+noGc),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,buildDir:join(directory,'build-'+noGc),isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/grouping-evaluation.js#sloppy',setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exit:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exit:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exit:native.exitCode,err:native.stderr.toString()}).toEqual({exit:0,err:''});const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation).toEqual(expect.objectContaining({kind:'normal'}));expect(observation.stdout).toBe(oracle.stdout.toString());
  }
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

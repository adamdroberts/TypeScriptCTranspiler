import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';
import {compile} from '../../src/compile';import {parseHostObservation} from '../test262/protocol';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
function reference(source:string):string {
 const script='const fs=require("node:fs"),vm=require("node:vm");new vm.Script(\'function external(){return "19;";}\'+fs.readFileSync(0,"utf8")).runInNewContext({print:value=>{fs.writeSync(1,String(value)+"\\n");},setImmediate,setTimeout,setInterval,clearInterval,queueMicrotask});';
 const node=nodeReferenceSync(['node','-e',script],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});return node.stdout.toString();
}
const original='{const owner={body:"17;"};setImmediate(()=>{print(eval(owner.body));print("deferred-complete");});owner.body="19;";}';
const reaction=(method:string,body='"19;"')=>'{const owner={body:"17;"};const task='+method+'(()=>{print(eval(owner.body));});owner.body='+body+';task.then(()=>print("reaction-complete"));}';
const schedules=['setImmediate(callback)','setTimeout(callback,0)','queueMicrotask(callback)','ticket=setInterval(()=>{clearInterval(ticket);callback();},0)'];
const timer=(schedule:string,body='"19;"')=>'{const owner={body:"17;"};let ticket;const callback=()=>{print(eval(owner.body));print("timer-complete");};'+schedule+';owner.body='+body+';}';
const executor='{const owner={body:"17;"};new Promise(resolve=>{print(eval("/*executor*/"+owner.body));resolve();});owner.body="19;";print("executor-complete");}';
const thenable='{const owner={body:"17;"};const thenable={get then(){print(eval("/*get*/"+owner.body));return resolve=>{print(eval("/*job*/"+owner.body));resolve();};}};const task=Promise.resolve(thenable);owner.body="19;";task.then(()=>print("thenable-complete"));}';
const fresh='{setImmediate(()=>{let body="23;";const saved=body;body=String(Math.random())+";";print(eval(saved));print("fresh-complete");});}';
test('source invocation timing separates immediate access/executors from queued and repeated jobs',()=>{
 for(const method of ['Promise.resolve().then','Promise.reject(0).catch','Promise.resolve().finally']){
  const source=reaction(method);expect(reference(source)).toBe('19\nreaction-complete\n');const result=graph([{path:'subject.js',source}]);expect(result.error).toBeNull();expect(result.directEvalSources.map(value=>value.source)).toContain('19;');
  const unknown=reaction(method,'external()');expect(reference(unknown)).toBe('19\nreaction-complete\n');expect(graph([{path:'subject.js',source:unknown}]).error).toContain('direct eval source is not a finite static string expression');
 }
 for(const schedule of schedules){const source=timer(schedule);expect(reference(source)).toBe('19\ntimer-complete\n');const result=graph([{path:'subject.js',source}]);expect(result.error).toBeNull();expect(result.directEvalSources.map(value=>value.source)).toContain('19;');const unknown=timer(schedule,'external()');expect(reference(unknown)).toBe('19\ntimer-complete\n');expect(graph([{path:'subject.js',source:unknown}]).error).toContain('direct eval source is not a finite static string expression');}
 expect(reference(executor)).toBe('17\nexecutor-complete\n');const immediate=graph([{path:'subject.js',source:executor}]);expect(immediate.error).toBeNull();expect(immediate.directEvalSources.map(value=>value.source)).toEqual(['/*executor*/17;']);
 expect(reference(thenable)).toBe('17\n19\nthenable-complete\n');const resolved=graph([{path:'subject.js',source:thenable}]);expect(resolved.error).toBeNull();expect(resolved.directEvalSources.map(value=>value.source)).toEqual(expect.arrayContaining(['/*get*/17;','/*job*/19;']));expect(resolved.directEvalSources.map(value=>value.source)).not.toContain('/*get*/19;');
 expect(reference(fresh)).toBe('23\nfresh-complete\n');const saved=graph([{path:'subject.js',source:fresh}]);expect(saved.error).toBeNull();expect(saved.directEvalSources.map(value=>value.source)).toEqual(['23;']);
});
function retainedSource():string {const aliases=Array.from({length:512},(_,index)=>'const owner'+(index+1)+'=owner'+index+';').join('\n');return '{const owner0={body:"17;"};'+aliases+'setImmediate(()=>{print(eval(owner512.body));print("retained-deferred-complete");});COLLECT owner0.body="31;";}';}
test('queued source reads execute the unchanged original and one retained graph against complete Node in both memory modes',async()=>{
 const subjects=[original,reaction('Promise.resolve().then'),executor,thenable,fresh,retainedSource()];const directory=await mkdtemp(join(tmpdir(),'tsc2c-deferred-source-'));
 try{for(const [index,source]of subjects.entries()){
  const expected=reference(source.replace('COLLECT',''));expect(expected.endsWith('complete\n')).toBe(true);
  for(const noGc of [false,true]){const entry=join(directory,'subject-'+index+'.js'),output=join(directory,'program-'+index+'-'+noGc),diagnostics:string[]=[];await writeFile(entry,source.replace('COLLECT',noGc?'':'$262.gc();'));
   const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/deferred-source.js#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(parseHostObservation(JSON.parse(native.stdout.toString()))).toMatchObject({kind:'normal',stdout:expected});
  }
 }}finally{await rm(directory,{recursive:true,force:true});}
},900000);

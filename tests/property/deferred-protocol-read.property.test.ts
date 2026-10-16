import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';
import {compile} from '../../src/compile';import {parseHostObservation} from '../test262/protocol';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
const original='{const thenable={then(resolve){resolve("17;");}};const task=Promise.resolve().then(()=>thenable);thenable.then=resolve=>resolve("19;");task.then(code=>{print(eval(code));print("thenable-job-complete");});}';
const invoked='{const run=()=>'+original+';run();}';
const inactive='{const unused=()=>'+original+';print("inactive");}';
const asyncReturned=original.replace('const task=Promise.resolve().then(()=>thenable);','async function run(){await 0;return thenable;}const task=run();');
const asyncImmediate=asyncReturned.replace('await 0;','');
const asyncSaved=asyncReturned.replace('async function run(){await 0;return thenable;}','const saved=thenable.then;async function run(){await 0;return {then:saved};}');
const immediate=original.replace('Promise.resolve().then(()=>thenable)','Promise.resolve(thenable)');
const saved=original.replace('const task=Promise.resolve().then(()=>thenable);','const saved=thenable.then;const task=Promise.resolve().then(()=>({then:saved}));');
const unknown=original.replace('resolve("19;")','resolve(String(Math.random())+";")');
function reference(source:string,setup=''):string {
 const script='const fs=require("node:fs"),vm=require("node:vm");new vm.Script('+JSON.stringify(setup)+'+fs.readFileSync(0,"utf8")).runInNewContext({print:value=>{fs.writeSync(1,String(value)+"\\n");}});';
 const node=nodeReferenceSync(['node','-e',script],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});return node.stdout.toString();
}
test('deferred protocol reads see later method writes while immediate and saved reads retain their snapshots',()=>{
 for(const source of [original,invoked,asyncReturned]){expect(reference(source)).toBe('19\nthenable-job-complete\n');const deferred=graph([{path:'subject.js',source}]);expect(deferred.error).toBeNull();expect(deferred.directEvalSources.map(value=>value.source)).toContain('19;');}
 for(const source of [inactive,inactive.replace(original,asyncReturned)]){expect(reference(source)).toBe('inactive\n');const dormant=graph([{path:'subject.js',source}]);expect(dormant.error).toBeNull();expect(dormant.directEvalSources).toEqual([]);}
 for(const source of [immediate,saved,asyncSaved]){expect(reference(source)).toBe('17\nthenable-job-complete\n');const result=graph([{path:'subject.js',source}]);expect(result.error).toBeNull();expect(result.directEvalSources.map(value=>value.source)).toEqual(['17;']);}
 for(const source of [unknown,asyncReturned.replace('resolve("19;")','resolve(String(Math.random())+";")')]){expect(reference(source,'Math.random=()=>19;')).toBe('19\nthenable-job-complete\n');expect(graph([{path:'subject.js',source}]).error).toContain('direct eval source is not a finite static string expression');}
 // An async callee can also resolve in its initial activation. The overlap
 // projection must retain that source even though its temporal union is broad.
 expect(reference(asyncImmediate)).toBe('17\nthenable-job-complete\n');const initial=graph([{path:'subject.js',source:asyncImmediate}]);expect(initial.error).toBeNull();expect(initial.directEvalSources.map(value=>value.source)).toContain('17;');
});
function retained():string {
 const aliases=Array.from({length:512},(_,index)=>'const owner'+(index+1)+'=owner'+index+';').join('\n');
 return asyncReturned.replace('async function run()', 'const owner0=thenable;'+aliases+'async function run()').replace('await 0;return thenable;','await 0;COLLECT return owner512;');
}
test('protocol read windows execute the unchanged original and retained owner graph against complete Node in both memory modes',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-protocol-read-'));
 try{for(const [index,source]of [original,invoked,immediate,saved,asyncReturned,asyncImmediate,asyncSaved,retained()].entries()){
  const expected=reference(source.replace('COLLECT',''));expect(expected.endsWith('thenable-job-complete\n')).toBe(true);
  for(const noGc of [false,true]){const entry=join(directory,'subject-'+index+'.js'),output=join(directory,'program-'+index+'-'+noGc),diagnostics:string[]=[];await writeFile(entry,source.replace('COLLECT',noGc?'':'$262.gc();'));
   const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/protocol-read#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(parseHostObservation(JSON.parse(native.stdout.toString()))).toMatchObject({kind:'normal',stdout:expected});
  }
 }}finally{await rm(directory,{recursive:true,force:true});}
},900000);

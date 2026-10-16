import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';
import {parseHostObservation} from '../test262/protocol';
function reference(source:string):string{
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({print:v=>fs.writeSync(1,String(v)+"\\n")});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});return node.stdout.toString();
}
test('SameValue source facts distinguish primitive values without coercion or callback escape',()=>{
 const values=['undefined','null','false','true','0','-0','NaN','Infinity','17','17n','"17"','""','Symbol.iterator'];
 for(const left of values)for(const right of values){
  const source='print(eval(Object.is('+left+','+right+')?"17;":"19;"));',expected=reference(source).trimEnd()+';',result=graph([{path:'subject.js',source}]);
  expect(result.error).toBeNull();expect(result.directEvalSources.map(value=>value.source)).toContain(expected);
 }
 const calls=['Object.is(owner,other)','Reflect.apply(Object.is,undefined,[owner,other])','Object.is.call(null,owner,other)','Object.is.bind(null,owner)(other)'];
 for(const call of calls){
  const source='let body="17;";const owner={toString(){body=String(Math.random());return "value";},valueOf(){body=String(Math.random());return 1;},callback(){body=String(Math.random());}},other=new Proxy({},{get(){body=String(Math.random());}});'+call+';print(eval(body));';
  expect(reference(source)).toBe('17\n');const result=graph([{path:'subject.js',source}]);expect({call,error:result.error}).toEqual({call,error:null});expect(result.directEvalSources.map(value=>value.source)).toEqual(['17;']);
 }
 const ignored='let body="17;";Object.is({}, {},(body="19;"));print(eval(body));';
 expect(reference(ignored)).toBe('19\n');expect(graph([{path:'subject.js',source:ignored}]).directEvalSources.map(value=>value.source)).toContain('19;');
 for(const source of [
  'let body="17;";Object.is((body=String(Math.random())),{});eval(body);',
  'const original=Object.is;Object.is=function(){return String(Math.random());};eval(Object.is());',
  'let body="17;";const owner={valueOf(){body=String(Math.random());return 0;}};Object.is(+owner,0);eval(body);',
 ])expect(graph([{path:'subject.js',source}]).error).toContain('direct eval source is not a finite static string expression');
});
function nativeSource():string{
 return '{const original=Object.is,events=[],owner={toString(){throw "unexpected conversion";}},proxy=new Proxy(owner,{get(){throw "unexpected Get";}});for(const left of [undefined,null,false,true,0,-0,NaN,17,17n,"17",owner,proxy])for(const right of [undefined,null,false,true,0,-0,NaN,17,17n,"17",owner,proxy])print(original(left,right));print(original.name+":"+original.length);try{new original((events.push("left"),owner),(events.push("right"),proxy));}catch(error){print(error.name);}print(events.join("|"));Object.is=function(){return "replaced";};print(original(owner,owner));print(Object.is());Object.is=original;}'+
 '\nlet owner={body:"31;"};'+Array.from({length:512},()=> 'owner={next:owner};').join('\n')+
 '\nconst retained=owner;COLLECT for(let index=0;index<512;index++)owner=owner.next;print(Object.is(owner,retained));print(Object.is(owner,owner));print(eval(owner.body));print("same-value-complete");';
}
test('SameValue and one deep retained operand graph match complete independent Node and native output',async()=>{
 const source=nativeSource(),expected=reference(source.replace('COLLECT',''));expect(expected.endsWith('false\ntrue\n31\nsame-value-complete\n')).toBe(true);
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-same-value-native-'));
 try{for(const noGc of [false,true]){
  const entry=join(directory,'subject.js'),output=join(directory,'program-'+noGc),diagnostics:string[]=[];await writeFile(entry,source.replace('COLLECT',noGc?'':'$262.gc();'));
  const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/same-value-source.js#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({exitCode:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(expected);
 }}finally{await rm(directory,{recursive:true,force:true});}
},600000);

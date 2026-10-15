import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildProgram} from '../../src/program';
import {compile} from '../../src/compile';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {nodeReferenceSync} from './node-reference';
import {parseHostObservation} from '../test262/protocol';

interface Partition {name:string;source:string;}
const observed=(expression:string)=>'let body="17;";try{'+expression+';}catch(error){body="19;";}print(eval(body));';
const restricted=['Array.prototype.map','function(){"use strict";}','()=>{}','class C{}','(function(){}).bind(null)']
 .flatMap(fn=>['caller','arguments'].flatMap(key=>[false,true].map(write=>({name:fn+':'+key+':'+write,source:observed('('+fn+').'+key+(write?'="23;"':''))}))));
const mutations=['get','data'].flatMap(before=>['get','data'].flatMap(after=>[false,true].map(writable=>{
 const descriptor=(kind:string,value:string)=>kind==='get'?'get(){throw 1;}':'value:"'+value+'",writable:'+writable;
 return {name:before+':'+after+':'+writable,source:'const proto={};Object.defineProperty(proto,"caller",{configurable:true,'+descriptor(before,'23;')+'});const owner=Object.create(proto);Object.defineProperty(proto,"caller",{configurable:true,'+descriptor(after,'29;')+'});let body="31;";try{owner.caller="37;";body=owner.caller;}catch(error){body="41;";}print(eval(body));'};
})));
const partitions:Partition[]=[...restricted,...mutations,
 ...['null','undefined'].map(value=>({name:'array-nullish:'+value,source:observed('Array.prototype.toString.call('+value+')')})),
 ...['Object.getPrototypeOf(null)','Object.getPrototypeOf(undefined)','Reflect.getPrototypeOf(17)','Reflect.getPrototypeOf()'].map(expression=>({name:expression,source:observed(expression)})),
 {name:'native-prototype',source:'print(eval(Object.getPrototypeOf(Array.prototype.map)===Function.prototype?"43;":"47;"));'},
 {name:'primitive-prototype',source:'print(eval(Object.getPrototypeOf(17)===Number.prototype?"43;":"47;"));'},
 ...['function*(){}','async function(){}','async function*(){}'].map(fn=>({name:'noncallable-prototype:'+fn,source:'print(eval(typeof Object.getPrototypeOf('+fn+')==="object"?"43;":"47;"));'})),
 ...[false,true].map(strict=>({name:'readonly-shadow:'+strict,source:(strict?'function strictShadow(){"use strict";':'')+'const owner=Object.create(Array.prototype.map);let body="53;";try{owner.name="59;";body=owner.name==="map"?"61;":"67;";}catch(error){body="71;";}print(eval(body));'+(strict?'}strictShadow();':'')})),
 {name:'proxy-prototype',source:'const value=Object.getPrototypeOf(new Proxy({}, {getPrototypeOf(){return function(){};}}));print(eval(typeof value==="function"?"73;":"79;"));'},
 {name:'proxy-default',source:'const value=Reflect.getPrototypeOf(new Proxy(Array.prototype.map,{}));print(eval(value===Function.prototype?"73;":"79;"));'},
 ...['{getPrototypeOf(){return 17;}}','{get getPrototypeOf(){throw 1;}}','{getPrototypeOf:17}'].map(handler=>({name:'proxy-abrupt:'+handler,source:observed('Object.getPrototypeOf(new Proxy({},'+handler+'))')})),
 {name:'opaque-prototype',source:'const get=Object.getPrototypeOf;const owner={};Object.setPrototypeOf(owner,function(){});print(eval(typeof get(owner)==="function"?"83;":"89;"));'},
];
function reference(source:string):string {
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30_000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});return node.stdout.toString();
}
test('callable and descriptor source projections contain the independently observed eval source',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-native-callable-source-'));
 try{for(const [index,part]of partitions.entries()){
  const expected=reference(part.source);expect(expected).toMatch(/^\d+\n$/);
  const entry=join(directory,index+'.js');await writeFile(entry,part.source);
  const program=buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]}).program;
  const calls=sourceEvaluationInvocations(program,{roots:[entry]});expect(calls.length).toBe(1);
  expect({name:part.name,choices:calls[0]!.choices}).toMatchObject({choices:expect.arrayContaining([expected.trimEnd()+';'])});
 }}finally{await rm(directory,{recursive:true,force:true});}
});
// The pinned core profile has one nonextensible %ThrowTypeError% per Realm.
// Node's legacy callable extensions differ, so these invariants use the pinned
// algorithm and the actual native profile instead of a legacy Node oracle.
const coreProfile=`
const caller=Object.getOwnPropertyDescriptor(Function.prototype,'caller');
const args=Object.getOwnPropertyDescriptor(Function.prototype,'arguments');
print(caller.get===caller.set&&caller.get===args.get&&caller.get===args.set);
print(caller.enumerable===false&&caller.configurable===true);
const thrower=caller.get;print(thrower.name==='');print(thrower.length===0);
print(Object.isExtensible(thrower)===false);
let body='97;';try{Object.defineProperty(thrower,'caller',{value:null});}catch(error){body='101;';}
print(eval(body));
let inherited='103;';try{thrower.caller;}catch(error){inherited='107;';}print(eval(inherited));
print('callable-profile-complete');`;
const coreExpected='true\ntrue\ntrue\ntrue\ntrue\n101\n107\ncallable-profile-complete\n';
test('callable prototypes preserve native completions and pinned core invariants in both memory modes',async()=>{
 const standard=partitions.map(part=>'{'+part.source+'}').join('\n');
 const subjects=[{name:'standard',source:standard,expected:partitions.map(part=>reference(part.source)).join('')},
  {name:'pinned-core',source:coreProfile,expected:coreExpected}];
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-native-callable-profile-'));
 try{for(const subject of subjects)for(const noGc of [false,true]){
  const entry=join(directory,subject.name+'.js'),output=join(directory,subject.name+'-'+noGc),diagnostics:string[]=[];
  await writeFile(entry,(noGc?'':'$262.gc();\n')+subject.source);
  const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/native-callable-profile.js#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({exitCode:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(subject.expected);
 }}finally{await rm(directory,{recursive:true,force:true});}
},600_000);

test('uncaptured reflection after an opaque prototype change retains the stable source diagnostic',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-native-callable-opaque-'));
 try{
  const entry=join(directory,'subject.js'),source=partitions.map(part=>'{'+part.source+'}').join('\n')+'\n'+coreProfile;
  await writeFile(entry,source);const diagnostics:string[]=[];
  const built=await compile({entry,output:join(directory,'rejected'),buildDir:join(directory,'build'),isolatedScriptRoots:[entry],initializationEntries:[entry],diagnosticWriter:message=>diagnostics.push(message)});
  expect(built.exitCode).toBe(3);expect(diagnostics.join('')).toContain('unknown eval() source requires --runtime-code-manifest allow-list');
 }finally{await rm(directory,{recursive:true,force:true});}
});

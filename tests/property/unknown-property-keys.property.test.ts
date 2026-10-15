import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildProgram} from '../../src/program';
import {compile} from '../../src/compile';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {nodeReferenceSync} from './node-reference';
import {parseHostObservation} from '../test262/protocol';

const cases=[
 {name:'own',source:'const owner={m(body){return executeSource(body);}};print(owner[String.fromCharCode(109)]("17;"));',value:'17;'},
 {name:'inherited',source:'const owner=createPrototype({m(body){return executeSource(body);}});print(owner[String.fromCharCode(109)]("19;"));',value:'19;'},
 {name:'numeric',source:'const owner={1(body){return executeSource(body);}};print(owner[Math.floor(1)]("23;"));',value:'23;'},
 {name:'symbol',source:'const owner={[Symbol.for("m")](body){return executeSource(body);}};print(owner[Symbol.for(String.fromCharCode(109))]("29;"));',value:'29;'},
 {name:'write',source:'const owner={};owner[String.fromCharCode(109)]=function(body){return executeSource(body);};print(owner.m("31;"));',value:'31;'},
 {name:'definition',source:'const owner={[String.fromCharCode(109)](body){return executeSource(body);}};print(owner.m("37;"));',value:'37;'},
 {name:'getter',source:'const owner={get m(){return function(body){return executeSource(body);};}};print(owner[String.fromCharCode(109)]("41;"));',value:'41;'},
 {name:'computed-getter',source:'const owner={get [String.fromCharCode(109)](){return function(body){return executeSource(body);};}};print(owner.m("43;"));',value:'43;'},
 {name:'descriptor',source:'const owner={};defineProperty(owner,String.fromCharCode(109),{value:function(body){return executeSource(body);}});print(owner.m("67;"));',value:'67;'},
 {name:'class-method',source:'class C{[String.fromCharCode(109)](body){return executeSource(body);}}const owner=new C();print(owner.m("71;"));',value:'71;'},
 {name:'class-static',source:'class C{static [String.fromCharCode(109)](body){return executeSource(body);}}print(C.m("73;"));',value:'73;'},
 {name:'class-field',source:'class C{[String.fromCharCode(109)]=function(body){return executeSource(body);};}const owner=new C();print(owner.m("79;"));',value:'79;'},
];
const pureCases=cases.filter(item=>!['numeric','symbol'].includes(item.name)).map(item=>({...item,name:'pure-'+item.name,source:item.source.replaceAll('String.fromCharCode(109)','String(Math.floor(Math.random())+109)').replaceAll(' m(', ' [109](').replaceAll('{m(', '{[109](').replaceAll('.m(', '[109](').replaceAll('get m()', 'get [109]()')}));
const prelude='const executeSource=eval;const createPrototype=Object.create;const defineProperty=Object.defineProperty;';
function reference(source:string):string {
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({external:owner=>owner["109"]("19;"),print:value=>fs.writeSync(1,String(value)+"\\n")});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30_000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});
 return node.stdout.toString();
}
async function invocations(directory:string,name:string,source:string){
 const entry=join(directory,name+'.js');await writeFile(entry,source);
 const built=buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]});
 return sourceEvaluationInvocations(built.program,{roots:[entry]});
}
test('unknown key domains retain represented callable values, definitions and accessors',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-unknown-keys-source-'));
 try{for(const item of [...cases,...pureCases]){
  const source=prelude+item.source,expected=reference(source);
  expect({name:item.name,stdout:expected}).toEqual({name:item.name,stdout:item.value.slice(0,-1)+'\n'});
  const calls=await invocations(directory,item.name,source);
  expect({name:item.name,choices:calls.map(call=>call.choices)}).toEqual({name:item.name,choices:[[item.value]]});
 }}finally{await rm(directory,{recursive:true,force:true});}
});
test('opaque escapes retain callbacks written through an unknown key',async()=>{
 const source='function read(body){print(eval(body));}read("17;");const owner={__proto__:null};owner[String(Math.floor(Math.random())+109)]=read;external(owner);';
 expect(reference(source)).toBe('17\n19\n');
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-unknown-key-escape-'));
 try{const calls=await invocations(directory,'escaped',source);expect(calls.map(call=>call.choices)).toEqual([null]);}
 finally{await rm(directory,{recursive:true,force:true});}
});
test('global object properties share Object Environment locations and retain unknown alternatives',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-unknown-global-keys-'));
 try{
  const sources=[
   'var selected=function(body){return executeSource(body);};const saved=selected;globalThis.selected=function(){return "unused";};print(saved("47;"));',
   'globalThis.selected=function(body){return executeSource(body);};print(selected("53;"));',
   'var selected=function(){return "unused";};globalThis[String.fromCharCode(115,101,108,101,99,116,101,100)]=function(body){return executeSource(body);};print(selected("59;"));',
  ];
  for(const [index,source]of sources.entries()){
   const expected=reference(prelude+source).trim()+';',calls=await invocations(directory,'global-'+index,prelude+source);
   expect(calls.length).toBeGreaterThan(0);
   // An unknown global key may replace an intrinsic as well as selected.
   // Retained opaque alternatives must never become a false finite proof.
   for(const call of calls)if(call.choices!==null)expect(call.choices).toContain(expected);
  }
  const laterLookup='const owner={m(body){return executeSource(body);}};print(owner[String.fromCharCode(109)]("17;"));const child=Object.create(owner);print(child[String.fromCharCode(109)]("19;"));';
  expect(reference(prelude+laterLookup)).toBe('17\n19\n');
  const escaped=await invocations(directory,'later-opaque-lookup',prelude+laterLookup);
  expect(escaped.some(call=>call.choices===null)).toBe(true);
  const proxy='const owner=new Proxy({[Symbol.for("109")](body){return executeSource(body);}},{__proto__:null});print(owner[Symbol.for(String(Math.floor(Math.random())+109))]("83;"));';
  expect(reference(prelude+proxy)).toBe('83\n');
  const proxyCalls=await invocations(directory,'proxy-key',prelude+proxy);
  expect(proxyCalls.some(call=>call.choices===null)).toBe(true);
  const opaque=await invocations(directory,'opaque',prelude+'const owner={m:external};owner[String.fromCharCode(109)]();executeSource(externalSource);');
  expect(opaque.some(call=>call.choices===null)).toBe(true);
 }finally{await rm(directory,{recursive:true,force:true});}
});
function program():string {
 const depth=256;
 return prelude+[...cases,...pureCases].map(item=>'{'+item.source+'}').join('\n')+'\n'+
  'const p0={m(body){return executeSource(body);}};'+Array.from({length:depth},(_,index)=>'const p'+(index+1)+'=createPrototype(p'+index+');').join('\n')+
  'if(NATIVE_GC)$262.gc();print(p'+depth+'[String.fromCharCode(109)]("61;"));print("complete");';
}
test('unknown-key dispatch follows one retained prototype graph in native execution',async()=>{
 const source=program(),expected=[...cases,...pureCases].map(item=>item.value.slice(0,-1)+'\n').join('')+'61\ncomplete\n';
 expect(reference(source.replaceAll('NATIVE_GC','false'))).toBe(expected);
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-unknown-keys-native-'));
 try{for(const noGc of [false,true]){
  const entry=join(directory,'subject.js'),output=join(directory,'program-'+noGc),diagnostics:string[]=[];
  await writeFile(entry,source.replaceAll('NATIVE_GC',String(!noGc)));
  const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/unknown-property-keys.js#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({exitCode:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(expected);
 }}finally{await rm(directory,{recursive:true,force:true});}
},600_000);

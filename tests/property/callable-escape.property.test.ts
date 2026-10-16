import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildProgram} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';
import {parseHostObservation} from '../test262/protocol';

const constructor='const executeSource=eval;class C{constructor(body){print(executeSource(body));}}new C("17;");';
const reference=(source:string,external='()=>{}',sameRealm='')=>{
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script('+JSON.stringify(sameRealm)+'+fs.readFileSync(0,"utf8")).runInNewContext({external:'+external+',print:value=>fs.writeSync(1,String(value)+"\\n")});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});return node.stdout.toString();
};
const graphPartitions=[
 {name:'sloppy-callback-this',source:'var read=function(body){print(eval(body));};read("17;");function callback(){this.read("19;");}external(callback);',external:'callback=>callback()'},
 {name:'construct',source:constructor+'external(C);',external:'C=>new C("19;")'},
 {name:'throw',source:'const executeSource=eval;function read(body){print(executeSource(body));}read("17;");function make(){throw read;}external(make);',external:'make=>{try{make();}catch(callback){callback("19;");}}'},
 {name:'recursive-opaque-return',source:'const executeSource=eval;function read(body){print(executeSource(body));}read("17;");function make(){return new Proxy({read,make},{});}external(make);',external:'make=>make().read("19;")'},
 {name:'return',source:'const executeSource=eval;function read(body){print(executeSource(body));}read("17;");function make(){return read;}external(make);',external:'make=>make()("19;")'},
 {name:'receiver',source:'const executeSource=eval;function read(body){print(executeSource(body));}read("17;");const owner={read,invoke:external};owner.invoke();',external:'function(){this.read("19;");}'},
 {name:'global-receiver',source:'var read=function(body){print(eval(body));};read("17;");globalThis.invoke=external;globalThis.invoke();',external:'function(){this.read("19;");}'},
 {name:'global-argument',source:'var read=function(body){print(eval(body));};read("17;");external(globalThis);',external:'owner=>owner.read("19;")'},
 {name:'data',source:constructor+'const owner={callback:C};external(owner);',external:'owner=>new owner.callback("19;")'},
 {name:'getter',source:constructor+'const owner={get callback(){return C;}};external(owner);',external:'owner=>new owner.callback("19;")'},
 {name:'prototype',source:constructor+'const owner=Object.create({callback:C});external(owner);',external:'owner=>new owner.callback("19;")'},
 {name:'collection',source:constructor+'const owner=new Map([["callback",C]]);external(owner);',external:'owner=>new (owner.get("callback"))("19;")'},
 {name:'iterator',source:constructor+'const owner=[C].values();external(owner);',external:'owner=>new (owner.next().value)("19;")'},
 {name:'unknown-key',source:constructor+'const owner={__proto__:null};owner[String(Math.floor(Math.random())+109)]=C;external(owner);',external:'owner=>new (owner["109"])("19;")'},
 {name:'cycle',source:constructor+'const owner={callback:C};owner.self=owner;external(owner);',external:'owner=>new owner.self.callback("19;")'},
];
function ownerGraph(depth:number):string {
 return 'const carrier=new class{#callback=C;get callback(){return this.#callback;}};const owner0={...{carrier},get callback(){return carrier.callback;}};'+Array.from({length:depth},(_,index)=>'const owner'+(index+1)+'={next:owner'+index+'};').join('\n');
}
async function choices(directory:string,name:string,source:string){
 const entry=join(directory,name+'.js');await writeFile(entry,source);
 const program=buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]}).program;
 return sourceEvaluationInvocations(program,{roots:[entry]}).map(call=>call.choices);
}
test('opaque escape retains call, construct, completion and owner graph alternatives',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-callable-escape-source-'));
 try{for(const part of graphPartitions){
  expect({name:part.name,stdout:reference(part.source,part.external)}).toEqual({name:part.name,stdout:'17\n19\n'});
  expect({name:part.name,calls:await choices(directory,part.name,part.source)}).toMatchObject({calls:expect.arrayContaining([null])});
 }
 const disconnected=constructor+'external({token:19});';
 expect(reference(disconnected)).toBe('17\n');expect(reference(disconnected,'()=>{}','function external(){new C("19;");}')).toBe('17\n19\n');expect(await choices(directory,'disconnected',disconnected)).toEqual([null]);
 const privateControl='{'+disconnected+'}';expect(reference(privateControl)).toBe('17\n');expect(await choices(directory,'private-disconnected',privateControl)).toEqual([['17;']]);
 const deep=constructor+ownerGraph(512)+'external(owner512);';
 expect(reference(deep,'owner=>{while(owner.next)owner=owner.next;new owner.callback("19;");}')).toBe('17\n19\n');
 expect(await choices(directory,'deep',deep)).toEqual([null]);
 }finally{await rm(directory,{recursive:true,force:true});}
});
const actualSort=constructor+'[C,C].sort(function(first){new first("19;");return 0;});print("complete");';
test('native receiver construction cannot yield a partial accepted execution',async()=>{
 expect(reference(actualSort)).toBe('17\n19\ncomplete\n');
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-callable-escape-rejection-'));
 try{
  const entry=join(directory,'subject.js'),diagnostics:string[]=[];await writeFile(entry,actualSort);
  const output=join(directory,'program');
  const result=await compile({entry,output,buildDir:join(directory,'build'),isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/callable-escape#construction',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
  if(result.exitCode===0){const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe('17\n19\ncomplete\n');}
  else {expect(result.exitCode).toBe(3);expect(diagnostics.join('')).toContain('unknown eval() source requires --runtime-code-manifest allow-list');}
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('a retained owner graph with constant callback source executes in both memory modes',async()=>{
 const source='const executeSource=eval;class C{constructor(){print(executeSource("17;"));}}'+ownerGraph(512)+
  'let owner=owner512;while(owner.next)owner=owner.next;[owner.callback,owner.callback].sort(function(first){new first();return 0;});print("complete");';
 const expected=reference(source);expect(expected).toBe('17\ncomplete\n');
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-callable-escape-native-'));
 try{for(const noGc of [false,true]){
  const entry=join(directory,'subject.js'),output=join(directory,'program-'+noGc),diagnostics:string[]=[];await writeFile(entry,source.replace('let owner=',(noGc?'':'$262.gc();')+'let owner='));
  const result=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/callable-escape.js#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(expected);
 }}finally{await rm(directory,{recursive:true,force:true});}
},600000);

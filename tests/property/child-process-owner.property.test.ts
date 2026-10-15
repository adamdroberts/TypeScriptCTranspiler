import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {runtimeChildProcessOperations} from '../../src/global-bindings';

const common=String.raw`import ordinary from 'node:child_process';import * as namespace from 'child_process';import {execFileSync as run,spawnSync} from 'node:child_process';
function check(value:any,label:string){if(!value)throw new Error(label);console.log(label,true)}
check(namespace.default===ordinary&&run===ordinary.execFileSync&&run===namespace.execFileSync,'retained-export-identity');
for(const [name,length] of [['exec',3],['execFile',4],['execSync',2],['execFileSync',3],['spawnSync',3],['spawn',3],['fork',1]] as const){const fn=(ordinary as any)[name],d=Object.getOwnPropertyDescriptor(ordinary,name);check(fn.name===name&&fn.length===length&&Object.hasOwn(fn,'prototype')&&fn.prototype.constructor===fn&&d.value===fn&&d.writable&&d.enumerable&&d.configurable,'metadata-'+name)}
const saved=ordinary.execFileSync;(ordinary as any).execFileSync=function(...args:any[]){return args};const marker={};let trace='';function mark(value:any){trace+='A';return value}const values=(ordinary as any).execFileSync(mark(marker),mark('two'),mark('three'));check(trace==='AAA'&&values.length===3&&values[0]===marker&&namespace.execFileSync===saved,'live-default-complete-actuals');ordinary.execFileSync=saved;
const options:any={encoding:'utf8',env:{TSC_CHILD_OWNER:'retained'}};const args:any=['%s','actual-array'];check(Reflect.apply(run,Symbol(),['/bin/printf',args,options])==='actual-array','runtime-array-options');
check(ordinary.execSync('printf command',{encoding:'utf8'})==='command','command-owner');
check(run('/bin/sh',['-c','printf \"$TSC_CHILD_OWNER\"'],options)==='retained','actual-environment-owner');
const bytes=run('/bin/printf',['bytes']);check(bytes.toString()==='bytes','boxed-byte-result');
const result=Reflect.apply(spawnSync,{},['/bin/printf',['result'],{encoding:'utf8'}]);check(result.status===0&&result.stdout==='result'&&result.stderr==='','sync-result-owner');
const holders:any[]=[];for(let i=0;i<512;i++)holders.push({call:saved,next:i?holders[i-1]:null});let current:any=holders[holders.length-1],valid=true;while(current){valid=valid&&current.call===run;current=current.next}check(valid&&holders[0].call('/bin/printf',['retained'],{encoding:'utf8'})==='retained','deep-retained-export-graph');
async function main(){const fn=run;check(Reflect.apply(fn,{},['/bin/printf',[await Promise.resolve('suspension')],{encoding:'utf8'}])==='suspension','stored-import-suspension')}main();`;

const nativeProfile=String.raw`import ordinary from 'node:child_process';import {exec,execFile} from 'child_process';
function check(value:any,label:string){if(!value)throw new Error(label);console.log(label,true)}
const trace:string[]=[];function record(label:string){return function(error:any,stdout:string,stderr:string){trace.push(label+':'+(error===null)+':'+stdout+':'+stderr.length)}}
function mark(value:any){trace.push('actual');return value}
const callback:any=record('file'),args:any=['callback'],options:any={shell:false};Reflect.apply(execFile,{},[mark('/bin/printf'),mark(args),mark(options),mark(callback),mark('ignored')]);
check(trace.join('|')==='actual|actual|actual|actual|actual|file:true:callback:0','native-synchronous-callback-profile');
const sentinel={};let same=false;try{Reflect.apply(exec,{},['printf x',function(){throw sentinel}])}catch(error){same=error===sentinel}check(same,'callback-abrupt-identity');
const effects:string[]=[];const dynamic:any={};for(const key of ['cwd','input','env','shell','argv0','uid','gid','maxBuffer','timeout','killSignal','encoding','stdio','detached','signal'])Object.defineProperty(dynamic,key,{get(){effects.push(key);return key==='encoding'?'utf8':undefined}});
check(ordinary.execFileSync('/bin/printf',['getters'],dynamic)==='getters'&&effects.join('|')==='cwd|input|env|shell|argv0|uid|gid|maxBuffer|timeout|killSignal|encoding|stdio|detached|signal','native-option-slot-collection');`;

async function native(root:string,source:string,label:string,expected:string){
 const erased=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 for(const typed of [true,false])for(const noGc of [false,true]){
  const entry=join(root,`${label}-${typed}-${noGc}.${typed?'mts':'mjs'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?source:erased);
  const built=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:message=>diagnostics.push(message)});
  expect({label,typed,noGc,code:built.exitCode,diagnostics}).toEqual({label,typed,noGc,code:0,diagnostics:[]});
  const run=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
  expect({label,typed,noGc,code:run.exitCode,stderr:run.stderr.toString(),stdout:run.stdout.toString()}).toEqual({label,typed,noGc,code:0,stderr:'',stdout:expected});
 }
}

test('child-process exports retain ordinary owners and actual Lists',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-child-process-owner-'));
 try{
  const oracle=join(root,'oracle.mjs');await writeFile(oracle,ts.transpileModule(common,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText);
  const node=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.map(String).join(" ")+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});expect(node.stdout.toString().trimEnd().split('\n').at(-1)).toBe('stored-import-suspension true');
  await native(root,common,'common',node.stdout.toString());
  await native(root,nativeProfile,'profile','native-synchronous-callback-profile true\ncallback-abrupt-identity true\nnative-option-slot-collection true\n');
 }finally{await rm(root,{recursive:true,force:true})}
},900000);

test('child-process declared exports and runtime operation collection agree',async()=>{
 const declaration=await readFile(join(process.cwd(),'stdlib/lib.core.d.ts'),'utf8');
 const block=declaration.split('interface ChildProcessModule {')[1]!.split('declare module')[0]!;
 const names=new Set([...block.matchAll(/^\s+(\w+)\(/gm)].map(match=>match[1]!));
 expect(names).toEqual(new Set(runtimeChildProcessOperations.keys()));
});

test('child-process source metadata shares owners while callback and text results stay conservative',async()=>{
 const {finiteEvalScriptSourceGraph}=await import('../test262/native-host');
 const graph=(source:string)=>finiteEvalScriptSourceGraph([{path:'child-owner.mjs',source}]);
 const metadata=graph("import {execFileSync as run} from 'node:child_process';eval(run.name==='execFileSync'?'17;':'23;');");
 expect(metadata.error).toBeNull();expect(metadata.directEvalSources).toContainEqual({source:'17;',strictCaller:true,strict:true});
 for(const source of [
  "import {execFile} from 'child_process';let body='17;';execFile('/bin/true',function(){body=process.argv[1]});eval(body);",
  "import {execFileSync} from 'child_process';eval(execFileSync('/bin/printf',['17;'],{encoding:'utf8'}));",
 ])expect(graph(source).error).toContain('direct eval source is not a finite static string expression');
});

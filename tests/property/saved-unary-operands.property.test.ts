import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

const wrappers=[(value:string)=>`(${value})`,(value:string)=>`(${value} as any)`,(value:string)=>`(<any>${value})`,(value:string)=>`(${value}!)`,(value:string)=>`(${value} satisfies any)`];
const operators=['typeof ','void ','!','-','+'];
function source():string{
 const statements=[`const records=[];function encode(value){return typeof value+':'+String(value)+(Object.is(value,-0)?':minus-zero':'');}async function run(){`];
 for(const [index,wrap] of wrappers.entries())for(const [operation,operator] of operators.entries()){
  const label=index+':'+operation;
  statements.push(`{let trace='';async function take(value){trace+='call|';await Promise.resolve();trace+='resume|';return value;}const value=${operator}${wrap('(await take(false))')};records.push('${label}:await:'+encode(value)+':'+trace);}`);
  statements.push(`{let trace='';function* subject(){trace+='yield|';const value=${operator}${wrap('(yield "pause")')};trace+='return|';return value;}const iterator=subject();const pause=iterator.next();const result=iterator.next(false);records.push('${label}:yield:'+encode(result.value)+':'+trace+':'+pause.value+':'+result.done);}`);
  statements.push(`{let trace='';async function* subject(){trace+='yield|';const value=${operator}${wrap('(yield "pause")')};trace+='return|';return value;}const iterator=subject();const pause=await iterator.next();const result=await iterator.next(false);records.push('${label}:async-yield:'+encode(result.value)+':'+trace+':'+pause.value+':'+result.done);}`);
 }
 for(const wrap of wrappers){
  statements.push(`{const marker={};let caught=false;try{typeof ${wrap('(await Promise.reject(marker))')};}catch(error){caught=error===marker;}records.push('rejected:'+caught);}`);
  statements.push(`{const missing=typeof ${wrap('unresolvable_saved_unary_operand')};let caught=false;try{typeof ${wrap('uninitialized')};let uninitialized=1;}catch(error){caught=error instanceof ReferenceError;}records.push('reference:'+missing+':'+caught);}`);
 }
 let expression='(await Promise.resolve({value:19}))';for(let depth=0;depth<128;depth++)expression=wrappers[depth%wrappers.length]!(expression);
 statements.push(`records.push('deep:'+typeof ${expression});console.log(records.join(${JSON.stringify('\n')}));}run();`);
 return statements.join('\n');
}

test('wrapped unary operands consume saved await/yield values once and preserve abrupt References',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-saved-unary-operands-'));
 try{
  const typedSource=source();
  const transpiled=ts.transpileModule(typedSource,{reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}});expect((transpiled.diagnostics??[]).map(diagnostic=>ts.flattenDiagnosticMessageText(diagnostic.messageText," "))).toEqual([]);const erased=transpiled.outputText;
  const reference=join(root,'reference.js');await writeFile(reference,erased);
  const node=nodeReferenceSync(['node',reference],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});expect(node.stdout.toString().trimEnd().split('\n').at(-1)).toBe('deep:object');
  for(const noGc of [false,true])for(const typed of [false,true]){
   const directory=join(root,noGc+'-'+typed);await mkdir(directory);
   const entry=join(directory,typed?'main.ts':'main.js'),output=join(directory,'program'),diagnostics:string[]=[];
   await writeFile(entry,typed?'// @ts-nocheck\n'+typedSource:erased);
   const result=await compile({entry,output,buildDir:join(directory,'build'),noGc,isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'saved-unary-operands#script',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,typed,code:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,typed,code:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({noGc,typed,code:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,typed,code:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect({noGc,typed,observation}).toMatchObject({observation:{kind:'normal'}});if(observation.kind==='normal')expect(observation.stdout).toBe(node.stdout.toString());
  }
 }finally{await rm(root,{recursive:true,force:true});}
},600_000);

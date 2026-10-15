import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {parseHostObservation} from '../test262/protocol';

test('indexed ranges clamp lengths, preserve sparse positions and reject opaque iteration',()=>{
 for(const length of ['undefined','null','false','true','-0','-3','NaN','1.8','"3.9"']){
  const graph=finiteEvalScriptSourceGraph([{path:'main.js',source:`eval(Array.prototype.join.call({0:"1",2:"7;",length:${length}},""));`}]);
  expect({length,error:graph.error}).toEqual({length,error:null});
 }
 for(const length of ['4294967297','Number.MAX_SAFE_INTEGER','Infinity']){
  const graph=finiteEvalScriptSourceGraph([{path:'main.js',source:`eval(Array.prototype.join.call({0:"17;",length:${length==="Number.MAX_SAFE_INTEGER"?'9007199254740991':length}},""));`}]);
  expect({length,error:graph.error}).toEqual({length,error:null});expect(graph.directEvalSources.some(entry=>entry.source==='17;')).toBe(true);
 }
 for(const source of [
  'eval(Array.prototype.join.call({length:opaque()},""));',
  'const a={0:"1",length:2,get 1(){return opaque();}};eval(Array.prototype.join.call(a,""));',
  'eval(Array.prototype.join.call({length:4294967297},","));',
  'Array.prototype[Symbol.iterator]=function*(){yield opaque();};eval(...["17;"]);',
  'const a=["17;"];Object.defineProperty(a,Symbol.iterator,{get(){a[0]=opaque();return Array.prototype.values;}});eval(...a);',
  'const a=["17;"];Object.defineProperty(a,"0",{get(){return opaque();}});eval(...a);',
 ])expect({source,error:finiteEvalScriptSourceGraph([{path:'main.js',source}]).error}).toMatchObject({error:expect.stringContaining('direct eval source is not a finite static string expression')});
 for(const length of ['1n','Symbol.iterator'])expect(finiteEvalScriptSourceGraph([{path:'main.js',source:`eval(Array.prototype.join.call({length:${length}},""));`}]).error).toBeNull();
 for(const [expression,expected] of [['eval.apply(null,{0:"17;",length:"1.9"})','17;'],['Reflect.apply(eval,null,{0:"19;",length:1})','19;'],['eval.apply(null,null)',null],['eval.apply(null,undefined)',null],['eval.apply(null)',null]] as const){
  const graph=finiteEvalScriptSourceGraph([{path:'main.js',source:expression+';'}]);
  expect({expression,error:graph.error}).toEqual({expression,error:null});
  if(expected)expect(graph.indirectEvalSources.some(entry=>entry.source===expected)).toBe(true);
 }
 for(const source of ['eval(...{0:"17;",length:1});','eval(Reflect.apply(eval,null,"17;"));','eval(eval.apply(null,1));']){
  const graph=finiteEvalScriptSourceGraph([{path:'main.js',source}]);expect(graph.error).toBeNull();expect(graph.directEvalSources).toEqual([]);expect(graph.indirectEvalSources).toEqual([]);
 }
});

test('generic indexed reads and a deep prototype graph match Node in both memory modes',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-indexed-range-source-'));
 try{
  for(const noGc of [false,true])for(const typed of [false,true]){
   const lengths=['undefined','null','false','true','-0','-3','NaN','1.8','"3.9"'];
   const partitions=lengths.map((length,index)=>`print("length${index}:"+String(eval(Array.prototype.join.call({0:"1",2:"7;",length:${length}},""))));`).join('\n');
   const depth=typed&&!noGc?256:1;
   const prototypes=['const p0={0:"1"};',...Array.from({length:depth},(_,index)=>`const p${index+1}={__proto__:p${index}};`)];
   const abrupt=['1n','Symbol.iterator'].map(length=>`{let effects=0;const separator={toString(){effects++;return "";}};try{Array.prototype.join.call({length:${length}},separator);}catch(error){print("abrupt:"+(error instanceof TypeError)+":"+effects);}}`).join('\n');
   const source=partitions+'\n'+prototypes.join('\n')+`\nconst inherited={__proto__:p${depth},2:"7;",length:"3.9"};print("deep:"+eval(Array.prototype.join.call(inherited,"")));`+
    '\nprint("string:"+eval(Array.prototype.join.call("29;","")));'+
    '\nprint("apply:"+eval.apply(null,{0:"31;",length:"1.9"}));print("reflect:"+Reflect.apply(eval,null,{0:"37;",length:1}));print("nullable:"+String(eval.apply(null,null))+":"+String(eval.apply(null)));'+
    '\n{const owner={0:"1",2:"7;",get length(){return {valueOf(){return 3.9;}};}};print("getter:"+eval(Array.prototype.join.call(owner,"")));}'+
    '\n{const owner={0:"1",get 2(){return "9;";},length:3};print("index:"+eval(Array.prototype.join.call(owner,"")));}'+
    '\n{Array.prototype[0]="23;";const sparse=[,"37;"];print("sparse:"+eval(...sparse));delete Array.prototype[0];}'+
    '\n'+abrupt+
    '\ntry{Array.prototype.join.call(null,"");}catch(error){print("null:"+(error instanceof TypeError));}';
   const invalid=source+'\ntry{Reflect.apply(eval,null,"17;");}catch(error){print("primitive:"+(error instanceof TypeError));}';
   const entry=join(directory,'source-'+noGc+'-'+typed+(typed?'.ts':'.js')),output=join(directory,'program-'+noGc+'-'+typed),diagnostics:string[]=[];
   const node=nodeReferenceSync(['node','-e','const vm=require("node:vm"),fs=require("node:fs");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});'],{stdin:Buffer.from(invalid),stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});expect(finiteEvalScriptSourceGraph([{path:'main.js',source:invalid}]).error).toBeNull();
   await writeFile(entry,(typed?'// @ts-nocheck\n':'')+invalid);
   const result=await compile({entry,output,noGc,buildDir:join(directory,'build-'+noGc+'-'+typed),isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/indexed-range-source#script',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,typed,code:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,typed,code:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString());
  }
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

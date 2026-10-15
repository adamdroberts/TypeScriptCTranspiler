import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {parseHostObservation} from '../test262/protocol';

const expressions=[
 '["1","7;"].join("")','[null,undefined,"19;"].join("")','["2","3;"].join(undefined)',
 '["29;"].join()','Array.prototype.join.call(["3","1;"],"")',
 'Reflect.apply(Array.prototype.join,["3","7;"],[""])','Array.prototype.join.bind(["4","1;"],"")()',
 '[{toString(){return "43;";}}].join("")',
 'Array.prototype.join.call({0:"17;",length:1},"")','[,"17;"].join("")',
];
test('join source facts use captured Lists and reject unknown values, live mutations and callback escapes',()=>{
 for(const expression of expressions)expect({expression,error:finiteEvalScriptSourceGraph([{path:'main.js',source:`eval(${expression});`}]).error}).toEqual({expression,error:null});
 for(const source of [
  'eval([opaque(),"17;"].join(""));','eval(["17;"].join(opaque()));',
  'const a=[{toString(){a[1]=opaque();return "1";}},"7;"];eval(a.join(""));',
  'const a=["1","7;"];Object.defineProperty(a,"1",{get(){return opaque();}});eval(a.join(""));',
  'const owner={body:"17;"};function run(){return eval(owner.body);}run();opaque(owner,run);',
  'const owner={body:"17;"};function run(){return eval(owner.body);}run();opaque(owner,{run});',
  'globalThis.owner={body:"17;"};function run(){return eval(owner.body);}run();opaque(globalThis);',
 ])expect({source,error:finiteEvalScriptSourceGraph([{path:'main.js',source}]).error}).toMatchObject({error:expect.stringContaining('direct eval source is not a finite static string expression')});
 expect(finiteEvalScriptSourceGraph([{path:'main.js',source:'eval(["17;"].join(Symbol.iterator));'}]).error).toBeNull();
});

test('join conversion and a deep source List match Node across typed and erased native inputs',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-array-join-source-'));
 try{
  for(const noGc of [false,true])for(const typed of [false,true]){
   const source=expressions.map((expression,index)=>`print("case${index}:"+eval(${expression}));`).join('\n')+
    '\n{const a=["1","3;"];const separator={toString(){a[1]="7;";return "";}};print("separator:"+eval(a.join(separator)));}'+
    '\n{const a=[{toString(){a[1]="9;";return "1";}},"7;"];print("element:"+eval(a.join("")));}'+
    '\n{const a=["1","7;"];Object.defineProperty(a,"1",{get(){return "9;";}});print("getter:"+eval(a.join("")));}'+
    '\ntry{["17;"].join(Symbol.iterator);}catch(error){print("symbol:"+(error instanceof TypeError));}'+
    '\n{let count=0;function extra(){count++;return Symbol.iterator;}print("extra:"+eval(["1","7;"].join("",extra()))+":"+count);}'+
    `\nprint("deep:"+eval(["1",${Array(typed&&!noGc?512:1).fill('null').join(',')},"7;"].join("")));`;
   const entry=join(directory,'source-'+noGc+'-'+typed+(typed?'.ts':'.js')),output=join(directory,'program-'+noGc+'-'+typed),diagnostics:string[]=[];
   const node=nodeReferenceSync(['node','-e','const vm=require("node:vm"),fs=require("node:fs");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
   expect(finiteEvalScriptSourceGraph([{path:'main.js',source}]).error).toBeNull();
   await writeFile(entry,(typed?'// @ts-nocheck\n':'')+source);
   const result=await compile({entry,output,noGc,buildDir:join(directory,'build-'+noGc+'-'+typed),isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/array-join-source#script',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,typed,code:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,typed,code:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString());
  }
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';
import {primitivePropertyPrototypeInput} from '../e2e/generated-cases';
import {buildProgram,resolvePackageRoot} from '../../src/program';
import {sourceExpressionTexts} from '../../src/source-value-flow';

const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
const realmSource=String.raw`const host:any=globalThis;const other=host.$262.createRealm().global;let seen='';const constructors=['Number','String','Boolean','BigInt','Symbol'];
for(const name of constructors){const prototype=other[name].prototype,parent=Object.getPrototypeOf(prototype);Object.setPrototypeOf(prototype,new Proxy(parent,{set(target:any,key:any,value:any,receiver:any){seen+=name+':'+typeof receiver+':'+String(key)+':'+value+'|';return true;}}));}
other.eval('0..probe=11;"".probe=13;true.probe=17;19n.probe=23;Symbol().probe=29;');console.log('realm',seen);
try{other.eval('"use strict";delete Number.prototype.probe;Object.setPrototypeOf(Number.prototype,Object.prototype);0..absent=31;');}catch(error){console.log('realm abrupt',error instanceof other.TypeError,!(error instanceof TypeError));}
console.log('restored',Object.getPrototypeOf(Object(1))===Number.prototype);`;
const vmOracle=String.raw`const fs=require('node:fs'),vm=require('node:vm');const context=vm.createContext({console});const global=vm.runInContext('globalThis',context);context.$262={createRealm(){const other=vm.createContext({console});return {global:vm.runInContext('globalThis',other)}}};vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),context);`;

test('primitive source writes retain inherited setter and opaque Proxy effects',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-primitive-write-facts-'));
 try{for(const [index,source]of [
  'let query="17;";Object.defineProperty(Number.prototype,"probe",{set(value){query="53;"},configurable:true});(1).probe=19;',
  'let query="17;";Object.setPrototypeOf(Number.prototype,new Proxy({}, {set(){query="59;";return true}}));(1).probe=19;',
 ].entries()){
  const entry=join(root,index+'.mjs');await writeFile(entry,'export {};'+source+'console.log(query);');const built=buildProgram({entry,packageRoot:resolvePackageRoot()}),pending:ts.Node[]=[built.entrySourceFile];let query:ts.Expression|undefined;
  while(pending.length){const node=pending.pop()!;if(ts.isCallExpression(node)&&node.getText().startsWith('console.log'))query=node.arguments[0];node.forEachChild(child=>{pending.push(child)});}
  const proof=sourceExpressionTexts(built.program,[query!],{roots:[entry]}).get(query!),node=Bun.spawnSync(['node','-e',source+'require("node:fs").writeSync(1,String(query));'],{stdout:'pipe',stderr:'pipe'});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});if(index===1)expect(proof).toBeNull();else {expect(proof).not.toBeNull();expect(proof!).toContain(node.stdout.toString());}
 }}finally{await rm(root,{recursive:true,force:true})}
});

test('primitive property References preserve receivers, key order, failure and Realm ownership',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-primitive-property-'));
 try{
  const partitions=await readFile(join(import.meta.dir,'../e2e/cases/primitive_property_reference/in.ts'),'utf8');
  for(const javascript of [false,true])for(const noGc of [false,true]){
   const plans=[{name:'partitions',source:partitions,host:false},{name:'sloppy',source:partitions.replace('export {};',''),host:false},{name:'realm',source:realmSource,host:true}];
   if(!javascript)plans.push({name:'prototype',source:primitivePropertyPrototypeInput(noGc?3:4096),host:false});
   for(const plan of plans){
    const source=javascript?erase(plan.source):plan.source,entry=join(root,plan.name+'-'+javascript+'-'+noGc+(javascript?(plan.name==='sloppy'?'.js':'.mjs'):(plan.name==='sloppy'?'.ts':'.mts'))),reference=entry+'.reference.js',output=entry+'-program';
    const nodeSource=erase(plan.source);await writeFile(entry,source);await writeFile(reference,nodeSource);
    const node=Bun.spawnSync(['node',...(plan.host?['-e',vmOracle,reference]:[...(plan.name==='sloppy'?[]:['--input-type=module']),'-e',nodeSource])],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
    const diagnostics:string[]=[],result=await compile({entry,output,buildDir:output+'-build',noGc,...(plan.host?{isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/primitive-property#sloppy',setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});expect({code:result.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
    const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
    if(plan.host){const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString());}else expect(native.stdout.toString()).toBe(node.stdout.toString());
   }
  }
 }finally{await rm(root,{recursive:true,force:true})}
},900000);

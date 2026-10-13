import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {analyzeModuleGraph,prepareNativeRequest} from '../test262/native-host';
import {sha256Text} from '../test262/model';
import {parseHostObservation} from '../test262/protocol';
import {exportedModuleNames,moduleNamespaceBinding,resolveModuleExport,type ModuleExportRecord} from '../../src/module-export-resolution';

const plans=[
 {name:'named',leaf:'export const namespace=17;',left:'export {namespace as token} from "./leaf.js";',right:null,expected:'number:17'},
 {name:'local-alias',leaf:'export const namespace=17;',left:'export {named as token};import {namespace as named} from "./leaf.js";',right:null,expected:'number:17'},
 {name:'quoted',leaf:'const value=17;export {value as "namespace"};',left:'export {"namespace" as token} from "./leaf.js";',right:null,expected:'number:17'},
 {name:'missing',leaf:'export const other=17;',left:'export {namespace as token} from "./leaf.js";',right:null,expected:'SyntaxError'},
 {name:'namespace',leaf:'export const namespace=17;',left:'export * as token from "./leaf.js";',right:null,expected:'object:17'},
 {name:'same-namespace',leaf:'export const namespace=17;',left:'export * as token from "./leaf.js";',right:'export * as token from "./leaf.js";',expected:'object:17'},
 {name:'same-named',leaf:'export const namespace=17;',left:'export {namespace as token} from "./leaf.js";',right:'import {namespace} from "./leaf.js";export {namespace as token};',expected:'number:17'},
 {name:'mixed-identity',leaf:'export const namespace=17;',left:'export {namespace as token} from "./leaf.js";',right:'export * as token from "./leaf.js";',expected:'SyntaxError'},
 {name:'namespace-local-alias',leaf:'export const namespace=17;',left:'export {named as token};import * as named from "./leaf.js";',right:null,expected:'object:17'},
 {name:'destructured-local',leaf:'export const {value:namespace}={value:17};',left:'export {namespace as token} from "./leaf.js";',right:null,expected:'number:17'},
 {name:'default-local-identity',leaf:'export default function namespace(){};export {namespace};',left:'export {default as token} from "./leaf.js";',right:'export {namespace as token} from "./leaf.js";',expected:'function:namespace'},
 {name:'explicit-shadows-star',leaf:'export const token=29;',left:'export const token=17;export * from "./leaf.js";',right:null,expected:'number:17'},
 {name:'star-cycle',leaf:'export const namespace=17;',left:'export * from "./all.js";export {namespace as token} from "./leaf.js";',right:null,expected:'number:17'},
];
function sources(plan:typeof plans[number]):Map<string,string>{return new Map([
 ['test/leaf.js',plan.leaf],['test/left.js',plan.left],...(plan.right?[['test/right.js',plan.right] as [string,string]]:[]),
 ['test/all.js','export * from "./left.js";'+(plan.right?'export * from "./right.js";':'')],
 ['test/root.js','import {token} from "./all.js";export const result=typeof token+":"+(typeof token==="object"?token.namespace:typeof token==="function"?token.name:token);'],
]);}
const oracle=`const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');const input=JSON.parse(fs.readFileSync(0,'utf8')),modules=new Map(input.map(([name,source])=>[name,new vm.SourceTextModule(source,{identifier:name})]));(async()=>{try{const root=modules.get('test/root.js');await root.link((specifier,parent)=>modules.get(path.posix.normalize(path.posix.join(path.posix.dirname(parent.identifier),specifier))));await root.evaluate();fs.writeSync(1,root.namespace.result)}catch(error){fs.writeSync(1,error.name)}})();`;

test('exported name worklists match Node namespace names across graph partitions',()=>{
 for(const same of [false,true])for(const explicit of [false,true])for(const cycle of [false,true]){
  const records=new Map<string,ModuleExportRecord<string>>(),graph=new Map<string,string>();
  const add=(name:string,source:string,locals:readonly string[],stars:readonly string[]=[],namespace=false)=>{
   records.set(name,{path:name,localExports:new Map(locals.map(name=>[name,name])),starExports:stars,indirectExports:new Map(namespace?[['nested',{moduleRequest:'leaf-a',importName:moduleNamespaceBinding}]]:[])});
   graph.set('test/'+name+'.js',source);
  };
  add('leaf-a','export const token=17;export default 19;',['token','default']);
  add('leaf-b','export const token=23;export const other=29;',['token','other']);
  add('left','export * from "./leaf-a.js";'+(cycle?'export * from "./aggregate.js";':''),[],['leaf-a',...(cycle?['aggregate']:[])]);
  add('right',`export * from "./${same?'leaf-a':'leaf-b'}.js";`,[],[same?'leaf-a':'leaf-b']);
  add('aggregate','export * from "./left.js";export * from "./right.js";export * as nested from "./leaf-a.js";export default 31;'+(explicit?'export const token=37;':''),['default',...(explicit?['token']:[])],['left','right'],true);
  graph.set('test/root.js','import * as namespace from "./aggregate.js";export const result=Object.keys(namespace).join("|");');
  const root=records.get('aggregate')!,imported=(_record:ModuleExportRecord<string>,request:string)=>records.get(request)??null;
  const names=exportedModuleNames<string,ModuleExportRecord<string>>(root,imported).filter(name=>{const result=resolveModuleExport<string,ModuleExportRecord<string>>(root,name,imported);return result!==null&&result!=='ambiguous'}).sort();
  const node=Bun.spawnSync(['node','--experimental-vm-modules','--no-warnings','-e',oracle],{stdin:Buffer.from(JSON.stringify([...graph])),stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({same,explicit,cycle,code:node.exitCode,stderr:node.stderr.toString(),names:names.join('|')}).toEqual({same,explicit,cycle,code:0,stderr:'',names:node.stdout.toString()});
 }
});

test('synthetic export records retain String names and direct binding identity',()=>{
 const syntheticOracle=`const fs=require('node:fs'),vm=require('node:vm');const names=JSON.parse(fs.readFileSync(0,'utf8'));const value=new vm.SyntheticModule(names,function(){for(const name of names)this.setExport(name,name)});(async()=>{await value.link(()=>{throw new Error('unexpected dependency')});await value.evaluate();fs.writeSync(1,JSON.stringify(Object.keys(value.namespace)))})();`;
 for(const seed of [0x10293847,0x55667788,0x90abcdef]){
  let state=seed>>>0;const names=['default','namespace','quoted name'];
  while((state&15)!==0){names.push('binding-'+state);state=(Math.imul(state,1664525)+1013904223)>>>0}
  const record:ModuleExportRecord<string>={path:'synthetic',localExports:new Map(names.map(name=>[name,name])),indirectExports:new Map(),starExports:[]};
  const imported=()=>{throw new Error('synthetic record has no imports')};
  const node=Bun.spawnSync(['node','--experimental-vm-modules','--no-warnings','-e',syntheticOracle],{stdin:Buffer.from(JSON.stringify(names)),stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({code:node.exitCode,stderr:node.stderr.toString(),names:exportedModuleNames<string,ModuleExportRecord<string>>(record,imported).sort()}).toEqual({code:0,stderr:'',names:JSON.parse(node.stdout.toString())});
  for(const name of names)expect(resolveModuleExport<string,ModuleExportRecord<string>>(record,name,imported)).toEqual({modulePath:'synthetic',bindingName:name});
  expect(resolveModuleExport<string,ModuleExportRecord<string>>(record,'missing',imported)).toBeNull();
 }
});

test('Module namespace markers stay distinct from every source binding name',async()=>{
 for(const plan of plans){const graph=sources(plan),failure=analyzeModuleGraph('test/root.js',graph),node=Bun.spawnSync(['node','--experimental-vm-modules','--no-warnings','-e',oracle],{stdin:Buffer.from(JSON.stringify([...graph])),stdout:'pipe',stderr:'pipe',timeout:120_000});expect({plan:plan.name,code:node.exitCode,stderr:node.stderr.toString(),result:node.stdout.toString()}).toEqual({plan:plan.name,code:0,stderr:'',result:plan.expected});
  if(plan.expected==='SyntaxError')expect(failure).toMatchObject({phase:'resolution',origin:'module-graph'});else expect({plan:plan.name,failure}).toEqual({plan:plan.name,failure:null});
 }
 const missing=new Map([['test/root.js','import {namespace} from "./leaf.js";'],['test/leaf.js','export const other=17;']]);expect(analyzeModuleGraph('test/root.js',missing)).toMatchObject({phase:'resolution',origin:'module-graph'});
});

test('namespace-name resolution errors retain native preparation phase and origin',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-module-marker-negative-'));
 try{for(const plan of plans.filter(plan=>plan.expected==='SyntaxError')){
  const graph=sources(plan),testSource=graph.get('test/root.js')!,artifactDirectory=path.join(temporary,plan.name);await fs.mkdir(artifactDirectory);
  const moduleFiles=[...graph].filter(([name])=>name!=='test/root.js').map(([name,source])=>({path:name,sha256:sha256Text(source),encoding:'base64' as const,data:Buffer.from(source).toString('base64')})).sort((a,b)=>a.path.localeCompare(b.path));
  const prepared=await prepareNativeRequest({protocolVersion:4,scenarioId:plan.name+'#module',testPath:'test/root.js',moduleBasePath:'test',moduleFiles,mode:'module',goal:'module',raw:false,setupScripts:[],testSource,testSourceSha256:sha256Text(testSource),async:false,canBlock:null,timeoutMs:30_000,artifactDirectory});
  expect(prepared.kind).toBe('compiler-error');if(prepared.kind!=='compiler-error')throw new Error('missing negative preparation');expect(prepared.observation).toMatchObject({kind:'throw',phase:'resolution',origin:'module-graph',errorConstructor:'SyntaxError'});expect(await fs.readFile(path.join(artifactDirectory,prepared.diagnosticsPath),'utf8')).toContain('cannot resolve');
 }}finally{await fs.rm(temporary,{recursive:true,force:true})}
});

test('named bindings and true namespace identities retain native Module execution',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-module-namespace-marker-'));
 try{
  const valid=plans.filter(plan=>plan.expected!=='SyntaxError');
  for(const typed of [false,true])for(const noGc of [false,true]){
   const directory=path.join(temporary,`${typed}-${noGc}`);await fs.mkdir(directory);const entries:string[]=[],imports:string[]=[],checks:string[]=[];
   for(const [index,plan]of valid.entries()){
    const subdirectory=path.join(directory,plan.name);await fs.mkdir(subdirectory);
    for(const [name,body]of sources(plan)){const filename=path.join(subdirectory,path.basename(name));await fs.writeFile(filename,body);entries.push(filename);}
    imports.push(`import {result as result${index}} from './${plan.name}/root.js';import * as exports${index} from './${plan.name}/all.js';`);checks.push(`if(Object.keys(exports${index}).join('|')!=='token')throw new Error('namespace names: ${plan.name}');console.log(result${index});`);
   }
   const entry=path.join(directory,typed?'main.ts':'main.mjs');await fs.writeFile(entry,(typed?'// @ts-nocheck\n':'')+imports.concat(checks).join('\n'));entries.push(entry);
   const output=path.join(directory,'program'),diagnostics:string[]=[];const built=await compile({entry,output,noGc,moduleRoots:entries,initializationEntries:[entry],buildDir:path.join(directory,'build'),test262Observation:{kind:'test262-native-observation',scenarioId:'module-namespace-marker#module',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({typed,noGc,code:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({typed,noGc,code:0,diagnostics:''});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation).toMatchObject({kind:'normal',stdout:valid.map(plan=>plan.expected+'\n').join('')});
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

test('emitter export records traverse one representative deep Module graph',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-emitter-export-depth-'));
 try{
  const depth=512,entries:string[]=[],graph=new Map<string,string>();
  for(let index=0;index<depth;index++){
   const name=`edge-${index}.js`,body=index+1===depth?'export const token=262;export default 17;':`export * from './edge-${index+1}.js';`;
   graph.set('test/'+name,body);const filename=path.join(temporary,name);await fs.writeFile(filename,body);entries.push(filename);
  }
  const body="import * as namespace from './edge-0.js';export const result=Object.keys(namespace).join('|')+':'+namespace.token+':'+(namespace.default===undefined);";
  graph.set('test/root.js',body);
  const node=Bun.spawnSync(['node','--experimental-vm-modules','--no-warnings','-e',oracle],{stdin:Buffer.from(JSON.stringify([...graph])),stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({code:node.exitCode,stderr:node.stderr.toString(),result:node.stdout.toString()}).toEqual({code:0,stderr:'',result:'token:262:true'});
  const entry=path.join(temporary,'root.mjs');await fs.writeFile(entry,body+'\nconsole.log(result);');entries.push(entry);
  for(const noGc of [false,true]){
   const output=path.join(temporary,'program-'+noGc),diagnostics:string[]=[];
   const built=await compile({entry,output,noGc,moduleRoots:entries,initializationEntries:[entry],buildDir:path.join(temporary,'build-'+noGc),diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,code:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,code:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({code:native.exitCode,stderr:native.stderr.toString(),result:native.stdout.toString()}).toEqual({code:0,stderr:'',result:node.stdout.toString()+'\n'});
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

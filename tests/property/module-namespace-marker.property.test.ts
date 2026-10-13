import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {analyzeModuleGraph,prepareNativeRequest} from '../test262/native-host';
import {sha256Text} from '../test262/model';
import {parseHostObservation} from '../test262/protocol';

const plans=[
 {name:'named',leaf:'export const namespace=17;',left:'export {namespace as token} from "./leaf.js";',right:null,expected:'number:17'},
 {name:'local-alias',leaf:'export const namespace=17;',left:'export {named as token};import {namespace as named} from "./leaf.js";',right:null,expected:'number:17'},
 {name:'quoted',leaf:'const value=17;export {value as "namespace"};',left:'export {"namespace" as token} from "./leaf.js";',right:null,expected:'number:17'},
 {name:'missing',leaf:'export const other=17;',left:'export {namespace as token} from "./leaf.js";',right:null,expected:'SyntaxError'},
 {name:'namespace',leaf:'export const namespace=17;',left:'export * as token from "./leaf.js";',right:null,expected:'object:17'},
 {name:'same-namespace',leaf:'export const namespace=17;',left:'export * as token from "./leaf.js";',right:'export * as token from "./leaf.js";',expected:'object:17'},
 {name:'same-named',leaf:'export const namespace=17;',left:'export {namespace as token} from "./leaf.js";',right:'import {namespace} from "./leaf.js";export {namespace as token};',expected:'number:17'},
 {name:'mixed-identity',leaf:'export const namespace=17;',left:'export {namespace as token} from "./leaf.js";',right:'export * as token from "./leaf.js";',expected:'SyntaxError'},
];
function sources(plan:typeof plans[number]):Map<string,string>{return new Map([
 ['test/leaf.js',plan.leaf],['test/left.js',plan.left],...(plan.right?[['test/right.js',plan.right] as [string,string]]:[]),
 ['test/all.js','export * from "./left.js";'+(plan.right?'export * from "./right.js";':'')],
 ['test/root.js','import {token} from "./all.js";export const result=typeof token+":"+(typeof token==="object"?token.namespace:token);'],
]);}
const oracle=`const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');const input=JSON.parse(fs.readFileSync(0,'utf8')),modules=new Map(input.map(([name,source])=>[name,new vm.SourceTextModule(source,{identifier:name})]));(async()=>{try{const root=modules.get('test/root.js');await root.link((specifier,parent)=>modules.get(path.posix.normalize(path.posix.join(path.posix.dirname(parent.identifier),specifier))));await root.evaluate();fs.writeSync(1,root.namespace.result)}catch(error){fs.writeSync(1,error.name)}})();`;

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
    imports.push(`import {result as result${index}} from './${plan.name}/root.js';`);checks.push(`console.log(result${index});`);
   }
   const entry=path.join(directory,typed?'main.ts':'main.mjs');await fs.writeFile(entry,(typed?'// @ts-nocheck\n':'')+imports.concat(checks).join('\n'));entries.push(entry);
   const output=path.join(directory,'program'),diagnostics:string[]=[];const built=await compile({entry,output,noGc,moduleRoots:entries,initializationEntries:[entry],buildDir:path.join(directory,'build'),test262Observation:{kind:'test262-native-observation',scenarioId:'module-namespace-marker#module',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({typed,noGc,code:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({typed,noGc,code:0,diagnostics:''});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation).toMatchObject({kind:'normal',stdout:valid.map(plan=>plan.expected+'\n').join('')});
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

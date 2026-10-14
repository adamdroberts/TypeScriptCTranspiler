import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildProgram,resolvePackageRoot} from '../../src/program';
import {sourceExpressionTexts} from '../../src/source-value-flow';
import {compile} from '../../src/compile';
import {collectionSourceAliasInput} from '../e2e/generated-cases';

async function facts(entry:string,source:string):Promise<readonly string[]|null>{
 await writeFile(entry,source+'\nconsole.log(query);');
 const built=buildProgram({entry,packageRoot:resolvePackageRoot(),...(entry.endsWith('.js')?{isolatedScriptRoots:[entry]}:{})}),work:ts.Node[]=[built.entrySourceFile];let expression:ts.Expression|undefined;
 while(work.length){const node=work.pop()!;if(ts.isCallExpression(node)&&node.getText().startsWith('console.log'))expression=node.arguments[0];node.forEachChild(child=>{work.push(child)});}
 return sourceExpressionTexts(built.program,[expression!],{roots:[entry]}).get(expression!)??null;
}
const nextReplacement='let ready=true;Object.getPrototypeOf([][Symbol.iterator]()).next=function(){if(ready){ready=false;return {done:false,value:"53;"}}return {done:true}};';
const partitions=[
 nextReplacement+'let query="empty";for(const value of ["17;"])query=value;',
 'let query="normal";const next=Object.getPrototypeOf([][Symbol.iterator]()).next;try{next.call(new Set().values())}catch(error){query="wrong brand"}',
 'let query="normal";try{new (new Map().get)}catch(error){query="not constructible"}',

 'const map=new Map([["key","17;"]]);const query=map.get("key");',
 'const map=new Map();map.set("key","19;");const query=map.get("k"+"ey");',
 'const object={};const map=new Map([[object,"23;"]]);const query=map.get(object);',
 'const map=new Map([[NaN,"29;"]]);const query=map.get(NaN);',
 'let query="empty";for(const value of new Set(["31;"]))query=value;',
 'let query="empty";for(const [key,value]of new Map([["key","37;"]]).entries())query=value;',
 'const map=new Map();const query=map.getOrInsert("key","41;");',
 'const map=new Map();const query=map.getOrInsertComputed(-0,key=>String(1/key));',
 'let query="empty";for(const value of new Set())query=value;',
 'const map=new Map([["key","43;"]]);map.clear();const query=map.get("key");',
 'let source="17;";new Map([{get 0(){source="47;";return "key"},1:"value"}]);const query=source;',
];
test('canonical collection records contain independent Node read, iteration and callback facts',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-collection-source-'));
 try{for(const [index,source]of partitions.entries()){
  const proof=await facts(join(directory,index+'.mjs'),'export {};'+source);
  const node=Bun.spawnSync(['node','-e',source+'require("node:fs").writeSync(1,String(query));'],{stdout:'pipe',stderr:'pipe'});
  expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});if(proof===null)throw new Error("unrepresented source partition: "+source);expect(proof).toContain(node.stdout.toString());
 }
 for(const source of ['function callback(){return typeof this}const query=new Map().getOrInsertComputed("key",callback);','function callback(){return typeof this}const query=callback.call(3);','function callback(){return typeof this}const query=callback.call();']){
  const proof=await facts(join(directory,'receiver.js'),source),node=Bun.spawnSync(['node','-e',source+'require("node:fs").writeSync(1,String(query));'],{stdout:'pipe',stderr:'pipe'});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});expect(proof).toContain(node.stdout.toString());
 }
 expect(await facts(join(directory,'opaque.mjs'),'export {};const map=new Map([["key","17;"]]);opaque(map);const query=map.get("key");')).toBeNull();
 expect(await facts(join(directory,'composition.mjs'),'export {};let query="empty";for(const value of new Set(["17;"]).union(new Set(["19;"])))query=value;')).toBeNull();
 const proxyPartitions=[
  'const map=new Map([["key","17;"]]);const callback=new Proxy(function(value){value.set("key","53;")},{});callback(map);const query=map.get("key");',
  'let query="17;";const callback=new Proxy(function(){query="67;"},{});new Map([["key","value"]]).forEach(callback);',
  'let query="17;";const callback=new Proxy(function(){},{apply(){query="71;"}});new Set(["value"]).forEach(callback);',
  'let query="17;";const callback=new Proxy(function(){},{apply(){query="73;"}});callback.bind(null)();',
  'let query="17;";const callback=new Proxy(function(){query="79;"},{});new Map().forEach(callback);',
 ];
 for(const [index,source]of proxyPartitions.entries()){
  const proof=await facts(join(directory,'proxy-'+index+'.mjs'),'export {};'+source),node=Bun.spawnSync(['node','-e',source+'require("node:fs").writeSync(1,String(query));'],{stdout:'pipe',stderr:'pipe'});
  expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});if(proof!==null)expect(proof).toContain(node.stdout.toString());
  if(index===0)expect(proof).toBeNull();
 }
 }finally{await rm(directory,{recursive:true,force:true})}
},900000);

test('collection-derived finite sources execute through native AOT closure in both memory modes',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-collection-source-native-'));
 try{for(const noGc of [false,true]){
  const directory=join(root,String(noGc));await mkdir(directory);const source=collectionSourceAliasInput(noGc?3:512),entry=join(directory,'main.mts'),oracle=join(directory,'reference.mjs'),output=join(directory,'program');await writeFile(entry,source);await writeFile(oracle,ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText);
  const node=Bun.spawnSync(['node',oracle],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const diagnostics:string[]=[],compiled=await compile({entry,output,buildDir:join(directory,'build'),noGc,diagnosticWriter:message=>diagnostics.push(message)});expect({code:compiled.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:node.stdout.toString()});
 }}finally{await rm(root,{recursive:true,force:true})}
},900000);

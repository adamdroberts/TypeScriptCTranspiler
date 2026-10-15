import {nodeReferenceSync} from './node-reference';
import {expect,test} from "bun:test";
import ts from "typescript";
import {mkdtemp,mkdir,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";
import {createEcmaSourceFile} from "../../src/ecmascript-source";
import {earlyFunctionStaticSemanticsFailure} from "../../src/function-static-semantics";
import {evalSourceIsValid,evalSourceRequest} from "../../src/eval-source";
import {functionConstructorSourceIsValid} from "../../src/function-constructor-source";

async function files(directory:string,depth:number,collect:boolean):Promise<string>{
 for(let index=0;index<depth;index++)await writeFile(join(directory,'node-'+index+'.mjs'),
  `${index+1<depth?`import * as next from './node-${index+1}.mjs';export {next};`:''}export const metadata=import.meta;export function read(){return import.meta;}`);
 await writeFile(join(directory,'failed.mjs'),`globalThis.failedMetadata=import.meta;throw globalThis.reason;`);
 return `import * as graph from './node-0.mjs';
 function uninvoked(){import.meta;}
 const root:any=import.meta;const symbol=Symbol('meta');const marker={token:71};
 function rejected(callback:()=>any):boolean{try{callback();return false;}catch(error){return error instanceof TypeError;}}
 console.log('type',typeof import.meta,rejected(()=>import.meta()),rejected(()=>new (import.meta)()));
 root.token=marker;root[symbol]=marker;Object.defineProperty(root,'hidden',{value:marker});
 const descriptor=Object.getOwnPropertyDescriptor(root,'token');
 console.log('shape',Object.getPrototypeOf(root)===null,Object.isExtensible(root),Object.prototype.toString.call(root),descriptor.value===marker,descriptor.writable,descriptor.enumerable,descriptor.configurable);
 console.log('identity',root===import.meta,graph.metadata===graph.read(),root!==graph.metadata,root.hidden===marker,root[symbol]===marker);
 let node:any=graph;let distinct=true;for(let index=1;index<${depth};index++){distinct=distinct&&node.metadata!==node.next.metadata;node=node.next;}
 const tail=node.metadata;tail.retained=marker;${collect?'(globalThis as any).$262.gc();':''}
 console.log('retained-graph',distinct,node.read()===tail,node.read().retained===marker);
 (globalThis as any).reason=marker;let same=true;for(let index=0;index<2;index++){try{await import('./failed.mjs');same=false;}catch(error){same=same&&error===marker;}}
 console.log('rejected-record',same,(globalThis as any).failedMetadata!==root,Object.getPrototypeOf((globalThis as any).failedMetadata)===null);
 Object.freeze(root);console.log('ordinary-freeze',Object.isFrozen(import.meta),import.meta===root);
 `;
}
test('import.meta follows retained Module identity and ordinary null-prototype object semantics',async()=>{
 const temporary=await mkdtemp(join(tmpdir(),'tsc2c-import-meta-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try{for(const typed of [false,true])for(const noGc of [false,true]){
  const directory=join(temporary,`${typed}-${noGc}`);await mkdir(directory);const source=await files(directory,typed&&!noGc?128:3,!noGc);
  const reference=join(directory,'reference.mjs');await writeFile(reference,erase(source.replace('(globalThis as any).$262.gc();','')));
  const node=nodeReferenceSync(['node',reference],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exit:node.exitCode,stderr:node.stderr.toString()}).toEqual({exit:0,stderr:''});
  const entry=join(directory,typed?'main.ts':'main.mjs');await writeFile(entry,typed?'// @ts-nocheck\n'+source:erase(source));
  const output=join(directory,'program'),diagnostics:string[]=[];
  const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:join(directory,'build'),diagnosticWriter:message=>diagnostics.push(message),test262Observation:{kind:'test262-native-observation',scenarioId:'property/import-meta-record#module',setupEntries:[],testEntry:entry,async:false}});
  expect({exit:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exit:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exit:native.exitCode,stderr:native.stderr.toString()}).toEqual({exit:0,stderr:''});
  const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(node.stdout.toString());
 }}finally{await rm(temporary,{recursive:true,force:true});}
},900_000);

test('Module metadata source cells preserve finite source selection',async()=>{
 const temporary=await mkdtemp(join(tmpdir(),'tsc2c-import-meta-source-'));
 try{const entry=join(temporary,'main.mjs');await writeFile(entry,"const meta=import.meta;meta.code='7+11';console.log(eval(import.meta.code));\n");
  const diagnostics:string[]=[];const result=await compile({entry,output:join(temporary,'program'),buildDir:join(temporary,'build'),emitCOnly:true,diagnosticWriter:message=>diagnostics.push(message)});
  expect({exit:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exit:0,diagnostics:''});
 }finally{await rm(temporary,{recursive:true,force:true});}
});

test('import.meta admission follows the parse goal through the source tree',()=>{
 for(const source of ['import.meta;','function read(){return import.meta;}','()=>import.meta;','class C {read(){return import.meta;}}']) {
  const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");try{new vm.Script(process.argv[1]);process.exitCode=1}catch(error){if(!(error instanceof SyntaxError))throw error;}',source],{stdout:'pipe',stderr:'pipe'});
  expect({exit:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exit:0,stderr:''});
  for(const goal of ['script','module'] as const){const file=createEcmaSourceFile('source.js',source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,goal);expect(earlyFunctionStaticSemanticsFailure(file)?.message??null).toBe(goal==='script'?'import.meta requires the Module parse goal':null);}
  expect(evalSourceIsValid(evalSourceRequest('direct',source,true))).toBe(false);
 }
 expect(functionConstructorSourceIsValid({parameters:'',body:'return import.meta;'})).toBe(false);
 for(const source of ['import.m\\u0065ta;','function read(){return new.targ\\u0065t;}']) {
  const file=createEcmaSourceFile('source.js',source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,'module');
  expect(earlyFunctionStaticSemanticsFailure(file)?.message).toBe('MetaProperty requires its literal token spelling');
 }
 const literals=createEcmaSourceFile('source.mjs','const a=/import.meta/;const b=`import.meta ${import.meta}`;',ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,'module');
 const worklist:ts.Node[]=[literals];const metadata:ts.MetaProperty[]=[];
 while(worklist.length){const node=worklist.pop()!;if(ts.isMetaProperty(node))metadata.push(node);ts.forEachChild(node,child=>{worklist.push(child);});}
 expect(metadata.map(node=>node.getText(literals))).toEqual(['import.meta']);
 expect(literals.text).toBe('const a=/import.meta/;const b=`import.meta ${import.meta}`;');
});

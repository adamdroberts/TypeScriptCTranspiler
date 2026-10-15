import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';

const source=String.raw`import ordinary from 'node:buffer';import * as namespace from 'buffer';import {Buffer as Named,atob as decode,btoa as encode,transcode} from 'node:buffer';
function check(value:any,label:string){if(!value)throw new Error(label);console.log(label,true)}
check(Named===Buffer&&ordinary.Buffer===Buffer&&namespace.Buffer===Buffer&&namespace.default===ordinary,'constructor-identity');
check(decode===atob&&encode===btoa&&ordinary.atob===decode&&namespace.transcode===transcode,'export-identity');
for(const [name,length] of [['Buffer',3],['atob',1],['btoa',1],['transcode',3]] as const){const value=(ordinary as any)[name],d=Object.getOwnPropertyDescriptor(ordinary,name);check(value.name===name&&value.length===length&&d.value===value&&d.writable&&d.enumerable&&d.configurable,'metadata-'+name)}
const bytes=Named.from('retained');check(bytes.toString()==='retained'&&Named.isBuffer(bytes)&&Named.byteLength(bytes)===8,'actual-byte-owner');
const actual=ordinary.Buffer;const substitute=function(value:any){return {value}};(ordinary as any).Buffer=substitute;check((ordinary as any).Buffer(17).value===17&&namespace.Buffer===actual&&Named===actual,'default-mutation-separate-namespace');ordinary.Buffer=actual;
const saved=Named.from;const old=Named.from;let trace='';(Named as any).from=function(...args:any[]){trace+='C';return {args}};
const marker={};function mark(value:any){trace+='A';return value}const replaced=(Named as any).from(mark(marker),mark('utf8'),mark('ignored'));check(trace==='AAAC'&&replaced.args[0]===marker&&replaced.args.length===3,'complete-actuals-and-live-constructor');(Named as any).from=old;
function shadow(Named:any){return Named.from('shadow')}check(shadow({from(value:any){return value}})==='shadow','lexical-shadow');
const originalDecode=globalThis.atob;(globalThis as any).atob=function(){return 'changed'};check(decode('QQ==')==='A'&&namespace.atob===decode,'global-mutation-keeps-export');globalThis.atob=originalDecode;
const encoded=Reflect.apply(encode,Symbol(),['A','ignored']);check(encoded==='QQ=='&&Reflect.apply(decode,{},[encoded])==='A','base64-actual-owner');
const owners:any[]=[];for(let i=0;i<512;i++)owners.push({constructor:Named,create:saved,data:Named.from('value'+i)});let valid=true;for(let i=0;i<owners.length;i++)valid=valid&&owners[i].constructor===Buffer&&owners[i].data.toString()==='value'+i&&Reflect.apply(owners[i].create,{},['saved'+i]).toString()==='saved'+i;check(valid,'retained-export-owner-graph');
async function main(){const callee=Named.from;const result=Reflect.apply(callee,{},[await Promise.resolve('suspended')]);check(result.toString()==='suspended','stored-import-suspension')}main();`;

test('Buffer module exports share ordinary retained owners and complete actual Lists',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-buffer-module-owner-'));
 try{const program=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 const oracle=join(root,'oracle.mjs');await writeFile(oracle,program);const node=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.map(String).join(" ")+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});expect(node.stdout.toString().trimEnd().split('\n').at(-1)).toBe('stored-import-suspension true');
 for(const typed of [true,false])for(const noGc of [false,true]){
  const entry=join(root,`main-${typed}-${noGc}.${typed?'mts':'mjs'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?source:program);
  const r=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:m=>diagnostics.push(m)});expect({typed,noGc,code:r.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const run=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});expect({typed,noGc,code:run.exitCode,stderr:run.stderr.toString(),stdout:run.stdout.toString()}).toEqual({typed,noGc,code:0,stderr:'',stdout:node.stdout.toString()});
 }
 }finally{await rm(root,{recursive:true,force:true})}
},900000);

test('Buffer import source identities and declared exports share the canonical owner collection',async()=>{
 const {finiteEvalScriptSourceGraph}=await import('../test262/native-host');
 const {runtimeBufferExports}=await import('../../src/global-bindings');
 const {readFile}=await import('node:fs/promises');
 const declaration=await readFile(join(process.cwd(),'stdlib/lib.core.d.ts'),'utf8');
 const block=declaration.split('interface BufferModule {')[1]!.split('}')[0]!;
 const declared=new Set(block.split(String.fromCharCode(10)).map(line=>line.trim()).filter(Boolean).map(line=>line.split(':')[0]!.split('(')[0]!));
 expect(declared).toEqual(new Set(runtimeBufferExports));
 const graph=finiteEvalScriptSourceGraph([{path:'buffer-source.mjs',source:"import {Buffer as Bytes} from 'node:buffer';const fn=Bytes.from;eval(fn.name==='from'?'17;':'23;');"}]);
 expect(graph.error).toBeNull();expect(graph.directEvalSources).toContainEqual({source:'17;',strictCaller:true,strict:true});
});

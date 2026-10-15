import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';

function subject(root:string):string{return `import ordinary from 'node:fs';import * as namespace from 'node:fs';import {readdirSync as names,readFileSync as read} from 'node:fs';import promises from 'node:fs/promises';
const root=${JSON.stringify(root)},file=root+'/entry';
function check(value:any,label:string){if(!value)throw new Error(label);console.log(label,true)}
ordinary.rmSync(root,{recursive:true,force:true});ordinary.mkdirSync(root,{recursive:true});ordinary.writeFileSync(file,'A\\0B');
const typed:string[]=names(root,{encoding:'utf8'}),alias=typed;const marker={token:17};
check(Array.isArray(typed)&&typed[0]==='entry'&&typed===alias,'typed-host-array-owner');
const method=ordinary.readdirSync;(ordinary as any).readdirSync=function(){return marker};
const actual:string[]=ordinary.readdirSync(root);check((actual as any)===marker&&namespace.readdirSync===method&&names===method,'ambient-result-keeps-actual-owner');ordinary.readdirSync=method;
Object.defineProperty(typed,'retained',{value:marker,configurable:true});Reflect.set(alias,'0',marker);check((typed as any)[0]===marker&&(alias as any).retained===marker&&typed===alias,'native-array-storage-mutation');
function shadow(ordinary:any){return ordinary.readdirSync()}check(shadow({readdirSync(){return marker}})===marker,'lexical-host-shadow');
const bytes:Buffer=read(file,null),objectBytes:Buffer=read(file,{encoding:null});check(Buffer.isBuffer(bytes)&&bytes.length===3&&bytes[0]===65&&bytes[1]===0&&bytes[2]===66&&objectBytes.toString('hex')==='410042','present-null-byte-owner');
const textNames:string[]=names(root,null);check(textNames[0]==='entry'&&typeof textNames[0]==='string','null-directory-text-profile');
async function run(){
 const result:string[]=await promises.readdir(root,{encoding:'utf8'});const same=result;Reflect.set(result,'0',marker);check((same as any)[0]===marker&&result===same,'awaited-host-array-owner');
 await promises.readdir(root,{encoding:'utf8'}).then((entries:string[])=>{const retained=entries;Reflect.set(entries,'0',marker);check(retained===entries&&(retained as any)[0]===marker,'reaction-host-array-owner')});
 const promised:Buffer=await promises.readFile(file,null);check(Buffer.isBuffer(promised)&&promised.toString('hex')==='410042','awaited-null-byte-owner');
 let graph:any={typed,bytes,result};for(let depth=0;depth<1024;depth++)graph={next:graph};await Promise.resolve(graph);for(let depth=0;depth<1024;depth++)graph=graph.next;
 check(graph.typed===typed&&graph.bytes===bytes&&graph.result===result&&(graph.typed as any)[0]===marker,'deep-retained-host-result-graph');ordinary.rmSync(root,{recursive:true,force:true});
}run();`;}

test('ordinary host exports propagate actual result owners through typed aliases and reactions',async()=>{
 const temporary=await mkdtemp(join(tmpdir(),'tsc2c-host-result-owner-'));
 try{
  const source=subject(join(temporary,'work')),erased=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
  const oracle=join(temporary,'reference.mjs');await writeFile(oracle,erased);
  const node=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(...v)=>fs.writeSync(1,v.map(String).join(" ")+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});expect(node.stdout.toString().trimEnd().split('\n').at(-1)).toBe('deep-retained-host-result-graph true');
  for(const typed of [true,false])for(const noGc of [false,true]){
   const entry=join(temporary,`main-${typed}-${noGc}.${typed?'mts':'mjs'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?source:erased);
   const built=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:m=>diagnostics.push(m)});
   expect({typed,noGc,code:built.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,noGc,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({typed,noGc,code:0,stderr:'',stdout:node.stdout.toString()});
  }
 }finally{await rm(temporary,{recursive:true,force:true})}
},900000);

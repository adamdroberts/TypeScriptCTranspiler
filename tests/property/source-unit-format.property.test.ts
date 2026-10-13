import { expect, test } from "bun:test";
import ts from "typescript";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compile } from "../../src/compile";
import { buildProgram, resolvePackageRoot, sourceUnitFormat } from "../../src/program";
import { ecmaParseGoal } from "../../src/ecmascript-source";
import { parseHostObservation } from "../test262/protocol";

const partitions = [
 {directory:"declared-cjs",type:"commonjs",extension:".js",commonjs:true},
 {directory:"declared-esm",type:"module",extension:".js",commonjs:false},
 {directory:"cjs-extension",type:"module",extension:".cjs",commonjs:true},
 {directory:"esm-extension",type:"commonjs",extension:".mjs",commonjs:false},
 {directory:"ambiguous-cjs",type:undefined,extension:".js",commonjs:true},
 {directory:"syntax-esm",type:undefined,extension:".js",commonjs:false,syntax:true},
] as const;
async function fixtures(directory:string,depth:number,collect:boolean):Promise<string>{
 const imports:string[]=[],checks:string[]=[];
 for(const [index,partition] of partitions.entries()){
  const folder=join(directory,partition.directory);await mkdir(folder,{recursive:true});
  await writeFile(join(folder,"package.json"),JSON.stringify(partition.type?{type:partition.type}:{}));
  const name="value"+partition.extension,spec="./"+partition.directory+"/"+name;
  const text=partition.commonjs ? `exports.receiver=this;exports.label='${partition.directory}';exports.read=function(){return this===exports;};module.exports=Object.freeze(exports);` :
   `globalThis['format${index}']=this===undefined;${'syntax' in partition&&partition.syntax?"export {};":""}`;
  await writeFile(join(folder,name),text);
  if(partition.commonjs){imports.push(`import owner${index}, {label as label${index}} from '${spec}';`);checks.push(`console.log(label${index},owner${index}.receiver===owner${index},owner${index}.read());`);}
  else {imports.push(`import '${spec}';`);checks.push(`console.log('${partition.directory}',globalThis['format${index}']);`);}
 }
 const graph=join(directory,"graph");await mkdir(graph);await writeFile(join(graph,"package.json"),'{"type":"commonjs"}');
 for(let index=0;index<depth;index++)await writeFile(join(graph,'node-'+index+'.js'),index+1<depth?`exports.next=require('./node-${index+1}.js');`:`exports.token=71;`);
 imports.push("import graph from './graph/node-0.js';");checks.push(`${collect?"(globalThis as any).$262.gc();":""}console.log('retained-format-graph',graph${'.next'.repeat(depth-1)}.token);`);
 return '// @ts-nocheck\n'+imports.join('\n')+'\n'+checks.join('\n');
}
test('host source formats preserve Script wrappers and ECMAScript Module goals over one source-unit graph',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-source-format-'));
 try{
  for(const typed of [false,true])for(const noGc of [false,true]){
   const directory=join(root,`${typed}-${noGc}`);await mkdir(directory);const depth=typed&&!noGc?128:3;
   const source=await fixtures(directory,depth,!noGc),entry=join(directory,typed?'main.ts':'main.mjs');
   const erase=(value:string)=>ts.transpileModule(value,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
   await writeFile(entry,typed?source:erase(source));
   const reference=join(directory,'reference.mjs');await writeFile(reference,erase(source.replace('(globalThis as any).$262.gc();','')));
   const node=Bun.spawnSync(['node','--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',reference],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exit:node.exitCode,stderr:node.stderr.toString()}).toEqual({exit:0,stderr:''});
   const built=buildProgram({entry,packageRoot:resolvePackageRoot()});
   for(const partition of partitions){const file=built.program.getSourceFile(join(directory,partition.directory,'value'+partition.extension))!;expect(sourceUnitFormat(file)).toBe(partition.commonjs?'commonjs':'ecmascript');expect(ecmaParseGoal(file)).toBe(partition.commonjs?'script':'module');}
   const output=join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:join(directory,'build'),diagnosticWriter:message=>diagnostics.push(message),test262Observation:{kind:'test262-native-observation',scenarioId:'property/source-unit-format#module',setupEntries:[],testEntry:entry,async:false}});
   expect({exit:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exit:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exit:native.exitCode,stderr:native.stderr.toString()}).toEqual({exit:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString());
  }
 }finally{await rm(root,{recursive:true,force:true});}
},900_000);

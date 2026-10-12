import { expect, test } from "bun:test";
import ts from "typescript";
import { mkdtemp, writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compile } from "../../src/compile";
import { buildProgram, resolvePackageRoot, sourceUnitFileName } from "../../src/program";
import { buildModuleGraph } from "../../src/resolve";
import { ecmaParseGoal } from "../../src/ecmascript-source";
import { parseHostObservation } from "../test262/protocol";

function source(index: number, depth: number, collect: boolean): string {
    return `var host:any=globalThis;var value=${index};function read():number{return value;}
if(this===undefined){
 host.readers.push(read);value+=7;
 ${index+1<depth?`host.pending.push(import("./unit-${index+1}.js"));`:""}
}else{
 host.readers=[];host.pending=[];host.scriptRead=read;
 host.pending.push(import("./unit-0.js"),import("./unit-0.js"));
 async function verify():Promise<void>{
  for(let cursor=0;cursor<host.pending.length;cursor++)await host.pending[cursor];
  ${collect?"host.$262.gc();":""}
  if(read()!==0||host.value!==0||host.readers.length!==${depth}||!host.readers.every((reader:any,index:number)=>reader()===index+7))throw 'private cells';
  if(await host.pending[0]!==await host.pending[1])throw 'module cache';
  host.print('script-module-cells-and-cache:true');
 }
 verify().catch((error:any)=>{host.print('failure:'+String(error));throw error;});
}`;
}
const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
const oracle=String.raw`const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const sources=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const records=new Map();
const context=vm.createContext({print:value=>fs.writeSync(1,String(value)+'\n')});
function record(name){let item=records.get(name);if(item)return item;
 const module=new vm.SourceTextModule(sources[name],{context,identifier:name,importModuleDynamically:specifier=>load(path.posix.normalize(path.posix.join(path.posix.dirname(name),specifier)))});
 item={module};records.set(name,item);return item;}
async function load(name){const item=record(name);item.linked??=item.module.link(specifier=>record(path.posix.normalize(path.posix.join(path.posix.dirname(name),specifier))).module);await item.linked;item.evaluated??=item.module.evaluate();await item.evaluated;return item.module;}
new vm.Script(sources['unit-0.js'],{filename:'unit-0.js',importModuleDynamically:specifier=>load(path.posix.normalize(specifier))}).runInContext(context);`;

test("source units keep Script and Module identities, private cells and cached evaluation separate", async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-source-unit-goal-'));
 try{
  for(const typed of [false,true])for(const noGc of [false,true]){
   const depth=typed&&!noGc?128:3,variant=String(typed)+'-'+String(noGc),root=join(directory,variant);await mkdir(root);
   const files:string[]=[],references:Record<string,string>={};
   for(let index=0;index<depth;index++){
    const entry=join(root,'unit-'+index+(typed?'.ts':'.js'));files.push(entry);
    await writeFile(entry,typed?source(index,depth,!noGc):erase(source(index,depth,!noGc)));
    references['unit-'+index+'.js']=erase(source(index,depth,false));
   }
   const reference=join(root,'reference.json');await writeFile(reference,JSON.stringify(references));
   const node=Bun.spawnSync(['node','--experimental-vm-modules','--no-warnings','-e',oracle,reference],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exit:node.exitCode,stderr:node.stderr.toString()}).toEqual({exit:0,stderr:''});expect(node.stdout.toString()).toBe('script-module-cells-and-cache:true\n');
   const options={entry:files[0]!,packageRoot:resolvePackageRoot(),additionalRoots:files.slice(1),isolatedScriptRoots:files};
   const built=buildProgram(options),graph=buildModuleGraph(built.program,built.libCoreDts,built.entrySourceFile.fileName);
   for(const entry of files){
    const script=sourceUnitFileName(built.program,entry,'script'),module=sourceUnitFileName(built.program,entry,'module');
    expect(script).not.toBe(module);expect(built.program.getSourceFile(script)!.text).toBe(built.program.getSourceFile(module)!.text);
    expect(ecmaParseGoal(built.program.getSourceFile(script)!)).toBe('script');expect(ecmaParseGoal(built.program.getSourceFile(module)!)).toBe('module');
    expect(graph.fileToModuleId.get(script)).not.toBe(graph.fileToModuleId.get(module));
   }
   const output=join(root,'program'),diagnostics:string[]=[];
   const result=await compile({...options,output,noGc,initializationEntries:[files[0]!],buildDir:join(root,'build'),test262Observation:{kind:'test262-native-observation',scenarioId:'property/source-unit-goal#sloppy',setupEntries:[],testEntry:files[0]!,async:false,scriptEntries:files},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exit:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exit:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exit:native.exitCode,stderr:native.stderr.toString()}).toEqual({exit:0,stderr:''});
   const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed).toMatchObject({kind:'normal'});expect(observed.stdout).toBe(node.stdout.toString());
  }
 }finally{await rm(directory,{recursive:true,force:true});}
},900_000);

import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {buildProgram,resolvePackageRoot} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {sourceProjectionProvenanceInput} from '../e2e/generated-cases';

test('projection provenance closes composition while preserving actual sources and opaque alternatives',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-projection-provenance-facts-'));
 try{for(const operation of ['value','String(value)','`${value}`']){
  for(const opaque of [false,true]){
   const entry=join(root,'main.ts');
   await writeFile(entry,`function project(value:any):any{return ${operation}}function twice(fn:(value:any)=>any,value:any):any{return fn(fn(value))}const saved=twice(project,'17;');twice(project,${opaque?'opaque()':"'19;'"});eval(saved);declare function opaque():any;`);
   const built=buildProgram({entry,packageRoot:resolvePackageRoot()});
   const calls=sourceEvaluationInvocations(built.program,{roots:[entry]}).filter(call=>call.operation==='eval');
   expect(calls).toHaveLength(1);
   if(operation==='value')expect(calls[0]!.choices).toEqual(['17;']);
   else if(opaque)expect(calls[0]!.choices).toBeNull();
   else expect(calls[0]!.choices).toEqual(expect.arrayContaining(['17;']));
  }
 }
 const entry=join(root,'unknown.ts');await writeFile(entry,"function project(value:any):any{return String(value)}function twice(fn:(value:any)=>any,value:any):any{return fn(fn(value))}eval(twice(project,opaque()));declare function opaque():any;");
 const diagnostics:string[]=[];const result=await compile({entry,output:entry+'-native',emitCOnly:true,diagnosticWriter:message=>diagnostics.push(message)});
 expect(result.exitCode).toBe(3);expect(diagnostics.join('')).toContain('unknown eval() source requires --runtime-code-manifest allow-list or gated --unsafe-eval embedded Node bridge');
 }finally{await rm(root,{recursive:true,force:true})}
});

test('cyclic capture and return projections match Node through typed and erased native execution',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-projection-provenance-native-'));
 try{
 const original=await readFile(join(import.meta.dir,'../e2e/cases/function_closures/in.ts'),'utf8');
 const recursive=`{function read(depth:number):any{let value:any='41;';const code:any="depth?read(depth-1):value";return eval(code)}console.log('recursive:',eval(read(3)));}`;
 const separate=`{function read(value:any):any{return eval('value')}console.log('actual:',eval(read('43;')),eval(read('47;')));}`;
 for(const typed of [true,false])for(const noGc of [false,true]){
  const source=original+'\n'+recursive+'\n'+separate+'\n'+sourceProjectionProvenanceInput(typed&&!noGc?512:3);
  const program=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}.js`);await writeFile(oracle,program);
  const node=Bun.spawnSync(['node',oracle],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?source:program);
  const result=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:node.stdout.toString()});
 }
 }finally{await rm(root,{recursive:true,force:true})}
},900000);

import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {createEcmaSourceFile} from '../../src/ecmascript-source';
import {sourceFileExpressionTexts} from '../../src/source-file-expression-proof';
import {moduleIteratorImportInput} from '../e2e/generated-cases';

function query(source:string):readonly string[]|null{
 const file=createEcmaSourceFile('/tmp/module-iterator-proof.mjs',source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,'module'),pending:ts.Node[]=[file];
 while(pending.length){const node=pending.pop()!;if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword)return sourceFileExpressionTexts(node.arguments[0]!);node.forEachChild(child=>{pending.push(child)});}
 throw new Error('missing import');
}
test('canonical iterator reads retain dense, hole, inherited and empty source domains',()=>{
 const plans=[['','["./a.mjs","./b.mjs"]'],['','[,"./a.mjs"]'],['Array.prototype[0]="./inherited.mjs";','[,"./a.mjs"]'],['const values=["./a.mjs"];Object.defineProperty(values,0,{get(){return "./getter.mjs"}});','values'],['','[]'],['const values={[Symbol.iterator](){return {next(){return {done:true,value:"./outside.mjs"}}}}};','values']];
 for(const [setup,collection]of plans){
  const source=setup+`async function run(){for(const request of ${collection}){await import(request)}}run();`,proof=query(source);
  const node=Bun.spawnSync(['node','-e',setup+`for(const request of ${collection})require('node:fs').writeSync(1,String(request)+'\\n');`],{stdout:'pipe',stderr:'pipe'});
  expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});expect(proof).not.toBeNull();
  const values=node.stdout.toString().trimEnd();if(values)for(const value of values.split('\n'))expect(proof).toContain(value);else expect(proof).toEqual([]);
 }
 for(const setup of ['opaque();','Array.prototype[Symbol.iterator]=function*(){yield "./outside.mjs"};'])expect(query(setup+'async function run(){for(const request of ["./a.mjs"]){await import(request)}}run();')).toBeNull();
 for(const value of ['./literal.mjs','', './escaped\0.mjs','./\u03bb.mjs']){
  const literal=JSON.stringify(value),node=Bun.spawnSync(['node','-e',"require('node:fs').writeSync(1,String(JSON.parse(process.argv[1])))",literal],{stdout:'pipe',stderr:'pipe'});
  expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});expect(query('opaque();import('+literal+');')).toEqual([node.stdout.toString()]);
 }
 expect(query('import(Symbol());')).toEqual([]);
 expect(query('import({[Symbol.toPrimitive](hint){return "./coerced.mjs"}});')).toEqual(['./coerced.mjs']);
});
test('iterator imports and source graph closure match Node in both native memory modes',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-module-iterator-'));
 try{for(const noGc of [false,true]){
  const directory=join(root,String(noGc));await mkdir(directory);
  await writeFile(join(directory,'a.mjs'),'export const value=17;');await writeFile(join(directory,'b.mjs'),'export const value=19;');
  const input=moduleIteratorImportInput(noGc?1:512),entry=join(directory,'main.mjs');for(const [name,source]of Object.entries(input.files))await writeFile(join(directory,name),source);await writeFile(entry,input.source);
  const node=Bun.spawnSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const diagnostics:string[]=[],output=join(directory,'program'),built=await compile({entry,output,buildDir:join(directory,'build'),noGc,diagnosticWriter:x=>diagnostics.push(x)});
  expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:node.stdout.toString()});
  await writeFile(entry,'let touched=false;async function run(){const namespace=await import({[Symbol.toPrimitive](hint){return "./a.mjs"}});try{await import(Symbol(),{get with(){touched=true;return {type:"json"}}})}catch(error){console.log(namespace.value,error instanceof TypeError,!touched)}}run();');
  const coercionNode=Bun.spawnSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:120000}),coercionDiagnostics:string[]=[],coercion=await compile({entry,output:output+'-coercion',noGc,diagnosticWriter:x=>coercionDiagnostics.push(x)});
  expect({code:coercion.exitCode,diagnostics:coercionDiagnostics}).toEqual({code:0,diagnostics:[]});const coercionNative=Bun.spawnSync([output+'-coercion'],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({code:coercionNode.exitCode,stderr:coercionNode.stderr.toString()}).toEqual({code:0,stderr:''});expect({code:coercionNative.exitCode,stderr:coercionNative.stderr.toString(),stdout:coercionNative.stdout.toString()}).toEqual({code:0,stderr:'',stdout:coercionNode.stdout.toString()});
  for(const body of ['Array.prototype[Symbol.iterator]=function*(){yield "./b.mjs"};export const value=17;', 'export function then(resolve){Array.prototype[Symbol.iterator]=function*(){yield "./b.mjs"};resolve({})}']){
   await writeFile(join(directory,'a.mjs'),body);
   await writeFile(entry,'async function run(){for(const request of ["./a.mjs"]){await import(request)}}run().then(run);');
   const reference=Bun.spawnSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});
   const rejected:string[]=[],unsafe=await compile({entry,output:output+'-unsafe',noGc,diagnosticWriter:x=>rejected.push(x)});expect(unsafe.exitCode).toBe(3);expect(rejected.join('')).toContain('dynamic import needs a finite AOT specifier proof');
  }
 }}finally{await rm(root,{recursive:true,force:true})}
},900000);

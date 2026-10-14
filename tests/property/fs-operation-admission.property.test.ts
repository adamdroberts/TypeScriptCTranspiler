import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {resolvePackageRoot} from '../../src/program';
import {runtimeFsExports,runtimeFsFdOperations} from '../../src/global-bindings';
const source=String.raw`
import {open} from 'node:fs/promises';
function local(fs:any):any{return fs.readFileSync('payload');}
function nested(fs:any):any{return fs.promises.readFile('nested');}
const owner:any={readFileSync(value:any):any{return 'local:'+value;},promises:{readFile(value:any):any{return 'nested:'+value;}}};
console.log('shadow',local(owner),nested(owner));
function deep(fs:any):any { DEEP }
console.log('deep shadow',deep(owner));
open('package.json','r').then((handle:any):any=>handle.close()).then(():void=>console.log('named open',true));
`.replace('DEEP','{'.repeat(512)+"return fs.readFileSync('deep');"+'}'.repeat(512));
test('filesystem export channels share one admission collection and preserve lexical receiver identity',async()=>{
 const library=ts.createSourceFile('lib.core.d.ts',await readFile(join(resolvePackageRoot(),'stdlib/lib.core.d.ts'),'utf8'),ts.ScriptTarget.Latest,true);
 for(const [channel,name] of [['sync','FS'],['promises','FSPromises']] as const){
  const declaration=library.statements.find(statement=>ts.isInterfaceDeclaration(statement)&&statement.name.text===name) as ts.InterfaceDeclaration;
  const methods=new Set(declaration.members.filter(ts.isMethodSignature).map(member=>(member.name as ts.Identifier).text));
  expect([...methods].sort()).toEqual([...runtimeFsExports.get(channel)!].sort());
 }
 for(const name of runtimeFsFdOperations.keys())expect(runtimeFsExports.get('sync')!.has(name)).toBe(true);
 expect(runtimeFsExports.get('promises')!.has('open')).toBe(true);
 const root=await mkdtemp(join(tmpdir(),'tsc2c-fs-admission-'));
 try{
  const erased=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText,oracle=join(root,'oracle.mjs'),stdout=oracle+'.stdout';await writeFile(oracle,erased);
  const node=Bun.spawnSync(['node',oracle],{stdout:Bun.file(stdout),stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});const expected=await readFile(stdout,'utf8');expect(expected).toBe('shadow local:payload nested:nested\ndeep shadow local:deep\nnamed open true\n');
  for(const typed of [true,false])for(const noGc of [false,true]){
   const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'mjs'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?source:erased);
   const result=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:m=>diagnostics.push(m)});expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(native.stdout.toString()).toBe(expected);
  }
 }finally{await rm(root,{recursive:true,force:true});}
},900000);

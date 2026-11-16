import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

// An import binding from a host module needs a runtime owner. When the host
// module has none (node:module), or the export is not one of the owner's
// members, the binding has no C storage: compilation fails closed with one
// stable diagnostic instead of emitting a reference to an undeclared C
// variable (which only gcc rejected). Partitions: named, namespace and default
// imports of node:module, an unowned named export of node:util, in .mjs and
// .ts modules; a supported node:path import is the control (compared with
// Node). One module importing 64 names from node:module is the stress.
const diagnostic='ambient host export requires an ordinary runtime owner';
const unowned:Record<string,string>={
 named:'import { isBuiltin } from "node:module";\nconsole.log(isBuiltin("fs"));\n',
 namedValue:'import { builtinModules } from "node:module";\nconsole.log(builtinModules.length > 0);\n',
 namespace:'import * as m from "node:module";\nconsole.log(typeof m.createRequire);\n',
 createRequire:'import { createRequire } from "node:module";\nconsole.log(typeof createRequire(import.meta.url));\n',
 unownedMember:'import { styleText } from "node:util";\nconsole.log(typeof styleText);\n',
};

test('imports from host modules without a runtime owner fail closed',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-host-import-owner-'));
 try{
  const names=Array.from({length:64},(_,index)=>`n${index}`);
  const cases:Array<[string,string]>=[];
  for(const [name,source] of Object.entries(unowned))cases.push([`${name}.mjs`,source],[`${name}.ts`,'// @ts-nocheck\n'+source]);
  cases.push(['stress.mjs',`import { ${names.map(name=>`isBuiltin as ${name}`).join(', ')} } from "node:module";\nconsole.log(${names.map(name=>`${name}("fs")`).join(' && ')});\n`]);
  for(const [file,source] of cases){
   const entry=join(directory,file),diagnostics:string[]=[];
   await writeFile(entry,source);
   const built=await compile({entry,output:join(directory,file+'.out'),buildDir:join(directory,file+'-build'),diagnosticWriter:message=>diagnostics.push(message)});
   const text=diagnostics.join('\n');
   expect({file,code:built.exitCode,stable:text.includes(diagnostic),gcc:text.includes('gcc exited')}).toEqual({file,code:3,stable:true,gcc:false});
  }
  const control=join(directory,'control.mjs'),diagnostics:string[]=[];
  await writeFile(control,'import { join } from "node:path";\nimport * as path from "node:path";\nconsole.log(join("a", "b"), path.basename("/x/y.txt"));\n');
  const node=nodeReferenceSync(['node',control],{stdout:'pipe',stderr:'pipe',timeout:30_000});
  const built=await compile({entry:control,output:join(directory,'control.out'),buildDir:join(directory,'control-build'),diagnosticWriter:message=>diagnostics.push(message)});
  expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([join(directory,'control.out')],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  expect({code:native.exitCode,stdout:native.stdout.toString()}).toEqual({code:0,stdout:node.stdout.toString()});
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {pathComponentInput} from '../e2e/generated-cases';

function partitions():string{
 const fragments=['','a','/a','//','./','../','a/../','a//b/./c','/a/../../b','a/../../b','../a/../','x/','é/../😀/'];
 const calls:string[]=[];
 for(const value of fragments)calls.push(`console.log('normalize',${JSON.stringify(value)},path.normalize(${JSON.stringify(value)}));`);
 for(const left of fragments)for(const right of ['','b','/b','./','../']){
  const values=JSON.stringify([left,right]);calls.push(`console.log('join',${values}.join('|'),path.join(...${values}));console.log('resolve',${values}.join('|'),path.resolve(...${values}));console.log('relative',${values}.join('|'),path.relative(${JSON.stringify(left)},${JSON.stringify(right)}));`);
 }
 return `import path from 'node:path';${calls.join('\n')}
 let effects='';function mark(value:any):any{effects+='A';return value;}
 for(const method of ['join','resolve','normalize','relative']){
  effects='';try{if(method==='join')path.join(mark(1),mark('later'));else if(method==='resolve')path.resolve(mark(1),mark('/later'));else if(method==='normalize')path.normalize(mark(undefined),mark('ignored'));else path.relative(mark('from'),mark({toString(){effects+='C';return 'to'}}));}catch(error){console.log('error',method,error instanceof TypeError,effects);}
 }
 console.log('resolve-boundary',path.resolve(1 as any,'/absolute'),path.resolve('a','/absolute','../leaf'));
 let skipped=0;const skippedObject={toString(){skipped++;return 'x'}};console.log('resolve-skipped',path.resolve(skippedObject as any,'/absolute'),skipped);
 console.log('empty',path.join(),path.resolve(),path.relative('',''));
 let spreadEffects='';const iterable={*[Symbol.iterator](){spreadEffects+='S';yield 'a';yield '..';yield 'b/';spreadEffects+='E'}};console.log('iterable',path.join(...iterable),spreadEffects);
 const marker={};let preserved=false;const abrupt={*[Symbol.iterator](){yield 'a';throw marker;}};try{path.resolve(...abrupt);}catch(error){preserved=error===marker;}console.log('abrupt',preserved);
 `;
}

test('POSIX paths use one unbounded component record and actual argument List against Node',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-path-components-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const source=partitions()+(typed&&!noGc?pathComponentInput(8192).replace("import path from 'node:path';",''):''),entry=join(root,typed?'main-'+noGc+'.ts':'main-'+noGc+'.mjs'),oracle=join(root,'reference-'+typed+'-'+noGc+'.mjs'),output=entry+'-program';
  const erased=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;await writeFile(entry,typed?source:erased);await writeFile(oracle,'import fs from "node:fs";console.log=(...values)=>fs.writeSync(1,values.map(String).join(" ")+"\\n");\n'+erased);
  const node=nodeReferenceSync(['node',oracle],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const diagnostics:string[]=[],r=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:m=>diagnostics.push(m)});expect({code:r.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});if(native.stdout.toString()!==node.stdout.toString()){await writeFile('/tmp/tsc2c-path-components-actual.stdout',native.stdout);await writeFile('/tmp/tsc2c-path-components-expected.stdout',node.stdout);}expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:node.stdout.toString()});
 }}finally{await rm(root,{recursive:true,force:true})}
},900000);

import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import ts from 'typescript';
import {compile} from '../../src/compile';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {generateE2eCaseSource} from '../e2e/generated-cases';

function captured(parameters:boolean,depth:number):string {
 const formal=parameters?'ignored':'',actual=parameters?'17':'';
 return `let body='23;';let read=(${formal})=>body;
 for(let index=0;index<${depth};index++){const previous=read;read=(${formal})=>previous(${actual})}
 console.log('captured:'+eval(read(${actual})));`;
}

test('return projection closes captured cycles and retains actual substitutions and opaque effects',()=>{
 for(const parameters of [false,true]){
  const finite=graph([{path:'main.mjs',source:captured(parameters,3),goal:'module'}]);
  expect(finite.error).toBeNull();expect(finite.directEvalSources.some(entry=>entry.source==='23;')).toBe(true);
  const opaque=captured(parameters,3).replace("let body='23;'","let body=opaque()");
  expect(graph([{path:'main.mjs',source:opaque,goal:'module'}]).error).toContain('direct eval source is not a finite static string expression');
 }
 const actual="function identity(value){return value}const first=identity('29;');identity(opaque());eval(first);";
 expect(graph([{path:'main.mjs',source:actual,goal:'module'}]).error).toBeNull();
 const effects="let body='31;';function identity(value){body=opaque();return value}identity('37;');eval(body);";
 expect(graph([{path:'main.mjs',source:effects,goal:'module'}]).error).toContain('direct eval source is not a finite static string expression');
});

test('recursive capture projections match Node through typed and erased native execution',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-return-projection-cycle-'));
 try{for(const typed of [false,true])for(const noGc of [false,true]){
  const directory=path.join(temporary,`${typed}-${noGc}`);await fs.mkdir(directory);
  const stress=!typed&&!noGc?generateE2eCaseSource('{"generator":"return-projection-depth","depth":512}','property/return_projection_depth'):'';
  const source=[false,true].map(parameters=>'{'+captured(parameters,3)+'}').join('\n')+"\nfunction identity(value){return value}console.log('actual:'+eval(identity('29;')));"+stress;
  const program=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
  const oracle=path.join(directory,'oracle.mjs');await fs.writeFile(oracle,program);
  const node=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=path.join(directory,typed?'main.ts':'main.mjs');await fs.writeFile(entry,typed?'// @ts-nocheck\nexport {};\n'+source:program);
  const output=path.join(directory,'program'),diagnostics:string[]=[];
  const built=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,code:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({typed,noGc,code:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:node.stdout.toString()});
 }}finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

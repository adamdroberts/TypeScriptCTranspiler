import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import ts from 'typescript';
import {createEcmaSourceFile} from '../../src/ecmascript-source';
import {sourceFileExpressionTexts} from '../../src/source-file-expression-proof';
import {compile} from '../../src/compile';
import {generateE2eCaseSource} from '../e2e/generated-cases';

function proof(source:string):readonly string[]|null {
 const parsed=createEcmaSourceFile('/tmp/util-format-source-proof.ts',source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.TS,'module');
 const pending:ts.Node[]=[parsed];let query:ts.CallExpression|undefined;
 while(pending.length){const node=pending.pop()!;if(ts.isVariableDeclaration(node)&&node.name.getText(parsed)==='query'&&node.initializer&&ts.isCallExpression(node.initializer))query=node.initializer;node.forEachChild(child=>{pending.push(child)});}
 if(!query)throw new Error('missing query');return sourceFileExpressionTexts(query);
}
const imports="import ordinary from 'util';import * as namespace from 'node:util';import {format as named} from 'util';";

test('finite formatter queries follow callable locations, actual Lists and return projections',()=>{
 const partitions=[
  ["ordinary.format=()=> './other';const query=ordinary.format('./first');",['./first','./other']],
  ["const saved=ordinary.format;ordinary.format=()=> './other';const query=saved('./first');",['./first']],
  ["ordinary.format=()=> './other';const query=named('./first');",['./first']],
  ["ordinary.format=()=> './other';const query=namespace.format('./first');",['./first']],
  ["Object.defineProperty(ordinary,'format',{get(){return ()=> './other'}});const query=ordinary.format('./first');",['./first','./other']],
  ["const inherited=Object.create({get format(){return ()=> './other'}});const query=inherited.format('./first');",['./other']],
  ["const target=named.bind(null,'%s:%d');function forward(fn,...args){return Reflect.apply(fn,null,args)}const query=forward(target,'part',17);",['part:17']],
  ["const owner=require('node:util');owner.format=()=> './other';const query=owner.format('./first');",['./first','./other']],
  ["const query=named(...['%s:%s','a\\0b','']);",['a\0b:']],
  ["opaque();const query=namespace.format('./first');",['./first']],
  ["opaque();const query=ordinary.format('./first');",null],
  ["const query=named();",['']],
  ["ordinary.format=opaque();const query=ordinary.format('./first');",null],
  ["Object.defineProperty(ordinary,'format',{get(){return opaque()}});const query=ordinary.format('./first');",null],
  ["const query=named('%s',{toString(){return './other'}});",null],
 ] as const;
 for(const [source,expected]of partitions){
  const actual=proof(imports+source);expect({source,actual:actual&&[...actual].sort()}).toEqual({source,actual:expected&&[...expected].sort()});
  if(expected!==null){
   const setup='import {createRequire} from "node:module";const require=createRequire(import.meta.url);function opaque(){ordinary.format=()=>"./other";}';
   const node=nodeReferenceSync(['node','--input-type=module','-e',imports+setup+source+'import {writeSync} from "node:fs";writeSync(1,JSON.stringify(query));'],{stdout:'pipe',stderr:'pipe',timeout:30000});
   expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});expect(node.stdout.toString()).not.toBe('');expect(actual).toContain(JSON.parse(node.stdout.toString()));
  }
 }
 const synthetic=ts.factory.createCallExpression(ts.factory.createIdentifier('format'),undefined,[]);
 expect(sourceFileExpressionTexts(synthetic)).toBeNull();
});

const scenarios=[
 ["ordinary.format=()=> './other';", "ordinary.format('./first')"],
 ["const saved=named;ordinary.format=()=> './other';", "saved('./first')"],
 ["ordinary.format=()=> './other';", "namespace.format('./first')"],
 ["Object.defineProperty(ordinary,'format',{configurable:true,get(){return ()=> './other'}});", "ordinary.format('./first')"],
 ["const inherited=Object.create({get format(){return ()=> './other'}});", "inherited.format('./first')"],
 ["const target=named.bind(null,'%s');", "Reflect.apply(target,null,['./first'])"],
] as const;

test('formatter request admission matches independent Node and native execution',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-util-source-'));
 try{for(const typed of [false,true])for(const noGc of [false,true])for(const [scenario,[setup,expression]]of scenarios.entries()){
  const directory=path.join(temporary,`${typed}-${noGc}-${scenario}`);await fs.mkdir(directory);
  for(const [name,label]of [['first',17],['other',23]]as const){await fs.writeFile(path.join(directory,name+'.ts'),`export const label=${label};`);await fs.writeFile(path.join(directory,name+'.cjs'),`exports.label=${label};`)}
  const stress=!typed&&!noGc&&scenario===0?generateE2eCaseSource('{"generator":"util-format-source-depth","depth":512}','property/util_format_source_depth'):'';
  const source=stress||imports+setup+`console.log(require(${expression}).label);`,program=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
  const oracle=path.join(directory,'oracle.mjs');await fs.writeFile(oracle,"import {createRequire} from 'node:module';const originalRequire=createRequire(import.meta.url);const require=value=>originalRequire(value+'.cjs');\n"+program);
  const node=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=path.join(directory,typed?'main.ts':'main.mjs');await fs.writeFile(entry,(typed?'// @ts-nocheck\n':'')+(typed?source:program));
  const output=path.join(directory,'program'),diagnostics:string[]=[];
  const built=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,code:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({typed,noGc,code:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:node.stdout.toString()});
 }}finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

test('opaque formatter replacements fail closed at ordinary request admission',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-util-source-opaque-'));
 try{for(const replacement of ["ordinary.format=opaque();","Object.defineProperty(ordinary,'format',{get(){return opaque()}});"]){
  const entry=path.join(temporary,'main.ts'),diagnostics:string[]=[];
  await fs.writeFile(entry,'// @ts-nocheck\n'+imports+replacement+"require(ordinary.format('./first'));");
  const built=await compile({entry,output:path.join(temporary,'program'),emitCOnly:true,diagnosticWriter:message=>diagnostics.push(message)});
  expect(built.exitCode).toBe(3);expect(diagnostics.join('')).toContain('dynamic require(variable) needs a finite AOT specifier proof');
 }}finally{await fs.rm(temporary,{recursive:true,force:true})}
});

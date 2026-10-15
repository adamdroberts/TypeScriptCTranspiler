import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createEcmaSourceFile} from '../../src/ecmascript-source';
import {earlyControlFlowStaticSemanticsFailure} from '../../src/control-static-semantics';
import {evalSourceIsValid,evalSourceRequest} from '../../src/eval-source';
import {compile} from '../../src/compile';

const declarations=['let f;','const f=0;','class f{}','function f(){}','function* f(){}','async function f(){}','async function* f(){}','var f;'];
const scopes=[(body:string)=>`{${body}}`,(body:string)=>body,(body:string)=>`function subject(){${body}}`];
const inputs=scopes.flatMap(scope=>declarations.flatMap(left=>declarations.flatMap(right=>[false,true].map(strict=>(strict?'"use strict";':'')+scope(left+right)))));
inputs.push('{let f;{let f;}}','{let f;function nested(){var f;}}','{let f;if(false){var f;}}','function subject(){let f;{var f;}}','function subject(){function f(){}function f(){}}','function subject(){let {x:f}=source;var f;}','class Subject{static{let f;var f;}}','class Subject{method(){let f;var f;}}');
const wide=Array.from({length:2048},(_,index)=>`let n${index};`).join('');inputs.push(`{${wide}}`,`{${wide}var n2047;}`);

test('Block and Body lexical conflicts use one StatementList name algorithm with independent scope identity',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-statement-list-names-'));
 try {
  const output=join(root,'oracle.json');const oracle=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");fs.writeFileSync(process.argv[1],JSON.stringify(JSON.parse(fs.readFileSync(0,"utf8")).map(source=>{try{new vm.Script(source);return true}catch(error){if(error.name!=="SyntaxError")throw error;return false}})));',output],{stdin:Buffer.from(JSON.stringify(inputs)),stdout:'pipe',stderr:'pipe'});
  expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});const expected=JSON.parse(await readFile(output,'utf8')) as boolean[];
  expect(inputs.map(source=>evalSourceIsValid(evalSourceRequest('direct',source,false)))).toEqual(expected);
  for(const [index,source]of inputs.entries()){
   const file=createEcmaSourceFile('model.js',source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,'script');expect({index,valid:!earlyControlFlowStaticSemanticsFailure(file)}).toEqual({index,valid:expected[index]});
  }
  for(const source of ['{function f(){}function f(){}}','function subject(){function f(){}function f(){}}'])for(const parents of [false,true])for(const strict of [false,true]){
   const file=createEcmaSourceFile('model.js',(strict?'"use strict";':'')+source,ts.ScriptTarget.ESNext,parents,ts.ScriptKind.JS,'script');expect(!earlyControlFlowStaticSemanticsFailure(file)).toBe(source.startsWith('function')||!strict);
  }
  const entry=join(root,'invalid.js'),diagnostics:string[]=[];await writeFile(entry,'{let f;if(false){var f;}}');const result=await compile({entry,output:entry+'-native',diagnosticWriter:message=>diagnostics.push(message)});expect(result.exitCode).toBe(2);expect(diagnostics.join('')).toContain("Block LexicallyDeclaredNames and VarDeclaredNames both contain 'f'");
 }finally{await rm(root,{recursive:true,force:true});}
});

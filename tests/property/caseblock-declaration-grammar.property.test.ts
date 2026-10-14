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
const inputs=declarations.flatMap(left=>declarations.flatMap(right=>[false,true].map(strict=>(strict?'"use strict";':'')+`switch(0){case 1:${left}default:${right}}`)));
inputs.push('switch(0){case 0:let f;default:{let f;}}','switch(0){case 0:let f;default:function nested(){var f;}}','switch(0){case 0:let f;default:class Nested{method(){var f;}}}','switch(0){case 0:let f;default:if(false){var f;}}','switch(0){case 0:let {x:f}=source;default:var f;}','switch(0){case 0:var [f]=source;default:const f=0;}','switch(0){case 0:let f;default:switch(1){default:var f;}}');
const wide=Array.from({length:2048},(_,index)=>`case ${index}:let n${index};`).join('');inputs.push(`switch(0){${wide}}`,`switch(0){${wide}default:let n2047;}`);

test('CaseBlock lexical and var names share canonical statement and binding collections',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-caseblock-names-'));
 try {
  const output=join(root,'oracle.json');const oracle=Bun.spawnSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");fs.writeFileSync(process.argv[1],JSON.stringify(JSON.parse(fs.readFileSync(0,"utf8")).map(source=>{try{new vm.Script(source);return true}catch(error){if(error.name!=="SyntaxError")throw error;return false}})));',output],{stdin:Buffer.from(JSON.stringify(inputs)),stdout:'pipe',stderr:'pipe'});
  expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});const expected=JSON.parse(await readFile(output,'utf8')) as boolean[];
  expect(inputs.map(source=>evalSourceIsValid(evalSourceRequest('direct',source,false)))).toEqual(expected);
  for(const [index,source]of inputs.entries()){
   const file=createEcmaSourceFile('model.js',source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,'script');expect({index,valid:!earlyControlFlowStaticSemanticsFailure(file)}).toEqual({index,valid:expected[index]});
  }
  for(const source of ['switch(0){case 0:function f(){}default:function f(){}}','switch(0){case 0:function* f(){}default:function* f(){}}'])for(const parents of [false,true])for(const strict of [false,true]){
   const file=createEcmaSourceFile('model.js',(strict?'"use strict";':'')+source,ts.ScriptTarget.ESNext,parents,ts.ScriptKind.JS,'script');expect(!earlyControlFlowStaticSemanticsFailure(file)).toBe(!strict&&!source.includes('function*'));
  }
  for(const module of [false,true]){
   const entry=join(root,module?'invalid.mjs':'invalid.js'),diagnostics:string[]=[];await writeFile(entry,'switch(0){case 0:async function f(){}default:let f;}');
   const result=await compile({entry,output:entry+'-native',...(module?{moduleRoots:[entry]}:{}),diagnosticWriter:message=>diagnostics.push(message)});expect(result.exitCode).toBe(2);expect(diagnostics.join('')).toContain("CaseBlock LexicallyDeclaredNames contains duplicate 'f'");
  }
 }finally{await rm(root,{recursive:true,force:true});}
});

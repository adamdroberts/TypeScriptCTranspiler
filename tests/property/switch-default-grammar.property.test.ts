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

const invalid='switch(0){default:;case 1:;default:;}';
const valid='switch(0){default:switch(1){default:;}}';
const containers=[(body:string)=>body,(body:string)=>`function subject(){${body}}`,(body:string)=>`function* subject(){${body}}`,(body:string)=>`async function subject(){${body}}`,(body:string)=>`async function* subject(){${body}}`,(body:string)=>`if(false){${body}}`];

test('each CaseBlock owns one default production independent of nesting and function context',async()=>{
 const inputs=containers.flatMap(wrap=>[valid,invalid].flatMap(body=>[false,true].map(strict=>(strict?'"use strict";':'')+wrap(body))));
 const deep='{'.repeat(2048)+invalid+'}'.repeat(2048);inputs.push(deep);
 const root=await mkdtemp(join(tmpdir(),'tsc2c-switch-default-'));
 try {
  const output=join(root,'node.json');const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");fs.writeFileSync(process.argv[1],JSON.stringify(JSON.parse(process.argv[2]).map(source=>{try{new vm.Script(source);return true}catch(error){if(error.name!=="SyntaxError")throw error;return false}})));',output,JSON.stringify(inputs)],{stdout:'pipe',stderr:'pipe'});
  expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});
  const expected=JSON.parse(await readFile(output,'utf8')) as boolean[];
  expect(inputs.map(source=>evalSourceIsValid(evalSourceRequest('direct',source,false)))).toEqual(expected);
  for(const [index,source] of inputs.entries())for(const parents of [false,true]) {
   const file=createEcmaSourceFile('model.js',source,ts.ScriptTarget.ESNext,parents,ts.ScriptKind.JS,'script');
   expect({index,parents,valid:!earlyControlFlowStaticSemanticsFailure(file)}).toEqual({index,parents,valid:expected[index]});
  }
  for(const module of [false,true]) {
   const entry=join(root,module?'invalid.mjs':'invalid.js'),diagnostics:string[]=[];await writeFile(entry,invalid);
   const result=await compile({entry,output:entry+'-native',...(module?{moduleRoots:[entry]}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect(result.exitCode).toBe(2);expect(diagnostics.join('')).toContain('switch CaseBlock contains more than one default clause');
  }
 }finally{await rm(root,{recursive:true,force:true});}
});

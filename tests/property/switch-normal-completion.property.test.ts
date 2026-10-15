import {nodeReferenceSync} from './node-reference';
import {expect,test}from'bun:test';
import ts from'typescript';
import{mkdtemp,writeFile,rm}from'node:fs/promises';
import{tmpdir}from'node:os';
import{join}from'node:path';
import{compile}from'../../src/compile';
import{switchNormalCompletionInput}from'../e2e/generated-cases';
import{statementBodyCompletions}from'../../src/function-static-semantics';

function subject():string{
 const pieces=[`export {};type Domain='one'|'two';function mark(value:any):any{events.push('case:'+String(value));return value;}let events:string[]=[];`];
 for(const [index,tail]of ['','default: events.push("default");','case mark("other"):events.push("fallthrough");'].entries()){
  pieces.push(`{function ordinary(value:Domain):string{switch(value){case mark('one'):return 'one';case mark('two'):return 'two';${tail}}events.push('after');return 'after';}for(const value of ['one','two','absent']){events=[];console.log('ordinary',${index},value,ordinary(value as any),events.join('|'));}}`);
 }
 pieces.push(`function narrowed(value:Domain):string{switch(value){case 'one':return 'one';case 'two':return 'two';}events.push('reachable');return 'after';}events=[];console.log('erased',narrowed('outside' as any),events.join('|'));`,
 `function implicit(value:Domain):any{switch(value){case 'one':return 1;case 'two':return 2;}}console.log('undefined',implicit('outside' as any)===undefined);`,
 `function* generator(value:Domain):Generator<string,string,any>{try{switch(value){case yield 'selector':events.push('matched');break;}events.push('after');return 'done';}finally{events.push('finally');}}`,
 `for(const resume of ['one','absent']){events=[];const iterator=generator('one');const first=iterator.next(),last=iterator.next(resume);console.log('generator',resume,first.value,last.value,last.done,events.join('|'));}`,
 `events=[];const closed=generator('one');closed.next();console.log('return',closed.return('closed').value,events.join('|'));`,
 `const marker={};events=[];const thrown=generator('one');thrown.next();try{thrown.throw(marker);}catch(error){console.log('throw',error===marker,events.join('|'));}`,
 `async function asyncSubject(value:Domain):Promise<string>{switch(value){case await Promise.resolve('one'):return 'one';case await Promise.resolve('two'):return 'two';}return 'after';}asyncSubject('absent' as any).then(value=>console.log('async',value));`,
 `async function* asyncGenerator(value:Domain):AsyncGenerator<string,string,any>{switch(value){case yield 'selector':return 'matched';}return 'after';}async function consume(){const iterator=asyncGenerator('one');const first=await iterator.next(),last=await iterator.next('absent');console.log('async-generator',first.value,last.value,last.done);}consume();`);
 return pieces.join('\n');
}

test('canonical statement completion retains the unmatched CaseBlock path',()=>{
 for(const source of ['switch(value){case 1:return 1;}','switch(value){case 1:return 1;default:return 2;}','switch(value){default:return 2;case 1:break;}']){
  const file=ts.createSourceFile('switch-completion.js','function subject(){'+source+'}',ts.ScriptTarget.ESNext,true),node=((file.statements[0]as ts.FunctionDeclaration).body!.statements[0])!;const completion=statementBodyCompletions(node);
  expect(completion.complete).toBe(true);expect(completion.normal).toBe(!source.includes('default:return 2;}'));
 }
});
test('ordinary and suspended switches preserve normal completion independent of annotated domains',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-switch-normal-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const source=subject()+(typed&&!noGc?switchNormalCompletionInput(512).replace('export {};',''):''),entry=join(root,typed?'main-'+noGc+'.ts':'main-'+noGc+'.mjs'),oracle=join(root,'reference-'+typed+'-'+noGc+'.mjs'),output=entry+'-program';const erased=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;await writeFile(entry,typed?source:erased);await writeFile(oracle,'import fs from"node:fs";console.log=(...values)=>fs.writeSync(1,values.map(String).join(" ")+"\\n");\n'+erased);
  const node=nodeReferenceSync(['node',oracle],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const diagnostics:string[]=[],r=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:m=>diagnostics.push(m)});expect({code:r.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:node.stdout.toString()});
 }}finally{await rm(root,{recursive:true,force:true})}
},900000);

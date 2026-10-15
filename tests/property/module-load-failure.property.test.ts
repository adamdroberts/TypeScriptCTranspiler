import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import ts from 'typescript';
import {compile} from '../../src/compile';
import {moduleFailureDepthInput} from '../e2e/generated-cases';
import {createEcmaSourceFile} from '../../src/ecmascript-source';
import {retainModuleParseFailure,sourceModuleFailure,moduleSourceOriginal} from '../../src/module-source-record';

const invalid=[
 ['parse','export const value=;'],
 ['declaration','var value;function value(){}'],
 ['control','break;'],
 ['strict','var package=1;'],
 ['private','class C{read(){return this.#missing}}'],
] as const;
test('failed Module source records retain original bytes and one inert view',()=>{
 for(const [kind,source]of invalid){
  const parsed=createEcmaSourceFile('/tmp/module-load-'+kind+'.mjs',source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,'module'),record=retainModuleParseFailure(parsed),failure=sourceModuleFailure(record);
  expect(failure).toBeDefined();expect(failure!.source).toBe(parsed);expect(failure!.source.text).toBe(source);expect(record.statements.length).toBe(0);expect(moduleSourceOriginal(record)).toBe(parsed);
 }
 const script=createEcmaSourceFile('/tmp/module-load-script.js',invalid[1][1],ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,'script');expect(retainModuleParseFailure(script)).toBe(script);
});
async function files(directory:string,depth:number):Promise<string>{
 for(const [kind,source]of invalid)await fs.writeFile(path.join(directory,kind+'.mjs'),source);
 await fs.writeFile(path.join(directory,'bad.json'),'{\"key\":}');
 await fs.writeFile(path.join(directory,'side.mjs'),"globalThis.loadEffects+='side';export const value=17;\n");
 await fs.writeFile(path.join(directory,'parent.mjs'),"import './side.mjs';import './declaration.mjs';globalThis.loadEffects+='parent';eval(runtimeUnknownSource);export const value=19;\n");
 await fs.writeFile(path.join(directory,'cycle.mjs'),"import './parent.mjs';import './other.mjs';globalThis.loadEffects+='cycle';export const value=23;\n");
 await fs.writeFile(path.join(directory,'other.mjs'),"import './cycle.mjs';globalThis.loadEffects+='other';export const value=29;\n");
 const deep=moduleFailureDepthInput(depth);for(const [file,source]of Object.entries(deep.files))await fs.writeFile(path.join(directory,file),source);
 const requests=[...invalid.map(([kind])=>'./'+kind+'.mjs'),'./parent.mjs','./cycle.mjs','./failure-chain-0.mjs'];
 const checks=`for(const request of ${JSON.stringify(requests)}){try{await import(request);console.log('missing',request)}catch(error){console.log('rejected',request,error.name,globalThis.loadEffects==='')}}`;
 return `globalThis.loadEffects='';globalThis.failureDepthEffect=false;async function main(){${checks}console.log('depth-effects',!globalThis.failureDepthEffect);try{await import('./bad.json',{with:{type:'json'}});console.log('missing-json')}catch(error){console.log('json-rejected',error.name,globalThis.loadEffects==='')}const one=await import('./declaration.mjs').catch(error=>error);const two=await import('./declaration.mjs').catch(error=>error);console.log('cached',one===two);console.log('healthy',(await import('./side.mjs')).value,globalThis.loadEffects==='side')}main().catch(error=>{console.log('unexpected',String(error))});\n`;
}
test('deferred Module failures reject before all static bodies and preserve load failure completions against Node',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-module-load-'));
 try{for(const noGc of [false,true]){
  const directory=path.join(temporary,String(noGc));await fs.mkdir(directory);const source=await files(directory,noGc?1:512),entry=path.join(directory,'main.mjs');await fs.writeFile(entry,source);
  const node=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const output=path.join(directory,'program'),diagnostics:string[]=[];const built=await compile({entry,output,noGc,diagnosticWriter:message=>diagnostics.push(message)});expect({code:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({code:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:node.stdout.toString()});
  const eager=path.join(directory,'eager.mjs');await fs.writeFile(eager,"import './parent.mjs';console.log('unreachable');\n");const eagerDiagnostics:string[]=[];const rejected=await compile({entry:eager,output:output+'-eager',noGc,diagnosticWriter:message=>eagerDiagnostics.push(message)});expect(rejected.exitCode).toBe(2);expect(eagerDiagnostics.join('')).toContain("LexicallyDeclaredNames and VarDeclaredNames both contain 'value'");
 }}finally{await fs.rm(temporary,{recursive:true,force:true})}
},900000);

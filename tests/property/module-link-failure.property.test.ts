import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {moduleFailureDepthInput} from '../e2e/generated-cases';
import {moduleLinkRecord} from '../../src/module-source-record';
import {createEcmaSourceFile} from '../../src/ecmascript-source';
import ts from 'typescript';

const contents:Record<string,string>={
 'a.mjs':"globalThis.linkEffects+='a';export const value=17;export const same=23;",
 'b.mjs':"globalThis.linkEffects+='b';export const value=19;",
 'star.mjs':"export * from './a.mjs';export * from './b.mjs';",
 'ambiguous.mjs':"export {value} from './star.mjs';globalThis.linkEffects+='ambiguous';",
 'missing.mjs':"import {missing} from './a.mjs';globalThis.linkEffects+='missing';export {missing};",
 'nested.mjs':"if(true){var nested=31}export {nested};",
 'namespace.mjs':"import * as ns from './a.mjs';export {ns};",
 'same-a.mjs':"export {same} from './a.mjs';",
 'same-b.mjs':"export {same} from './a.mjs';",
 'same-star.mjs':"export * from './same-a.mjs';export * from './same-b.mjs';",
 'same.mjs':"export {same} from './same-star.mjs';",
 'cycle-a.mjs':"export {missing} from './cycle-b.mjs';globalThis.linkEffects+='cycle-a';",
 'cycle-b.mjs':"export {missing} from './cycle-a.mjs';globalThis.linkEffects+='cycle-b';",
 'parent.mjs':"import './a.mjs';import './ambiguous.mjs';eval(runtimeUnknownSource);globalThis.linkEffects+='parent';",
};
test('one Module entry collection retains binding identity and erases type-only edges',()=>{
 const source=createEcmaSourceFile('/tmp/module-entry-record.ts',"import type {Ignored} from './types';import value,{item as saved} from './a';import * as ns from './a';export {saved as value};export {ns};export {value as direct} from './a';export const {name:local}=object;",ts.ScriptTarget.ESNext,true,ts.ScriptKind.TS,'module'),record=moduleLinkRecord(source,'root');
 expect(record.requestedModules.map(request=>request.specifier)).toEqual(['./a']);expect(record.imports.length).toBe(3);expect(record.indirectExports.get('value')!.importName).toBe('item');expect(record.indirectExports.get('direct')!.importName).toBe('value');expect(record.bindings.has('local')).toBe(true);expect(moduleLinkRecord(source,'root')).toBe(record);
});
async function files(directory:string,depth:number):Promise<string>{
 for(const [name,source]of Object.entries(contents))await fs.writeFile(path.join(directory,name),source);
 const deep=moduleFailureDepthInput(depth,'link');for(const [name,source]of Object.entries(deep.files))await fs.writeFile(path.join(directory,name),source);
 const cases=['ambiguous','missing','cycle-a','parent','failure-chain-0'];
 const checks=cases.map(name=>`try{await import('./${name}.mjs');console.log('missing-rejection','${name}')}catch(error){console.log('link-rejected','${name}',error.name,globalThis.linkEffects==='')}`).join('\n');
 return `globalThis.linkEffects='';globalThis.failureDepthEffect=false;async function main(){${checks}console.log('depth-effects',!globalThis.failureDepthEffect);const one=await import('./ambiguous.mjs').catch(error=>error),two=await import('./ambiguous.mjs').catch(error=>error);console.log('same-failure',one===two);console.log('same-binding',(await import('./same.mjs')).same);console.log('namespace',(await import('./namespace.mjs')).ns.value);console.log('nested',(await import('./nested.mjs')).nested);console.log('healthy',(await import('./a.mjs')).value,globalThis.linkEffects==='a')}main();`;
}
test('Module linking rejects before bodies and distinguishes ambiguity from shared bindings against Node',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-module-link-'));
 try{for(const noGc of [false,true]){
  const directory=path.join(temporary,String(noGc));await fs.mkdir(directory);const source=await files(directory,noGc?1:512),entry=path.join(directory,'main.mjs');await fs.writeFile(entry,source);
  const node=Bun.spawnSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const output=path.join(directory,'program'),diagnostics:string[]=[];const built=await compile({entry,output,noGc,diagnosticWriter:message=>diagnostics.push(message)});expect({code:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({code:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:node.stdout.toString()});
  const eager=path.join(directory,'eager.mjs');await fs.writeFile(eager,"import './ambiguous.mjs';console.log('unreachable');");const messages:string[]=[];const rejected=await compile({entry:eager,output:output+'-eager',noGc,diagnosticWriter:message=>messages.push(message)});expect(rejected.exitCode).toBe(2);expect(messages.join('')).toContain('cannot resolve indirect export');
 }}finally{await fs.rm(temporary,{recursive:true,force:true})}
},900000);

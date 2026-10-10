import { expect, test } from 'bun:test';
import ts from 'typescript';
import * as vm from 'node:vm';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { earlyPrivateStaticSemanticsFailure } from '../../src/emit/private-names';
import { createEcmaSourceFile } from '../../src/ecmascript-source';
import { compile } from '../../src/compile';

function accepted(source:string):boolean { try { new vm.Script(source);return true }catch(error){if(!(error instanceof SyntaxError))throw error;return false} }
function valid(source:string):boolean {
 const file=createEcmaSourceFile('private.js',source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,'script');
 return !(file as ts.SourceFile & {parseDiagnostics?:readonly ts.Diagnostic[]}).parseDiagnostics?.length&&!earlyPrivateStaticSemanticsFailure(file);
}
const declarations=['#x;', '#x(){}', 'get #x(){return 1}', 'set #x(value){}'];
test('private early errors follow the canonical lexical name collection',()=>{
 for(const first of declarations)for(const second of declarations)for(const prefix of ['', 'static ']) {
  const source=`class Owner {${first}${prefix}${second}}`;
  expect({source,valid:valid(source)}).toEqual({source,valid:accepted(source)});
 }
 const references=[
  'class Owner {#constructor;}', 'class Owner {read(){return this.#x}}',
  'class Owner {#x;read(){delete this.#x}}', 'class Owner {#x;read(){delete (this.#x)}}',
  'class Owner {#x;read(){return super.#x}}', 'class Owner {#x;read(){return #x}}',
  'class Owner {#x;read(){return #x in this}}', 'class Owner {#x;read(value){return value?.#x}}',
  'class Owner {#x;read(){return class Inner {read(value){return value.#x}}}}',
  'class Owner {#x;read(){return class Inner extends (this.#x,Object) {#x}}}',
  'class Owner extends (class Inner {}.#x) {#x}',
 ];
 for(const source of references)expect({source,valid:valid(source)}).toEqual({source,valid:accepted(source)});
});

test('private early errors reject before native code generation',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-private-static-'));
 try { const entry=path.join(temporary,'main.mjs');await fs.writeFile(entry,'class Owner {#x;read(){return super.#x}}');
  const diagnostics:string[]=[];const result=await compile({entry,output:path.join(temporary,'program'),buildDir:path.join(temporary,'build'),diagnosticWriter:message=>diagnostics.push(message)});
  expect(result.exitCode).toBe(2);expect(result.mainC).toBe('');expect(diagnostics.join('')).toContain('invalid private name declaration or reference');
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
});

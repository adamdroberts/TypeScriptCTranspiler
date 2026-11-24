import { expect, test } from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { earlyPrivateStaticSemanticsFailure } from '../../src/emit/private-names';
import { createEcmaSourceFile } from '../../src/ecmascript-source';
import { compile } from '../../src/compile';

import { nodeAcceptsScripts } from './node-reference';
function valid(source:string):boolean {
 const file=createEcmaSourceFile('private.js',source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,'script');
 return !(file as ts.SourceFile & {parseDiagnostics?:readonly ts.Diagnostic[]}).parseDiagnostics?.length&&!earlyPrivateStaticSemanticsFailure(file);
}
const declarations=['#x;', '#x(){}', 'get #x(){return 1}', 'set #x(value){}'];
// The reference parser is the reference Node's (one batch, nodeAcceptsScripts).
test('private early errors follow the canonical lexical name collection',()=>{
 const cases:string[]=[];
 for(const first of declarations)for(const second of declarations)for(const prefix of ['', 'static '])
  cases.push(`class Owner {${first}${prefix}${second}}`);
 const references=[
  'class Owner {#constructor;}', 'class Owner {read(){return this.#x}}',
  'class Owner {#x;read(){delete this.#x}}', 'class Owner {#x;read(){delete (this.#x)}}',
  'class Owner {#x;read(){return super.#x}}', 'class Owner {#x;read(){return #x}}',
  'class Owner {#x;read(){return #x in this}}', 'class Owner {#x;read(value){return value?.#x}}',
  'class Owner {#x;read(){return class Inner {read(value){return value.#x}}}}',
  'class Owner {#x;read(){return class Inner extends (this.#x,Object) {#x}}}',
  'class Owner extends (class Inner {}.#x) {#x}',
 ];
 cases.push(...references);
 const native=nodeAcceptsScripts(cases);
 expect(cases.flatMap((source,index)=>valid(source)===native[index]?[]:[{source,native:native[index]}])).toEqual([]);
});

test('private early errors reject before native code generation',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-private-static-'));
 try { const entry=path.join(temporary,'main.mjs');await fs.writeFile(entry,'class Owner {#x;read(){return super.#x}}');
  const diagnostics:string[]=[];const result=await compile({entry,output:path.join(temporary,'program'),buildDir:path.join(temporary,'build'),diagnosticWriter:message=>diagnostics.push(message)});
  expect(result.exitCode).toBe(2);expect(result.mainC).toBe('');expect(diagnostics.join('')).toContain('invalid private name declaration or reference');
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
});

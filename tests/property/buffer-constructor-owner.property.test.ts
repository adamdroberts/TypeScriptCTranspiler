import {expect, test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {bufferStaticDescriptors} from '../../src/buffer-statics';
import {sourceConstructorInvocations} from '../../src/source-value-flow';

test('Buffer coercion effects keep changed runtime Function source outside a stale finite proof', async () => {
 const input = "let body='return 307;';const fill={valueOf(){body='return 311;';return 65}};Buffer.alloc(1,fill);console.log(Function(body)());";
 const options: ts.CompilerOptions = {noLib:true, allowJs:true, noEmit:true, target:ts.ScriptTarget.ESNext}, host = ts.createCompilerHost(options);
 host.getSourceFile = file => file === '/model.js' ? ts.createSourceFile(file, input, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS) : undefined;
 host.readFile = file => file === '/model.js' ? input : undefined; host.fileExists = file => file === '/model.js';
 const facts = sourceConstructorInvocations(ts.createProgram(['/model.js'], options, host), {roots:['/model.js']});
 expect(facts.some(fact => fact.choices === null || fact.choices.some(tuple => tuple.includes('return 311;')))).toBe(true);
 const root = await mkdtemp(join(tmpdir(), 'tsc2c-buffer-source-effect-'));
 try {
  const output = join(root, 'node.stdout'), reference = Bun.spawnSync(['node', '-e', input], {stdout:Bun.file(output), stderr:'pipe'});
  expect({code:reference.exitCode, stdout:await readFile(output, 'utf8'), stderr:reference.stderr.toString()}).toEqual({code:0, stdout:'311\n', stderr:''});
 } finally { await rm(root, {recursive:true, force:true}); }
});

const source = String.raw`
function check(value: boolean, label: string): void { if (!value) throw new Error(label); console.log(label + ':true'); }
async function verifyBufferOwner(): Promise<void> {
 const host: any = globalThis, constructor: any = Buffer, plans: any[] = PLANS;
 check(host.Buffer === constructor && constructor.name === 'Buffer' && constructor.length === 3, 'constructor-identity');
 check(Object.getPrototypeOf(constructor) === Uint8Array && Object.getPrototypeOf(constructor.prototype) === Uint8Array.prototype && constructor.prototype.constructor === constructor, 'constructor-prototypes');
 for (const plan of plans) { const method: any = constructor[plan.name], descriptor: any = Object.getOwnPropertyDescriptor(constructor, plan.name); check(method.name === plan.name && method.length === plan.length && descriptor.writable && descriptor.enumerable && descriptor.configurable && Object.hasOwn(method, 'prototype'), 'static-metadata-' + plan.name); }
 const allocate: any = Buffer.alloc, from: any = Buffer.from, joined: any = Buffer.concat;
 check(allocate.call(null, 3, 65).toString() === 'AAA' && Reflect.apply(from, {}, ['4142', 'hex']).toString() === 'AB' && joined.bind(null, [from('a'), from('b')])().toString() === 'ab', 'stored-call-adapters');
 const pending: Promise<any> = (async (): Promise<any> => allocate(await Promise.resolve(2), 66))();
 const original: any = constructor.alloc; let calls = 0; constructor.alloc = (): any => { calls++; return original(1, 67); };
 Buffer.alloc(7);
 check(Buffer.alloc(7).toString() === 'C' && allocate(2, 65).toString() === 'AA' && calls === 2, 'method-replacement');
 constructor.alloc = original;
 host.Buffer = {alloc: (): any => original(1, 68)};
 check(Buffer.alloc(7).toString() === 'D' && (await pending).toString() === 'BB', 'global-replacement-and-retention');
 host.Buffer = constructor;
 let owner: any = {fn: allocate, next: null}; for (let depth = 0; depth < 4096; depth++) owner = {fn: from, next: owner};
 while (owner.next) owner = owner.next;
 check(owner.fn(2, 69).toString() === 'EE' && host.Buffer === constructor, 'retained-owner-graph');
}
verifyBufferOwner();
`;

test('Buffer constructor and static operations retain ordinary owners and complete actual Lists', async () => {
 const root = await mkdtemp(join(tmpdir(), 'tsc2c-buffer-owner-'));
 try {
  const typedSource = source.replace('PLANS', JSON.stringify([...bufferStaticDescriptors].map(([name, {length}]) => ({name, length}))));
  const erased = ts.transpileModule(typedSource, {compilerOptions: {target: ts.ScriptTarget.ESNext}}).outputText;
  const oracle = join(root, 'oracle.js'), oracleOutput = oracle + '.stdout'; await writeFile(oracle, erased);
  const reference = Bun.spawnSync(['node', oracle], {stdout: Bun.file(oracleOutput), stderr: 'pipe', timeout: 120000});
  expect({code: reference.exitCode, stderr: reference.stderr.toString()}).toEqual({code: 0, stderr: ''});
  const expected = await readFile(oracleOutput, 'utf8'); expect(expected).toContain('retained-owner-graph:true\n');
  for (const typed of [true, false]) for (const noGc of [false, true]) {
   const entry = join(root, `main-${typed}-${noGc}.${typed ? 'ts' : 'js'}`), output = entry + '-native', diagnostics: string[] = [];
   await writeFile(entry, typed ? typedSource : erased);
   const result = await compile({entry, output, noGc, buildDir: output + '-build', diagnosticWriter: message => diagnostics.push(message)});
   expect({typed, noGc, code: result.exitCode, diagnostics}).toEqual({typed, noGc, code: 0, diagnostics: []});
   const native = Bun.spawnSync([output], {stdout: 'pipe', stderr: 'pipe', timeout: 120000});
   expect({code: native.exitCode, stderr: native.stderr.toString()}).toEqual({code: 0, stderr: ''});
   expect(native.stdout.toString()).toBe(expected);
  }
 } finally { await rm(root, {recursive: true, force: true}); }
}, 900000);

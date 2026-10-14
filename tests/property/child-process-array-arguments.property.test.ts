import {expect, test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';

const source = String.raw`
import {execFileSync, spawnSync} from 'node:child_process';
function check(value: boolean, label: string): void { if (!value) throw new Error(label); }
for (let seed = 0; seed < 11; seed++) {
 const args: string[] = ['%s']; let expected = '';
 for (let index = 0; index < seed; index++) { const value = String(index % 7); args.push(value); expected += value; }
 const dynamic: any = args;
 check(execFileSync('/bin/printf', dynamic).toString() === expected, 'exec-array');
 check(spawnSync('/bin/printf', dynamic).stdout.toString() === expected, 'spawn-array');
}
let trace = ''; function mark(value: string): string { trace += value; return value; }
const args: any = ['%s', 'a', 'b'];
const result: any = execFileSync('/bin/printf', args, undefined, mark('extra'));
console.log('actual-order', result.toString(), trace);
const alias: any = args; Reflect.set(alias, '1', 17); Reflect.deleteProperty(alias, '2');
check(args === alias && typeof args[1] === 'number' && !Reflect.has(args, '2'), 'retained-array-owner');
const retained: string[] = ['%s']; let expected = '';
for (let index = 0; index < 4096; index++) { retained.push('x'); expected += 'x'; }
check(execFileSync('/bin/printf', retained).toString() === expected, 'long-argument-list');
console.log('child argument bridge:true');
`;

test('child-process calls project canonical Array arguments through one native element bridge', async () => {
 const root = await mkdtemp(join(tmpdir(), 'tsc2c-child-array-'));
 try {
  const erased = ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ESNext, module:ts.ModuleKind.ESNext}}).outputText;
  const oracle = join(root, 'oracle.mjs'), oracleOutput = oracle + '.stdout'; await writeFile(oracle, erased);
  const reference = Bun.spawnSync(['node', oracle], {stdout:Bun.file(oracleOutput), stderr:'pipe', timeout:120000});
  expect({code:reference.exitCode, stderr:reference.stderr.toString()}).toEqual({code:0, stderr:''});
  const expected = await readFile(oracleOutput, 'utf8'); expect(expected).toContain('child argument bridge:true\n');
  for (const typed of [true, false]) for (const noGc of [false, true]) {
   const entry = join(root, `main-${typed}-${noGc}.${typed ? 'ts' : 'mjs'}`), output = entry + '-native', diagnostics:string[] = [];
   await writeFile(entry, typed ? source : erased);
   const result = await compile({entry, output, noGc, moduleRoots:[entry], initializationEntries:[entry], buildDir:output + '-build', diagnosticWriter:message => diagnostics.push(message)});
   expect({typed, noGc, code:result.exitCode, diagnostics}).toEqual({typed, noGc, code:0, diagnostics:[]});
   const native = Bun.spawnSync([output], {stdout:'pipe', stderr:'pipe', timeout:120000});
   expect({code:native.exitCode, stderr:native.stderr.toString()}).toEqual({code:0, stderr:''});
   expect(native.stdout.toString()).toBe(expected);
  }
 } finally { await rm(root, {recursive:true, force:true}); }
}, 900000);

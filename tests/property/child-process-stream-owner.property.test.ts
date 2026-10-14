import {expect, test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';

const partitions = ['ignore', 'pipe', ['ignore', 'pipe', 'ignore']] as const;
const source = String.raw`
import {spawn} from 'node:child_process';
async function observeStreams(child: any): Promise<void> {
 const present: string = [child.stdin, child.stdout, child.stderr].map((value: any): string => String(value !== null)).join(',');
 await new Promise<void>((resolve): void => {
  child.on('error', (error: any): void => { throw error; });
  child.on('close', (code: any, signal: any): void => { console.log('streams', present, code, String(signal)); resolve(); });
 });
}
async function observeChildStreams(): Promise<void> {
 CALLS
}
observeChildStreams();
`.replace('CALLS', partitions.map(stdio => `await observeStreams(spawn('/bin/true', [], {stdio:${JSON.stringify(stdio)}}));`).join('\n'));

test('child stream refresh requires its represented owner across stdio lifecycle partitions', async () => {
 const root = await mkdtemp(join(tmpdir(), 'tsc2c-child-stream-owner-'));
 try {
  const erased = ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ESNext, module:ts.ModuleKind.ESNext}}).outputText;
  const oracle = join(root, 'oracle.mjs'), oracleOutput = oracle + '.stdout'; await writeFile(oracle, erased);
  const reference = Bun.spawnSync(['node', oracle], {stdout:Bun.file(oracleOutput), stderr:'pipe', timeout:120000});
  expect({code:reference.exitCode, stderr:reference.stderr.toString()}).toEqual({code:0, stderr:''});
  const expected = await readFile(oracleOutput, 'utf8'); expect(expected).toContain('streams false,false,false 0 null\n');
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

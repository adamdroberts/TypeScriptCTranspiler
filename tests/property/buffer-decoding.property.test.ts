import {expect, test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';

const source = String.raw`
function verifyBufferDecoding(): void {
 const uppercase: any = 'HEX', unknownEncoding: any = 'bogus';
 const inputs: string[] = ['', 'A', 'AA', 'AAA', 'AAAA', 'A=AA', 'AA=AA', '@@@', ' A A ', 'AA===', 'SGk=tail', '-_8=', '+/8=', 'ab', 'abc', 'abzz12', 'zz', 'ABcd', '💛', 'ŁA', '\ud841A', 'ÁA', '💛QQ==', 'QQ💛QQ', 'QQĀQQ'];
 for (const input of inputs) {
  console.log('decode', JSON.stringify(input), Buffer.from(input, 'hex').toString('hex'), Buffer.from(input, 'base64').toString('hex'));
  console.log('length', JSON.stringify(input), Buffer.byteLength(input, 'hex'), Buffer.byteLength(input, 'base64'), Buffer.byteLength(input, uppercase), Buffer.byteLength(input, unknownEncoding));
 }
 let state = 0x12345;
 for (let seed = 0; seed < 19; seed++) {
  let hex = '';
  for (let index = 0; index < seed; index++) { state = (state * 1664525 + 1013904223) >>> 0; hex += (state >>> 24).toString(16).padStart(2, '0'); }
  const bytes: any = Buffer.from(hex, 'hex'), encoded: string = bytes.toString('base64');
  const noisy: string = encoded.split('').join('@ \n');
  console.log('generated', seed, Buffer.from(noisy, 'base64').toString('hex'), Buffer.from(hex + 'z123', 'hex').toString('hex'), Buffer.byteLength(encoded, 'base64'));
 }
 const text: string = 'QUJD'.repeat(32768), noisyText: string = 'Q@U@J@D@'.repeat(32768);
 const decoded: any = Buffer.from(noisyText + '=ignored', 'base64');
 console.log('stress', decoded.length, decoded[0], decoded[decoded.length - 1], decoded.toString('base64') === text);
 let strictRejected = false; try { atob('@@@'); } catch { strictRejected = true; }
 console.log('separate-global', atob('SGk='), strictRejected);
}
verifyBufferDecoding();
`;

test('Buffer decoding scans permissive hex/base64 while byteLength estimates independently', async () => {
 const root = await mkdtemp(join(tmpdir(), 'tsc2c-buffer-decoding-'));
 try {
  const erased = ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ESNext}}).outputText;
  const oracle = join(root, 'oracle.js'), oracleOutput = oracle + '.stdout'; await writeFile(oracle, erased);
  const reference = Bun.spawnSync(['node', oracle], {stdout: Bun.file(oracleOutput), stderr: 'pipe', timeout: 120000});
  expect({code: reference.exitCode, stderr: reference.stderr.toString()}).toEqual({code: 0, stderr: ''});
  const expected = await readFile(oracleOutput, 'utf8'); expect(expected).toContain('stress 98304 65 67 true\n');
  for (const typed of [true, false]) for (const noGc of [false, true]) {
   const entry = join(root, `main-${typed}-${noGc}.${typed ? 'ts' : 'js'}`), output = entry + '-native', diagnostics: string[] = [];
   await writeFile(entry, typed ? source : erased);
   const result = await compile({entry, output, noGc, buildDir: output + '-build', diagnosticWriter: message => diagnostics.push(message)});
   expect({typed, noGc, code: result.exitCode, diagnostics}).toEqual({typed, noGc, code: 0, diagnostics: []});
   const native = Bun.spawnSync([output], {stdout: 'pipe', stderr: 'pipe', timeout: 120000});
   expect({code: native.exitCode, stderr: native.stderr.toString()}).toEqual({code: 0, stderr: ''});
   expect(native.stdout.toString()).toBe(expected);
  }
 } finally { await rm(root, {recursive: true, force: true}); }
}, 900000);

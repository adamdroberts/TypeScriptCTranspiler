import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

const NODE=process.env.TSC2C_NODE_REFERENCE??'node';

/* String.prototype.toUpperCase/toLowerCase and RegExp Canonicalize (/i and
 * /iu) use the case data generated from the pinned Unicode Character
 * Database (runtime/tsc_unicode_data.h), not the host ICU, so they follow
 * the Unicode version ECMA-262 requires even on a host whose ICU is older
 * (Unicode 17 adds the Beria Erfe case pairs, U+16EA0..U+16EDF). The
 * partitions, compared with Node (whose ICU carries the same version):
 * every code point's full upper and lower mapping; lone and paired
 * surrogates; Final_Sigma over generated left and right contexts (cased,
 * case-ignorable, both, neither, astral); and, for every code point with a
 * case mapping, each of its case partners matched against the others as an
 * atom and as a class under /i and /iu. The stress input is one string of
 * every cased letter, mapped both ways. */

const program=String.raw`
const out = [];
const hex = (text) => [...text].map(c => c.codePointAt(0).toString(16)).join(' ');
for (let cp = 0; cp <= 0x10ffff; cp++) {
  if (cp >= 0xd800 && cp <= 0xdfff) continue;
  const c = String.fromCodePoint(cp), upper = c.toUpperCase(), lower = c.toLowerCase();
  if (upper !== c) out.push('U ' + cp.toString(16) + ' ' + hex(upper));
  if (lower !== c) out.push('L ' + cp.toString(16) + ' ' + hex(lower));
}
for (const text of ['\ud800', '\udc00', 'a\udc00b', 'A\ud800B', '􏿿', '𖺠', '\ud81b', 'x\udea0'])
  out.push('S ' + hex(text.toUpperCase()) + ' | ' + hex(text.toLowerCase()));
const left = ['', 'A', 'a', "'", "A'", "A''", '1', ' ', 'A ', 'ͅ', 'Aͅ', '\u{16ea0}', '\u{16ea0}́', 'Σ', 'ß', 'A­'];
const right = ['', 'A', 'a', "'", "'A", "''a", '1', ' ', '́', '́A', 'ͅ', '\u{16ea0}', 'Σ', '.'];
for (const before of left) for (const after of right)
  out.push('F ' + hex(before) + ' / ' + hex(after) + ' ' + hex((before + 'Σ' + after).toLowerCase()));
const unit = (cp) => cp > 0xffff ? unit(0xd800 + ((cp - 0x10000) >> 10)) + unit(0xdc00 + ((cp - 0x10000) & 0x3ff)) : '\\u' + cp.toString(16).padStart(4, '0');
const single = (text) => { const points = [...text]; return points.length === 1 ? points[0].codePointAt(0) : -1; };
for (let cp = 0; cp <= 0x10ffff; cp++) {
  if (cp >= 0xd800 && cp <= 0xdfff) continue;
  const c = String.fromCodePoint(cp), upper = single(c.toUpperCase()), lower = single(c.toLowerCase());
  if (upper === cp && lower === cp) continue;
  const partners = new Set([cp]);
  for (const other of [upper, lower]) if (other >= 0) {
    partners.add(other);
    const text = String.fromCodePoint(other);
    for (const next of [single(text.toUpperCase()), single(text.toLowerCase())]) if (next >= 0) partners.add(next);
  }
  const members = [...partners].sort((a, b) => a - b);
  let bits = '';
  for (const x of members) for (const flags of ['i', 'iu']) {
    const escaped = flags === 'iu' ? '\\u{' + x.toString(16) + '}' : unit(x);
    const atom = new RegExp('^' + escaped + '$', flags), klass = new RegExp('^[' + escaped + ']$', flags);
    for (const y of members) { const text = String.fromCodePoint(y); bits += (atom.test(text) ? '1' : '0') + (klass.test(text) ? '1' : '0'); }
  }
  out.push('R ' + members.map(x => x.toString(16)).join(',') + ' ' + bits);
}
let cased = '';
for (let cp = 0; cp <= 0x10ffff; cp++) if (!(cp >= 0xd800 && cp <= 0xdfff) && /\p{Cased}/u.test(String.fromCodePoint(cp))) cased += String.fromCodePoint(cp);
const up = cased.toUpperCase(), down = cased.toLowerCase();
let sum = 0;
for (let i = 0; i < up.length; i++) sum = (sum * 31 + up.charCodeAt(i)) >>> 0;
for (let i = 0; i < down.length; i++) sum = (sum * 31 + down.charCodeAt(i)) >>> 0;
out.push('X ' + cased.length + ' ' + up.length + ' ' + down.length + ' ' + sum);
console.log(out.join('\n'));
`;

test('case mapping and case-insensitive matching follow the pinned Unicode tables, as Node does',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-unicode-case-'));
 try{
  const entry=join(root,'main.cjs');await writeFile(entry,program);
  const node=nodeReferenceSync([NODE,entry],{stdout:'pipe',stderr:'pipe',timeout:300000});
  expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const expected=node.stdout.toString();
  // Unicode 17's Beria Erfe pairs are part of the oracle's answer.
  expect(expected).toContain('L 16ea0 16ebb');
  const diagnostics:string[]=[],output=join(root,'program');
  const built=await compile({entry,output,buildDir:join(root,'build'),diagnosticWriter:x=>diagnostics.push(x)});
  expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:300000,maxBuffer:64*1024*1024});
  expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  const actual=native.stdout.toString().split('\n'),wanted=expected.split('\n');
  const differences=wanted.flatMap((line,index)=>actual[index]===line?[]:[{index,expected:line,actual:actual[index]}]).slice(0,12);
  expect({lines:actual.length,differences}).toEqual({lines:wanted.length,differences:[]});
 }finally{await rm(root,{recursive:true,force:true});}
},900_000);

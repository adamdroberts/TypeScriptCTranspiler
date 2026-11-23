import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

const NODE=process.env.TSC2C_NODE_REFERENCE??'node';

/* String.prototype.normalize runs UAX #15 over the normalization data
 * generated from the pinned Unicode Character Database
 * (runtime/tsc_unicode_data.h: combining classes, full canonical and
 * compatibility decompositions, primary composites), not the host ICU, so
 * Unicode 17 additions normalize (U+A7F1 has the compatibility mapping
 * <super> S). Compared with Node (ICU with the same Unicode version): every
 * code point in all four forms; generated sequences over an alphabet that
 * exercises canonical reordering (marks of several combining classes),
 * composition and blocking (composable starters and their second
 * characters, intervening marks of equal and lower class), Hangul L/V/T
 * jamo and LV/LVT syllables, astral composites, singletons, composition
 * exclusions and lone surrogates; and an invalid form's RangeError. The
 * stress input is one long string over the same alphabet. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const alphabet=[0x41,0x61,0x45,0x65,0x4f,0x6f,0x55,0x75,0x5a,0x7a,0x3b1,0x3c9,0x415,0x438,0x1100,0x1112,0x1161,0x1175,0x11a8,0x11c2,0xac00,0xac01,0xd7a3,
 0x300,0x301,0x302,0x308,0x30c,0x323,0x327,0x328,0x31b,0x345,0x5b0,0x5bc,0x93c,0x94d,0x1e0b,0x1e0d,0x212b,0x2126,0x340,0x344,0xf73,0xfb1d,
 0x11099,0x110ba,0x1109a,0x1d15e,0x1d165,0xa7f1,0xfb01,0x2460,0x1f1,0xd800,0xdc00,0x20,0x2d];
function sequences():string[]{
 const random=rng(0x15),out:string[]=[];
 for(let index=0;index<4000;index++){
  const length=1+Math.floor(random()*8);let text='';
  for(let at=0;at<length;at++)text+=String.fromCharCode(...(cp=>cp>0xffff?[0xd800+((cp-0x10000)>>10),0xdc00+((cp-0x10000)&0x3ff)]:[cp])(alphabet[Math.floor(random()*alphabet.length)]!));
  out.push(text);
 }
 return out;
}
function stress():string{
 const random=rng(0x99);let text='';
 for(let index=0;index<20000;index++)text+=String.fromCodePoint(alphabet[Math.floor(random()*alphabet.length)]!).replace(/[\ud800-\udfff]/g,'');
 return text;
}

const program=(texts:string[],long:string)=>`
const out = [];
const hex = (text) => { let result = ''; for (let i = 0; i < text.length; i++) result += text.charCodeAt(i).toString(16) + ' '; return result; };
for (let cp = 0; cp <= 0x10ffff; cp++) {
  if (cp >= 0xd800 && cp <= 0xdfff) continue;
  const c = String.fromCodePoint(cp);
  for (const form of ['NFC', 'NFD', 'NFKC', 'NFKD']) { const n = c.normalize(form); if (n !== c) out.push(form + ' ' + cp.toString(16) + ' ' + hex(n)); }
}
const texts = ${JSON.stringify(texts)};
for (const text of texts) out.push('Q ' + hex(text) + '| ' + hex(text.normalize()) + '| ' + hex(text.normalize('NFD')) + '| ' + hex(text.normalize('NFKC')) + '| ' + hex(text.normalize('NFKD')));
try { 'a'.normalize('nfc'); out.push('no error'); } catch (error) { out.push(error.constructor.name); }
const long = ${JSON.stringify(long)};
let sum = 0;
for (const form of ['NFC', 'NFD', 'NFKC', 'NFKD']) { const n = long.normalize(form); for (let i = 0; i < n.length; i++) sum = (sum * 31 + n.charCodeAt(i)) >>> 0; out.push(form + ' long ' + n.length); }
out.push('sum ' + sum);
console.log(out.join('\\n'));
`;

test('normalization follows the pinned Unicode tables, as Node does',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-unicode-normalization-'));
 try{
  const entry=join(root,'main.cjs');await writeFile(entry,program(sequences(),stress()));
  const node=nodeReferenceSync([NODE,entry],{stdout:'pipe',stderr:'pipe',timeout:300000});
  expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const expected=node.stdout.toString();
  // Unicode 17's U+A7F1 is part of the oracle's answer.
  expect(expected).toContain('NFKC a7f1 53 ');
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

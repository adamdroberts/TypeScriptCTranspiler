import {expect,test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

const NODE=process.env.TSC2C_NODE_REFERENCE??'node';

/* \p{...} admission and membership come from the generated Unicode tables in
 * runtime/tsc_unicode_data.h (pinned UCD version), not from the host ICU.
 * The tables only choose where to look: every admitted name is probed at
 * the boundaries of its own ranges plus random code points, every property
 * of strings at each of its sequences and truncations, and the results are
 * compared with Node, whose ICU carries the same Unicode version. One class
 * uniting every Script value is the stress input. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
interface Tables{version:string;ranges:[number,number][];sets:[number,number][];names:Map<string,Map<string,number>>;strings:number[];stringProperties:{name:string;set:number;offset:number;count:number}[]}
function tables():Tables{
 const text=readFileSync(join(process.cwd(),'runtime','tsc_unicode_data.h'),'utf8');
 const section=(name:string):string=>{const start=text.indexOf(`${name}[] = {`);const end=text.indexOf('\n};',start);return text.slice(start,end);};
 const version=/TSC_UNICODE_VERSION "([^"]+)"/.exec(text)![1]!;
 const ranges=[...section('tsc_ucd_ranges').matchAll(/\{0x([0-9a-f]+),0x([0-9a-f]+)\}/g)].map(m=>[parseInt(m[1]!,16),parseInt(m[2]!,16)] as [number,number]);
 const sets=[...section('tsc_ucd_sets').matchAll(/\{(\d+),(\d+)\}/g)].map(m=>[Number(m[1]),Number(m[2])] as [number,number]);
 const names=new Map<string,Map<string,number>>();
 for(const table of ['tsc_ucd_binary_names','tsc_ucd_general_category_names','tsc_ucd_script_names','tsc_ucd_script_extension_names'])
  names.set(table,new Map([...section(table).matchAll(/\{ "([^"]+)", (\d+) \}/g)].map(m=>[m[1]!,Number(m[2])])));
 const strings=[...section('tsc_ucd_strings').matchAll(/0x([0-9a-f]+)/g)].map(m=>parseInt(m[1]!,16));
 const stringProperties=[...section('tsc_ucd_string_properties').matchAll(/\{ "([^"]+)", (\d+), (\d+), (\d+) \}/g)].map(m=>({name:m[1]!,set:Number(m[2]),offset:Number(m[3]),count:Number(m[4])}));
 return {version,ranges,sets,names,strings,stringProperties};
}
function setRanges(t:Tables,set:number):[number,number][]{const [offset,count]=t.sets[set]!;return t.ranges.slice(offset,offset+count);}
function escapeFor(table:string,name:string):string{
 return table==='tsc_ucd_script_names'?`Script=${name}`:table==='tsc_ucd_script_extension_names'?`Script_Extensions=${name}`:name;
}
function samplePoints(random:()=>number,ranges:[number,number][]):number[]{
 const points=new Set<number>();
 const take=(range:[number,number])=>{for(const cp of [range[0]-1,range[0],range[1],range[1]+1])if(cp>=0&&cp<=0x10ffff&&!(cp>=0xd800&&cp<=0xdfff))points.add(cp);};
 if(ranges.length){take(ranges[0]!);take(ranges[ranges.length-1]!);for(let index=0;index<4;index++)take(ranges[Math.floor(random()*ranges.length)]!);}
 for(let index=0;index<4;index++){const cp=Math.floor(random()*0x110000);if(!(cp>=0xd800&&cp<=0xdfff))points.add(cp);}
 return [...points].sort((a,b)=>a-b);
}
const runner=`function run(cases, flags) { const out = []; for (const [escape, points] of cases) { let re; try { re = new RegExp('^\\\\p{' + escape + '}$', flags); } catch (error) { out.push(escape + ' ' + error.name); continue; } out.push(escape + ' ' + points.map(cp => re.test(String.fromCodePoint(cp)) ? '1' : '0').join('')); } return out; }\n`;
function membershipProgram(t:Tables,random:()=>number):string{
 const cases:[string,number[]][]=[];
 for(const [table,entries] of t.names)for(const [name,set] of entries)cases.push([escapeFor(table,name),samplePoints(random,setRanges(t,set))]);
 // Spellings ECMA-262 rejects: wrong case, loose matching, script values without a key.
 for(const bad of ['lu','uppercase','UPPERCASE','General_Category=Lu ','gc=L u','Script=latin','Latin','sc=Latn=Latin','Any=Any','ASCII_Hex_Digit=Y','Hex_Digit=True','Block=Basic_Latin','In_Latin','Script_Extensions=Zzzz'])cases.push([bad,[0x41]]);
 return `${runner}const cases = ${JSON.stringify(cases)};\nconsole.log(run(cases, 'u').join('\\n'));\n`;
}
function stringsProgram(t:Tables):string{
 const lines:string[]=[];
 for(const property of t.stringProperties){
  const sequences:number[][]=[];let at=property.offset;
  for(let index=0;index<property.count;index++){const length=t.strings[at]!;sequences.push(t.strings.slice(at+1,at+1+length));at+=1+length;}
  const singles=setRanges(t,property.set).flatMap(([lo,hi])=>[lo,hi]);
  lines.push(`check(${JSON.stringify(property.name)}, ${JSON.stringify(sequences.map(points=>String.fromCodePoint(...points)))}, ${JSON.stringify(singles.slice(0,40))});`);
 }
 return `const out = [];
function check(name, sequences, singles) {
  let re; try { re = new RegExp('^\\\\p{' + name + '}$', 'v'); } catch (error) { out.push(name + ' ' + error.name); return; }
  const u = (() => { try { return new RegExp('\\\\p{' + name + '}', 'u').source; } catch (error) { return error.name; } })();
  const neg = (() => { try { return new RegExp('\\\\P{' + name + '}', 'v').source; } catch (error) { return error.name; } })();
  let hits = 0, truncated = 0, unitwise = 0;
  for (const text of sequences) { if (re.test(text)) hits++; const shorter = [...text].slice(0, -1).join(''); if (shorter && re.test(shorter)) truncated++; if (new RegExp('[\\\\p{' + name + '}--\\\\q{' + text.replace(/[\\\\^$.*+?()[\\]{}|\\/-]/g, '\\\\$&') + '}]', 'v').test(text)) unitwise++; }
  const singleHits = singles.map(cp => re.test(String.fromCodePoint(cp)) ? '1' : '0').join('');
  const all = sequences.length ? new RegExp('(?:\\\\p{' + name + '})+', 'v').exec(sequences.join(''))?.[0].length : 0;
  out.push(name + ' ' + sequences.length + ' ' + hits + ' ' + truncated + ' ' + unitwise + ' ' + singleHits + ' ' + all + ' ' + u + ' ' + neg);
}
${lines.join('\n')}
console.log(out.join('\\n'));
`;
}
async function compare(name:string,source:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-unicode-props-'));
 try{
  const entry=join(root,'main.cjs');await writeFile(entry,source);
  const node=nodeReferenceSync([NODE,entry],{stdout:'pipe',stderr:'pipe',timeout:300000});
  expect({name,code:node.exitCode,stderr:node.stderr.toString()}).toEqual({name,code:0,stderr:''});
  const diagnostics:string[]=[],output=join(root,'program');
  const built=await compile({entry,output,buildDir:join(root,'build'),diagnosticWriter:x=>diagnostics.push(x)});
  expect({name,code:built.exitCode,diagnostics}).toEqual({name,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:300000});
  expect({name,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({name,code:0,stderr:'',stdout:node.stdout.toString()});
 }finally{await rm(root,{recursive:true,force:true});}
}

test('the pinned tables carry the Unicode version Node reports',()=>{
 const t=tables();
 const node=nodeReferenceSync([NODE,'-p','process.versions.unicode'],{stdout:'pipe',stderr:'pipe',timeout:60000});
 expect(t.version.startsWith(node.stdout.toString().trim())).toBe(true);
 expect(t.names.get('tsc_ucd_script_names')!.size).toBeGreaterThan(300);
});

test('every admitted property name matches Node at its range boundaries',async()=>{
 await compare('membership',membershipProgram(tables(),rng(0x17)));
},600000);

test('properties of strings match Node on their sequences',async()=>{
 await compare('strings',stringsProgram(tables()));
},600000);

test('one class uniting every Script value',async()=>{
 const t=tables();
 const scripts=[...t.names.get('tsc_ucd_script_names')!.keys()];
 const source=`const union = new RegExp('^[' + ${JSON.stringify(scripts)}.map(name => '\\\\p{Script=' + name + '}').join('') + ']+$', 'u');
const text = ${JSON.stringify(String.fromCodePoint(...scripts.map((_,index)=>[0x41,0x416,0x4e00,0x10940,0x1e6d0,0x1f600,0x600,0x900][index%8]!)))};
console.log(union.test(text), union.test(text + '\\u{e0000}'), union.source.length);
`;
 await compare('stress',source);
},600000);

import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createEcmaSourceFile} from '../../src/ecmascript-source';
import {earlyRegExpLiteralFailure} from '../../src/regexp-static-semantics';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

const NODE=process.env.TSC2C_NODE_REFERENCE??'node';

/* Annex B.1.2: outside Unicode mode `\c` not followed by a ControlLetter is
 * the single character `\` and the `c` is an ordinary pattern character,
 * while inside a class `\c` also accepts a DecimalDigit or `_` (value % 32).
 * A class range whose endpoint is a character-class escape is a SyntaxError
 * in Unicode mode and an Annex B union otherwise; `\\-` and, in v mode, the
 * ClassSetReservedPunctuators escape only inside a class. Generated patterns compare
 * construction verdicts and exec results with Node; generated literals
 * compare the early-error verdict; one long fallback pattern is the stress
 * input. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const followers=['A','z','Z','1','0','_','!',' ','Ж','ж','','c','-','\\\\',']','^','$'];
const flagSets=['','u','i','iu','g','s'];
function patterns(random:()=>number,count:number):[string,string][]{
 const out:[string,string][]=[];
 for(let index=0;index<count;index++){
  const next=followers[Math.floor(random()*followers.length)]!;
  const flags=flagSets[Math.floor(random()*flagSets.length)]!;
  const shape=Math.floor(random()*7);
  const escape=`\\c${next}`;
  const pattern=shape===0?escape:shape===1?`[${escape}]`:shape===2?`[${escape}-z]`:shape===3?`[a-${escape}]`:shape===4?`[${escape}-]`:shape===5?`x${escape}+`:`(?:${escape}|q)*`;
  out.push([pattern,flags]);
 }
 return out;
}
function program(cases:readonly [string,string][]):string{
 const probes=['\\c','\\','c','!','1','_',' ','\u0001','\u0011','\u001f','\u001a','\u000a','Ж','xcc','x\\c\\c','q','z','a','-',']','^','$'];
 return `const cases = ${JSON.stringify(cases)};
const probes = ${JSON.stringify(probes)};
const out = [];
for (const [pattern, flags] of cases) {
  let re;
  try { re = new RegExp(pattern, flags); } catch (error) { out.push(pattern + '/' + flags + ' ' + error.name); continue; }
  const results = [];
  for (const probe of probes) { re.lastIndex = 0; const m = re.exec(probe); results.push(m === null ? '-' : JSON.stringify(m[0]) + '@' + m.index); }
  out.push(pattern + '/' + flags + ' ' + re.source + ' ' + results.join(','));
}
console.log(out.join('\\n'));
`;
}
async function compare(name:string,source:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-annexb-escape-'));
 try{
  const entry=join(root,'main.cjs');await writeFile(entry,source);
  const node=nodeReferenceSync([NODE,entry],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({name,code:node.exitCode,stderr:node.stderr.toString()}).toEqual({name,code:0,stderr:''});
  const diagnostics:string[]=[],output=join(root,'program');
  const built=await compile({entry,output,buildDir:join(root,'build'),diagnosticWriter:x=>diagnostics.push(x)});
  expect({name,code:built.exitCode,diagnostics}).toEqual({name,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({name,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({name,code:0,stderr:'',stdout:node.stdout.toString()});
 }finally{await rm(root,{recursive:true,force:true});}
}

test('generated \\c escapes construct and match exactly like Node',async()=>{
 await compare('control',program(patterns(rng(0xc0de),400)));
},600000);

const endpoints=['\\d','\\D','\\p{Hex}','\\P{Lu}','\\w','\\s','a','\\x41','\\u{10000}','-','\\-','\\b'];
function literalProgram(a:string,b:string,flags:string):string{
 return `var re = /[${a}-${b}]/${flags};`;
}
function ours(source:string):boolean{
 const file=createEcmaSourceFile('x.js',source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,'script');
 const parse=(file as ts.SourceFile&{parseDiagnostics?:readonly ts.Diagnostic[]}).parseDiagnostics??[];
 return parse.length>0||earlyRegExpLiteralFailure(file)!==null;
}
function nodeVerdicts(sources:readonly string[]):boolean[]{
 const script='const sources=JSON.parse(require("node:fs").readFileSync(0,"utf8"));process.stdout.write(JSON.stringify(sources.map(source=>{try{new Function(source);return false;}catch(error){return error instanceof SyntaxError;}})));';
 const node=nodeReferenceSync([NODE,'-e',script],{stdin:Buffer.from(JSON.stringify(sources)),stdout:'pipe',stderr:'pipe',timeout:60000});
 expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
 return JSON.parse(node.stdout.toString());
}

const punctuators=['&','-','!','#','%',',',':',';','<','=','>','@','`','~','^','$','.','*','+','?','(',')','[',']','{','}','|','/','a','1'];
test('class ranges with escape endpoints are early errors exactly when Node rejects the literal',()=>{
 const sources:string[]=[];
 for(const a of endpoints)for(const b of endpoints)for(const flags of ['','u','v','iu'])sources.push(literalProgram(a,b,flags));
 // ClassSetReservedPunctuator escapes are valid only inside v-mode classes.
 for(const c of punctuators)for(const flags of ['','u','v'])for(const shape of ['[\\X]','\\X','[a\\Xb]','[\\X--a]','[\\q{\\X}]'])sources.push(`var re = /${shape.replace('X',c)}/${flags};`);
 const expected=nodeVerdicts(sources);
 expect(expected.filter(Boolean).length).toBeGreaterThan(100);
 expect(expected.filter(value=>!value).length).toBeGreaterThan(50);
 for(const [index,source] of sources.entries())expect({source,early:ours(source)}).toEqual({source,early:expected[index]!});
});

test('one long fallback pattern matches its own source text',async()=>{
 const source=`const unit = '\\\\cЖ'; const n = 1500;
const re = new RegExp(unit.repeat(n)); const text = unit.repeat(n);
const cls = new RegExp('[' + '\\\\c!'.repeat(n) + ']+');
console.log(re.test(text), re.exec(text + 'tail')[0].length, cls.exec('!c\\\\!c\\\\x')[0], new RegExp('[\\\\c1\\\\c_]'.repeat(2)).exec('\\u0011\\u001f')[0].length);
`;
 await compare('stress',source);
},600000);

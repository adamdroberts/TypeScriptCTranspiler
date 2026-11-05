import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {earlyFunctionStaticSemanticsFailure} from '../../src/function-static-semantics';
import {earlyRegExpLiteralFailure} from '../../src/regexp-static-semantics';
import {createEcmaSourceFile} from '../../src/ecmascript-source';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* Annex B legacy literals: LegacyOctalIntegerLiteral (010),
 * NonOctalDecimalIntegerLiteral (08, 019), LegacyOctalEscapeSequence (\1,
 * \377, \08) and NonOctalDecimalEscapeSequence (\8, \9) are permitted in
 * non-strict code and early SyntaxErrors in strict code (including a string
 * before a "use strict" directive of the same prologue), and never in a
 * template. Regular expressions: a braced quantifier where a term starts
 * (/{2}/, /x{2}{3}/) is an InvalidBracedQuantifier SyntaxError even under
 * the Annex B pattern grammar, while a lone brace stays a literal; a class
 * range with a class escape on either side ([\d-a], [a-\d], [\s-\d]) is the
 * union of both sides and the hyphen itself (CharacterRangeOrUnion).
 * Generated sources compare our verdict with Node's parser and generated
 * programs compare values and matches; one long string literal of octal
 * escapes is the stress input. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const numerics=['00','01','07','010','0777','08','09','019','0123456789','0o17','0.5','08.5','09e1','010n'];
const escapes=['\\0','\\1','\\7','\\8','\\9','\\01','\\08','\\78','\\377','\\400','\\1234','\\00','\\x41','\\u0041'];
function literal(random:()=>number):{text:string;value:string}{
 if(random()<0.5){const n=numerics[Math.floor(random()*numerics.length)]!;return {text:n,value:n};}
 const parts:string[]=[];const count=1+Math.floor(random()*3);
 for(let index=0;index<count;index++)parts.push(random()<0.7?escapes[Math.floor(random()*escapes.length)]!:'ab');
 const quote=random()<0.5?'"':"'";
 return {text:quote+parts.join('')+quote,value:quote+parts.join('')+quote};
}
function source(random:()=>number):string{
 const lit=literal(random).text;
 const position=Math.floor(random()*6);
 const body=position===0?`var a = ${lit};`:position===1?`var o = { ${lit}: 1 };`:position===2?`f(${lit});`:position===3?`var t = \`x${lit}y\`;`:position===4?`var a = [${lit}, ${lit}];`:`var a = ${lit} + 1;`;
 const mode=Math.floor(random()*5);
 switch(mode){
  case 0:return body;
  case 1:return `"use strict";\n${body}`;
  case 2:return `function f() { "use strict"; ${body} }`;
  case 3:return `function f() { ${lit}; "use strict"; ${body} }`;
  default:return `function f() { ${body} }\nfunction g() { "use strict"; }`;
 }
}
function ours(text:string):boolean{
 const file=createEcmaSourceFile('x.js',text,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,'script');
 const parse=(file as ts.SourceFile&{parseDiagnostics?:readonly ts.Diagnostic[]}).parseDiagnostics??[];
 return parse.length>0||earlyFunctionStaticSemanticsFailure(file)!==null||earlyRegExpLiteralFailure(file)!==null;
}
function nodeVerdicts(sources:readonly string[]):boolean[]{
 const script='const sources=JSON.parse(require("node:fs").readFileSync(0,"utf8"));process.stdout.write(JSON.stringify(sources.map(source=>{try{new Function(source);return false;}catch(error){return error instanceof SyntaxError;}})));';
 const node=nodeReferenceSync(['node','-e',script],{stdin:Buffer.from(JSON.stringify(sources)),stdout:'pipe',stderr:'pipe',timeout:60000});
 expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
 return JSON.parse(node.stdout.toString());
}
const patterns=['{2}','{2,}','{2,3}','x{2}{3}','{','}','a{','a{2','{,2}','x{2,}?','(?:){2}','[\\d-a]','[a-\\d]','[\\s-\\d]','[\\w-x]','[-\\d]','[\\d-]','[%-\\dz]','[a-z]','[z-a]','[\\d-\\s-x]','a{3}{','\\{2}'];
function regexpSources():string[]{
 const sources:string[]=[];
 for(const pattern of patterns)for(const flags of ['','u'])sources.push(`var r = /${pattern}/${flags};`);
 return sources;
}
function valueProgram(random:()=>number,count:number):string{
 let text='const out = [];\nfunction f(x) { out.push(typeof x + ":" + JSON.stringify(x)); }\n';
 for(let index=0;index<count;index++){
  const lit=literal(random).text;
  // A legacy octal BigInt (010n) is a SyntaxError everywhere; the verdict test covers it.
  if(lit.endsWith('n'))continue;
  text+=`f(${lit});\nf({ ${lit}: 1 });\n`;
 }
 text+='const inputs = [":a0123456789-:", ":a0123456789z-:", "&%0123456789-&", "& \\t0123456789z-&", "xyz-_", "--", "a{2}b", "{{{", "}}", "aaa{"];\n';
 for(const pattern of patterns){
  text+=`try { const r = new RegExp(${JSON.stringify(pattern)}); for (const input of inputs) { const m = r.exec(input); out.push(${JSON.stringify(pattern)} + " " + JSON.stringify(input) + " -> " + (m ? JSON.stringify(m[0]) : "null")); } } catch (error) { out.push(${JSON.stringify(pattern)} + " " + error.name); }\n`;
 }
 return text+'console.log(out.join("\\n"));\n';
}
function stressProgram(count:number):string{
 let text='const s = "';
 for(let index=0;index<count;index++)text+='\\'+(index%256).toString(8);
 return text+'";\nconsole.log(s.length, s.charCodeAt(0), s.charCodeAt(s.length - 1), encodeURIComponent(s).length);\n';
}
async function compare(name:string,text:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-annexb-literals-'));
 try{
  const entry=join(root,'main.cjs');await writeFile(entry,text);
  const node=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({name,code:node.exitCode,stderr:node.stderr.toString()}).toEqual({name,code:0,stderr:''});
  const diagnostics:string[]=[],output=join(root,'program');
  const built=await compile({entry,output,buildDir:join(root,'build'),diagnosticWriter:x=>diagnostics.push(x)});
  expect({name,code:built.exitCode,diagnostics}).toEqual({name,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({name,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({name,code:0,stderr:'',stdout:node.stdout.toString()});
 }finally{await rm(root,{recursive:true,force:true});}
}

test('legacy octal literals and escapes are early errors exactly when Node rejects them',()=>{
 const random=rng(0x0c7a1);
 const sources:string[]=[];
 for(let index=0;index<400;index++)sources.push(source(random));
 sources.push(...regexpSources());
 const expected=nodeVerdicts(sources);
 expect(expected.filter(Boolean).length).toBeGreaterThan(60);
 expect(expected.filter(value=>!value).length).toBeGreaterThan(60);
 for(const [index,text] of sources.entries())expect({text,early:ours(text)}).toEqual({text,early:expected[index]!});
});

test('sloppy legacy literals and Annex B class ranges evaluate like Node',async()=>{
 await compare('values',valueProgram(rng(0x5e7),60));
},600000);

test('one long string of octal escapes',async()=>{
 await compare('stress',stressProgram(3000));
},600000);

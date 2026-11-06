import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createEcmaSourceFile} from '../../src/ecmascript-source';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* IdentifierName admits every code point with the Unicode ID_Start /
 * ID_Continue property of the current Unicode version (plus $, _, ZWNJ and
 * ZWJ), written directly or as a \uXXXX / \u{...} escape, in every binding,
 * reference, property-name, private-name and label position. TypeScript's
 * scanner carries an older table and rejects the newer code points, so the
 * source parse shadows each such code point and restores the identifier.
 * A code point outside both properties stays a SyntaxError. Generated
 * programs use code points TypeScript rejects but Unicode admits; one
 * identifier of two thousand such code points is the stress input. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const starts:string[]=[],parts:string[]=[],rejected:string[]=[];
for(let cp=0x80;cp<=0x10ffff;cp++){
 if(cp>=0xd800&&cp<=0xdfff)continue;
 const ch=String.fromCodePoint(cp);
 const unicodeStart=/^\p{ID_Start}$/u.test(ch),unicodePart=unicodeStart||/^\p{ID_Continue}$/u.test(ch);
 if(unicodeStart&&!ts.isIdentifierStart(cp,ts.ScriptTarget.ESNext))starts.push(ch);
 else if(unicodePart&&!ts.isIdentifierPart(cp,ts.ScriptTarget.ESNext))parts.push(ch);
 else if(!unicodePart&&cp<0x3000&&rejected.length<64&&!/\s/u.test(ch)&&cp!==0x200c&&cp!==0x200d)rejected.push(ch);
}
function escape(ch:string):string{
 const cp=ch.codePointAt(0)!;
 return cp<=0xffff?`\\u${cp.toString(16).padStart(4,'0')}`:`\\u{${cp.toString(16)}}`;
}
function identifier(random:()=>number,escaped:boolean):string{
 let text=random()<0.7?starts[Math.floor(random()*starts.length)]!:'_'+starts[Math.floor(random()*starts.length)]!;
 const length=Math.floor(random()*3);
 for(let index=0;index<length;index++){
  const pool=random()<0.5?starts:parts;
  text+=pool[Math.floor(random()*pool.length)]!;
 }
 return escaped?[...text].map(ch=>random()<0.5?escape(ch):ch).join(''):text;
}
function block(random:()=>number,index:number):string{
 const escaped=random()<0.3;
 const names=new Set<string>();
 while(names.size<3)names.add(identifier(random,escaped));
 const [a,b,c]=[...names] as [string,string,string];
 const show=(name:string)=>`String(${name})`;
 switch(Math.floor(random()*7)){
  case 0:return `{ var ${a} = ${index}; let ${b} = ${a} + 1; out.push(${show(a)}, ${show(b)}); }\n`;
  case 1:return `{ function ${a}(${b}, ${c} = 2) { return ${b} * ${c}; } out.push(${a}.name.length, ${show(`${a}(${index})`)}); }\n`;
  case 2:return `{ const o = { ${a}: ${index}, ${b}() { return this.${a}; }, get ${c}() { return 'g'; } }; out.push(Object.keys(o).join().length, ${show(`o.${b}()`)}, ${show(`o["${[...a].map(ch=>ch.codePointAt(0)!>0x7f?ch:ch).join('')}"]`)}, o.${c}); }\n`;
  case 3:return `{ class ${a} { #${b} = ${index}; static ${c} = 's'; read() { return this.#${b}; } has(o) { return #${b} in o; } } out.push(${show(`new ${a}().read()`)}, ${show(`new ${a}().has({})`)}, ${a}.${c}, ${a}.name.length); }\n`;
  case 4:return `${a}: for (let ${b} = 0; ${b} < 3; ${b}++) { if (${b} === 1) continue ${a}; out.push(${b}); }\n`;
  case 5:return `{ const { ${a}, ${b}: [${c}] } = { ${a}: ${index}, ${b}: ['x'] }; out.push(${show(a)}, ${show(c)}); }\n`;
  default:return `{ const ${a} = (${b}) => ${b} + ${index}; out.push(${show(`${a}(1)`)}, typeof ${a}); }\n`;
 }
}
function program(random:()=>number,count:number):string{
 let text='const out = [];\n';
 for(let index=0;index<count;index++)text+=block(random,index);
 return text+'console.log(out.join("\\n"));\n';
}
function stressProgram(length:number):string{
 const random=rng(0x51de);
 let name=starts[0]!;
 for(let index=1;index<length;index++)name+=(index%2?starts:parts)[Math.floor(random()*(index%2?starts.length:parts.length))]!;
 return `var ${name} = 7;\nconsole.log(${name} * 6, ${JSON.stringify(name)}.length, [...${JSON.stringify(name)}].length);\n`;
}
function ours(text:string):boolean{
 const file=createEcmaSourceFile('x.js',text,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,'script');
 return ((file as ts.SourceFile&{parseDiagnostics?:readonly ts.Diagnostic[]}).parseDiagnostics??[]).length>0;
}
function nodeVerdicts(sources:readonly string[]):boolean[]{
 const script='const sources=JSON.parse(require("node:fs").readFileSync(0,"utf8"));process.stdout.write(JSON.stringify(sources.map(source=>{try{new Function(source);return false;}catch(error){return error instanceof SyntaxError;}})));';
 const node=nodeReferenceSync(['node','-e',script],{stdin:Buffer.from(JSON.stringify(sources)),stdout:'pipe',stderr:'pipe',timeout:60000});
 expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
 return JSON.parse(node.stdout.toString());
}
async function compare(name:string,source:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-unicode-identifiers-'));
 try{
  const entry=join(root,'main.cjs');await writeFile(entry,source);
  const node=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({name,code:node.exitCode,stderr:node.stderr.toString()}).toEqual({name,code:0,stderr:''});
  const diagnostics:string[]=[],output=join(root,'program');
  const built=await compile({entry,output,buildDir:join(root,'build'),diagnosticWriter:x=>diagnostics.push(x)});
  expect({name,code:built.exitCode,diagnostics}).toEqual({name,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({name,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({name,code:0,stderr:'',stdout:node.stdout.toString()});
 }finally{await rm(root,{recursive:true,force:true});}
}

test('identifier code points TypeScript rejects parse exactly when Node accepts them',()=>{
 expect(starts.length).toBeGreaterThan(100);expect(parts.length).toBeGreaterThan(20);expect(rejected.length).toBeGreaterThan(20);
 const random=rng(0x1d5);
 const sources:string[]=[];
 for(let index=0;index<200;index++){
  const roll=random();
  if(roll<0.6)sources.push(`var ${identifier(random,random()<0.3)} = 1;`);
  else if(roll<0.8)sources.push(`var ${rejected[Math.floor(random()*rejected.length)]} = 1;`);
  else sources.push(`var a${rejected[Math.floor(random()*rejected.length)]} = 1;`);
 }
 sources.push(`var ${parts[0]} = 1;`,`var a${parts[0]} = 1;`,`var ${escape(starts[0]!)}${escape(parts[0]!)} = 1;`,'var \\u00AC = 1;','var a\\u{2E80} = 1;');
 const expected=nodeVerdicts(sources);
 expect(expected.filter(Boolean).length).toBeGreaterThan(30);
 expect(expected.filter(value=>!value).length).toBeGreaterThan(80);
 for(const [index,text] of sources.entries())expect({text,early:ours(text)}).toEqual({text,early:expected[index]!});
});

test('generated programs over newer identifier code points run like Node',async()=>{
 await compare('identifiers',program(rng(0x1d17),50));
},600000);

test('one identifier of two thousand newer code points',async()=>{
 await compare('stress',stressProgram(2000));
},600000);

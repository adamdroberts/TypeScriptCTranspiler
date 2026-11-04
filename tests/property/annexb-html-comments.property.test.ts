import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* Annex B B.1.1 HTML-like comments (Script goal only), compared against Node.
 * One generator mixes every lexical position: `<!--` at a line start, after
 * code and inside a template substitution; `-->` at a line start after
 * whitespace, delimited comments, a multi-line comment containing a line
 * terminator and U+2028/U+2029; the same sequences inside string, template and
 * regular expression literals, where they are text; and `-->` after code,
 * where it is a decrement and a comparison. Comment bodies carry quotes,
 * backticks, slashes and braces so a recovered parse of the comment line can
 * never leak into the lexing of the lines that follow. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const junkWords=['x','y',"'",'"','`','/','(',')','{','}','${','*/','/*','-->','<!--','--','>','$','\\','//','0/'];
function junk(random:()=>number,insideDelimited=false):string{
 const words=insideDelimited?junkWords.filter(word=>word!=='*/'):junkWords;
 let text='';const length=Math.floor(random()*6);
 for(let index=0;index<length;index++)text+=words[Math.floor(random()*words.length)]!+(random()<0.5?' ':'');
 return text;
}
function delimited(random:()=>number):string{
 let text='';const count=Math.floor(random()*3);
 for(let index=0;index<count;index++)text+=['/**/','/* a */','/* -> */','/* <!-- */'][Math.floor(random()*4)]!+(random()<0.5?' ':'');
 return text;
}
function snippet(random:()=>number):string{
 const ws=random()<0.5?'':'  ';
 switch(Math.floor(random()*14)){
  case 0:return `counter += 1; <!-- ${junk(random)}\n`;
  case 1:return `<!-- ${junk(random)}\ncounter += 2;\n`;
  case 2:return `${ws}${delimited(random)}--> ${junk(random)}\ncounter += 3;\n`;
  case 3:return `/* ${junk(random,true)}\n*/--> ${junk(random)}\ncounter += 4;\n`;
  case 4:return `0/*\n*/-->${junk(random)}\ncounter += 5;\n`;
  case 5:return `counter-->0;\n`;
  case 6:return `log.push("<!--", '-->', \`\n-->\n<!--\`, /<!--|-->/.source);\n`;
  case 7:return `if (counter <!-- ${junk(random)}\n> -1000) counter += 7;\n`;
  case 8:return `counter += 8 <!-- ${junk(random)}\n`;
  case 9:return `counter \u2028-->${junk(random)}\ncounter += 10;\ncounter \u2029--> ${junk(random)}\n`;
  case 10:return `log.push(\`a\${counter <!-- ${junk(random)}\n}b\`);\n`;
  case 11:return `counter += 1; <!-- ${junk(random)}\n/a<!--b/.test("a<!--b") && (counter += 12);\n`;
  case 12:return `counter /* x */-->0;\ncounter /*\n*/-->0;\n`;
  default:return `log.push(function f(){ <!-- ${junk(random)}\n return 13; }.toString());\n`;
 }
}
function generatedProgram(random:()=>number,count:number,strict:boolean):string{
 let text=`${strict?'"use strict";\n':''}var counter = 0, log = [];\n`;
 for(let index=0;index<count;index++)text+=snippet(random);
 return text+'log.push(counter);\nconsole.log(JSON.stringify(log));\n';
}

const dynamicProgram=`const results = [];
const attempt = (label, thunk) => { try { results.push([label, String(thunk())]); } catch (error) { results.push([label, error.name]); } };
attempt('body-open', () => Function("<!--")());
attempt('body-close-lf', () => Function("\\n-->")());
attempt('body-close', () => Function("-->")());
attempt('params-close', () => Function("-->", ""));
attempt('params-close-lf', () => Function("\\n-->", "")());
attempt('params-open', () => Function("a <!-- b", "return a")(5));
attempt('params-open-lf', () => Function("a\\n-->b", "return a")(6));
attempt('body-text', () => Function("a", "return a <!-- c\\n+ 1")(7));
attempt('source', () => Function("a <!-- p", "return a <!-- b\\n").toString());
attempt('eval-open', () => eval("1 <!-- c\\n+ 2"));
attempt('eval-close', () => eval("\\n--> z\\n7"));
attempt('eval-close-first', () => eval("--> z\\n8"));
attempt('eval-string', () => eval("'<!--' + '-->'"));
console.log(JSON.stringify(results));
`;

function stressProgram(lines:number):string{
 let text='var counter = 0;\n';
 for(let index=0;index<lines;index++)text+=index%3===0?`<!-- ${index} ' \` / {\ncounter += 1;\n`:index%3===1?`--> ${index} " / ( \${\ncounter += 1;\n`:`counter += 1; /*\n*/--> ${index}\n`;
 return text+'console.log(counter);\n';
}

async function compare(name:string,source:string,extension='cjs'):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-html-'));
 try{
  const entry=join(root,`main.${extension}`);await writeFile(entry,source);
  const node=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:120000});
  const rejected=node.exitCode!==0;
  if(rejected)expect({name,stderr:node.stderr.toString()}).toMatchObject({name,stderr:expect.stringContaining('SyntaxError')});
  for(const noGc of [false,true]){
   const diagnostics:string[]=[],output=join(root,`program-${noGc}`);
   const built=await compile({entry,output,buildDir:join(root,`build-${noGc}`),noGc,diagnosticWriter:x=>diagnostics.push(x)});
   if(rejected){expect({name,noGc,failed:built.exitCode!==0,rejected:diagnostics.length>0}).toEqual({name,noGc,failed:true,rejected:true});continue;}
   expect({name,noGc,code:built.exitCode,diagnostics}).toEqual({name,noGc,code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});
   expect({name,noGc,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({name,noGc,code:0,stderr:'',stdout:node.stdout.toString()});
  }
 }finally{await rm(root,{recursive:true,force:true});}
}

test('generated HTML-like comment programs match Node in sloppy and strict scripts',async()=>{
 const random=rng(0x4e2b);
 await compare('sloppy',generatedProgram(random,80,false));
 await compare('strict',generatedProgram(random,80,true));
},600000);

test('Function and eval sources apply the Script-goal grammar exactly as Node',async()=>{
 await compare('dynamic',dynamicProgram);
},600000);

test('sequences that are not comments are rejected or lexed as operators like Node',async()=>{
 await compare('close-after-code','var x = 2\n--> comment\n)\n');
 await compare('close-after-token','var x = 1; /*\n*/ x -->\n');
 await compare('module','console.log(1)\n--> x\n','mjs');
},600000);

test('one long script with alternating comment forms',async()=>{
 await compare('stress',stressProgram(1200));
},600000);

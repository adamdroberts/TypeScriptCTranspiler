import {expect,test} from "bun:test";
import {spawnSync} from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import ts from "typescript";
import {compile} from "../../src/compile";
import {evalSourceIsValid} from "../../src/eval-source";
import {earlyRegExpLiteralFailure,ensureValidator} from "../../src/regexp-static-semantics";

function literalFile(text:string):ts.SourceFile {
 return ts.createSourceFile("x.js",text,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS);
}

// The compile-time verdict comes from the runtime's C grammar; Bun's own
// RegExp constructor is the independent oracle for the same early error.
test("RegExp literal early errors agree with Bun over generated patterns and flags",()=>{
 const alphabet=["(","?",":","-","i","m","s","x",")","[","]","^","\\","a","|","*","+","{","}","1",",","<",">","k","n","u","p","=","!",".","$"];
 const flagSets=["","i","u","v","gi","m","s","dgimsy","uv","ii","x"];
 let seed=0x2545f491;
 const next=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/0x100000000;};
 let checked=0,rejected=0;
 for(let sample=0;sample<3000;sample++){
  let pattern="";const length=1+Math.floor(next()*10);
  for(let index=0;index<length;index++)pattern+=alphabet[Math.floor(next()*alphabet.length)];
  const flags=flagSets[Math.floor(next()*flagSets.length)]!;
  const file=literalFile(`/${pattern}/${flags};`);
  const statement=file.statements[0];
  // Keep only inputs that tokenize as exactly this one literal.
  if(file.statements.length!==1||!statement||!ts.isExpressionStatement(statement)||!ts.isRegularExpressionLiteral(statement.expression)||
   statement.expression.text!==`/${pattern}/${flags}`)continue;
  let bun=true;try{new RegExp(pattern,flags);}catch{bun=false;}
  const ours=earlyRegExpLiteralFailure(file)===null;
  expect({pattern,flags,accepted:ours}).toEqual({pattern,flags,accepted:bun});
  checked++;if(!bun)rejected++;
 }
 expect(checked).toBeGreaterThan(2000);expect(rejected).toBeGreaterThan(200);expect(checked-rejected).toBeGreaterThan(200);
});

test("the first invalid literal in source order is reported, including flags errors",()=>{
 const failure=earlyRegExpLiteralFailure(literalFile("const a=/ok/g;\nconst b=/(?i-i:a)/;\nconst c=/x/gg;\n"));
 expect(failure?.message).toBe("Invalid regular expression: /(?i-i:a)/: invalid pattern");
 expect(failure?.node.getStart()).toBe("const a=/ok/g;\nconst b=".length);
 expect(earlyRegExpLiteralFailure(literalFile("/x/gg;"))?.message).toBe("Invalid regular expression: /x/gg: invalid flags");
 expect(earlyRegExpLiteralFailure(literalFile("let f=()=>[/a/u,{k:/(?<n>b)\\k<n>/}];"))).toBeNull();
});

// One deep representative input: nesting depth is not a cardinality the
// validator enumerates, so a 10,000-deep group must parse like a shallow one.
test("deeply nested modifier groups validate without a depth limit",()=>{
 const depth=10_000;
 expect(earlyRegExpLiteralFailure(literalFile(`/${"(?i:".repeat(depth)}a${")".repeat(depth)}/;`))).toBeNull();
 expect(earlyRegExpLiteralFailure(literalFile(`/${"(?i:".repeat(depth)}a${")".repeat(depth)}(?ii:b)/;`))?.message).toContain("invalid pattern");
});

test("eval and Function sources with invalid RegExp literals are not admitted",()=>{
 expect(evalSourceIsValid({kind:"indirect",source:"/(?i:a)/.test('A')",strict:false,strictCaller:false})).toBe(true);
 expect(evalSourceIsValid({kind:"indirect",source:"/(?-:a)/.test('A')",strict:false,strictCaller:false})).toBe(false);
});

test("the compiler rejects an invalid RegExp literal before emitting code",async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-regexp-literal-"));
 try{
  for(const [name,source,ok] of [["valid.mjs","console.log(/(?i:a)/.test('A'));\n",true],["invalid.mjs","console.log(1);\nconst r=/(?i-i:a)/;\n",false]] as const){
   const entry=path.join(root,name),diagnostics:string[]=[];await fs.writeFile(entry,source);
   const result=await compile({entry,output:path.join(root,name+".out"),emitCOnly:true,buildDir:path.join(root,name+".build"),diagnosticWriter:message=>diagnostics.push(message)});
   if(ok)expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
   else{expect(result.exitCode).not.toBe(0);expect(diagnostics.join("")).toContain(`${entry}:2:9: Invalid regular expression: /(?i-i:a)/: invalid pattern`);}
  }
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

// A truncated or oversized stream must end the validator with status 2 and
// no verdict, which the compiler treats as unavailable rather than valid.
test("the validator fails closed on malformed input",()=>{
 const validator=ensureValidator();
 const record=(units:number[])=>{const buffer=Buffer.alloc(4+units.length*2);buffer.writeUInt32LE(units.length,0);units.forEach((unit,index)=>buffer.writeUInt16LE(unit,4+index*2));return buffer;};
 const a=[...'a'].map(c=>c.charCodeAt(0));
 expect(spawnSync(validator,[],{input:Buffer.concat([record(a),record([])])}).stdout.toString()).toBe("k");
 for(const input of [record(a),Buffer.concat([record(a),record([]).subarray(0,3)]),Buffer.from([0xff,0xff,0xff,0x7f])]){
  const run=spawnSync(validator,[],{input});
  expect({status:run.status,stdout:run.stdout.toString()}).toEqual({status:2,stdout:""});
 }
});

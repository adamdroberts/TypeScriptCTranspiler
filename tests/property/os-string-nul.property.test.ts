import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {compile} from '../../src/compile';

// Every native C-string boundary rejects embedded NUL instead of truncating.
// Node-validated APIs are compared with independent Node; APIs that Node
// itself truncates fail closed with the same TypeError/code shape.
const domains=['`\'"\0','a\0b','\0','tail\0','it\'s\0"q"','é\n\0\u0007','x'.repeat(125)+'\0','x'.repeat(200)+'\0','target.txt\0.png'];
const nodeValidated:Array<[string,string]>=[
 ['readFileSync','fs.readFileSync(V)'],['writeFileSync','fs.writeFileSync(V,"x")'],['statSync','fs.statSync(V)'],
 ['existsSync','fs.existsSync(V)'],['renameSync-old','fs.renameSync(V,"r")'],['renameSync-new','fs.renameSync("target.txt",V)'],
 ['copyFileSync-src','fs.copyFileSync(V,"c")'],['copyFileSync-dest','fs.copyFileSync("target.txt",V)'],
 ['mkdtempSync','fs.mkdtempSync(V)'],
 ['execFileSync-file','cp.execFileSync(V)'],['execFileSync-arg','cp.execFileSync("true",["ok",V])'],
 ['execFileSync-cwd','cp.execFileSync("true",[],{cwd:V})'],['execFileSync-env','cp.execFileSync("true",[],{env:{A:V}})'],
 ['execSync','cp.execSync(V)'],['dns.lookup','dns.lookup(V,()=>{})'],
];
const failClosed:Array<[string,string,string]>=[
 ['process.chdir','process.chdir(V)',"The argument 'directory' must be a string without null bytes. Received "],
 ['env-value','process.env.TSC2C_NUL_PROBE=V',"The property 'process.env['TSC2C_NUL_PROBE']' must be a string without null bytes. Received "],
];
const program=(cases:readonly (readonly [string,string])[])=>[
 'import * as fs from "node:fs";import * as cp from "node:child_process";import * as dns from "node:dns";',
 `const domains: string[] = ${JSON.stringify(domains)};`,
 ...cases.map(([name,call])=>`for (const V of domains) { try { const result: unknown = ${call}; console.log(${JSON.stringify(name)}, "accepted", JSON.stringify(result)); } catch (e) { const error = e as any; console.log(${JSON.stringify(name)}, error.name, error.code, JSON.stringify(error.message)); } }`),
 'console.log("created", ["r","c","x"].filter(name => fs.existsSync(name)).join(","));',
].join('\n')+'\n';

function inspectString(value:string):string{
 const quote=!value.includes("'")?"'":!value.includes('"')?'"':!value.includes('`')?'`':"'";
 let out=quote;for(const ch of value){const c=ch.codePointAt(0)!;
  if(ch===quote)out+='\\'+ch;else if(ch==='\n')out+='\\n';else if(ch==='\t')out+='\\t';else if(ch==='\r')out+='\\r';else if(ch==='\\')out+='\\\\';
  else if(c<0x20||c===0x7f)out+='\\x'+c.toString(16).toUpperCase().padStart(2,'0');else out+=ch;}
 out+=quote;return out.length>128?out.slice(0,128)+'...':out;
}

async function runBoth(root:string,name:string,source:string,noGc:boolean,withNode:boolean){
 const directory=join(root,`${name}-${noGc}`);await Bun.write(join(directory,'target.txt'),'secret\n');
 const entry=join(directory,'main.ts');await writeFile(entry,source);
 const node=withNode?Bun.spawnSync(['node',entry],{cwd:directory,stdout:'pipe',stderr:'pipe'}):null;
 for(const file of ['r','c','x'])if(existsSync(join(directory,file)))await rm(join(directory,file),{recursive:true,force:true});
 const output=join(directory,'native'),diagnostics:string[]=[];
 const result=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:message=>diagnostics.push(message)});
 expect({name,noGc,code:result.exitCode,diagnostics}).toEqual({name,noGc,code:0,diagnostics:[]});
 const native=Bun.spawnSync([output],{cwd:directory,stdout:'pipe',stderr:'pipe'});
 expect({name,noGc,code:native.exitCode,stderr:native.stderr.toString()}).toEqual({name,noGc,code:0,stderr:''});
 return {node:node?.stdout.toString(),native:native.stdout.toString()};
}

test('Node-validated native string boundaries reject embedded NUL with identical errors and no effects',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-os-nul-'));
 try{for(const noGc of [false,true]){
  const {node,native}=await runBoth(root,'validated',program(nodeValidated),noGc,true);
  expect(node).toContain('created \n');expect(node!.split('\n').filter(line=>line.includes(' accepted ')).every(line=>line==='existsSync accepted false')).toBe(true);
  expect({noGc,native}).toEqual({noGc,native:node!});
 }}finally{await rm(root,{recursive:true,force:true})}
},900000);

test('host boundaries that Node truncates fail closed with the canonical NUL TypeError',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-os-nul-closed-'));
 try{for(const noGc of [false,true]){
  const {native}=await runBoth(root,'closed',program(failClosed.map(([name,call])=>[name,call] as const)),noGc,false);
  const expected=failClosed.flatMap(([name,,prefix])=>domains.map(value=>`${name} TypeError ERR_INVALID_ARG_VALUE ${JSON.stringify(prefix+inspectString(value))}`));
  expect({noGc,native}).toEqual({noGc,native:[...expected,'created ',''].join('\n')});
 }}finally{await rm(root,{recursive:true,force:true})}
},900000);

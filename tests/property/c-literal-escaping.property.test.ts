import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {escapeCString} from '../../src/emit/cbuf';
import {compile} from '../../src/compile';

// Characters that participate in C lexical structure: quotes, escapes, every
// trigraph introducer/terminator, comment delimiters, line splices, NUL and
// non-ASCII/surrogate code units.
const alphabet=['?','?','?','"',"'",'\\','/','=','(',')','!','<','>','-','*','\n','\r','\t','\0','0','7','a','#','\u00e9','\u2028','\ud83d','\ude00','\ud800'];
function strings(seed:number,count:number,maxLength:number):string[]{
 let state=seed>>>0;const next=()=>(state=(Math.imul(state,1664525)+1013904223)>>>0);
 const out:string[]=[];for(let i=0;i<count;i++){let s='';const length=next()%maxLength;for(let j=0;j<length;j++)s+=alphabet[next()%alphabet.length];out.push(s);}
 return out;
}
function wtf8(s:string):number[]{
 const bytes:number[]=[];for(const ch of s){const cp=ch.codePointAt(0)!;
  if(cp<0x80)bytes.push(cp);else if(cp<0x800)bytes.push(0xc0|cp>>6,0x80|cp&63);
  else if(cp<0x10000)bytes.push(0xe0|cp>>12,0x80|cp>>6&63,0x80|cp&63);
  else bytes.push(0xf0|cp>>18,0x80|cp>>12&63,0x80|cp>>6&63,0x80|cp&63);}
 return bytes;
}

test('escaped C literals decode to their exact WTF-8 bytes under ISO C trigraph translation',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-c-literal-'));
 try{
  const inputs=['??/','a??/"','??=??(??)??!??<??>??-??\'','???/','*/','\\\n',...strings(0x5eed,400,24),'??/'.repeat(4096)];
  for(const input of inputs)expect(escapeCString(input)).not.toContain('??');
  const source=['#include <stdio.h>','static const char* const v[]={',...inputs.map(s=>`"${escapeCString(s)}",`),'};',
   'static const unsigned long n[]={',...inputs.map(s=>`sizeof("${escapeCString(s)}")-1,`),'};',
   'int main(void){for(unsigned i=0;i<sizeof n/sizeof n[0];i++){for(unsigned long j=0;j<n[i];j++)printf("%02x",(unsigned char)v[i][j]);printf("\\n");}return 0;}'].join('\n');
  const c=join(root,'probe.c'),exe=join(root,'probe');await writeFile(c,source);
  const cc=Bun.spawnSync([process.env.TSC2C_CC||'gcc','-std=c11','-Wall','-Werror','-Wno-trigraphs','-Wno-overlength-strings',c,'-o',exe],{stdout:'pipe',stderr:'pipe'});
  expect({code:cc.exitCode,stderr:cc.stderr.toString()}).toEqual({code:0,stderr:''});
  const run=Bun.spawnSync([exe],{stdout:'pipe',stderr:'pipe'});expect(run.exitCode).toBe(0);
  const lines=run.stdout.toString().split('\n').slice(0,-1);
  expect(lines).toEqual(inputs.map(s=>wtf8(s).map(b=>b.toString(16).padStart(2,'0')).join('')));
 }finally{await rm(root,{recursive:true,force:true})}
},120000);

test('source text containing trigraph sequences cannot escape emitted C literals',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-c-literal-e2e-'));
 try{
  const values=['a??/','??/"); abort(); ("','??=??(??)??!??<??>??-??\'','*/ ??/',...strings(0xc0de,32,16).filter(s=>!/[\ud800-\udfff]/.test(s))];
  const program=[...values.map((v,i)=>`const s${i}: string = ${JSON.stringify(v)};\nconsole.log(JSON.stringify([s${i}, s${i}.length, \`\${s${i}}??/\`, ({${JSON.stringify(v)}: 1})[s${i}]]));`)].join('\n')+'\n';
  for(const noGc of [false,true]){
   const directory=join(root,`gc-${!noGc}`,'dir??=x');await Bun.write(join(directory,'.keep'),'');
   const entry=join(directory,'main??-??(.ts');await writeFile(entry,program);
   const node=Bun.spawnSync(['node','--experimental-strip-types',entry],{stdout:'pipe',stderr:'pipe'});expect(node.exitCode).toBe(0);
   const output=join(directory,'native'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,code:result.exitCode,diagnostics}).toEqual({noGc,code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe'});
   expect({noGc,code:native.exitCode,stdout:native.stdout.toString()}).toEqual({noGc,code:0,stdout:node.stdout.toString()});
  }
 }finally{await rm(root,{recursive:true,force:true})}
},600000);

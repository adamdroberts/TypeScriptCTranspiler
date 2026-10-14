import {expect, test} from 'bun:test';
import {mkdtemp, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';

type Action = {kind:'value'; value:number} | {kind:'empty' | 'break' | 'throw' | 'continue'};
type Clause = {selector:number | null; actions:readonly Action[]};
type Plan = {label:string; input:number; clauses:readonly Clause[]};
const value = (value:number):Action => ({kind:'value', value});
const empty:Action = {kind:'empty'}, brk:Action = {kind:'break'}, abrupt:Action = {kind:'throw'}, cont:Action = {kind:'continue'};
const plans:Plan[] = [];
for (const withDefault of [false,true]) for (const input of [1,2,9]) for (const ending of [empty,brk,abrupt,cont]) {
 const clauses:Clause[] = [{selector:1,actions:[value(17),empty]}, ...(withDefault ? [{selector:null,actions:[value(23)]}] : []), {selector:2,actions:[value(31),ending]}, {selector:3,actions:[value(41)]}];
 plans.push({label:`${withDefault}-${input}-${ending.kind}`, input, clauses});
}
plans.push({label:'empty',input:0,clauses:[]},{label:'default-only',input:0,clauses:[{selector:null,actions:[empty]}]});

function modeled(plan:Plan):string {
 let selected = -1, fallback = -1; const trace:string[] = [];
 for (const [index,clause] of plan.clauses.entries()) {
  if (clause.selector === null) {fallback=index; continue;}
  trace.push(`s${index}`); if (clause.selector === plan.input) {selected=index; break;}
 }
 if (selected<0) selected=fallback;
 let completion:number | undefined, thrown=false;
 if (selected>=0) outer:for (const [index,clause] of plan.clauses.entries()) {
  if(index<selected) continue; trace.push(`b${index}`);
  for(const action of clause.actions) {
   if(action.kind==='value') completion=action.value;
   else if(action.kind==='throw') {thrown=true;break outer;}
   else if(action.kind==='break'||action.kind==='continue') break outer;
  }
 }
 return `${thrown?'throw:marker':'normal:'+String(completion)}:${trace.join(',')}`;
}
function script(plan:Plan):string {
 const clauses=plan.clauses.map((clause,index)=>`${clause.selector===null?'default':`case select(${clause.selector},${index})`}:void trace.push('b${index}');`+clause.actions.map(action=>action.kind==='value'?`${action.value};`:action.kind==='empty'?';':action.kind==='break'?'break;':action.kind==='throw'?'throw marker;':'continue outer;').join('')).join('');
 const block=`switch(${plan.input}){${clauses}}`;
 return plan.clauses.some(clause=>clause.actions.some(action=>action.kind==='continue'))?`outer:do{${block}}while(false);`:block;
}
const source = `function select(value,index){trace.push('s'+index);return value;}let trace=[];const marker={};
`+plans.map(plan=>`trace=[];try{const value=eval(${JSON.stringify(script(plan))});console.log(${JSON.stringify(plan.label)}+':normal:'+String(value)+':'+trace.join(','));}catch(error){if(error!==marker)throw error;console.log(${JSON.stringify(plan.label)}+':throw:marker:'+trace.join(','));}`).join('\n');
const expected=plans.map(plan=>plan.label+':'+modeled(plan)).join('\n')+'\n';

test('CaseBlock clause Lists preserve selection, fallthrough and UpdateEmpty completion',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-caseblock-completion-'));
 try {
  const oracle=join(root,'oracle.js'),stdout=oracle+'.stdout';await writeFile(oracle,source);
  const reference=Bun.spawnSync(['node',oracle],{stdout:Bun.file(stdout),stderr:'pipe',timeout:120000});
  expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});expect(await readFile(stdout,'utf8')).toBe(expected);
  for(const noGc of [false,true]) {
   const entry=join(root,`main-${noGc}.js`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,source);
   const result=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:message=>diagnostics.push(message)});
   expect({code:result.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(native.stdout.toString()).toBe(expected);
  }
 } finally {await rm(root,{recursive:true,force:true});}
},900000);

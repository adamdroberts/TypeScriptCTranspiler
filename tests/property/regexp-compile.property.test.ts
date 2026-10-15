import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';

const source=String.raw`export {};const host:any=globalThis;let trace='';const marker={};
function check(value:any,label:string){if(!value)throw new Error(label);console.log(label,true)}
function caught(action:()=>any){try{action();return 'normal'}catch(e){return e===marker?'marker':e instanceof TypeError?'TypeError':e instanceof SyntaxError?'SyntaxError':'other'}}
const method=RegExp.prototype.compile;const descriptor=Object.getOwnPropertyDescriptor(RegExp.prototype,'compile');
check(method.name==='compile'&&method.length===2&&descriptor.value===method&&descriptor.writable&&!descriptor.enumerable&&descriptor.configurable,'metadata');
const original=/old/g;original.lastIndex=2;(original as any).mark=marker;const prototype=Object.getPrototypeOf(original);
check(original.compile('(new)','ig')===original&&original.source==='(new)'&&original.flags==='gi'&&original.lastIndex===0&&(original as any).mark===marker&&Object.getPrototypeOf(original)===prototype&&original.exec('NEW')![1]==='NEW','same-owner-reinitialized');
const pattern=/a/i;Object.defineProperty(pattern,'source',{get(){throw marker}});Object.defineProperty(pattern,'flags',{get(){throw marker}});Object.defineProperty(pattern,Symbol.match,{get(){throw marker}});
check(original.compile(pattern)===original&&original.source==='a'&&original.flags==='i','internal-pattern-slots');
check(caught(()=>original.compile(pattern,'g'))==='TypeError','pattern-flags-error');
trace='';const p={toString(){trace+='P';return '(b)'}},f={toString(){trace+='F';return 'gy'}};
check(Reflect.apply(method,original,[p,f,'ignored'])===original&&trace==='PF'&&original.exec('b')![1]==='b','ordered-coercion');
trace='';const bad={toString(){trace+='X';throw marker}};check(caught(()=>Reflect.apply(method,original,[bad,f]))==='marker'&&trace==='X'&&original.source==='(b)','coercion-error-no-mutation');
check(caught(()=>original.compile('x','gg'))==='SyntaxError'&&original.source==='(b)','flag-error-no-mutation');
check(caught(()=>original.compile('[','g'))==='SyntaxError'&&original.source==='(b)'&&original.flags==='gy','parse-error-no-mutation');
original.lastIndex=5;Object.defineProperty(original,'lastIndex',{writable:false});check(caught(()=>original.compile('changed','i'))==='TypeError'&&original.source==='changed'&&original.flags==='i'&&original.lastIndex===5,'slots-before-lastindex-set');
trace='';for(const receiver of [undefined,null,1,{},RegExp.prototype,Object.create(/x/),new Proxy(/x/,{})])check(caught(()=>Reflect.apply(method,receiver,[p,f]))==='TypeError','receiver-brand');check(trace==='','brand-before-coercion');
const spoof={get [Symbol.match](){throw marker},toString(){return 'spoof'}};check(Reflect.apply(method,/x/,[spoof]).source==='spoof','no-IsRegExp-protocol');
const empty=/x/;check(empty.compile()===empty&&empty.source==='(?:)'&&empty.flags==='','omitted');check(caught(()=>Reflect.construct(method,['x']))==='TypeError','nonconstructor');
const own=/self/gi;own.lastIndex=3;check(own.compile(own)===own&&own.source==='self'&&own.flags==='gi'&&own.lastIndex===0,'self-pattern');
const saved=method;const owners:any[]=[];for(let i=0;i<512;i++){const owner=/x/;owners.push({owner,prototype:Object.getPrototypeOf(owner)});Reflect.apply(saved,owner,['(value'+i+')','i']);}let valid=true;for(let i=0;i<owners.length;i++){const item=owners[i];valid=valid&&item.owner.exec('VALUE'+i)[1]==='VALUE'+i&&Object.getPrototypeOf(item.owner)===item.prototype;}check(valid,'retained-reinitialized-owner-graph');
async function main(){const owner=/before/;const callee=owner.compile;const result=Reflect.apply(callee,owner,[await Promise.resolve('after'),'g']);check(result===owner&&owner.test('after'),'retained-callee-suspension')}main();
`;

test('RegExp compile reinitializes the retained matcher owner through ordered internal-slot intake',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-regexp-compile-'));
 try{const program=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 const oracle=join(root,'oracle.mjs');await writeFile(oracle,program);const node=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.map(String).join(" ")+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});expect(node.stdout.toString().trimEnd().split('\n').at(-1)).toBe('retained-callee-suspension true');
 for(const typed of [true,false])for(const noGc of [false,true]){
  const entry=join(root,`main-${typed}-${noGc}.${typed?'mts':'mjs'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?source:program);
  const result=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:message=>diagnostics.push(message)});expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});expect({typed,noGc,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({typed,noGc,code:0,stderr:'',stdout:node.stdout.toString()});
 }
 }finally{await rm(root,{recursive:true,force:true})}
},900000);

test('borrowed RegExp compile retains target prototype and uses method Realm for errors',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-regexp-compile-realm-'));
 const input=`const foreign=$262.createRealm().global;const method=foreign.RegExp.prototype.compile;const local=/before/g;const result=Reflect.apply(method,local,['after','i']);if(result!==local||Object.getPrototypeOf(local)!==RegExp.prototype||!local.test('AFTER'))throw 'owner';let error;try{Reflect.apply(method,{},[])}catch(value){error=value}if(error?.constructor!==foreign.TypeError)throw 'Realm';console.log('borrowed Realm',true);`;
 try{
  const oracle=join(root,'oracle.js');await writeFile(oracle,input);
  const node=Bun.spawnSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");console.log=(...values)=>fs.writeSync(1,values.map(String).join(" ")+"\\n");globalThis.$262={createRealm(){const context=vm.createContext();return {global:vm.runInContext("globalThis",context)}}};vm.runInThisContext(fs.readFileSync(process.argv[1],"utf8"));',oracle],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({code:node.exitCode,stderr:node.stderr.toString(),stdout:node.stdout.toString()}).toEqual({code:0,stderr:'',stdout:'borrowed Realm true\n'});
  for(const noGc of [false,true]){
   const entry=join(root,`main-${noGc}.js`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,input);
   const result=await compile({entry,output,noGc,buildDir:output+'-build',initializationEntries:[entry],isolatedScriptRoots:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'compile-realm',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({code:result.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(JSON.parse(native.stdout.toString())).toMatchObject({kind:'normal',stdout:node.stdout.toString()});
  }
 }finally{await rm(root,{recursive:true,force:true})}
},900000);

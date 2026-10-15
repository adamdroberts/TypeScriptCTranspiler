import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(collect:boolean):string{return `
'use strict';
function check(value,label){if(!value)throw label}
function run(){
 function shadowed(process){return process.stdout.write('local')}
 const local={stdout:{write:function(chunk){return this===local.stdout&&chunk==='local'}}};check(shadowed(local),'shadowed-process');
 let trace='',calls=0;
 function shared(error){check(this===undefined&&arguments.length===1&&error===null,'callback-contract');trace+='shared|';calls++}
 const result=process.stdout.write('',shared);
 process.nextTick(()=>trace+='tick|');process.stdout.write('',shared);
 process.stdout.write('',()=>trace+='different|');process.stdout.write('',shared);
 process.stderr.write('',()=>trace+='stderr|');
 check(result===true&&calls===0&&trace==='','deferred-callback');
 let argumentsTrace='';function mark(label,value){argumentsTrace+=label;return value}
 process.stdout.write(...[mark('data|',''),mark('callback|',function(error){check(error===null,'spread-callback');trace+='spread|'}),mark('extra|',3),mark('last|',4)]);
 check(argumentsTrace==='data|callback|extra|last|','argument-evaluation');
 for(const value of [undefined,null,1,{},Symbol('chunk')]){let rejected=false;try{process.stdout.write(value)}catch(error){rejected=error instanceof TypeError&&(error.code==='ERR_INVALID_ARG_TYPE'||error.code==='ERR_STREAM_NULL_VALUES')}check(rejected,'chunk-validation')}
 for(const encoding of [1,{},'unknown','buffer']){let rejected=false;try{process.stdout.write('',encoding)}catch(error){rejected=error instanceof TypeError&&error.code==='ERR_UNKNOWN_ENCODING'}check(rejected,'encoding-validation')}
 for(const callback of [undefined,null,3,{},Symbol('callback')])check(process.stdout.write('',undefined,callback)===true,'ignored-non-callable');
 process.stdout.write('',null,()=>trace+='null-encoding|');
 function split(){trace+='split|'}process.stdout.write('',split);process.nextTick(()=>trace+='between|');process.stdout.write('');process.stdout.write('',split);
 process.stdout.write(Buffer.alloc(0),'buffer',()=>trace+='buffer|');
 process.stdout.write(new DataView(new ArrayBuffer(0)),()=>trace+='view|');
 let chain=null;
 for(let depth=0;depth<4096;depth++)chain={payload:'payload-'+depth,next:chain};
 function step(error){check(error===null&&chain.payload==='payload-'+(4095-count),'recursive-callback');chain=chain.next;count++;if(chain)process.stdout.write('',step);else trace+='deep|'}
 let count=0;process.stdout.write('',step);
 ${collect?'$262.gc();':''}
 queueMicrotask(()=>{check(calls===3&&count===4096&&chain===null,'unbounded-completion-chain');console.log('stdio jobs',trace,argumentsTrace,count)});
}
process.nextTick(run);
`}

test('Stdio completions share next-tick worklists, argument Lists and retained callbacks',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-stdio-completion-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false));
  const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile&&!noGc));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'stdio-completion.ts#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
   if(observation)expect({noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({noGc,kind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

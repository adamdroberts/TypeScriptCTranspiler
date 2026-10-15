import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import ts from 'typescript';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(profile:boolean,stress:boolean):string{return `
export {};
enum Mode {Off=-7,On=41,Next}
enum Label {Empty='',On='on'}
const host:any=globalThis;function check(value:boolean,label:string):void{if(!value)throw label;${profile?'host.print':'console.log'}(label+':true')}
async function read(value:Mode):Promise<string>{try{return value===Mode.On&&typeof value==='number'?await Promise.resolve(Label.On):await Promise.resolve(Label.Empty)}finally{effects.push('function')}}
class Reader {async read(value:Mode):Promise<number>{return value===Mode.On?await Promise.resolve(Mode.Next):await Promise.resolve(Mode.Off)}}
const arrow=async(value:Mode):Promise<boolean>=>{const held=Mode.Next;await Promise.resolve();return held===Mode.Next&&value===Mode.On};
function* values(){yield Mode.On;yield Label.On;return Mode.Next}
async function* asyncValues(){yield await Promise.resolve(Mode.Off);return Label.Empty}
const effects:string[]=[];
async function main():Promise<void>{
 check(await read(Mode.On)==='on'&&await read(Mode.Off)===''&&effects.join(',')==='function,function','enum-constant-conditional');
 const reader=new Reader();check(await reader.read(Mode.On)===42&&await reader.read(Mode.Off)===-7&&await arrow(Mode.On),'native-and-canonical-formals');
 const iterator=values();check(iterator.next().value===41&&iterator.next().value==='on'&&iterator.next().value===42,'generator-constant-read');
 const asyncIterator=asyncValues(),first=await asyncIterator.next(),last=await asyncIterator.next();check(first.value===-7&&last.value===''&&last.done,'async-generator-constant-read');
 ${stress?`let retained:any={reader,read:()=>Mode.Next};for(let depth=0;depth<4096;depth++)retained={next:retained};${profile?'host.$262.gc();':''}for(let depth=0;depth<4096;depth++)retained=retained.next;const held=await retained.reader.read(Mode.On);check(held===retained.read(),'deep-retained-constant-reader');`:''}
}main();
`}

test('constant enum members retain scalar reads in canonical source contexts',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-enum-constant-'));
 try{for(const profile of [false,true])for(const noGc of [false,true]){
  const stress=profile&&!noGc,directory=path.join(temporary,`${profile}-${noGc}`);await fs.mkdir(directory);
  const source=subject(profile,stress),entry=path.join(directory,'main.ts'),reference=path.join(directory,'reference.mjs');await fs.writeFile(entry,source);
  await fs.writeFile(reference,ts.transpileModule(subject(false,stress),{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText);
  const oracle=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");import(process.argv[1]);',reference],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  const diagnostics:string[]=[],output=path.join(directory,'program');const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),moduleRoots:[entry],initializationEntries:[entry],...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/enum-constant-reference.ts#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
  expect({profile,noGc,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({profile,noGc,exitCode:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});expect({profile,noGc,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({profile,noGc,exitCode:0,stderr:''});
  const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation.kind).toBe('normal');expect(observation?observation.stdout:native.stdout.toString()).toBe(oracle.stdout.toString());
 }}finally{await fs.rm(temporary,{recursive:true,force:true})}
},600_000);

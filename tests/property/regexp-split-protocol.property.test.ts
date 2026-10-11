import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(collect:boolean):string{return `'use strict';
function check(value,label){if(!value)throw label}
const split=RegExp.prototype[Symbol.split],d=Object.getOwnPropertyDescriptor(RegExp.prototype,Symbol.split);
console.log('metadata',split.name,split.length,d.writable,d.enumerable,d.configurable,Object.hasOwn(split,'prototype'));
function encode(values){return values.map(value=>value===undefined?'U':typeof value==='object'?JSON.stringify(value):typeof value+':'+value).join('|')}
for(const pattern of ['',',','(,)|(;)','(a)?b','a*?'])for(const flags of ['','g','y','u','v'])for(const source of ['','a,b;c','A😀B'])for(const limit of [undefined,0,2,-1,2.8]){
 const regexp=new RegExp(pattern,flags);regexp.lastIndex=2;const direct=split.call(regexp,source,limit),string=source.split(regexp,limit);check(encode(direct)===encode(string)&&regexp.lastIndex===2,'ordinary-source');console.log('partition',pattern,flags,JSON.stringify(source),String(limit),encode(direct));
}
let trace='';const capture={marker:7};
function Species(rx,flags){check(rx===receiver&&flags==='uy','species-arguments');trace+='construct|';return {lastIndex:0,exec(string){check(this===splitter&&string==='ab','exec-this');trace+='exec'+this.lastIndex+'|';if(this.lastIndex===0){this.lastIndex=1;return {0:'a',1:capture,2:undefined,length:3}}return null}}}
let splitter;const actualSpecies=new Proxy(Species,{construct(target,args){splitter=Reflect.construct(target,args);return splitter}});
const receiver={get constructor(){trace+='constructor|';return{get [Symbol.species](){trace+='species|';return actualSpecies}}},get flags(){trace+='flags|';return 'u'}};
const source={toString(){trace+='string|';return 'ab'}},limit={valueOf(){trace+='limit|';return 3}};
const result=split.call(receiver,source,limit);check(result.length===3&&result[1]===capture&&result[2]===undefined,'encoded-captures');console.log('species',trace,encode(result));
for(const phase of ['flags','construct','limit','exec','lastIndex','capture']){
 let trace='';const splitter={get lastIndex(){trace+='get-index|';if(phase==='lastIndex')throw 'marker';return 1},set lastIndex(v){trace+='set-index|'},exec(){trace+='exec|';if(phase==='exec')throw 'marker';return{length:2,get 1(){trace+='capture|';if(phase==='capture')throw 'marker';return 8}}}};
 function Species(){trace+='construct|';if(phase==='construct')throw 'marker';return splitter}
 const receiver={constructor:{[Symbol.species]:Species},get flags(){trace+='flags|';if(phase==='flags')throw 'marker';return ''}};
 let rejected=false;try{split.call(receiver,'ab',{valueOf(){trace+='limit|';if(phase==='limit')throw 'marker';return 2}})}catch(e){rejected=e==='marker'}check(rejected,'abrupt-phase');console.log('abrupt',phase,trace);
}
let noExec=false;function Zero(){return{exec(){noExec=true;return null}}}split.call({constructor:{[Symbol.species]:Zero},flags:''},'ab',0);check(!noExec,'zero-limit');
for(const receiver of [null,undefined,0,true,'str']){let rejected=false;try{split.call(receiver,'a')}catch(e){rejected=e instanceof TypeError}check(rejected,'receiver')}
for(const invalid of [0,'str',true]){function Species(){return{exec(){return invalid}}}let rejected=false;try{split.call({constructor:{[Symbol.species]:Species},flags:''},'a')}catch(e){rejected=e instanceof TypeError}check(rejected,'result-type')}
const custom={ [Symbol.split](receiver,limit){check(arguments.length===2,'custom-args');return receiver===object?limit:0}};const object={toString(){throw 'converted-before-symbol'}};check(String.prototype.split.call(object,custom,7)===7,'symbol-before-string');
const literal=/,/;literal[Symbol.split]=undefined;check('x,y'.split(literal).length===1,'missing-symbol-fallback');
let chain=null;for(let index=0;index<4096;index++){const owner={index};function Species(){return{lastIndex:0,exec(){this.lastIndex=1;return{length:2,1:owner}}}}const value=split.call({constructor:{[Symbol.species]:Species},flags:''},'x',2);chain={owner,value,next:chain}}
__COLLECT__
queueMicrotask(()=>{let visited=0;while(chain){check(chain.value[1]===chain.owner,'retained-capture');chain=chain.next;visited++}check(visited===4096,'retained-graph');console.log('retained',visited)});
`.replace("__COLLECT__",collect?"$262.gc();":"")}

test('RegExp split shares species, RegExpExec and encoded capture Lists',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-regexp-split-protocol-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false));
  const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile&&!noGc));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'regexp-split-protocol.ts#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
   if(observation)expect({noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({noGc,kind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

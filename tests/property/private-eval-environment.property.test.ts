import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {parseHostObservation} from '../test262/protocol';

const source=`
function check(value,label){if(!value)throw label;console.log(label+':true')}
function collect(){}
function make(){return class Owner {
 #value=3;#initial=eval('this.#value');static #static=7;
 get #pair(){return this.#value}set #pair(value){this.#value=value}
 #method(value){return this.#value+value}
 read(){return eval('this.#value')} initial(){return this.#initial}
 write(){return eval('this.#pair += 2')}
 invoke(){return eval('this.#method(4)')}
 has(receiver){return eval('#value in receiver')}
 retain(){return eval('(receiver)=>receiver.#value')} nestedEval(){return eval("eval('(receiver)=>receiver.#value')")}
 static read(){return eval('this.#static')}
 nested(){return eval('class Inner {#value=23;read(){return this.#value}}; Inner')}
 invalid(){return eval('effect++; false && this.#missing')}
 async later(){await Promise.resolve();return eval('this.#value')}
 }}
let effect=0;const Owner=make(),Other=make(),owner=new Owner(),other=new Other();
check(owner.initial()===3&&owner.read()===3&&owner.write()===5&&owner.invoke()===9&&Owner.read()===7,'private-eval-elements');
check(owner.has(owner)&&!owner.has(other),'private-eval-brand');
let rejected=false;try{owner.invalid()}catch(error){rejected=error instanceof SyntaxError}
check(rejected&&effect===0,'validate-all-external-names-before-evaluation');
const nested=owner.nestedEval();const saved=owner.retain();check(saved(owner)===5&&nested(owner)===5,'eval-created-private-closure');
rejected=false;try{saved(other)}catch(error){rejected=error instanceof TypeError}check(rejected,'retained-evaluation-identity');
const Inner=owner.nested();check(new Inner().read()===23,'eval-class-own-name-shadowing');
function outsideStrict(){'use strict';return eval('this.#value')}
rejected=false;try{outsideStrict()}catch(error){rejected=error instanceof SyntaxError}check(rejected,'same-source-different-private-environment');
rejected=false;try{eval('this.#value')}catch(error){rejected=error instanceof SyntaxError}check(rejected,'outside-private-environment');
let retained={owner,saved};for(let depth=0;depth<4096;depth++)retained={next:retained};collect();for(let depth=0;depth<4096;depth++)retained=retained.next;
check(retained.saved(retained.owner)===5,'deep-retained-eval-private-environment');
async function main(){const value=await owner.later();check(value===5,'suspended-private-eval')}
main();
`;

test('direct eval retains lexical private-name identities in the shared environment tree',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-private-eval-'));
 try {
  const reference=path.join(temporary,'reference.cjs');await fs.writeFile(reference,source);
  const oracle=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");require(process.argv[1]);',reference],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  const graph=finiteEvalScriptSourceGraph([{path:'caller.js',source}]);expect(graph.error).toBeNull();
  for(const noGc of [false,true]){
   const directory=path.join(temporary,String(noGc));await fs.mkdir(directory);
   const entry=path.join(directory,'caller.js');await fs.writeFile(entry,source.replace('console.log(label+', 'print(label+').replace('function collect(){}',noGc?'function collect(){}':'function collect(){$262.gc()}'));
   const roots:string[]=[],entries=[];
   for(const [index,direct] of graph.directEvalSources.entries()) {const file=path.join(directory,'eval-'+index+'.js');await fs.writeFile(file,direct.source);roots.push(file);entries.push({...direct,entry:file})}
   const diagnostics:string[]=[],output=path.join(directory,'program');const result=await compile({entry,output,noGc,additionalRoots:roots,isolatedScriptRoots:[entry,...roots],initializationEntries:[entry],buildDir:path.join(directory,'build'),test262Observation:{kind:'test262-native-observation',scenarioId:'property/private-eval.js#sloppy',setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry,...roots],directEvalEntries:entries},diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});expect({noGc,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,exitCode:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(oracle.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},600_000);

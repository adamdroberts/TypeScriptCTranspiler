import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {buildProgram,resolvePackageRoot} from '../../src/program';
import {ecmaParseGoal} from '../../src/ecmascript-source';
import {generateE2eCaseSource} from '../e2e/generated-cases';
function subject(strict:boolean):string{return `${strict?'"use strict";':''}
var goalVar=17;let goalLexical=19;
console.log('top:',this===globalThis,Object.hasOwn(globalThis,'goalVar'),Object.hasOwn(globalThis,'goalLexical'));
function loose(){return this===undefined}function directed(){'use strict';return this===undefined}function escaped(){'use\\x20strict';return this===undefined}
class Carrier{static read(){return (function(){return this===undefined})()}}
console.log('functions:',loose(),directed(),escaped(),Carrier.read());
globalThis.goalVar=23;globalThis.goalLexical=29;console.log('locations:',goalVar,goalLexical,globalThis.goalVar,globalThis.goalLexical);
console.log('eval:',eval('(function(){return this===undefined})()'),eval('"use strict";(function(){return this===undefined})()'),eval('goalVar+=1;goalVar;'));
function local(){let retained=31;const result=eval('retained+=6;retained;');return result+retained}console.log('local:',local());
`;}
const oracle=String.raw`const fs=require('node:fs'),vm=require('node:vm'),input=JSON.parse(fs.readFileSync(0,'utf8')),context=vm.createContext({console:{log:(...values)=>fs.writeSync(1,values.map(String).join(' ')+'\n')}});(async()=>{if(input.goal==='script')new vm.Script(input.source).runInContext(context);else{const record=new vm.SourceTextModule(input.source,{context});await record.link(()=>{throw Error('Unexpected import')});await record.evaluate()}})().catch(error=>{fs.writeSync(2,error.stack);process.exitCode=1});`;
test('native emission follows the canonical Script or Module goal independently of binding markers',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-parse-goal-emission-'));
 try{for(const goal of ['script','module'] as const)for(const strict of goal==='script'?[false,true]:[false])for(const typed of [false,true])for(const noGc of [false,true]){
  const deep=goal==='script'&&!strict&&!typed&&!noGc?generateE2eCaseSource('{"generator":"parse-goal-source-depth","depth":512}','property/parse_goal_source_depth'):'';
  const source=subject(strict)+deep,program=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
  const node=nodeReferenceSync(['node','--experimental-vm-modules','--no-warnings','-e',oracle],{stdin:Buffer.from(JSON.stringify({goal,source:program})),stdout:'pipe',stderr:'pipe',timeout:120000});expect({goal,strict,code:node.exitCode,stderr:node.stderr.toString()}).toEqual({goal,strict,code:0,stderr:''});
  const directory=path.join(temporary,`${goal}-${strict}-${typed}-${noGc}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.js'),output=path.join(directory,'program');await fs.writeFile(entry,(typed?'// @ts-nocheck\n':'')+(typed?source:program));
  const goalOptions=goal==='script'?{isolatedScriptRoots:[entry]}:{moduleRoots:[entry]},built=buildProgram({entry,packageRoot:resolvePackageRoot(),...goalOptions});expect(ecmaParseGoal(built.entrySourceFile)).toBe(goal);if(goal==='script')expect(ts.isExternalModule(built.entrySourceFile)).toBe(true);
  const diagnostics:string[]=[];const compiled=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),...goalOptions,diagnosticWriter:message=>diagnostics.push(message)});expect({goal,strict,typed,noGc,code:compiled.exitCode,diagnostics:diagnostics.join('')}).toEqual({goal,strict,typed,noGc,code:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({goal,strict,typed,noGc,code:native.exitCode,stderr:native.stderr.toString()}).toEqual({goal,strict,typed,noGc,code:0,stderr:''});expect(native.stdout.toString()).toBe(node.stdout.toString());
 }}finally{await fs.rm(temporary,{recursive:true,force:true})}
},900000);

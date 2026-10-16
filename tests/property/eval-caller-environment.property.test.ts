import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {buildProgram,resolvePackageRoot} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {evalCallerEnvironmentInput} from '../e2e/generated-cases';

const partitions=[
 `function spreadSource(first:any,...tail:any[]):any{let local:any=11;return [eval(first),eval(...tail),local]}console.log(spreadSource('local += 3; local;','local += 5; local;').join('|'));`,
 `function read(source:any):any{return eval('source')}console.log(eval(read('17;')));console.log(eval(read('19;')));`,
 `function write():any{let source:any='23;';eval("source='29;'");return source}console.log(eval(write()));`,
 `function first():any{const source:any='31;';return eval('source')}function second():any{const source:any='37;';return eval('source')}console.log(eval(first()));console.log(eval(second()));`,
 `function nested():any{const source:any='41;';return eval("eval('source')")}console.log(eval(nested()));`,
 `function local():any{class Local{static value='43;'}return eval('Local.value')}console.log(eval(local()));`,
 `(globalThis as any).callerSource='53;';function select():any{const callerSource:any='59;';return eval('callerSource')}console.log(eval(select()));console.log(eval((0,eval)('callerSource')));`,
 `function shadow():any{const value:any='61;';return eval("{const value='67;';value}")}console.log(eval(shadow()));`,
 `function abrupt():any{try{return eval('later')}catch(error){return error instanceof ReferenceError?'71;':'73;'}let later:any='79;'}console.log(eval(abrupt()));`,
];

test('eval source facts join actual caller bindings while indirect eval keeps global scope',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-eval-caller-facts-'));
 try{
  const entry=join(root,'main.js'),direct=join(root,'direct.js'),indirect=join(root,'indirect.js');
  await writeFile(entry,"var value='17;';function direct(){let value='19;';return eval('value')}function indirect(){let value='23;';return (0,eval)('value')}eval(direct());eval(indirect());");
  await writeFile(direct,'value');await writeFile(indirect,'value');
  const built=buildProgram({entry,packageRoot:resolvePackageRoot(),additionalRoots:[direct,indirect],isolatedScriptRoots:[direct,indirect]});
  const calls=sourceEvaluationInvocations(built.program,{roots:[entry],evaluations:[{source:'value',entry:direct,kind:'direct'},{source:'value',entry:indirect,kind:'indirect'}]});
  expect(calls.find(call=>call.node.getText()==='eval(direct())')?.choices).toEqual(['19;']);
  expect(calls.find(call=>call.node.getText()==='eval(indirect())')?.choices).toEqual(['17;']);
  const sharedSource="function first(){let value='29;';return eval('value')}function second(){let value='31;';return eval('value')}eval(first());eval(second());";
  await writeFile(entry,sharedSource);
  const oracle=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm"),context=vm.createContext({});vm.runInContext(fs.readFileSync(process.argv[1],"utf8"),context);fs.writeSync(1,JSON.stringify(vm.runInContext("[first(),second()]",context)));',entry],{stdout:'pipe',stderr:'pipe',timeout:30000});
  expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
  const actualSources=JSON.parse(oracle.stdout.toString()) as string[];expect(actualSources).toEqual(['29;','31;']);
  const shared=buildProgram({entry,packageRoot:resolvePackageRoot(),additionalRoots:[direct],isolatedScriptRoots:[direct]});
  const sharedCalls=sourceEvaluationInvocations(shared.program,{roots:[entry],evaluations:[{source:'value',entry:direct,kind:'direct'}]}).filter(call=>['eval(first())','eval(second())'].includes(call.node.getText()));
  expect(sharedCalls.map(call=>call.node.getText())).toEqual(['eval(first())','eval(second())']);
  for(const [index,call]of sharedCalls.entries())expect(call.choices).toContain(actualSources[index]!);
  expect([...new Set(sharedCalls.flatMap(call=>call.choices??[]))].sort()).toEqual(actualSources);
  await writeFile(entry,"function read(){let value='37;';with({value:'41;'})return eval('value')}eval(read());");
  const withOwner=buildProgram({entry,packageRoot:resolvePackageRoot(),additionalRoots:[direct],isolatedScriptRoots:[direct]});
  expect(sourceEvaluationInvocations(withOwner.program,{roots:[entry],evaluations:[{source:'value',entry:direct,kind:'direct'}]}).find(call=>call.node.getText()==='eval(read())')?.choices).toContain('41;');
 }finally{await rm(root,{recursive:true,force:true})}
});

test('eval caller environments match Node through source closure in typed and erased inputs',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-eval-caller-native-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const source=partitions.map(piece=>'{'+piece+'}').join('\n')+'\n'+evalCallerEnvironmentInput(typed&&!noGc?512:3);
  const program=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}.js`);await writeFile(oracle,program);
  const node=nodeReferenceSync(['node',oracle],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?source:program);
  const result=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:node.stdout.toString()});
 }
 const entry=join(root,'opaque.ts');await writeFile(entry,"function read(value:any):any{return eval('value')}eval(read(opaque()));declare function opaque():any;");const diagnostics:string[]=[];
 const result=await compile({entry,output:entry+'-native',emitCOnly:true,diagnosticWriter:message=>diagnostics.push(message)});expect(result.exitCode).toBe(3);expect(diagnostics.join('')).toContain('unknown eval() source requires --runtime-code-manifest allow-list or gated --unsafe-eval embedded Node bridge');
 }finally{await rm(root,{recursive:true,force:true})}
},900000);

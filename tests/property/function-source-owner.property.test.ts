import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';
import {functionSourceOwnerInput} from '../e2e/generated-cases';

const partitions=[
 `{const finite:any=Function("return '17;'"),unused:any=Function('return missing()');console.log('separate:',eval(finite()));}`,
 `{const first:any=Function('left','right','return left+right'),second:any=Function('left,right','return left+right');console.log('joined:',eval(first('1','9;')),eval(second('2','3;')));}`,
 `{const realm:any=$262.createRealm().global;realm.body='29;';const finite:any=realm.Function('return body');console.log('foreign:',eval(finite()));}`,
 `{const a:any=$262.createRealm().global,b:any=$262.createRealm().global;a.body='31;';b.body='37;';const first:any=a.Function('return body'),second:any=b.Function('return body');console.log('Realms:',eval(first()),eval(second()));}`,
 `{(globalThis as any).globalBody='41;';function build():any{const globalBody='43;';return Function('return globalBody')}console.log('global-only:',eval(build()()));}`,
 `{const read:any=Function(${JSON.stringify("eval(\"var body='47;'\");return eval('body')")});console.log('nested:',eval(read()));}`,
 `{let error:any;try{Function('return )')}catch(value){error=value}console.log('invalid:',error instanceof SyntaxError);}`,
 `{const source:any=Function('value','return value');console.log('formal:',eval(source('53;')));}`,
];

test('exact Function source records match Node and retain actual Realm globals',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-Function-source-owner-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const source=partitions.join('\n')+'\n'+functionSourceOwnerInput(typed&&!noGc?512:3),program=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}.js`);await writeFile(oracle,program);
  const node=Bun.spawnSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");globalThis.$262={createRealm(){return{global:vm.runInNewContext("globalThis")}}};vm.runInThisContext(fs.readFileSync(process.argv[1],"utf8"));',oracle],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?source:program);
  const result=await compile({entry,output,noGc,buildDir:output+'-build',initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/Function-source-owner.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(node.stdout.toString());
 }
 const entry=join(root,'opaque.ts');await writeFile(entry,"const read:any=Function('return missing()');console.log(eval(read()));");const diagnostics:string[]=[];const rejected=await compile({entry,output:entry+'-native',emitCOnly:true,diagnosticWriter:message=>diagnostics.push(message)});expect(rejected.exitCode).toBe(3);expect(diagnostics.join('')).toContain('unknown eval() source requires --runtime-code-manifest allow-list or gated --unsafe-eval embedded Node bridge');
 }finally{await rm(root,{recursive:true,force:true})}
},900000);

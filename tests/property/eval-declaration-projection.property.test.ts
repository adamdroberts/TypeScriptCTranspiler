import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {parseHostObservation} from '../test262/protocol';
import {evalDeclarationInput} from '../e2e/generated-cases';

const partitions=[
 `{(0,eval)("var projected='17;'");console.log('global:',eval((globalThis as any).projected));}`,
 `{const realm:any=$262.createRealm().global;realm.eval("var projected='19;'");console.log('foreign:',eval(realm.projected),eval(realm.eval('projected')));}`,
 `{const realm:any=$262.createRealm().global;realm.eval("function read(){return '23;'}");console.log('function:',eval(realm.read()));}`,
 `{(0,eval)("if(true){var {a:{nested}}={a:{nested:'29;'}}}");console.log('nested:',eval((globalThis as any).nested));}`,
 `{const reader:any=eval(${JSON.stringify("(function(){eval(\"var body='31;'\");return eval('body')})")});console.log('direct:',eval(reader()));}`,
 `{const reader:any=eval(${JSON.stringify("(function(){let body='53;';try{eval(\"var body='59;'\")}catch(error){return error instanceof SyntaxError?body:'61;'}})")});console.log('conflict:',eval(reader()));}`,
 `{(globalThis as any).isolated='37;';(0,eval)("'use strict';var isolated='41;'");console.log('strict:',eval((globalThis as any).isolated));}`,
 `{const realm:any=$262.createRealm().global;realm.eval("let hidden='43;';class Local{}");console.log('lexical:',typeof realm.hidden,typeof realm.Local);}`,
 `{const realm:any=$262.createRealm().global;realm.eval("function hidden(){var unreachable='47;'}");console.log('nested-boundary:',typeof realm.unreachable);}`,
];

test('generated declaration projection respects scope, strictness, origin order and opaque admission',()=>{
 for(const declaration of ["var body='17;'","var {a:{body}}={a:{body:'19;'}}","function body(){return '23;'}"]){
  const source=`(0,eval)(${JSON.stringify(declaration)});eval(${declaration.startsWith('function')?'body()':'body'});`,result=graph([{path:'main.js',source,goal:'script'}]);expect(result.error).toBeNull();expect(result.directEvalSources.map(row=>row.source)).toContain(declaration.includes('19;')?'19;':declaration.includes('23;')?'23;':'17;');
 }
 for(const source of ["eval(body);(0,eval)(\"var body='29;'\");","function read(){const saved=body;eval(\"var body='17;'\");return saved}eval(read());","(0,eval)(\"'use strict';var body='31;'\");eval(body);","(0,eval)(\"function hidden(){var body='37;'}\");eval(body);","(0,eval)(\"var body=opaque();\");eval(body);"]){expect(graph([{path:'main.js',source,goal:'script'}]).error).toContain('direct eval source is not a finite static string expression');}
 const saved="var body='41;';const saved=body;(0,eval)(\"var body=opaque();\");eval(saved);";expect(graph([{path:'main.js',source:saved,goal:'script'}]).error).toBeNull();
});

test('generated declarations match Node in actual local and foreign environments',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-eval-declaration-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const source=partitions.join('\n')+'\n'+evalDeclarationInput(typed&&!noGc?512:3),program=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}.js`);await writeFile(oracle,program);
  const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");globalThis.$262={createRealm(){return{global:vm.runInNewContext("globalThis")}}};vm.runInThisContext(fs.readFileSync(process.argv[1],"utf8"));',oracle],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?source:program);
  const result=await compile({entry,output,noGc,buildDir:output+'-build',initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/eval-declaration.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(node.stdout.toString());
 }
 }finally{await rm(root,{recursive:true,force:true})}
},900000);

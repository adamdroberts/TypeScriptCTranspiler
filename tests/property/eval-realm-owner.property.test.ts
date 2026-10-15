import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {parseHostObservation} from '../test262/protocol';
import {evalRealmAliasInput} from '../e2e/generated-cases';

const partitions=[
 `var value='outside';function read():any{const evaluate=$262.createRealm().global.eval;evaluate('var value="inside";');return value}console.log('foreign:',read());`,
 `{const realm:any=$262.createRealm().global;realm.source='17;';const evaluate=realm.eval;console.log('alias:',evaluate('source'));}`,
 `{const a:any=$262.createRealm().global,b:any=$262.createRealm().global;a.source='19;';b.source='23;';console.log('owners:',a.eval('source'),b.eval('source'));console.log('closures:',eval(a.eval('source')),eval(b.eval('source')));}`,
 `{const realm:any=$262.createRealm().global;realm.source='29;';const choose:any=eval("(function(local,realm){const source='31;',eval=local?globalThis.eval:realm.eval;return eval('source')})");console.log('mixed:',choose(true,realm),choose(false,realm));}`,
 `{const realm:any=$262.createRealm().global;realm.source='37;';console.log('nested:',eval(realm.eval("eval('source')")));}`,
 `{const realm:any=$262.createRealm().global;realm.source='41;';realm.eval("source='43;'");console.log('write:',realm.source);}`,
 `{const realm:any=$262.createRealm().global;realm.eval=globalThis.eval;const evaluate=realm.eval;console.log('replaced:',evaluate('47;'));}`,
 `{const realm:any=$262.createRealm().global;realm.eval=()=>53;console.log('shadow:',realm.eval('anything'));}`,
];

test('eval source admission uses intrinsic Realm identity and keeps foreign globals isolated',()=>{
 const foreign=graph([{path:'main.js',source:"const eval=$262.createRealm().global.eval;eval('17;');",goal:'script'}]);expect(foreign.error).toBeNull();expect(foreign.directEvalSources).toEqual([]);expect(foreign.indirectEvalSources.map(row=>row.source)).toContain('17;');
 const mixed=graph([{path:'main.js',source:"function read(flag){const eval=flag?globalThis.eval:$262.createRealm().global.eval;return eval('value')}read(true);read(false);",goal:'script'}]);expect(mixed.error).toBeNull();expect(mixed.directEvalSources.map(row=>row.source)).toContain('value');expect(mixed.indirectEvalSources.map(row=>row.source)).toContain('value');
 const isolated=graph([{path:'main.js',source:"const a=$262.createRealm().global,b=$262.createRealm().global;a.source='19;';b.source='23;';eval(a.eval('source'));eval(b.eval('source'));",goal:'script'}]);expect(isolated.error).toBeNull();expect(isolated.directEvalSources.map(row=>row.source)).toEqual(expect.arrayContaining(['19;','23;']));
 const opaque=graph([{path:'main.js',source:"const realm=$262.createRealm().global;realm.source=opaque();eval(realm.eval('source'));",goal:'script'}]);expect(opaque.error).toContain('direct eval source is not a finite static string expression');
});

test('Realm eval owners match Node through typed and erased native execution',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-eval-Realm-owner-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const source=partitions.join('\n')+'\n'+evalRealmAliasInput(typed&&!noGc?512:3,true),program=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}.js`);await writeFile(oracle,program);
  const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");globalThis.$262={createRealm(){return{global:vm.runInNewContext("globalThis")}}};vm.runInThisContext(fs.readFileSync(process.argv[1],"utf8"));',oracle],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?source:program);
  const result=await compile({entry,output,noGc,buildDir:output+'-build',initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/eval-Realm-owner.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(node.stdout.toString());
 }
 }finally{await rm(root,{recursive:true,force:true})}
},900000);

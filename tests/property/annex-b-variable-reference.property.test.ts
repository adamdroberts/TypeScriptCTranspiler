import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function source():string{
 const pieces=['var records=[];function check(value,label){if(!value)throw label;records.push(label+":true");}eval("0");'];
 const containers=[(body:string)=>`{${body}}`,(body:string)=>`if(true){${body}}`,(body:string)=>`switch(1){case 1:${body}}`,(body:string)=>`with(shadow){${body}}`];
 for(const [index,container] of containers.entries()){
  const name='globalAnnex'+index;
  pieces.push(`var ${name}='before';var shadow={${name}:'shadow'};${container(`{function ${name}(){return 'after';}}`)}check(${name}()==='after'&&shadow.${name}==='shadow','global-${index}');`);
 }
 const localSource='{function localAnnex(){return "local";}}';
 pieces.push(`function local(){var localAnnex='before';eval(${JSON.stringify(localSource)});return localAnnex();}check(local()==='local'&&!Object.hasOwn(globalThis,'localAnnex'),'function-variable-target');`);
 const shadowedSource='with({localWith:"shadow"}){{function localWith(){return "local";}}}';
 pieces.push(`function localWithSubject(){var localWith='before';eval(${JSON.stringify(shadowedSource)});return localWith();}check(localWithSubject()==='local'&&!Object.hasOwn(globalThis,'localWith'),'with-object-does-not-own-var');`);
 const suppressedSource='{function localLexical(){return "wrong";}}';
 pieces.push(`function suppressed(){let localLexical='kept';eval(${JSON.stringify(suppressedSource)});return localLexical;}check(suppressed()==='kept'&&!Object.hasOwn(globalThis,'localLexical'),'lexical-conflict-suppresses-insertion');`);
 const evalSource='{function evalDeletable(){return 7;}}';
 pieces.push(`(0,eval)(${JSON.stringify(evalSource)});check(evalDeletable()===7&&Object.getOwnPropertyDescriptor(globalThis,'evalDeletable').configurable&&delete globalThis.evalDeletable,'eval-deletability');`);
 const nested='{'.repeat(128)+'function deepAnnex(){return 19;}'+'}'.repeat(128);
 pieces.push(`function deep(){var deepAnnex='before';eval(${JSON.stringify(nested)});return deepAnnex();}check(deep()===19&&!Object.hasOwn(globalThis,'deepAnnex'),'deep-variable-target');console.log(records.join(${JSON.stringify('\n')}));`);
 return pieces.join('\n');
}

test('Annex B updates retain the actual variable environment across lexical and object scopes',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-annex-b-variable-reference-'));
 try{
  const program=source(),reference=join(root,'reference.js');await writeFile(reference,program);
  const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");vm.runInThisContext(fs.readFileSync(process.argv[1],"utf8"));',reference],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});expect(node.stdout.toString().trimEnd().split('\n').at(-1)).toBe('deep-variable-target:true');
  for(const noGc of [false,true]){
   const entry=join(root,'main.js'),output=join(root,'program-'+noGc),diagnostics:string[]=[];await writeFile(entry,program);
   const result=await compile({entry,output,buildDir:join(root,'build-'+noGc),noGc,isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'annex-b-variable-reference#script',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,code:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,code:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({noGc,code:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,code:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect({noGc,observation}).toMatchObject({observation:{kind:'normal'}});if(observation.kind==='normal')expect(observation.stdout).toBe(node.stdout.toString());
  }
 }finally{await rm(root,{recursive:true,force:true});}
},600_000);

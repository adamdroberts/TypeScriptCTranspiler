import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ts from 'typescript';
import {statementBodyCompletions} from '../../src/function-static-semantics';
import {compile} from '../../src/compile';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {parseHostObservation} from '../test262/protocol';

const bodies=[
 ';;','var hidden=0;','function hiddenFunction(){}','"17;";"19;";',
 '"17;";{}','"17;";if(false){"19;";}','"17;";while(false){"19;";}',
 'do{"23;";}while(false);','while(true){"29;";break;}',
 'label:{"31;";break label;"unreachable source";}',
 'switch(0){case 0:"37;";break;default:"41;";}',
 'try{"43;";}finally{"47;";}','try{throw "53;";}catch(source){source;}',
 'try{"59;";}finally{throw "61;";}','"67;";with({}){}',
];
const records=(body:string)=>statementBodyCompletions(ts.createSourceFile('script.js',body,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS));
test('Script records retain UpdateEmpty, abrupt exits and ignored normal finally values',()=>{
 for(const [body,expected] of [[';;',['undefined']],['var hidden=0;',['undefined']],['"17;";"19;";',['"19;"']],['"17;";{}',['"17;"']],['"17;";if(false){"19;";}',['undefined']],['do{"23;";}while(false);',['"23;"']],['try{"43;";}catch(source){"47;";}',['"43;"']],['try{"43;";}finally{"47;";}',['"43;"']],['try{"59;";}finally{throw "61;";}',[]]] as const){
  const summary=records(body);expect({body,complete:summary.complete,values:summary.normalValues.map(value=>typeof value==='string'?value:value.getText())}).toEqual({body,complete:true,values:[...expected]});
 }
 for(const body of bodies)for(const invoke of ['eval(text)','(0,eval)(text)','$262.evalScript(text)']){
  const source=`const text=${JSON.stringify(body)};try{eval(${invoke});}catch(source){eval(source);}`;
  expect({body,invoke,error:finiteEvalScriptSourceGraph([{path:'main.js',source}]).error}).toEqual({body,invoke,error:null});
 }
 const unknown=finiteEvalScriptSourceGraph([{path:'main.js',source:'try{eval("throw opaque();");}catch(source){eval(source);}'}]);
 expect(unknown.error).toContain('direct eval source is not a finite static string expression');
});

test('Script completion closure and a deep statement tree match Node in both memory modes',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-script-completion-source-'));
 try{
  for(const noGc of [false,true])for(const typed of [false,true]){
   const parts=bodies.flatMap((body,index)=>['eval(text)','(0,eval)(text)','$262.evalScript(text)'].map((invoke,mode)=>`{const text=${JSON.stringify(body)};try{print("case${index}-${mode}:"+String(eval(${invoke})));}catch(source){print("throw${index}-${mode}:"+String(eval(source)));}}`));
   const depth=typed&&!noGc?256:1;
   const deep='{'.repeat(depth)+'"71;";'+ '}'.repeat(depth);
   parts.push(`print("deep:"+eval(eval(${JSON.stringify(deep)})));`);
   const source=parts.join('\n'),entry=join(directory,'source-'+noGc+'-'+typed+(typed?'.ts':'.js')),output=join(directory,'program-'+noGc+'-'+typed),diagnostics:string[]=[];
   const node=nodeReferenceSync(['node','-e','const vm=require("node:vm"),fs=require("node:fs");const context=vm.createContext({print:value=>fs.writeSync(1,String(value)+"\\n"),$262:{evalScript(text){return new vm.Script(String(text)).runInContext(context);}}});new vm.Script(fs.readFileSync(0,"utf8")).runInContext(context);'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});expect(finiteEvalScriptSourceGraph([{path:'main.js',source}]).error).toBeNull();
   await writeFile(entry,(typed?'// @ts-nocheck\n':'')+source);
   const result=await compile({entry,output,noGc,buildDir:join(directory,'build-'+noGc+'-'+typed),isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/script-completion-source#script',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,typed,code:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,typed,code:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString());
  }
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);

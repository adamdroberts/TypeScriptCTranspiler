import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';
import {compile} from '../../src/compile';import {parseHostObservation} from '../test262/protocol';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';

const wrap=(body:string)=>'{const run=()=>{let code="17;";'+body+'};run();print("switch-complete");}';
const original=wrap('switch(0){default:print(eval(code));break;case (code="19;",1):break;}');
const partitions=[
 {source:original,expected:'19\nswitch-complete\n'},
 {source:wrap('switch(0){case 0:print(eval(code));break;default:break;case (code="19;",1):break;}'),expected:'17\nswitch-complete\n'},
 {source:wrap('switch(1){default:print("unexpected");break;case (code="19;",1):print(eval(code));}'),expected:'19\nswitch-complete\n'},
 {source:wrap('switch(0){default:code="23;";case (code="19;",1):print(eval(code));}'),expected:'23\nswitch-complete\n'},
 {source:wrap('switch((code="19;",0)){default:print(eval(code));}'),expected:'19\nswitch-complete\n'},
 {source:wrap('const marker={};try{switch(0){default:throw "unexpected";case (()=>{code="19;";throw marker;})():break;}}catch(error){if(error!==marker)throw error;print(eval(code));}'),expected:'19\nswitch-complete\n'},
 {source:wrap('switch(0){default:print(Function("return "+code)());break;case (code="19;",1):break;}'),expected:'19\nswitch-complete\n'},
];
const unknown=wrap('switch(0){default:print(eval(code));break;case (code=external(),1):break;}');
function reference(source:string):string {
 const script='const fs=require("node:fs"),vm=require("node:vm");new vm.Script(\'function external(){return "19;";}\'+fs.readFileSync(0,"utf8")).runInNewContext({print:value=>{fs.writeSync(1,String(value)+"\\n");}});';
 const node=nodeReferenceSync(['node','-e',script],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});return node.stdout.toString();
}
function retained():string {
 const clauses=Array.from({length:512},(_,index)=>'case (code="31;",'+(index+1)+'):break;').join('\n');
 return wrap('switch(-1){default:COLLECT print(eval(code));break;'+clauses+'}');
}
test('switch selection precedes selected bodies while preserving matching, fallthrough and abrupt source effects',()=>{
 for(const item of partitions){expect(reference(item.source)).toBe(item.expected);const result=graph([{path:'subject.js',source:item.source}]);expect({source:item.source,error:result.error}).toEqual({source:item.source,error:null});if(item.source.includes('eval(code)'))expect(result.directEvalSources.map(value=>value.source)).toContain(item.expected.split('\n')[0]+';');}
 expect(reference(unknown)).toBe('19\nswitch-complete\n');expect(graph([{path:'subject.js',source:unknown}]).error).toContain('direct eval source is not a finite static string expression');
});
test('switch source regions execute the unchanged original and a retained clause List against complete Node in both memory modes',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-switch-source-order-'));
 try{for(const [index,item]of [...partitions,{source:retained(),expected:'31\nswitch-complete\n'}].entries()){
  const expected=reference(item.source.replace('COLLECT',''));expect(expected).toBe(item.expected);
  for(const noGc of [false,true]){const entry=join(directory,'subject-'+index+'.js'),output=join(directory,'program-'+index+'-'+noGc),diagnostics:string[]=[];await writeFile(entry,item.source.replace('COLLECT',noGc?'':'$262.gc();'));
   const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/switch-source#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(parseHostObservation(JSON.parse(native.stdout.toString()))).toMatchObject({kind:'normal',stdout:expected});
  }
 }}finally{await rm(directory,{recursive:true,force:true});}
},900000);

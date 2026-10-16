import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const wrap=(body:string)=>'{const evaluate=code=>{print(code);return eval(code);};'+body+'}';
function reference(source:string,setup='function external(){return "19;";}'):string{
 const code='const fs=require("node:fs"),vm=require("node:vm");new vm.Script('+JSON.stringify(setup)+'+fs.readFileSync(0,"utf8")).runInNewContext({print:v=>fs.writeSync(1,String(v)+"\\n")});';
 const node=nodeReferenceSync(['node','-e',code],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});return node.stdout.toString();
}
test('fresh scalar reads preserve source values before later writes and initializer commits',()=>{
 const cases=[
  {body:'const run=body=>{const saved=body;body=external();evaluate(saved);};run("17;");',expected:'17;\n'},
  ...['let','var'].map(kind=>({body:'const run=()=>{'+kind+' body="17;";const saved=body;body=external();evaluate(saved);};run();',expected:'17;\n'})),
  {body:'const run=message=>{if(message===undefined)message="";else message+=" ";evaluate(...["17;"]);};run();',expected:'17;\n'},
  {body:'const run=body=>{body=body+";";evaluate(body);};run("17");',expected:'17;\n'},
  {body:'const run=body=>{[body,body=body]=["17;",undefined];evaluate(body);};run("23;");',expected:'17;\n'},
  {body:'const run=body=>{({[body]:body=body}={});evaluate(body);};run("17;");',expected:'17;\n'},
  {body:'const run=()=>{let [a="17;",b=a]=[];evaluate(b);};run();',expected:'17;\n'},
  {body:'const run=()=>{evaluate(body);var body="17;";};run();',expected:'undefined\n'},
  {body:'const run=body=>{const saved=body;body++;evaluate(saved);};run("17;");',expected:'17;\n'},
 ];
 for(const item of cases){const source=wrap(item.body);expect(reference(source)).toBe(item.expected);const result=graph([{path:'subject.js',source}]);expect({source,error:result.error}).toEqual({source,error:null});const sources=new Set(result.directEvalSources.map(value=>value.source));for(const value of item.expected.trimEnd().split('\n'))if(value!=='undefined')expect({source,sources:[...sources]}).toMatchObject({sources:expect.arrayContaining([value])});}
});
test('loop revisits, persistent bindings, heap aliases and captured writers retain unknown source alternatives',()=>{
 const cases=[
  {body:'const run=()=>{let body="17;";for(let i=0;i<2;i++){evaluate(body);body=external();}};run();',expected:'17;\n19;\n'},
  {body:'let body="17;";const run=()=>{const saved=body;body=external();evaluate(saved);};run();run();',expected:'17;\n19;\n'},
  {body:'const owner={body:"17;"};const run=owner=>{const saved=owner.body;owner.body=external();evaluate(saved);};run(owner);run(owner);',expected:'17;\n19;\n'},
  {body:'let previous;const run=function(body){if(!previous){previous=arguments;return;}const saved=previous[0];previous[0]=external();evaluate(saved);};run("17;");run("23;");run("29;");',expected:'17;\n19;\n'},
  {body:'const run=function(body){arguments[0]=external();evaluate(body);};run("17;");',expected:'19;\n'},
  {body:'const run=body=>{const write=()=>{body=external();};write();evaluate(body);};run("17;");',expected:'19;\n'},
  {body:'const make=body=>({write(){body=external();},read(){evaluate(body);}});const owner=make("17;");owner.write();owner.read();',expected:'19;\n'},
 ];
 for(const item of cases){const source=wrap(item.body);expect(reference(source)).toBe(item.expected);expect({source,error:graph([{path:'subject.js',source}]).error}).toEqual({source,error:expect.stringContaining('direct eval source is not a finite static string expression')});}
});
function retainedSource():string{
 const aliases=Array.from({length:512},(_,index)=>'let value'+(index+1)+'=value'+index+';').join('\n');
 return wrap('const run=function(body,message){if(message===undefined)message="";else message+=" ";let value0=body;'+aliases+'const saved=value512;body=String(Math.random())+";";["b","a"].sort();COLLECT evaluate(saved);print("local-snapshot-complete");};run("31;");');
}
test('one retained local source graph matches complete independent Node and native output',async()=>{
 const source=retainedSource(),expected=reference(source.replace('COLLECT',''));expect(expected).toBe('31;\nlocal-snapshot-complete\n');const directory=await mkdtemp(join(tmpdir(),'tsc2c-local-binding-snapshot-'));
 try{for(const noGc of [false,true]){
  const entry=join(directory,'subject.js'),output=join(directory,'program-'+noGc),diagnostics:string[]=[];await writeFile(entry,source.replace('COLLECT',noGc?'':'$262.gc();'));
  const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/local-binding-snapshot.js#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(parseHostObservation(JSON.parse(native.stdout.toString()))).toMatchObject({kind:'normal',stdout:expected});
 }}finally{await rm(directory,{recursive:true,force:true});}
},900000);

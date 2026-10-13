import {expect,test} from "bun:test";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {compile} from "../../src/compile";
import {finiteEvalScriptSourceGraph as graph} from "../test262/native-host";
import {parseHostObservation} from "../test262/protocol";

const records=[
 '{name:"",message:"17;"}', '{name:"19;",message:""}',
 '{name:undefined,message:"23;"}', '{name:"label",message:"29;"}',
 '{name:"",message:31}', '{name:"",message:null}',
];
const routes=['Error.prototype.toString.call(value)','Error.prototype.toString.bind(value)()','Reflect.apply(Error.prototype.toString,value,[])'];
test("native Error formatting retains root Types, ordering and genuine callbacks",()=>{
 for(const record of records)for(const route of routes){
  const source=`const value=${record};eval(${route});`,result=graph([{path:"main.js",source}]);
  expect({source,error:result.error}).toEqual({source,error:null});
  const node=Bun.spawnSync(['node','-e','process.stdout.write(JSON.stringify(Error.prototype.toString.call(eval("("+process.argv[1]+")"))));','--',record],{stdout:"pipe",stderr:"pipe"});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:""});
  expect(result.directEvalSources.map(entry=>entry.source)).toEqual([JSON.parse(node.stdout.toString())]);
 }
 const pure='let body="37;";try{null.value;}catch(error){String(error);}eval(body);';expect(graph([{path:"main.js",source:pure}]).error).toBeNull();
 const abrupt='let body="41;";const value={name:Symbol.iterator,get message(){body=opaque();return "";}};try{Error.prototype.toString.call(value);}catch(error){}eval(body);';expect(graph([{path:"main.js",source:abrupt}]).error).toBeNull();
 for(const source of [
  'let body="43;";Error.prototype.toString=function(){body=opaque();return "";};try{null.value;}catch(error){String(error);}eval(body);',
  'let body="47;";Object.defineProperty(Error.prototype,"name",{get(){body=opaque();return "";}});try{null.value;}catch(error){String(error);}eval(body);',
  'let body="53;";try{throw {toString(){body=opaque();return "";}};}catch(error){String(error);}eval(body);',
  'try{throw Object(0);}catch(error){eval(String(error));}',
  'eval(Error.prototype.toString.call({get name(){return opaque();},message:""}));',
  'eval(Error.prototype.toString.call({name:"",get message(){return opaque();}}));',
 ])expect({source,error:graph([{path:"main.js",source}]).error}).toMatchObject({error:expect.stringContaining("direct eval source is not a finite static string expression")});
});
function subject(depth:number):string {
 return records.map((record,index)=>`{const value=${record};print("record${index}:"+eval(Error.prototype.toString.call(value)));}`).join('\n')+`\n
 {let trace="";const value={get name(){trace+="name,";return {toString(){trace+="nameText,";return "";}};},get message(){trace+="message,";return {toString(){trace+="messageText";return "61;";}};}};print("order:"+eval(Error.prototype.toString.call(value))+":"+trace);}
 {let reads=0;const value={name:Symbol.iterator,get message(){reads++;return "";}};try{Error.prototype.toString.call(value);}catch(error){print("symbol:"+(error instanceof TypeError)+":"+reads);}}
 {try{Error.prototype.toString.call(null);}catch(error){print("receiver:"+(error instanceof TypeError));}}
 {let body="67;";try{null.value;}catch(error){String(error);}print("native:"+eval(body));}
 {function check(value){print("setter:"+value);}const owner={set value(input){throw input;}};try{owner.value="71;";}catch(error){check(eval(error));}}
 {const saved=Error.prototype.toString;Error.prototype.toString=function(){return "79;";};try{null.value;}catch(error){print("override:"+String(error));}Error.prototype.toString=saved;}
 {const p0={name:"",message:"73;"};${Array.from({length:depth},(_,index)=>`const p${index+1}={__proto__:p${index}};`).join('\n')}print("deep:"+eval(Error.prototype.toString.call(p${depth})));}
 `;
}
test("Error formatting and one deep property graph match Node through native source closure",async()=>{
 const directory=await mkdtemp(join(tmpdir(),"tsc2c-native-error-source-"));
 try{for(const typed of [false,true])for(const noGc of [false,true]){
  const source=subject(typed&&!noGc?256:1);expect(graph([{path:"main.js",source}]).error).toBeNull();
  const node=Bun.spawnSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});'],{stdin:Buffer.from(source),stdout:"pipe",stderr:"pipe",timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:""});
  const entry=join(directory,"main-"+typed+"-"+noGc+(typed?'.ts':'.js')),output=join(directory,"program-"+typed+"-"+noGc),diagnostics:string[]=[];await writeFile(entry,(typed?'// @ts-nocheck\n':'')+source);
  const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:"test262-native-observation",scenarioId:"property/native-error-source#script",setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({code:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({code:0,diagnostics:""});
  const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:""});const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString());
 }}finally{await rm(directory,{recursive:true,force:true});}
},600000);

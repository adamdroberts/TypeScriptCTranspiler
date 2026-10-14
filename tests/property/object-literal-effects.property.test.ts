import {expect,test} from "bun:test";
import ts from "typescript";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {compile} from "../../src/compile";

import {objectLiteralEffectInput} from "../e2e/generated-cases";
const marker="__unused_object_body__";
const partitionSource=String.raw`export {};
function effect(value:string):string{console.log(value);return value;}
function fail():never{throw "marker";}
const pure={method(){return "__unused_object_body__"},get value(){return "__unused_object_body__"},set value(input:string){console.log("__unused_object_body__",input)}};
const nested={...{value:{get unused(){return "__unused_object_body__"}}}};
const key={[effect("key")](){return "retained_key_body"}};
const coercion={[{toString(){return effect("coercion")}} as any]:17};
const data={value:effect("data"),method(){return "retained_data_body"}};
const spread={...{get value(){return effect("spread")}},method(){return "retained_spread_body"}};
const source={value:"before"};
Object.defineProperty(source,"value",{get(){return effect("alias")},enumerable:true});
const alias={...source};
const setter={...{set value(input:string){effect(input)}}};
console.log(Object.keys(setter).join(","),setter.value===undefined);
try{const abrupt={first:effect("before abrupt"),value:fail(),after:effect("unreached")};}catch(error){console.log(error==="marker");}
function inspect(value:any){console.log(value.read());}
const escaped={read(){return effect("escape")}};inspect(escaped);
console.log("done");`;

test("object construction and enumerable reads preserve effects, abrupt order and escaped bodies",async()=>{
 const directory=await mkdtemp(join(tmpdir(),"tsc2c-object-evaluation-"));
 try{for(const noGc of [false,true])for(const plan of [{name:"partitions",source:partitionSource},{name:"property-tree",source:objectLiteralEffectInput(noGc?3:512)}]){
  const entry=join(directory,plan.name+"-"+noGc+".mts"),reference=entry+".mjs",output=entry+"-program";
  await writeFile(entry,plan.source);await writeFile(reference,ts.transpileModule(plan.source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText);
  const node=Bun.spawnSync(["node",reference],{stdout:"pipe",stderr:"pipe",timeout:120000});
  expect({exit:node.exitCode,stderr:node.stderr.toString()}).toEqual({exit:0,stderr:""});
  const diagnostics:string[]=[],result=await compile({entry,output,buildDir:output+"-build",noGc,diagnosticWriter:message=>diagnostics.push(message)});
  expect({exit:result.exitCode,diagnostics}).toEqual({exit:0,diagnostics:[]});
  expect(result.mainC.includes(marker)).toBe(false);
  const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120000});
  expect({exit:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({exit:0,stderr:"",stdout:node.stdout.toString()});
 }}finally{await rm(directory,{recursive:true,force:true});}
},900000);

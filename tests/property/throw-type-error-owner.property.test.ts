import { expect, test } from "bun:test";
import ts from "typescript";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const source = `// @ts-nocheck
function check(value,label){if(!value)throw new Error(label);}
function strictArgs(){"use strict";return arguments;}
function nonSimple(value=17){return arguments;}
function simple(value){return arguments;}
const descriptor=Object.getOwnPropertyDescriptor(strictArgs(),"callee"),thrower=descriptor.get;
check(thrower===descriptor.set&&!descriptor.enumerable&&!descriptor.configurable,"callee-descriptor");
check(Object.getOwnPropertyDescriptor(strictArgs(),"callee").get===thrower,"same-realm");
check(Object.getOwnPropertyDescriptor(nonSimple(),"callee").get===thrower&&Object.getOwnPropertyDescriptor(nonSimple(),"callee").set===thrower,"non-simple");
check(simple(17).callee===simple,"mapped-callee");
check(typeof thrower==="function"&&thrower.name===""&&thrower.length===0&&Object.getPrototypeOf(thrower)===Function.prototype,"metadata");
for(const name of ["name","length"]){const d=Object.getOwnPropertyDescriptor(thrower,name);check(!d.writable&&!d.enumerable&&!d.configurable,"immutable-metadata");}
check(!Object.isExtensible(thrower)&&Object.isFrozen(thrower)&&Object.getOwnPropertyNames(thrower).join(":")==="length:name","frozen");
check(!Reflect.defineProperty(thrower,"extra",{value:17})&&!Reflect.deleteProperty(thrower,"name"),"rejected-mutation");
let caught;try{thrower.call({marker:17},1,2);}catch(error){caught=error;}check(caught instanceof TypeError,"call-type-error");
try{new thrower();}catch(error){caught=error;}check(caught instanceof TypeError,"not-constructor");
if(NATIVE_IDENTITY){for(const name of ["caller","arguments"]){const d=Object.getOwnPropertyDescriptor(Function.prototype,name);check(d.get===thrower&&d.set===thrower&&!d.enumerable&&d.configurable,"prototype-poison-identity");}}
const foreign=$262.createRealm().global;
const foreignArgs=foreign.Function('"use strict";return arguments;');
const foreignThrower=Object.getOwnPropertyDescriptor(foreignArgs(),"callee").get;
check(foreignThrower!==thrower&&Object.getPrototypeOf(foreignThrower)===foreign.Function.prototype&&Object.isFrozen(foreignThrower),"foreign-owner");
try{foreignThrower();}catch(error){caught=error;}check(caught instanceof foreign.TypeError&&!(caught instanceof TypeError),"foreign-error");
const owners=[thrower,foreignThrower];let tree=null;
for(let index=0;index<512;index++)tree={owner:owners[index%owners.length],previous:tree};
if(NATIVE_GC)$262.gc();let cursor=tree,expected=511;
while(cursor){check(cursor.owner===owners[expected%owners.length]&&Object.isFrozen(cursor.owner),"retained-poison-owner");cursor=cursor.previous;expected--;}
check(expected===-1,"worklist-complete");print("throw-type-error-owner-ok");`;

test("restricted accessors share one immutable ThrowTypeError owner per Realm", async () => {
 const root=await mkdtemp(join(tmpdir(),"tsc2c-throw-type-error-owner-"));
 try{
  const erased=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext}}).outputText;
  const oracle=join(root,"reference.js"),stdout=oracle+".stdout";await writeFile(oracle,erased.replaceAll("NATIVE_IDENTITY","false").replaceAll("NATIVE_GC","false"));
  const reference=Bun.spawnSync(["node","-e",'const fs=require("node:fs"),vm=require("node:vm");const context=vm.createContext({print:value=>fs.writeSync(1,String(value)+"\\n"),$262:{createRealm(){return{global:vm.runInNewContext("globalThis")}}}});new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInContext(context);',oracle],{stdout:Bun.file(stdout),stderr:"pipe",timeout:120000});
  expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:""});const expected=await readFile(stdout,"utf8");expect(expected).toBe("throw-type-error-owner-ok\n");
  for(const typed of [true,false])for(const noGc of [false,true]){
   const entry=join(root,`subject-${typed}-${noGc}.${typed?"ts":"js"}`),output=entry+"-native";await writeFile(entry,(typed?source:erased).replaceAll("NATIVE_IDENTITY","true").replaceAll("NATIVE_GC",String(!noGc)));const diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,buildDir:output+"-build",initializationEntries:[entry],test262Observation:{kind:"test262-native-observation",scenarioId:"property/throw-type-error-owner.js#sloppy",setupEntries:[],testEntry:entry,async:false},diagnosticWriter:m=>diagnostics.push(m)});
   expect({code:result.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:""});const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe("normal");expect(observation.stdout).toBe(expected);
  }
 }finally{await rm(root,{recursive:true,force:true});}
},600000);

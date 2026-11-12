import {expect,test} from "bun:test";
import ts from "typescript";
import {createEcmaSourceFile} from "../../src/ecmascript-source";
import {earlyControlFlowStaticSemanticsFailure} from "../../src/control-static-semantics";
import {nodeReferenceSync} from "./node-reference";

// Node 26 parses every source as a Script; Bun's vm.Script accepts
// `try{}catch(x){let x;}`, which ECMAScript (and Bun's own Function
// constructor) rejects.
function nodeAccepts(sources:readonly string[]):boolean[]{
 const reference=nodeReferenceSync(["node","-e",'const vm=require("node:vm");process.stdout.write(JSON.stringify(JSON.parse(process.argv[1]).map(source=>{try{new vm.Script(source);return true}catch(error){if(error instanceof SyntaxError)return false;throw error}})))',JSON.stringify(sources)],{stdout:"pipe",stderr:"pipe",timeout:60_000});
 expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:""});
 return JSON.parse(reference.stdout.toString());
}
function compilerAccepts(source:string):boolean{return earlyControlFlowStaticSemanticsFailure(createEcmaSourceFile("source.js",source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,"script"))===null;}
test("one binding tree and declaration-owner worklist validate catch names independently of shape",()=>{
 const parameters=["x","[x]","{value:x}","[{value:x}]"];
 const bodies=["let x;","const x=0;","function x(){}","class x{}","{let x;}","var x;","if(true){var x;}","for(var x of []){}","function inner(){var x;}","class Inner{static{var x;}}","let other;","try{}catch(other){var x;}"];
 const sources:string[]=[];
 for(const strict of [false,true])for(const parameter of parameters)for(const body of bodies)sources.push((strict?'"use strict";':'')+`try{}catch(${parameter}){${body}}`);
 let state=0x93cb41;
 for(let sample=0;sample<24;sample++){
  state=(Math.imul(state,1664525)+1013904223)>>>0;let pattern=sample%2?"[x,x]":"[x,y]";
  for(let depth=0;depth<(state%17);depth++)pattern=state&(1<<(depth%31))?`{p:${pattern}}`:`[${pattern}]`;
  sources.push(`try{}catch(${pattern}){}`);
 }
 for(const strict of [false,true])for(const name of ["eval","arguments"])sources.push((strict?'"use strict";':'')+`try{}catch(${name}){}`);
 const deep=`try{}catch(${"[".repeat(256)+"[x,x]"+"]".repeat(256)}){}`;sources.push(deep);
 const expected=nodeAccepts(sources);
 expect(sources.map(source=>({source,accepted:compilerAccepts(source)}))).toEqual(sources.map((source,index)=>({source,accepted:expected[index]})));
 expect(compilerAccepts(deep)).toBe(false);
});

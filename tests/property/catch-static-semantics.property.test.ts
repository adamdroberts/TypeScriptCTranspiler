import {expect,test} from "bun:test";
import vm from "node:vm";import ts from "typescript";
import {createEcmaSourceFile} from "../../src/ecmascript-source";
import {earlyControlFlowStaticSemanticsFailure} from "../../src/control-static-semantics";

function nativeAccepts(source:string):boolean{try{new vm.Script(source);return true;}catch(error){if(error instanceof SyntaxError)return false;throw error;}}
function compilerAccepts(source:string):boolean{return earlyControlFlowStaticSemanticsFailure(createEcmaSourceFile("source.js",source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,"script"))===null;}
test("one binding tree and declaration-owner worklist validate catch names independently of shape",()=>{
 const parameters=["x","[x]","{value:x}","[{value:x}]"];
 const bodies=["let x;","const x=0;","function x(){}","class x{}","{let x;}","var x;","if(true){var x;}","for(var x of []){}","function inner(){var x;}","class Inner{static{var x;}}","let other;","try{}catch(other){var x;}"];
 for(const strict of [false,true])for(const parameter of parameters)for(const body of bodies){
  const source=(strict?'"use strict";':'')+`try{}catch(${parameter}){${body}}`;expect({source,accepted:compilerAccepts(source)}).toEqual({source,accepted:nativeAccepts(source)});
 }
 let state=0x93cb41;
 for(let sample=0;sample<24;sample++){
  state=(Math.imul(state,1664525)+1013904223)>>>0;let pattern=sample%2?"[x,x]":"[x,y]";
  for(let depth=0;depth<(state%17);depth++)pattern=state&(1<<(depth%31))?`{p:${pattern}}`:`[${pattern}]`;
  const source=`try{}catch(${pattern}){}`;expect(compilerAccepts(source)).toBe(nativeAccepts(source));
 }
 for(const strict of [false,true])for(const name of ["eval","arguments"]){const source=(strict?'"use strict";':'')+`try{}catch(${name}){}`;expect(compilerAccepts(source)).toBe(nativeAccepts(source));}
 const deep="[".repeat(256)+"[x,x]"+"]".repeat(256);expect(compilerAccepts(`try{}catch(${deep}){}`)).toBe(false);expect(nativeAccepts(`try{}catch(${deep}){}`)).toBe(false);
});

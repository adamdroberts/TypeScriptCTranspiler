import {expect,test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import ts from "typescript";
import {compile} from "../../src/compile";
import {sourceEvaluationInvocations} from "../../src/source-value-flow";

function program(source:string):ts.Program {
 const name="source.js",options={allowJs:true,noLib:true,target:ts.ScriptTarget.ESNext};
 const host=ts.createCompilerHost(options);host.getSourceFile=file=>file===name?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>file===name?source:undefined;host.fileExists=file=>file===name;return ts.createProgram([name],options,host);
}
async function withBudget<T>(steps:string|undefined,run:()=>T|Promise<T>):Promise<T> {
 const previous=process.env.TSC2C_SOURCE_ANALYSIS_BUDGET;
 if(steps===undefined)delete process.env.TSC2C_SOURCE_ANALYSIS_BUDGET;else process.env.TSC2C_SOURCE_ANALYSIS_BUDGET=steps;
 try{return await run();}finally{if(previous===undefined)delete process.env.TSC2C_SOURCE_ANALYSIS_BUDGET;else process.env.TSC2C_SOURCE_ANALYSIS_BUDGET=previous;}
}
const source="var pick=function(flag){return flag?'1+1':'2+2';};console.log(eval(pick(true)),(0,eval)(pick(false)));\n";

// An exhausted analysis never reports a finite or empty source set: sites it
// discovered are unproven (choices null) and sites it never reached are absent.
test("an exhausted source analysis reports no proven eval source",async()=>{
 const proven=await withBudget(undefined,()=>sourceEvaluationInvocations(program(source)));
 expect(proven.map(invocation=>invocation.choices)).toEqual([["1+1","2+2"],["1+1","2+2"]]);
 for(const steps of ["1","4","16"]){
  const bounded=await withBudget(steps,()=>sourceEvaluationInvocations(program(source)));
  for(const invocation of bounded)expect({steps,choices:invocation.choices}).toEqual({steps,choices:null});
 }
});

// The compiler then fails closed on the unproven eval call instead of
// emitting a program whose dynamic code was never admitted.
test("an exhausted source analysis makes the compiler reject unproven eval",async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-analysis-budget-"));
 try{
  const entry=path.join(root,"main.js");await fs.writeFile(entry,source);
  await fs.writeFile(path.join(root,"package.json"),'{"type":"commonjs"}\n');
  const diagnostics:string[]=[];
  const result=await withBudget("4",()=>compile({entry,output:path.join(root,"main"),emitCOnly:true,buildDir:path.join(root,"build"),diagnosticWriter:message=>diagnostics.push(message)}));
  expect(result.exitCode).not.toBe(0);
  expect(diagnostics.join("")).toContain("unknown eval() source requires --runtime-code-manifest");
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

test("the source analysis budget rejects malformed overrides",async()=>{
 for(const value of ["0","-1","1e6","abc"," 5"])
  await expect(withBudget(value,()=>sourceEvaluationInvocations(program("eval('1');")))).rejects.toThrow(/TSC2C_SOURCE_ANALYSIS_BUDGET/);
});

import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {compile} from '../../src/compile';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {pendingComputedKeyInput} from '../e2e/generated-cases';

function solution(source:string,generated?:string){
 const files=new Map([['source.js',source],...(generated===undefined?[]:[['generated.js',generated] as const])]);
 const options={allowJs:true,noLib:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);
 host.getSourceFile=file=>files.has(file)?ts.createSourceFile(file,files.get(file)!,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>files.get(file);host.fileExists=file=>files.has(file);
 const program=ts.createProgram([...files.keys()],options,host);
 return sourceEvaluationInvocations(program,{evaluations:generated===undefined?[]:[{source:"'selected'",entry:'generated.js'}]});
}
test('pending computed-key dependencies preserve earlier finite sources and close only after generated eval',()=>{
 for(const key of ['key','(key)','true?key:"other"','String(key)']){
  const source=`const object={selected:'17;',other:'19;'};console.log(eval(object.selected));const key=eval("'selected'");console.log(eval(object[${key}]));`;
  const pending=solution(source);
  expect(pending.find(call=>call.node.getText()==='eval(object.selected)')?.choices).toEqual(['17;']);
  expect(pending.at(-1)?.choices).toBeNull();
  expect(solution(source,"'selected'").at(-1)?.choices).toContain('17;');
 }
 const opaque=`const object={selected:'17;'};const key=eval("'selected'");eval(object[external?key:opaque]);`;
 expect(solution(opaque,"'selected'").at(-1)?.choices).toBeNull();
 const abrupt=`const object={selected:'17;'};const key=eval('function () { [native code] }');eval(object[key]);`;
 const options={allowJs:true,noLib:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);
 host.getSourceFile=file=>file==='source.js'?ts.createSourceFile(file,abrupt,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.fileExists=file=>file==='source.js';host.readFile=file=>file==='source.js'?abrupt:undefined;
 expect(sourceEvaluationInvocations(ts.createProgram(['source.js'],options,host),{evaluations:[{source:'function () { [native code] }',entry:null}]}).at(-1)?.choices).toEqual([]);
});

test('pending computed-key source closure agrees with Node across typed and erased native inputs',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-pending-key-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const source=pendingComputedKeyInput(typed&&!noGc?512:3),program=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}.js`);await writeFile(oracle,program);
  const node=Bun.spawnSync(['node',oracle],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?source:program);
  const result=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:node.stdout.toString()});
 }
 const entry=join(root,'unknown.ts');await writeFile(entry,"const owner:any={selected:'17;'};const key:any=eval(opaque());eval(owner[key]);declare function opaque():string;");
 const diagnostics:string[]=[],result=await compile({entry,output:entry+'-native',emitCOnly:true,diagnosticWriter:message=>diagnostics.push(message)});
 expect(result.exitCode).toBe(3);expect(diagnostics.join('')).toContain('unknown eval() source requires --runtime-code-manifest allow-list or gated --unsafe-eval embedded Node bridge');
 }finally{await rm(root,{recursive:true,force:true})}
},900000);

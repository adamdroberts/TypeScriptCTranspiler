import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {buildProgram,resolvePackageRoot} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {lexicalSourceCaptureInput,lexicalSourceCaptureFiles} from '../e2e/generated-cases';

async function choices(entry:string,source:string){
 await writeFile(entry,source);
 const built=buildProgram({entry,packageRoot:resolvePackageRoot()});
 return sourceEvaluationInvocations(built.program,{roots:[entry]}).filter(call=>call.operation==='eval').map(call=>call.choices);
}
test('lexical captures retain earlier origins and reject prior, later-read and repeated opaque values',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-lexical-capture-facts-'));
 try{for(const declaration of ['let','var'])for(const projection of ['body','String(body)','`${body}`']){
  const read=`const saved=${projection};`,effect="body=opaque();";
  expect(await choices(join(root,'before.ts'),`${declaration} body:any='17;';${read}${effect}eval(saved);declare function opaque():any;`)).toEqual([['17;']]);
  expect(await choices(join(root,'after.ts'),`${declaration} body:any='17;';${effect}${read}eval(saved);declare function opaque():any;`)).toEqual([null]);
 }
 for(const source of [
  "let body:any='19;';const read=()=>body;body=opaque();eval(read());declare function opaque():any;",
  "let body:any='23;';for(let index=0;index<2;index++){const saved=body;body=opaque();eval(saved)}declare function opaque():any;",
  "let body:any='29;';function read(){const saved=body;body=opaque();return eval(saved)}read();declare function opaque():any;",
 ])expect(await choices(join(root,'dynamic.ts'),source)).toEqual([null]);
 for(const projection of ['saved','String(saved)','`${saved}`']){
  expect(await choices(join(root,'composed.ts'),`let body:any='37;';const saved=body;body=opaque();const later=${projection};eval(later);declare function opaque():any;`)).toEqual(projection==='String(saved)'?[null]:[['37;']]);
 }
 const publicString="let body='37;';const saved=body;body=opaque();const later=String(saved);print(eval(later));";
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(\'function opaque(){String=()=>"41;";return "43;";}\'+fs.readFileSync(0,"utf8")).runInNewContext({print:v=>fs.writeSync(1,String(v)+"\\n")});'],{stdin:Buffer.from(publicString),stdout:'pipe',stderr:'pipe',timeout:30000});expect({code:node.exitCode,stderr:node.stderr.toString(),stdout:node.stdout.toString()}).toEqual({code:0,stderr:'',stdout:'41\n'});
 expect(await choices(join(root,'captured-string.ts'),"const convert=String;let body:any='37;';const saved=body;body=opaque();const later=convert(saved);eval(later);declare function opaque():any;")).toEqual([['37;']]);
 const getter="let body:any='31;';const owner={get value(){body=opaque();return 1}};owner.value;eval(body);declare function opaque():any;";
 expect(await choices(join(root,'getter.ts'),getter)).toEqual([null]);
 }finally{await rm(root,{recursive:true,force:true})}
});

test('lexical source origin graph agrees with independent Node across typed and erased native inputs',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-lexical-capture-native-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const source=lexicalSourceCaptureInput(typed&&!noGc?512:3),program=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  for(const[file,contents]of Object.entries(lexicalSourceCaptureFiles))await writeFile(join(root,file),contents);
  const oracle=join(root,`oracle-${typed}-${noGc}.js`);await writeFile(oracle,program);
  const node=nodeReferenceSync(['node',oracle],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?source:program);
  const result=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:message=>diagnostics.push(message)});expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:node.stdout.toString()});
 }
 }finally{await rm(root,{recursive:true,force:true})}
},900000);

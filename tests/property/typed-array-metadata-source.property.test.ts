import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {runtimeTypedArrayDescriptors} from '../../src/global-bindings';
import {sourceConstructorInvocations} from '../../src/source-value-flow';
import {typedArrayMetadataInput} from '../e2e/generated-cases';
import {parseHostObservation} from '../test262/protocol';

function facts(source:string){
 const options:ts.CompilerOptions={noLib:true,allowJs:true,noEmit:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);
 host.getSourceFile=file=>file==='/model.js'?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>file==='/model.js'?source:undefined;host.fileExists=file=>file==='/model.js';
 return sourceConstructorInvocations(ts.createProgram(['/model.js'],options,host),{roots:['/model.js']});
}

test('TypedArray metadata source owners project native widths and preserve property effects',()=>{
 for(const [name,{width}]of runtimeTypedArrayDescriptors)for(const member of ['BYTES_PER_ELEMENT','prototype.BYTES_PER_ELEMENT']){
  expect({name,member,facts:facts(`const selected=${name};Function('return '+selected.${member}+';');`)}).toEqual({name,member,facts:[{kind:'ordinary',choices:[[`return ${width};`]]}]});
 }
 expect(facts("const captured=Int32Array;Int32Array={BYTES_PER_ELEMENT:17};Function('return '+captured.BYTES_PER_ELEMENT+';');Function('return '+Int32Array.BYTES_PER_ELEMENT+';');")).toEqual([{kind:'ordinary',choices:[['return 4;','return 17;']]},{kind:'ordinary',choices:[['return 4;','return 17;']]}]);
 expect(facts("const owner={get BYTES_PER_ELEMENT(){return 19}};Function('return '+owner.BYTES_PER_ELEMENT+';');")).toEqual([{kind:'ordinary',choices:[['return 19;']]}]);
 for(const source of [
  "const owner={get BYTES_PER_ELEMENT(){return runtimeInput}};Function('return '+owner.BYTES_PER_ELEMENT+';');",
  "unknownCall();Function('return '+Int32Array.BYTES_PER_ELEMENT+';');",
  "const own=Int32Array;unknownCall();Function('return '+own.prototype.BYTES_PER_ELEMENT+';');",
 ])expect(facts(source).some(invocation=>invocation.choices===null)).toBe(true);
});

test('TypedArray metadata source owners match independent Node through native invocation',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-typed-array-metadata-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const input=typedArrayMetadataInput(typed&&!noGc?512:3)+[...runtimeTypedArrayDescriptors].map(([name,{width}])=>`{const ctor:any=${name};console.log('${name}:',ctor.BYTES_PER_ELEMENT===${width},ctor.prototype.BYTES_PER_ELEMENT===${width},Function('return '+ctor.BYTES_PER_ELEMENT+';')());}`).join('\n')+`\nconst original:any=Int32Array;let seen=0;const changed:any={get BYTES_PER_ELEMENT(){seen++;return 23}};const selected:any=changed;console.log('getter:',Function('return '+selected.BYTES_PER_ELEMENT+';')(),seen);console.log('captured:',original.BYTES_PER_ELEMENT);`,erased=ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}.js`),oracleOutput=oracle+'.stdout';await writeFile(oracle,erased);
  const node=Bun.spawnSync(['node',oracle],{stdout:Bun.file(oracleOutput),stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?input:erased);
  const result=await compile({entry,output,noGc,initializationEntries:[entry],buildDir:output+'-build',test262Observation:{kind:'test262-native-observation',scenarioId:'property/typed-array-metadata.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(await readFile(oracleOutput,'utf8'));
 }}finally{await rm(root,{recursive:true,force:true})}
},900000);

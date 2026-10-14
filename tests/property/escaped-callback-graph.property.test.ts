import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {sourceConstructorInvocations} from '../../src/source-value-flow';
import {escapedCallbackGraphInput} from '../e2e/generated-cases';
import {parseHostObservation} from '../test262/protocol';

function facts(source:string){
 const options:ts.CompilerOptions={noLib:true,allowJs:true,noEmit:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);
 host.getSourceFile=file=>file==='/model.js'?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>file==='/model.js'?source:undefined;host.fileExists=file=>file==='/model.js';
 return sourceConstructorInvocations(ts.createProgram(['/model.js'],options,host),{roots:['/model.js']});
}

test('escaped callback reachability follows represented data, prototypes, payloads and returned cycles',()=>{
 const start="function callback(body){Function(body)}callback('return 307;');";
 for(const escape of ["unknownCall({callback});","const record={next:null,callbacks:[callback]};record.next=record;unknownCall(record);","unknownCall({get callback(){return callback}});","const proto={callback};unknownCall(Object.create(proto));","unknownCall(()=>callback);","unknownCall({callback:new Proxy(callback,{})});","const retained={callback};retained.self=retained;unknownCall(()=>retained);","unknownCall(new Map([['callback',callback]]));","unknownCall(new Set([callback]));","unknownCall(Promise.resolve(callback));","unknownCall([callback].values());"])
  expect(facts(start+escape).some(value=>value.choices===null)).toBe(true);
 expect(facts("class Receiver{callback(body){Function(body)}}const receiver=new Receiver();receiver.callback('return 307;');unknownCall(receiver);").some(value=>value.choices===null)).toBe(true);
 expect(facts("let body='return 307;';unknownCall({get callback(){body=opaque();return undefined}});Function(body);").some(value=>value.choices===null)).toBe(true);
 expect(facts(start+"const untouched={callback};")).toEqual([{kind:'ordinary',choices:[['return 307;']]}]);
 expect(facts(start+"unknownCall([callback].keys());")).toEqual([{kind:'ordinary',choices:[['return 307;']]}]);
});

test('escaped cyclic callback data uses explicit source closure and matches Node natively',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-escaped-callback-graph-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const input=escapedCallbackGraphInput(typed&&!noGc?512:3)+`
{function callback(body:any):void{console.log('iterator callback:',Function(body)())}callback('return 307;');const iterator:any=[callback].values();const methods:any={call(value:any){value.next().value('return 311;')}};const match:any=/.*/.exec('call');const selected:any=methods[match[0]];selected(iterator);}
`,erased=ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}.js`),oracleOutput=oracle+'.stdout';await writeFile(oracle,erased);
  const node=Bun.spawnSync(['node',oracle],{stdout:Bun.file(oracleOutput),stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',manifest=entry+'.manifest.json',diagnostics:string[]=[];await writeFile(entry,typed?input:erased);await writeFile(manifest,JSON.stringify({functions:['return 307;','return 311;']}));
  const result=await compile({entry,output,noGc,runtimeCodeManifest:manifest,initializationEntries:[entry],buildDir:output+'-build',test262Observation:{kind:'test262-native-observation',scenarioId:'property/escaped-callback-graph.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(await readFile(oracleOutput,'utf8'));
 }}finally{await rm(root,{recursive:true,force:true})}
},900000);

test('unadmitted callback source fails closed at the existing AOT Function boundary',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-escaped-callback-closed-'));
 try{
  const entry=join(root,'main.ts'),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,escapedCallbackGraphInput(3));
  const result=await compile({entry,output,noGc:true,initializationEntries:[entry],buildDir:output+'-build',test262Observation:{kind:'test262-native-observation',scenarioId:'property/escaped-callback-closed.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({code:result.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect(native.exitCode).toBe(0);
  expect(parseHostObservation(JSON.parse(native.stdout.toString()))).toMatchObject({kind:'throw',phase:'runtime',errorConstructor:'EvalError'});
 }finally{await rm(root,{recursive:true,force:true})}
},300000);

import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {sourceConstructorInvocations} from '../../src/source-value-flow';
import {escapedCallbackGraphInput} from '../e2e/generated-cases';
import {parseHostObservation} from '../test262/protocol';
import {nodeReferenceSync} from './node-reference';

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
 const publicKeys=start+"unknownCall([callback].keys());",privateKeys='"use strict";{'+publicKeys+'}';
 const setup='const NativeFunction=Function;globalThis.Function=new Proxy(NativeFunction,{apply(target,receiver,args){record(args[0]);return Reflect.apply(target,receiver,args);}});function unknownCall(iterator){for(const key of iterator){if(typeof key!=="number")throw "non-key";}if(typeof callback==="function")callback("return 311;");}';
 for(const [source,expected]of [[publicKeys,'return 307;\nreturn 311;\n'],[privateKeys,'return 307;\n']] as const){
  const code='const fs=require("node:fs"),vm=require("node:vm");const context=vm.createContext({record:v=>fs.writeSync(1,String(v)+"\\n")});new vm.Script('+JSON.stringify(setup)+').runInContext(context);new vm.Script(fs.readFileSync(0,"utf8")).runInContext(context);';
  const node=nodeReferenceSync(['node','-e',code],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});expect({code:node.exitCode,stderr:node.stderr.toString(),stdout:node.stdout.toString()}).toEqual({code:0,stderr:'',stdout:expected});
 }
 expect(facts(publicKeys)).toEqual([{kind:'ordinary',choices:null}]);
 expect(facts(privateKeys)).toEqual([{kind:'ordinary',choices:[['return 307;']]}]);
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

test('known callback sources execute without a manifest while unregistered runtime text fails closed',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-escaped-callback-closed-'));
 try{for(const dynamic of [false,true]){
  const original=escapedCallbackGraphInput(3),input=dynamic?original.replace("'return 311;'","'return '+String(Math.random())+';'"):original;
  if(dynamic)expect(input).not.toBe(original);
  const erased=ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const node=nodeReferenceSync(['node','-e',erased],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});const expected=node.stdout.toString();
  if(dynamic){const lines=expected.trimEnd().split('\n');expect(lines).toHaveLength(2);expect(lines[0]).toBe('container callback: 307');expect(lines[1]).toStartWith('container callback: ');const value=Number(lines[1]!.slice('container callback: '.length));expect(value).toBeGreaterThanOrEqual(0);expect(value).toBeLessThan(1);}
  else expect(expected).toBe('container callback: 307\ncontainer callback: 311\n');
  const entry=join(root,'main-'+dynamic+'.ts'),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,input);
  const result=await compile({entry,output,noGc:true,initializationEntries:[entry],buildDir:output+'-build',test262Observation:{kind:'test262-native-observation',scenarioId:'property/escaped-callback-closed.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({code:result.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});const observed=parseHostObservation(JSON.parse(native.stdout.toString()));
  if(dynamic)expect(observed).toMatchObject({kind:'throw',phase:'runtime',errorConstructor:'EvalError',stdout:'container callback: 307\n'});
  else expect(observed).toMatchObject({kind:'normal',stdout:expected});
 }}finally{await rm(root,{recursive:true,force:true})}
},600000);

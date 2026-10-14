import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {sourceConstructorInvocations} from '../../src/source-value-flow';
import {generatorSourceOwnerInput} from '../e2e/generated-cases';
import {runtimeGeneratorMethods} from '../../src/global-bindings';
import {parseHostObservation} from '../test262/protocol';

function facts(source:string){
 const options:ts.CompilerOptions={noLib:true,allowJs:true,noEmit:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);
 host.getSourceFile=file=>file==='/model.js'?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>file==='/model.js'?source:undefined;host.fileExists=file=>file==='/model.js';
 return sourceConstructorInvocations(ts.createProgram(['/model.js'],options,host),{roots:['/model.js']});
}

test('generator source owners retain payload, member, prototype and resume partitions',()=>{
 for(const source of ["function* f(){yield 'return 317;'}Function(f().next().value);","async function* f(){yield Promise.resolve('return 317;')}f().next().then(record=>Function(record.value));","function* f(){yield* ['return 317;']}Function(f().next().value);"])
  expect(facts(source)[0]!.choices?.[0]).toContain('return 317;');
 expect(facts("function* f(){}const iterator=f();Object.defineProperty(iterator,'constructor',{value:Function});iterator.constructor('return 331;');")).toEqual([{kind:'ordinary',choices:[['return 331;']]}]);
 expect(facts("function* f(){}const iterator=f();iterator.next=function(){return {value:'return 337;',done:false}};Function(iterator.next().value);")).toEqual([{kind:'ordinary',choices:[['return 337;']]}]);
 for(const [source,value]of [["function* f(){const value=yield 0;return value}const iterator=f();iterator.next();Function(iterator.next('return 347;').value);",'return 347;'],["function* f(){try{yield 0}catch(body){return body}}const iterator=f();iterator.next();Function(iterator.throw('return 349;').value);",'return 349;']]as const)
  expect(facts(source)[0]!.choices?.[0]).toContain(value);
 expect(facts("async function* f(){}Function('return '+JSON.stringify(typeof f()[Symbol.iterator])+';');Function('return '+JSON.stringify(typeof f()[Symbol.asyncIterator])+';');")).toEqual([{kind:'ordinary',choices:[['return \"undefined\";']]},{kind:'ordinary',choices:[['return \"function\";']]}]);
 for(const [name,entry]of runtimeGeneratorMethods)
  expect(facts(`function* f(){}const iterator=f();Function('return '+iterator[${JSON.stringify(name)}].length+';');`)).toEqual([{kind:'ordinary',choices:[['return '+entry.length+';']]}]);
 for(const source of ["function* f(){}Function(f().next.call(runtimeReceiver).value);","function callback(body){Function(body)}callback('return 307;');function* f(){yield callback}unknownCall(f());","const list=['return 317;'];function* f(){}const iterator=f();Object.defineProperty(iterator,'next',{get(){mutate(list);return ()=>({done:true})}});iterator.next();Function(...list);"])
  expect(facts(source).some(value=>value.choices===null)).toBe(true);
});

test('generator source owner execution matches independent Node in both memory modes',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-generator-source-owner-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const input=generatorSourceOwnerInput(typed&&!noGc?512:3)+`
{function* source():Generator<any,any,any>{yield* ['return 331;']}console.log('delegated:',Function(source().next().value)())}
{function* source():Generator<any,any,any>{const value=yield 0;return value}const iterator=source();iterator.next();console.log('received:',Function(iterator.next('return 337;').value)())}
{function* source():Generator<any,any,any>{try{yield 0}catch(body){return body}}const iterator=source();iterator.next();console.log('throw input:',Function(iterator.throw('return 347;').value)())}
{function* source():Generator<any,any,any>{}const iterator:any=source();Object.defineProperty(iterator,'constructor',{value:Function});console.log('constructor:',iterator.constructor('return 349;')());iterator.next=function(){return {value:'return 353;',done:false}};console.log('replacement:',Function(iterator.next().value)())}
{function* source():Generator<any,any,any>{}const iterator:any=source();Object.defineProperty(iterator,'next',{get(){throw 'return 359;'}});try{iterator.next()}catch(body:any){console.log('getter:',Function(body)())}}
{async function* source():AsyncGenerator<any,any,any>{yield Promise.resolve('return 367;')}source().next().then(record=>console.log('async yield:',Function(record.value)()))}
{async function* source():AsyncGenerator<any,any,any>{}source().return(Promise.resolve('return 373;')).then(record=>console.log('async return:',Function(record.value)()))}
{async function* source():AsyncGenerator<any,any,any>{}const iterator:any=source();console.log('async iterator:',typeof iterator[Symbol.iterator],typeof iterator[Symbol.asyncIterator],iterator[Symbol.asyncIterator]()===iterator);}
{function* source():Generator<any,any,any>{}const iterator:any=source();for(const name of ['next','return','throw'])console.log('method:',name,iterator[name].name,iterator[name].length);console.log('tag:',Object.prototype.toString.call(iterator),Object.getPrototypeOf(iterator)===source.prototype)}
`,erased=ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}.js`),oracleOutput=oracle+'.stdout';await writeFile(oracle,erased);
  const node=Bun.spawnSync(['node',oracle],{stdout:Bun.file(oracleOutput),stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?input:erased);
  const result=await compile({entry,output,noGc,initializationEntries:[entry],buildDir:output+'-build',test262Observation:{kind:'test262-native-observation',scenarioId:'property/generator-source-owner.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(await readFile(oracleOutput,'utf8'));
 }}finally{await rm(root,{recursive:true,force:true})}
},900000);

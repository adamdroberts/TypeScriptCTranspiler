import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {sourceConstructorInvocations} from '../../src/source-value-flow';
import {hasInstanceInput} from '../e2e/generated-cases';
import {parseHostObservation} from '../test262/protocol';

function facts(source:string){
 const options:ts.CompilerOptions={noLib:true,allowJs:true,noEmit:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);
 host.getSourceFile=file=>file==='/model.js'?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>file==='/model.js'?source:undefined;host.fileExists=file=>file==='/model.js';
 return sourceConstructorInvocations(ts.createProgram(['/model.js'],options,host),{roots:['/model.js']});
}

test('instanceof source effects retain actual hooks and ordinary primitive boundaries',()=>{
 for(const source of ["const list=['return 67;'];function C(){}new C() instanceof C;Function(...list);","const list=['return 67;'];const C=()=>1;1 instanceof C;Function(...list);"])
  expect(facts(source)).toEqual([{kind:'ordinary',choices:[['return 67;']]}]);
 for(const source of ["const list=['return 67;'];const C={[Symbol.hasInstance](value){mutate(list);return true}};({}) instanceof C;Function(...list);","const list=['return 67;'];const C={get [Symbol.hasInstance](){mutate(list);return undefined}};try{({}) instanceof C}catch(error){}Function(...list);","const list=['return 67;'];({}) instanceof runtimeInput;Function(...list);"])
  expect(facts(source).some(value=>value.choices===null)).toBe(true);
});
test('hasInstance operation owners match independent Node through native invocation',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-has-instance-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const input=hasInstanceInput(typed&&!noGc?4096:3)+`\nconst defaultMethod:any=Function.prototype[Symbol.hasInstance],descriptor=Object.getOwnPropertyDescriptor(Function.prototype,Symbol.hasInstance)!;console.log('metadata:',defaultMethod.name,defaultMethod.length,descriptor.writable,descriptor.enumerable,descriptor.configurable);console.log('ordinary primitive:',defaultMethod.call(17,{}),defaultMethod.call(()=>1,0));let order='';const item={};const hook:any={get [Symbol.hasInstance](){order+='G';return function(this:any,value:any){order+='C';return this===hook&&value===item?{}:0}}};console.log('hook:',item instanceof hook,order);const invalid:any={[Symbol.hasInstance]:17};try{console.log(item instanceof invalid)}catch(error){console.log('invalid:',error instanceof TypeError)}const absent:any={[Symbol.hasInstance]:null};try{console.log(item instanceof absent)}catch(error){console.log('absent:',error instanceof TypeError)}const callable:any=function(){};Object.defineProperty(callable,Symbol.hasInstance,{value(value:any){order+='T';return value===item}});const bound:any=callable.bind(null);console.log('bound hook:',item instanceof bound);const abrupt:any={get [Symbol.hasInstance](){throw item}};try{console.log(item instanceof abrupt)}catch(error){console.log('abrupt:',error===item)}const arrow:any=()=>0;try{console.log(item instanceof arrow)}catch(error){console.log('prototype:',error instanceof TypeError)}const proxy:any=new Proxy(function(){},{get(target:any,key:any,receiver:any){order+='P';return key===Symbol.hasInstance?undefined:key==='prototype'?17:Reflect.get(target,key,receiver)}});const primitive:any=0;console.log('primitive ordering:',primitive instanceof proxy,order.slice(-1));const throwMarker={};const throwing:any={[Symbol.hasInstance](){throw throwMarker}};try{console.log(item instanceof throwing)}catch(error){console.log('method abrupt:',error===throwMarker)}const override:any={[Symbol.hasInstance](){return false}};Object.defineProperty(bound,Symbol.hasInstance,{value:override[Symbol.hasInstance]});console.log('bound override:',item instanceof bound);`,erased=ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}.js`),oracleOutput=oracle+'.stdout';await writeFile(oracle,erased);
  const node=Bun.spawnSync(['node','--stack-size=16384',oracle],{stdout:Bun.file(oracleOutput),stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?input:erased);
  const result=await compile({entry,output,noGc,initializationEntries:[entry],buildDir:output+'-build',test262Observation:{kind:'test262-native-observation',scenarioId:'property/has-instance.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect({typed,noGc,observation}).toMatchObject({observation:{kind:'normal'}});expect(observation.stdout).toBe(await readFile(oracleOutput,'utf8'));
 }}finally{await rm(root,{recursive:true,force:true})}
},900000);

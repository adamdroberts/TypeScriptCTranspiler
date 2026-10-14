import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {runtimeAtomicsMethods} from '../../src/global-bindings';
import {sourceConstructorInvocations} from '../../src/source-value-flow';
import {atomicsSourceOwnerInput} from '../e2e/generated-cases';
import {parseHostObservation} from '../test262/protocol';

function facts(source:string){
 const options:ts.CompilerOptions={noLib:true,allowJs:true,noEmit:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);
 host.getSourceFile=file=>file==='/model.js'?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>file==='/model.js'?source:undefined;host.fileExists=file=>file==='/model.js';
 return sourceConstructorInvocations(ts.createProgram(['/model.js'],options,host),{roots:['/model.js']});
}

test('Atomics source owners retain primitive results and ordered conversion effects',()=>{
 for(const [name,{length}]of runtimeAtomicsMethods){
  const args=name==='isLockFree'?'4':Array.from({length},(_,index)=>index?'0':'new Int32Array(new SharedArrayBuffer(16))').join(',');
  const source=`const list=['return 29;'];Atomics[${JSON.stringify(name)}](${args});Function(...list);`;
  expect({name,facts:facts(source)}).toEqual({name,facts:[{kind:'ordinary',choices:[['return 29;']]}]});
 }
 for(const source of [
  "const list=['return 29;'];Atomics.load(new Int32Array(1),0);Function(...list);",
  "const list=['return 29;'];Atomics.store(new Int32Array(1),{valueOf(){throw 'stop'}},{valueOf(){mutate(list);return 1}});Function(...list);",
  "const list=['return 29;'];Atomics.store(new Int32Array(1),1n,{valueOf(){mutate(list);return 1}});Function(...list);",
  "const list=['return 29;'];const method=Atomics.load;Reflect.apply(method,Symbol(),[new Int32Array(1),0]);Function(...list);",
 ])expect(facts(source)).toEqual([{kind:'ordinary',choices:[['return 29;']]}]);
 for(const source of [
  "const list=['return 29;'];Atomics.load(new Int32Array(1),{valueOf(){mutate(list);return 0}});Function(...list);",
  "const list=['return 29;'];Atomics.load=()=>mutate(list);Atomics.load();Function(...list);",
  "const list=['return 29;'];Atomics.load(new Int32Array(1),0,mutate(list));Function(...list);",
 ])expect(facts(source).some(invocation=>invocation.choices===null)).toBe(true);
});
test('Atomics waitAsync result owners retain ordinary status and Promise values',()=>{
 const source="async function run(){const view=new Int32Array(new SharedArrayBuffer(4));const result=Atomics.waitAsync(view,0,1,0);const value=await result.value;Function('return '+JSON.stringify(value)+';')}run();";
 expect(facts(source)[0]!.choices).toEqual([expect.arrayContaining(['return \"not-equal\";','return \"timed-out\";','return \"ok\";'])]);
 expect(facts("const result=Atomics.waitAsync(new Int32Array(new SharedArrayBuffer(4)),0,1,0);unknownCall(result);Function(result.value);").some(value=>value.choices===null)).toBe(true);
});
test('Atomics source owners match independent Node through native invocation',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-atomics-source-owner-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const input=atomicsSourceOwnerInput(typed&&!noGc?512:3)+[...runtimeAtomicsMethods].map(([name,{length}])=>`{const fn:any=Atomics[${JSON.stringify(name)}];console.log('${name} metadata:',fn.name,fn.length===${length});}`).join('\n')+`\nconst atomicMethods:any=Atomics;const numericView:any=new Int32Array(new SharedArrayBuffer(16)),bigView:any=new BigInt64Array(new SharedArrayBuffer(16));for(const method of ['add','and','exchange','or','store','sub','xor']){console.log(method,typeof atomicMethods[method](numericView,0,1),typeof atomicMethods[method](bigView,0,1n));}console.log('load:',typeof Atomics.load(numericView,0),typeof Atomics.load(bigView,0));console.log('compare:',typeof Atomics.compareExchange(numericView,0,1,2));console.log('notify:',Atomics.notify(numericView,0,0));console.log('wait:',Atomics.wait(numericView,0,99,0));console.log('async:',Atomics.waitAsync(numericView,0,99,0).value);let seen=0;try{atomicMethods.store(numericView,{valueOf(){seen++;throw 'stop'}},{valueOf(){seen+=100;return 1}})}catch(e){console.log('ordered:',seen,e==='stop')}const selected:any={load(){seen++;return 7}};console.log('replacement:',selected.load(),seen);`,erased=ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}.js`),oracleOutput=oracle+'.stdout';await writeFile(oracle,erased);
  const node=Bun.spawnSync(['node',oracle],{stdout:Bun.file(oracleOutput),stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?input:erased);
  const result=await compile({entry,output,noGc,initializationEntries:[entry],buildDir:output+'-build',test262Observation:{kind:'test262-native-observation',scenarioId:'property/atomics-source-owner.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect({typed,noGc,observation}).toMatchObject({observation:{kind:'normal'}});expect(observation.stdout).toBe(await readFile(oracleOutput,'utf8'));
 }}finally{await rm(root,{recursive:true,force:true})}
},900000);

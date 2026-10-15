import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {parseHostObservation} from '../test262/protocol';

const admitted='var admitted=1;';
test('generated Script effects preserve caller and actual argument ordering',()=>{
 for(const prior of [false,true]){
  const read='$262.evalScript(owner.code);',effect='$262.evalScript("opaque(globalThis);");';
  const graph=finiteEvalScriptSourceGraph([{path:'main.js',source:`const owner={code:${JSON.stringify(admitted)}};`+(prior?effect+read:read+effect)}]);
  if(prior)expect(graph.error).toContain('evalScript source is not a finite static string expression');else expect(graph.error).toBeNull();
 }
 for(const prefix of ['', 'mutate(owner),']){
  const graph=finiteEvalScriptSourceGraph([{path:'main.js',source:`function run(owner,text){opaque(owner);$262.evalScript(text);}const owner={code:${JSON.stringify(admitted)}};run(owner,(${prefix}owner.code));`}]);
  if(prefix)expect(graph.error).toContain('evalScript source is not a finite static string expression');else expect(graph.error).toBeNull();
 }
 const later=finiteEvalScriptSourceGraph([{path:'main.js',source:`function run(owner,text){opaque(owner);$262.evalScript(text);}const owner={code:${JSON.stringify(admitted)}};run(owner,owner.code);$262.evalScript(owner.code);`}]);
 expect(later.error).toContain('evalScript source is not a finite static string expression');
});

test('effect origins preserve earlier captures and reject reads after opaque activations',()=>{
 for(const dispatch of ['opaque(o);','forward(o);','Reflect.apply(forward,undefined,[o]);','cycle(o);'])for(const earlier of [false,true]){
  const definitions='function forward(o){opaque(o);}function cycle(o){if(flag)cycle(o);else opaque(o);}';
  const capture='const body=o.body;';
  const source=definitions+`const o={body:${JSON.stringify(admitted)}};`+(earlier?dispatch+capture:capture+dispatch)+'$262.evalScript(body);';
  const graph=finiteEvalScriptSourceGraph([{path:'main.js',source}]);
  if(earlier)expect(graph.error).toContain('evalScript source is not a finite static string expression');
  else {expect(graph.error).toBeNull();expect(graph.sources).toContain(admitted);}
 }
 const loop=finiteEvalScriptSourceGraph([{path:'loop.js',source:`const o={body:${JSON.stringify(admitted)}};for(let i=0;i<2;i++){const body=o.body;opaque(o);$262.evalScript(body);}`}]);
 expect(loop.error).toContain('evalScript source is not a finite static string expression');
 for(const prior of [false,true]){
  const scripts=[`globalThis.o={body:${JSON.stringify(admitted)}};`,...prior?['opaque(globalThis.o);','$262.evalScript(globalThis.o.body);']:['$262.evalScript(globalThis.o.body);','opaque(globalThis.o);']];
  const graph=finiteEvalScriptSourceGraph(scripts.map((source,index)=>({path:'script-'+index+'.js',source,goal:'script'})));
  if(prior)expect(graph.error).toContain('evalScript source is not a finite static string expression');else expect(graph.error).toBeNull();
 }
 const module=finiteEvalScriptSourceGraph([{path:'main.js',source:`globalThis.o={body:${JSON.stringify(admitted)}};$262.evalScript(globalThis.o.body);`,goal:'script'},{path:'later.mjs',source:'opaque(globalThis.o);',goal:'module'}]);
 expect(module.error).toContain('evalScript source is not a finite static string expression');
});

test('activation origins close over the call graph and declared Script order independently of depth',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-source-effect-origins-'));
 try{
  for(const noGc of [false,true])for(const typed of [false,true]){
   const directory=join(root,noGc+'-'+typed);await mkdir(directory);
   const depth=typed&&!noGc?64:1;
   const functions=Array.from({length:depth},(_,index)=>`function f${index}(){return ${index+1<depth?'f'+(index+1)+'()':'(0,eval)("Math.random();")'};}`).join('\n');
   const sources=[`globalThis.setting={body:'return "saved";'};`,functions+'\nconst body=globalThis.setting.body;f0();console.log(Function(body)());',`Math.random();{const owner={body:'return "loop";'};const saved=owner.body;for(let index=0;index<3;index++)Math.random();console.log(Function(saved)());}`];
   const reference=join(directory,'reference.js');await writeFile(reference,sources.join('\n'));
   const oracleOutput=reference+'.stdout';const node=Bun.spawnSync(['node',reference],{stdout:Bun.file(oracleOutput),stderr:'pipe',timeout:120_000});const oracleText=await readFile(oracleOutput,'utf8');expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});expect(oracleText).toBe('saved\nloop\n');
   const entries:string[]=[];
   for(const [index,source] of sources.entries()){const entry=join(directory,index===1&&typed?'main.ts':'script-'+index+'.js');await writeFile(entry,(typed?'// @ts-nocheck\n':'')+source);entries.push(entry);}
   const entry=entries[1]!,output=join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,buildDir:join(directory,'build'),noGc,additionalRoots:entries,isolatedScriptRoots:entries,initializationEntries:entries,test262Observation:{kind:'test262-native-observation',scenarioId:'source-effect-origins#script',setupEntries:[],testEntry:entry,scriptEntries:entries,async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,typed,code:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,typed,code:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({noGc,typed,code:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,typed,code:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect({noGc,typed,observation}).toMatchObject({observation:{kind:'normal'}});if(observation.kind==='normal')expect(observation.stdout).toBe(oracleText);
  }
 }finally{await rm(root,{recursive:true,force:true});}
},600_000);

test('top-level repeated effects retain their source phase around saved reads',()=>{
 const effects=['for(let index=0;index<2;index++)opaque(owner);','while(flag){opaque(owner);break;}','do{opaque(owner);}while(false);'];
 for(const effect of effects)for(const prior of [false,true]){
  const source='const owner={body:"17;"};'+(prior?effect+'const saved=owner.body;':'const saved=owner.body;'+effect)+'eval(saved);';
  const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");const values=[];new vm.Script(process.argv[1]).runInNewContext({flag:true,opaque(owner){owner.body="19;"},eval:value=>values.push(value)});fs.writeSync(1,JSON.stringify(values));',source],{stdout:'pipe',stderr:'pipe',timeout:30_000});
  expect({code:reference.exitCode,stderr:reference.stderr.toString(),stdout:reference.stdout.toString()}).toEqual({code:0,stderr:'',stdout:JSON.stringify([prior?'19;':'17;'])});
  const result=finiteEvalScriptSourceGraph([{path:'subject.js',source}]);
  if(prior)expect(result.error).toContain('direct eval source is not a finite static string expression');
  else{expect(result.error).toBeNull();expect(result.directEvalSources.map(entry=>entry.source)).toEqual(['17;']);}
 }
 const repeated=finiteEvalScriptSourceGraph([{path:'subject.js',source:'const owner={body:"17;"};for(let index=0;index<2;index++){const saved=owner.body;opaque(owner);eval(saved);}'}]);
 expect(repeated.error).toContain('direct eval source is not a finite static string expression');
 const across=finiteEvalScriptSourceGraph([{path:'setup.js',goal:'script',source:'var owner={body:"17;"};var saved=owner.body;'}, {path:'later.js',goal:'script',source:'for(let index=0;index<2;index++)opaque(owner);eval(saved);'}]);
 expect(across.error).toBeNull();expect(across.directEvalSources.map(entry=>entry.source)).toEqual(['17;']);
});

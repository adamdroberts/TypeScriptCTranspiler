import {expect,test} from 'bun:test';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {parseHostObservation} from '../test262/protocol';

const admitted='var admitted=1;';
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
   const functions=Array.from({length:depth},(_,index)=>`function f${index}(){return ${index+1<depth?'f'+(index+1)+'()':'Math.random()'};}`).join('\n');
   const sources=[`globalThis.setting={body:'return "saved";'};`,functions+'\nconst body=globalThis.setting.body;f0();console.log(Function(body)());','Math.random();'];
   const reference=join(directory,'reference.js');await writeFile(reference,sources.join('\n'));
   const node=Bun.spawnSync(['node',reference],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});expect(node.stdout.toString()).toBe('saved\n');
   const entries:string[]=[];
   for(const [index,source] of sources.entries()){const entry=join(directory,index===1&&typed?'main.ts':'script-'+index+'.js');await writeFile(entry,(typed?'// @ts-nocheck\n':'')+source);entries.push(entry);}
   const entry=entries[1]!,output=join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,buildDir:join(directory,'build'),noGc,additionalRoots:entries,isolatedScriptRoots:entries,initializationEntries:entries,test262Observation:{kind:'test262-native-observation',scenarioId:'source-effect-origins#script',setupEntries:[],testEntry:entry,scriptEntries:entries,async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,typed,code:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,typed,code:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({noGc,typed,code:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,typed,code:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect({noGc,typed,observation}).toMatchObject({observation:{kind:'normal'}});if(observation.kind==='normal')expect(observation.stdout).toBe(node.stdout.toString());
  }
 }finally{await rm(root,{recursive:true,force:true});}
},600_000);

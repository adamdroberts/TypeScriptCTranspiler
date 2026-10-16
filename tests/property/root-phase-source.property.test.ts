import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';
import {parseHostObservation} from '../test262/protocol';
const prelude='function consume(body){print(eval(body));}';
const privateSource=(body:string)=>'{const consume=body=>print(eval(body));'+body+'}';
function reference(source:string,setup='function opaque(){Array.prototype[Symbol.iterator]=function*(){yield "19;";};}'):string{
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script('+JSON.stringify(setup)+'+fs.readFileSync(0,"utf8")).runInNewContext({print:v=>fs.writeSync(1,String(v)+"\\n")});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});return node.stdout.toString();
}
test('repeated root phases exclude later effects while overlapping iterations retain them',()=>{
 const read='consume(...["17;"]);',loops=[
  (body:string)=>'for(let index=0;index<2;index++){'+body+'}',
  (body:string)=>'let index=0;while(index++<2){'+body+'}',
  (body:string)=>'let index=0;do{'+body+'}while(++index<2);',
 ];
 for(const loop of loops){
  const before=privateSource(loop(read)+'opaque();'),finite=graph([{path:'subject.js',source:before}]);
  expect(reference(before)).toBe('17\n17\n');expect({source:before,error:finite.error}).toEqual({source:before,error:null});expect(finite.directEvalSources.map(value=>value.source)).toContain('17;');
  for(const source of [privateSource('opaque();'+loop(read)),privateSource(loop(read+'opaque();'))]){
   expect(reference(source)).toContain('19\n');expect({source,error:graph([{path:'subject.js',source}]).error}).toEqual({source,error:expect.stringContaining('direct eval source is not a finite static string expression')});
  }
 }
 const nested=privateSource('for(let outer=0;outer<2;outer++){for(let inner=0;inner<1;inner++){'+read+'}opaque();}');
 expect(reference(nested)).toBe('17\n19\n');expect(graph([{path:'subject.js',source:nested}]).error).toContain('direct eval source is not a finite static string expression');
 const activation=privateSource('function run(){for(let index=0;index<1;index++){'+read+'}}run();opaque();run();');
 expect(reference(activation)).toBe('17\n19\n');expect(graph([{path:'subject.js',source:activation}]).error).toContain('direct eval source is not a finite static string expression');
 // Keep the original public-function input: later opaque code can call it
 // with another source even though the earlier root loop has completed.
 const exposed=prelude+loops[0]!(read)+'opaque();';
 expect(reference(exposed,'function opaque(){consume("19;");}')).toBe('17\n17\n19\n');
 expect(graph([{path:'subject.js',source:exposed}]).error).toContain('direct eval source is not a finite static string expression');
 for(const scheduling of ['const later=async()=>{await 0;consume();};for(let index=0;index<2;index++)later();','for(let index=0;index<2;index++)Promise.resolve().then(()=>consume());']){
  const source='globalThis.body="17;";{const consume=()=>print(eval(body));'+scheduling+'opaque();}';
  expect(reference(source,'function opaque(){globalThis.body="19;";}')).toBe('19\n19\n');
  expect(graph([{path:'subject.js',source}]).error).toContain('direct eval source is not a finite static string expression');
 }
 const resolver='let resolve;new Promise(value=>{resolve=value;}).then(body=>print(eval(body)));opaque();';
 expect(reference(resolver,'function opaque(){resolve("19;");}')).toBe('19\n');expect(graph([{path:'subject.js',source:resolver}]).error).toContain('direct eval source is not a finite static string expression');
});
function stress():string{
 const depth=256;
 return privateSource(Array.from({length:depth},(_,index)=>'for(let index'+index+'=0;index'+index+'<1;index'+index+'++){').join('')+'consume(...["31;"]);'+'}'.repeat(depth)+'const items=["b","a"];items.sort();print("root-phase-complete");');
}
test('one deep repeated root phase matches complete independent Node and native output',async()=>{
 const source=stress(),expected=reference(source);expect(expected).toBe('31\nroot-phase-complete\n');
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-root-phase-native-'));
 try{for(const noGc of [false,true]){
  const entry=join(directory,'subject.js'),output=join(directory,'program-'+noGc),diagnostics:string[]=[];await writeFile(entry,(noGc?'':'$262.gc();')+source);
  const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/root-phase-source.js#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({exitCode:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(expected);
 }}finally{await rm(directory,{recursive:true,force:true});}
},600000);

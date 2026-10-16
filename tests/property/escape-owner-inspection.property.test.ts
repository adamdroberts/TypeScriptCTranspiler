import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';
import {parseHostObservation} from '../test262/protocol';
function reference(source:string,external='()=>{}',sameRealm=''):string{
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script('+JSON.stringify(sameRealm)+'+fs.readFileSync(0,"utf8")).runInNewContext({external:'+external+',print:v=>fs.writeSync(1,String(v)+"\\n")});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});return node.stdout.toString();
}
const prelude='function first(body){print(eval(body));}function second(body){print(eval(body));}first("17;");second("23;");';
test('canonical escaped values observe later descriptors, prototypes and collection records',()=>{
 const cases=[
  {body:'const owner={};for(const callback of [first,second]){owner.callback=callback;external(owner);}',external:'owner=>owner.callback(owner.callback.name==="first"?"19;":"29;")'},
  {body:'const owner={};for(const callback of [first,second]){Object.defineProperty(owner,"callback",{get(){return callback;},configurable:true});external(owner);}',external:'owner=>owner.callback(owner.callback.name==="first"?"19;":"29;")'},
  {body:'const owner={};for(const callback of [first,second]){Object.setPrototypeOf(owner,{callback});external(owner);}',external:'owner=>owner.callback(owner.callback.name==="first"?"19;":"29;")'},
  {body:'for(const Constructor of [Map,Set]){const owner=new Constructor(Constructor===Map?[["callback",first]]:[second]);external(owner);}',external:'owner=>typeof owner.get==="function"?owner.get("callback")("19;"):owner.values().next().value("29;")'},
 ];
 for(const item of cases){
  const source=prelude+item.body;expect(reference(source,item.external)).toBe('17\n23\n19\n29\n');expect({source,error:graph([{path:'subject.js',source}]).error}).toEqual({source,error:expect.stringContaining('direct eval source is not a finite static string expression')});
 }
 const disconnected=prelude+'external({value:1});';expect(reference(disconnected)).toBe('17\n23\n');expect(reference(disconnected,'()=>{}','function external(){first("19;");second("29;");}')).toBe('17\n23\n19\n29\n');expect(graph([{path:'subject.js',source:disconnected}]).error).toContain('direct eval source is not a finite static string expression');
 const privateControl='{'+disconnected+'}',result=graph([{path:'subject.js',source:privateControl}]);expect(reference(privateControl)).toBe('17\n23\n');expect(result.error).toBeNull();expect(new Set(result.directEvalSources.map(value=>value.source))).toEqual(new Set(['17;','23;']));
});
function ownerGraph():string{
 return 'const owner0={callback:C};'+Array.from({length:512},(_,index)=>'const owner'+(index+1)+'={next:owner'+index+',alias:owner'+index+'};').join('\n');
}
test('one dense alias graph retains escaping callback sources',()=>{
 const source='class C{constructor(body){print(eval(body));}}new C("17;");'+ownerGraph()+'external(owner512);';
 expect(reference(source,'owner=>{while(owner.next)owner=owner.next;new owner.callback("19;");}')).toBe('17\n19\n');expect(graph([{path:'subject.js',source}]).error).toContain('direct eval source is not a finite static string expression');
});
test('the same dense graph with constant callback source matches complete Node and native execution',async()=>{
 const source='class C{constructor(){print(eval("17;"));}}'+ownerGraph()+'COLLECT let owner=owner512;while(owner.next)owner=owner.next;[owner.callback,owner.callback].sort(function(callback){new callback();return 0;});print("escape-inspection-complete");',expected=reference(source.replace('COLLECT',''));expect(expected).toBe('17\nescape-inspection-complete\n');
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-escape-owner-native-'));
 try{for(const noGc of [false,true]){
  const entry=join(directory,'subject.js'),output=join(directory,'program-'+noGc),diagnostics:string[]=[];await writeFile(entry,source.replace('COLLECT',noGc?'':'$262.gc();'));
  const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/escape-owner-inspection.js#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({exitCode:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(expected);
 }}finally{await rm(directory,{recursive:true,force:true});}
},600000);

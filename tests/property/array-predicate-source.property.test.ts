import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';
import {parseHostObservation} from '../test262/protocol';
function reference(source:string):string{
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({print:v=>fs.writeSync(1,String(v)+"\\n")});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});return node.stdout.toString();
}
test('predicate source effects retain callback inputs, holes, abrupt gates and repeated activations',()=>{
 for(const method of ['some','every']){
  const sources=[
   {body:'let body="17;";try{[].METHOD(null);}catch(error){body="19;";}print(eval(body));',observed:'19\n',choices:['19;']},
   {body:'let body="17;";const queue=[,,];queue.METHOD(()=>{body=String(Math.random());return true;});print(eval(body));',observed:'17\n',choices:['17;']},
   {body:'let body="17;";const queue={__proto__:{get 0(){body="19;";return 1;}},length:1};Array.prototype.METHOD.call(queue,()=>true);print(eval(body));',observed:'19\n',choices:['19;']},
   {body:'let body="17;";[1].METHOD(function(value,index,owner){body=this.code;return true;},{code:"19;"});print(eval(body));',observed:'19\n',choices:['19;']},
   {body:'let body="17;";try{Array.prototype.METHOD.call({get length(){throw "19;";}},()=>{body=String(Math.random());});}catch(error){print(eval(error));}print(eval(body));',observed:'19\n17\n',choices:['19;','17;']},
   {body:'let body="17;";["19;"].METHOD(value=>{body=value;return true;});print(eval(body));',observed:'19\n',choices:['19;']},
  ];
  for(const input of sources){const source=input.body.replaceAll('METHOD',method);expect(reference(source)).toBe(input.observed);const result=graph([{path:'subject.js',source}]);expect({source,error:result.error}).toEqual({source,error:null});for(const choice of input.choices)expect(result.directEvalSources.map(value=>value.source)).toContain(choice);}
  for(const body of [
   'let body="17;";[1].METHOD(()=>{body=String(Math.random());return true;});eval(body);',
   'let body="17;";const queue={__proto__:{get 0(){body=String(Math.random());return 1;}},length:1};Array.prototype.METHOD.call(queue,()=>true);eval(body);',
   'let body="17;";[1,2].METHOD(function(value){const saved=body;body=String(Math.random());if(value===2)eval(saved);return CONTINUE;});',
  ]){const source=body.replaceAll('METHOD',method).replace('CONTINUE',String(method==='every'));expect({source,error:graph([{path:'subject.js',source}]).error}).toEqual({source,error:expect.stringContaining('direct eval source is not a finite static string expression')});}
 }
});
function program():string{
 return 'let body="17;";const args=[];args.push({toString(){body="19;";return "|";}});["item"].join(...args);print(eval(body));print("spread-separator-complete");\n'+
 ['some','every'].map(method=>'{const events=[],marker={},state={code:"this"},queue={__proto__:{get 1(){events.push("get");return marker;},get 2(){throw "late";}},length:3,0:17};const result=Array.prototype.'+method+'.call(queue,function(value,index,owner){events.push(index+":"+(owner===queue)+":"+(this===state)+":"+(index===0?value:value===marker));return index'+(method==='some'?'===':'!==')+'1;},state);print("'+method+':"+result+":"+events.join("|"));'+
 'let calls=0;print([,,].'+method+'(()=>{calls++;return true;})+":"+calls);'+
 'try{Array.prototype.'+method+'.call({get length(){events.push("length");throw "early";}},null);}catch(error){print(error+":"+events.join("|"));}'+
 'try{[].'+method+'(null);}catch(error){print(error.name);}'+
 'try{[1,2].'+method+'(()=>{throw "callback";});}catch(error){print(error);}'+
 '}').join('\n')+'\nprint("array-predicate-complete");';
}
test('predicate iteration and spread separator effects match complete Node and native output',async()=>{
 const source=program(),expected=reference(source);expect(expected.startsWith('19\nspread-separator-complete\n')).toBe(true);expect(expected.endsWith('array-predicate-complete\n')).toBe(true);
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-array-predicate-native-'));
 try{for(const noGc of [false,true]){
  const entry=join(directory,'subject.js'),output=join(directory,'program-'+noGc),diagnostics:string[]=[];await writeFile(entry,source);
  const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/array-predicate-source.js#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:m=>diagnostics.push(m)});
  expect({exitCode:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(expected);
 }}finally{await rm(directory,{recursive:true,force:true});}
},600000);

import {expect,test} from 'bun:test';
import ts from 'typescript';
import {SourceEvaluationOrder} from '../../src/source-evaluation-order';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
const original="{let code=\"17;\",saved=\"\";const target={};const key={[Symbol.toPrimitive](){code=String(Math.random())+\";\";return \"slot\";}};target[key]=(saved=code,0);print(eval(saved));print(\"reference-complete\");}";
const accessor='const target={get slot(){code=String(Math.random())+";";return 0;},set slot(value){}};';
const keyed='const target={},key={[Symbol.toPrimitive](){code=String(Math.random())+";";return "slot";}};';
const wrap=(prefix:string,operation:string)=>'{let code="17;",saved="";'+prefix+operation+'print(eval(saved));print("reference-complete");}';
function reference(source:string):string{
 const script='const fs=require("node:fs"),vm=require("node:vm"),context=vm.createContext({print:value=>{fs.writeSync(1,String(value)+"\\n");}});new vm.Script("Math.random=()=>19;").runInContext(context);new vm.Script(fs.readFileSync(0,"utf8")).runInContext(context);';
 const node=nodeReferenceSync(['node','-e',script],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});return node.stdout.toString();
}
const finite=[original,wrap(accessor,'target.slot=(saved=code,0);'),wrap(accessor,'delete target.slot;saved=code;'),wrap(accessor,'for(target.slot of [0]){}saved=code;'),wrap(keyed,'({slot:target[key]=(saved=code,0)}={});'),wrap(keyed,'[{slot:target[key]=(saved=code,0)}={}]=[];')];
finite.push(wrap(keyed,'target[(saved=code,key)];'),wrap(keyed,'target[(saved=code,key)]+=0;'),wrap(accessor,'(saved=code,target).slot;'));
const throwingKey='const marker={},target={},key={[Symbol.toPrimitive](){code=String(Math.random())+";";throw marker;}};';
finite.push(wrap('', '({}=(saved=code,{}));'),wrap(throwingKey,'try{target[key]=(saved=code,0);}catch(error){}'),wrap('const marker={},target={set slot(value){code=String(Math.random())+";";throw marker;}};','try{target.slot=(saved=code,0);}catch(error){}'));
const abruptGet=wrap(throwingKey,'saved="23;";try{target[key]+=(saved=code,0);}catch(error){}');
const unknown=[wrap(accessor,'target.slot+=(saved=code,0);'),wrap(accessor,'target.slot++;saved=code;'),wrap(accessor,'target.slot;saved=code;'),wrap(keyed,'target[key]=0;saved=code;'),wrap(keyed,'key[Symbol.toPrimitive]();target[key]=(saved=code,0);'),wrap(keyed,'function relay(fn){fn();}relay(key[Symbol.toPrimitive]);target[key]=(saved=code,0);'),wrap(keyed,'for(let index=0;index<2;index++)target[key]=(saved=code,0);'),wrap('const target={};function key(){code=String(Math.random())+";";return "slot";}','target[key()]=(saved=code,0);')];
test('References perform GetValue only for reads and delay PutValue key conversion past RHS/default evaluation',()=>{
 for(const source of finite){expect(reference(source)).toBe('17\nreference-complete\n');const result=graph([{path:'subject.js',source}]);expect({source,error:result.error}).toEqual({source,error:null});expect(result.directEvalSources.map(entry=>entry.source)).toContain('17;');}
 for(const source of unknown){expect(reference(source)).toBe('19\nreference-complete\n');expect({source,error:graph([{path:'subject.js',source}]).error}).toEqual({source,error:expect.stringContaining('direct eval source is not a finite static string expression')});}
});
function tree(seed:number,depth:number,mixed=true):string{
 let expression='(saved=code,COLLECT 0)',state=seed;
 for(let index=0;index<depth;index++){
  state=(Math.imul(state,1664525)+1013904223)>>>0;
  const target='target[makeKey()]';
  expression=!mixed||state%3===0?target+'=('+expression+')':state%3===1?'({slot:'+target+'}={slot:('+expression+')})':'(['+target+']=[('+expression+')])';
 }
 return wrap('const target={};function makeKey(){return {[Symbol.toPrimitive](){code=String(Math.random())+";";return "slot";}};}','('+expression+');');
}
test('an abrupt GetValue precedes RHS evaluation while an abrupt PutValue follows it',()=>{
 expect(reference(abruptGet)).toBe('23\nreference-complete\n');const result=graph([{path:'subject.js',source:abruptGet}]);expect(result.error).toBeNull();expect(result.directEvalSources.map(entry=>entry.source)).toContain('23;');
});
test('Reference completion order is strict for coincident events and follows assignment evaluation regions',()=>{
 const source=ts.createSourceFile('order.js','target[key]=(saved=code,0);',ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS),statement=source.statements[0] as ts.ExpressionStatement,assignment=statement.expression as ts.BinaryExpression,target=assignment.left as ts.ElementAccessExpression;
 const order=new SourceEvaluationOrder();order.registerAssignment(assignment,false);
 const get=order.referenceCompletion(target,target),put=order.referenceCompletion(target,assignment);
 for(const event of [get,put])expect(order.before(event,event)).toBe(false);
 expect(order.before(get,assignment.right)).toBe(true);expect(order.before(assignment.right,put)).toBe(true);expect(order.before(put,assignment.right)).toBe(false);
 const peer=ts.setTextRange(ts.factory.createEmptyStatement(),get);(peer as ts.Node&{parent:ts.Node}).parent=get.parent;expect(order.before(get,peer)).toBe(false);expect(order.before(peer,get)).toBe(false);
});
test('generated Reference trees share the binding plan and retain the innermost snapshot independently of tree shape',()=>{
 for(let seed=1;seed<=10;seed++){
  const source=tree(seed,18).replace('COLLECT','');expect(reference(source)).toBe('17\nreference-complete\n');const result=graph([{path:'subject.js',source}]);expect({seed,error:result.error}).toEqual({seed,error:null});expect(result.directEvalSources.map(entry=>entry.source)).toContain('17;');
 }
});
test('the unchanged original and one retained Reference tree match complete Node in both memory modes',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-source-reference-'));
 try{for(const [index,source]of [original,...finite.slice(1),abruptGet,tree(19,512,false)].entries()){
  const expected=reference(source.replace('COLLECT',''));expect(expected).toBe((source===abruptGet?'23':'17')+'\nreference-complete\n');
  for(const noGc of [false,true]){
   const entry=join(directory,'subject-'+index+'.js'),output=join(directory,'program-'+index+'-'+noGc),diagnostics:string[]=[];
   await writeFile(entry,source.replace('COLLECT',noGc?'':'$262.gc(),'));
   const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/source-reference#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(parseHostObservation(JSON.parse(native.stdout.toString()))).toMatchObject({kind:'normal',stdout:expected});
  }
 }}finally{await rm(directory,{recursive:true,force:true});}
},900000);

test('the unchanged GetValue operand original matches complete Node and native in both memory modes',async()=>{
 const source="{let code=\"17;\",saved=\"\";const target={};const key={[Symbol.toPrimitive](){code=String(Math.random())+\";\";return \"slot\";}};target[(saved=code,key)]+=0;print(eval(saved));print(\"reference-complete\");}";expect(reference(source)).toBe('17\nreference-complete\n');const result=graph([{path:'subject.js',source}]);expect(result.error).toBeNull();expect(result.directEvalSources.map(entry=>entry.source)).toContain('17;');
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-getvalue-original-'));
 try{for(const noGc of [false,true]){
  const entry=join(directory,'original.js'),output=join(directory,'program-'+noGc),diagnostics:string[]=[];await writeFile(entry,source);
  const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/source-reference-get-original#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(parseHostObservation(JSON.parse(native.stdout.toString()))).toMatchObject({kind:'normal',stdout:'17\nreference-complete\n'});
 }}finally{await rm(directory,{recursive:true,force:true});}
},900000);

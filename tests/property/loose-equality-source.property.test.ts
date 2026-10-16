import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
const original="{let code=\"17;\";const owner={[Symbol.toPrimitive](){code=\"19;\";return 1;}};owner==1;print(eval(code));print(\"equality-complete\");}";
function reference(source:string):string{
 const script='const fs=require("node:fs"),vm=require("node:vm"),context=vm.createContext({print:value=>{fs.writeSync(1,String(value)+"\\n");}});new vm.Script("Math.random=()=>19;").runInContext(context);new vm.Script(fs.readFileSync(0,"utf8")).runInContext(context);';
 const node=nodeReferenceSync(['node','-e',script],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});return node.stdout.toString();
}
function subject(expression:string,unknown=false,protocol='exotic'):string{
 const effect=unknown?'code=String(Math.random())+";";':'code="19;";';
 const owner=protocol==='ordinary'?'const owner={valueOf(){'+effect+'return 1;}};':protocol==='fallback'?'const owner={valueOf(){return {};},toString(){'+effect+'return "1";}};':protocol==='getter'?'const owner={get [Symbol.toPrimitive](){'+effect+'return function(){return 1;};}};':'const owner={[Symbol.toPrimitive](hint){'+effect+'return 1;}};';
 return '{let code="17;";'+owner+expression+';print(eval(code));print("equality-complete");}';
}
const primitives=['0','1','"1"','1n','true','false','Symbol.for("peer")'];
const conversions=primitives.flatMap(value=>['==','!='].flatMap(operator=>['owner'+operator+value,value+operator+'owner']));
const inert=['owner==null','undefined!=owner','null==owner','owner==owner','owner!={}'];
const strict=primitives.flatMap(value=>['owner==='+value,value+'!==owner']);
test('loose equality selects default-hint object coercion by both value categories while strict and nullish comparisons remain inert',()=>{
 for(const expression of conversions){
  const source=subject(expression);expect(reference(source)).toBe('19\nequality-complete\n');const result=graph([{path:'subject.js',source}]);expect({expression,error:result.error}).toEqual({expression,error:null});expect(result.directEvalSources.map(entry=>entry.source)).toContain('19;');
  expect(graph([{path:'subject.js',source:subject(expression,true)}]).error).toContain('direct eval source is not a finite static string expression');
 }
 for(const expression of [...inert,...strict]){
  const source=subject(expression,true);expect(reference(source)).toBe('17\nequality-complete\n');const result=graph([{path:'subject.js',source}]);expect({expression,error:result.error}).toEqual({expression,error:null});expect(result.directEvalSources.map(entry=>entry.source)).toEqual(['17;']);
 }
 for(const protocol of ['ordinary','fallback','getter']){
  const source=subject('owner==1',false,protocol);expect(reference(source)).toBe('19\nequality-complete\n');expect(graph([{path:'subject.js',source}]).error).toBeNull();expect(graph([{path:'subject.js',source:subject('owner==1',true,protocol)}]).error).toContain('direct eval source is not a finite static string expression');
 }
});
const ordered=[
 '{let code="17;",saved="17;";const owner={[Symbol.toPrimitive](){code=String(Math.random())+";";return 1;}};owner==(saved=code,1);print(eval(saved));print("equality-complete");}',
 '{let code="17;";function stop(){throw 0;}function mutate(){code=String(Math.random())+";";return 1;}try{stop()==mutate();}catch(error){}print(eval(code));print("equality-complete");}',
 '{let code="17;";const owner={[Symbol.toPrimitive](){code="19;";throw 0;}};try{(owner==1)+(code=String(Math.random())+";",0);}catch(error){}print(eval(code));print("equality-complete");}'
];
const primitiveSubjects=['1=="1"','1n!="2"','null==undefined','NaN!=NaN'].map(expression=>'{print(eval(String('+expression+')+";"));print("equality-complete");}');
const actualInput='{function same(value){return value==1;}const selected=same(1);same(2);print(eval(String(selected)+";"));print("equality-complete");}';
test('equality coercions follow operand evaluation and abrupt values guard later binary operands',()=>{
 for(const [index,source]of ordered.entries()){expect(reference(source)).toBe((index===2?'19':'17')+'\nequality-complete\n');const result=graph([{path:'subject.js',source}]);expect({source,error:result.error}).toEqual({source,error:null});expect(result.directEvalSources.map(entry=>entry.source)).toContain(index===2?'19;':'17;');}
 for(const source of [...primitiveSubjects,actualInput]){
  expect(reference(source)).toBe('true\nequality-complete\n');const result=graph([{path:'subject.js',source}]);expect(result.error).toBeNull();expect(result.directEvalSources.map(entry=>entry.source)).toEqual(['true;']);
 }
});
function matrix():string{return [...conversions,...inert,...strict].map(expression=>subject(expression)).join('\n');}
function retained():string{return '{let code="17;";let parent={[Symbol.toPrimitive](hint){code="19;";return 1;}};for(let index=0;index<512;index++)parent=Object.create(parent);const owner=Object.create(parent);COLLECT owner==1;print(eval(code));print("equality-complete");}';}
test('the unchanged equality counterexample, semantic matrix, abrupt ordering and one retained prototype graph match complete Node in both memory modes',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-loose-equality-'));
 try{for(const [index,source]of [original,matrix(),primitiveSubjects.join("\n")+actualInput,...ordered,retained()].entries()){
  const expected=reference(source.replace('COLLECT',''));expect(expected.endsWith('equality-complete\n')).toBe(true);if(index===0)expect(expected).toBe('19\nequality-complete\n');
  for(const noGc of [false,true]){
   const entry=join(directory,'subject-'+index+'.js'),output=join(directory,'program-'+index+'-'+noGc),diagnostics:string[]=[];await writeFile(entry,source.replace('COLLECT',noGc?'':'$262.gc();'));
   const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/loose-equality#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(parseHostObservation(JSON.parse(native.stdout.toString()))).toMatchObject({kind:'normal',stdout:expected});
  }
 }}finally{await rm(directory,{recursive:true,force:true});}
},900000);

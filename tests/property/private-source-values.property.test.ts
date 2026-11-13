import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildProgram} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';
import {parseHostObservation} from '../test262/protocol';
const prelude='const executeSource=eval;class C{constructor(body){print(executeSource(body));}}new C("17;");';
const cases=[
 {name:'data',source:'class Box{#callback=C;get callback(){return this.#callback;}}const owner=new Box();new (owner.callback)("19;");'},
 {name:'write',source:'class Box{#callback;set callback(value){this.#callback=value;}get callback(){return this.#callback;}}const owner=new Box();owner.callback=C;new (owner.callback)("19;");'},
 {name:'static',source:'class Box{static #callback=C;static get callback(){return this.#callback;}}new (Box.callback)("19;");'},
 {name:'method',source:'class Box{#callback(){return C;}get callback(){return this.#callback();}}const owner=new Box();new (owner.callback)("19;");'},
 {name:'accessor',source:'class Box{#value;get #callback(){return this.#value;}set #callback(value){this.#value=value;}get callback(){return this.#callback;}set callback(value){this.#callback=value;}}const owner=new Box();owner.callback=C;new (owner.callback)("19;");'},
 {name:'inheritance',source:'class Other{constructor(){throw "wrong private name";}}class Base{#callback=C;get callback(){return this.#callback;}}class Box extends Base{#callback=Other;}const owner=new Box();new (owner.callback)("19;");'},
 {name:'alternate-receiver',source:'class Parent{constructor(){return {};}}class Box extends Parent{#callback=C;callback(){return this.#callback;}}const owner=new Box();new (Box.prototype.callback.call(owner))("19;");'},
 {name:'direct-eval',source:'class Box{#callback=C;callback(){return eval("this.#callback");}}const owner=new Box();new (owner.callback())("19;");',evaluation:'this.#callback'},
];
function reference(source:string):string{
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({external:C=>new C("19;"),print:value=>fs.writeSync(1,String(value)+"\\n")});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});return node.stdout.toString();
}
test('canonical private names retain stored, called and assigned source values',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-private-source-values-'));
 try{for(const item of cases){
  const source=prelude+item.source+'print("complete");';expect(reference(source)).toBe('17\n19\ncomplete\n');const entry=join(directory,item.name+'.js');await writeFile(entry,source);const calls=sourceEvaluationInvocations(buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]}).program,{roots:[entry]});
  expect({name:item.name,finite:calls.every(call=>call.choices!==null)}).toEqual({name:item.name,finite:true});
  if(item.evaluation)expect(calls.some(call=>call.choices?.includes(item.evaluation!))).toBe(true);else expect(new Set(calls.flatMap(call=>call.choices??[]))).toEqual(new Set(['17;','19;']));
 }}finally{await rm(directory,{recursive:true,force:true});}
});
test('opaque calls retain constructors read from private state',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-private-escape-source-'));
 try{for(const item of cases.filter(item=>['data','method','accessor'].includes(item.name))){
  const body=item.source.replace('new (owner.callback)("19;");','external(owner.callback);'),source=prelude+body+'print("complete");';expect(reference(source)).toBe('17\n19\ncomplete\n');const entry=join(directory,item.name+'.js');await writeFile(entry,source);const calls=sourceEvaluationInvocations(buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]}).program,{roots:[entry]});expect(calls.find(call=>call.node.getText()==='executeSource(body)')?.choices).toBeNull();
 }}finally{await rm(directory,{recursive:true,force:true});}
});
const brandAndPrivacy='let body="23;";class Guard{#value="secret";read(receiver){return receiver.#value;}has(receiver){return #value in receiver;}}const owner=new Guard();try{owner.read({});}catch(error){if(error instanceof TypeError)body="29;";}print(executeSource(body));print(owner.has(owner));print(owner.has({}));print(Reflect.ownKeys(owner).length===0);print(Object.getOwnPropertySymbols(owner).length===0);print(Reflect.get(owner,"#value")===undefined);print(Reflect.ownKeys({...owner}).length===0);';
test('private values, brands and reflection agree with Node in native execution',async()=>{
 const scenarios=[
  {name:'values-brands-and-privacy',source:prelude+cases.map(item=>'{'+item.source+'}').join('\n')+'{'+brandAndPrivacy+'}print("complete");',expected:'17\n'+cases.map(()=>'19\n').join('')+'29\ntrue\nfalse\ntrue\ntrue\ntrue\ntrue\ncomplete\n'},
 ];
 for(const scenario of scenarios){const {source,expected}=scenario;expect(reference(source)).toBe(expected);
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-private-source-native-'+scenario.name+'-'));
 try{for(const noGc of [false,true]){
  const entry=join(directory,'source.js'),output=join(directory,'program-'+noGc),diagnostics:string[]=[];await writeFile(entry,source);
  const result=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/private-source-values#script',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(expected);
 }}finally{await rm(directory,{recursive:true,force:true});}
 }
},600000);
// `#x in o` evaluates only its right operand. Each placement of a brand check
// and each conversion of its result keeps the program's eval sources finite.
const brandPlacements:Record<string,{member:string;call:string}>={
 instance:{member:'has(r){return #v in r;}',call:'new Guard().has(ARG)'},
 static:{member:'static has(r){return #v in r;}',call:'Guard.has(ARG)'},
 arrow:{member:'has(r){const test=()=>#v in r;return test();}',call:'new Guard().has(ARG)'},
 logical:{member:'has(r){return r!==null&&#v in r;}',call:'new Guard().has(ARG)'},
 conditional:{member:'has(r){return (#v in r)?true:false;}',call:'new Guard().has(ARG)'},
};
const brandConsumers:Record<string,(value:string)=>string>={
 string:value=>`String(${value})`,plus:value=>`${value}+""`,template:value=>'`${'+value+'}`',condition:value=>`(${value}?"t":"f")`,
};
function brandProgram(placement:string,consumer:string,argument:string):string{
 const {member,call}=brandPlacements[placement]!;
 return prelude+`class Guard{#v="s";${member}}const result=${brandConsumers[consumer]!(call.replace('ARG',argument))};print(result);new C(result==="true"||result==="t"?"19;":"23;");`;
}
test('private brand checks keep eval sources finite in every placement and conversion',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-private-brand-source-'));
 try{for(const placement of Object.keys(brandPlacements))for(const consumer of Object.keys(brandConsumers))for(const [argument,branded] of [['new Guard()',true],['{}',false]] as const){
  const source=brandProgram(placement,consumer,argument);
  expect(reference(source)).toBe(`17\n${consumer==='condition'?(branded?'t':'f'):String(branded)}\n${branded?19:23}\n`);
  const entry=join(directory,`${placement}-${consumer}-${branded}.js`);await writeFile(entry,source);
  const calls=sourceEvaluationInvocations(buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]}).program,{roots:[entry]});
  expect({placement,consumer,branded,choices:[...new Set(calls.flatMap(call=>call.choices??['<unknown>']))].sort()}).toEqual({placement,consumer,branded,choices:['17;','19;','23;']});
 }
 // One stress: 64 guard classes whose converted brand results feed one
 // another's arguments.
 const depth=64;let source=prelude;
 for(let index=0;index<depth;index++)source+=`class G${index}{#v${index}=${index};static has(r){return String(#v${index} in r);}}`;
 source+='let text="";';for(let index=0;index<depth;index++)source+=`text+=G${index}.has(${index%2?'{}':`new G${index}()`});`;
 source+=`print(text.length);new C(text.length===${depth/2*('true'.length+'false'.length)}?"19;":"23;");`;
 expect(reference(source)).toBe(`17\n${depth/2*9}\n19\n`);
 const entry=join(directory,'stress.js');await writeFile(entry,source);
 const calls=sourceEvaluationInvocations(buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]}).program,{roots:[entry]});
 expect(calls.every(call=>call.choices!==null)).toBe(true);
 expect(new Set(calls.flatMap(call=>call.choices??[]))).toEqual(new Set(['17;','19;','23;']));
 }finally{await rm(directory,{recursive:true,force:true});}
},600000);

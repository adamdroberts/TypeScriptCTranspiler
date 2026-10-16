import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {buildProgram} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';
import {nodeReferenceSync} from './node-reference';
const prelude='const executeSource=eval;';
const partitions=[
 {name:'data',source:'print(executeSource(Reflect.get({body:"17;"},"body")));',stdout:'17\n',values:['17;']},
 {name:'inherited-receiver',source:'const target=Object.create({get body(){return this.text;}}),receiver={text:"19;"};print(executeSource(Reflect.get(target,"body",receiver)));',stdout:'19\n',values:['19;']},
 {name:'explicit-undefined',source:'const target={text:"29;",get body(){"use strict";return this===undefined?"23;":this.text;}};print(executeSource(Reflect.get(target,"body",undefined)));print(executeSource(Reflect.get(target,"body")));',stdout:'23\n29\n',values:['23;','29;']},
 {name:'forwarding',source:'const target={get body(){return this.text;}},receiver={text:"31;"},read=Reflect.get.bind(null,target);print(executeSource(read("body",receiver)));print(executeSource(Reflect.apply(Reflect.get,null,[target,"body",receiver])));',stdout:'31\n31\n',values:['31;']},
 {name:'wrapped-getter',source:'function load(){return Reflect.get({get body(){return "139;";}},"body");}print(executeSource(load()));',stdout:'139\n',values:['139;']},
 {name:'boxed-return',source:'function load(value){return String(value);}print(executeSource(load({toString(){return "149;";}})));',stdout:'149\n',values:['149;']},
 {name:'key-effects',source:'let body="37;";const key={toString(){body="41;";return "body";}};print(executeSource(Reflect.get({body:"43;"},key)));print(executeSource(body));',stdout:'43\n41\n',values:['43;','41;']},
 {name:'target-before-key',source:'let body="47;";try{Reflect.get(1,{toString(){body="53;";return "x";}});}catch(error){}print(executeSource(body));',stdout:'47\n',values:['47;'],exact:true},
 {name:'key-throw',source:'let body="61;";try{Reflect.get({}, {[Symbol.toPrimitive](){throw "59;";}});}catch(thrown){body=thrown;}print(executeSource(body));',stdout:'59\n',values:['59;']},
 {name:'own-key-values',source:'const owner={};Object.defineProperty(owner,"67;",{value:0,enumerable:false});owner["71;"]=0;const keys=Reflect.ownKeys(owner);print(executeSource(keys[0]));print(executeSource(keys[1]));print(keys.length);',stdout:'67\n71\n2\n',values:['67;','71;']},
 {name:'no-getter-on-keys',source:'let body="73;";const owner={get ["79;"](){body="invalid source(";return 0;}};Object.getOwnPropertyNames(owner);Reflect.ownKeys(owner);print(executeSource(body));',stdout:'73\n',values:['73;'],exact:true},
 {name:'symbol-selection',source:'const key=Symbol("key"),owner={[key]:0,plain:0};const symbols=Object.getOwnPropertySymbols(owner);print(executeSource(symbols[0]===key?"83;":"89;"));print(symbols.length);print(Object.getOwnPropertyNames(owner).length);',stdout:'83\n1\n1\n',values:['83;']},
 {name:'primitive-box',source:'print(Object.getOwnPropertyNames("ab").length);print(Object.getOwnPropertySymbols(1).length);print(executeSource("97;"));',stdout:'3\n0\n97\n',values:['97;']},
 {name:'construction',source:'let body="101;";try{new Reflect.ownKeys({});}catch(error){if(error instanceof TypeError)body="103;";}print(executeSource(body));',stdout:'103\n',values:['103;']},
 {name:'proxy-receiver',source:'const receiver={token:1},target={get value(){return this;}},proxy=new Proxy(target,{get(target,key,receiver){return Reflect.get(target,key,receiver);}});print(Reflect.get(proxy,"value",receiver)===receiver);print(executeSource("113;"));',stdout:'true\n113\n',values:['113;']},
 {name:'mutation',source:'const original=Reflect.get;Reflect.get=function(){return "127;";};print(executeSource(Reflect.get({},"body")));Reflect.get=original;',stdout:'127\n',values:['127;']},
 {name:'ignored-actual-effects',source:'let body="131;";Reflect.ownKeys({},body="137;");print(executeSource(body));',stdout:'137\n',values:['137;']},
 {name:'host-owner',source:'const value=Reflect.get($262,"global");print(executeSource(value?"151;":"157;"));',stdout:'151\n',values:['151;']},
 {name:'metadata',source:'print(Reflect.get.name);print(Reflect.get.length);print(Object.getOwnPropertyNames.name);print(Object.getOwnPropertyNames.length);print(executeSource("107;"));',stdout:'get\n2\ngetOwnPropertyNames\n1\n107\n',values:['107;']},
];
function reference(source:string):string{
 const result=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm"),context=vm.createContext({print:value=>fs.writeSync(1,String(value)+"\\n")});context.$262={global:vm.runInContext("globalThis",context)};new vm.Script(fs.readFileSync(0,"utf8")).runInContext(context);'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});
 expect({exitCode:result.exitCode,stderr:result.stderr.toString()}).toEqual({exitCode:0,stderr:''});return result.stdout.toString();
}
async function calls(entry:string,source:string){await writeFile(entry,source);return sourceEvaluationInvocations(buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]}).program,{roots:[entry]});}
test('reflection retains own keys, actual receivers, ordering gates and source effects',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-reflection-source-'));
 try{for(const part of partitions){
  const source=prelude+part.source+'print("complete");';expect({name:part.name,stdout:reference(source)}).toEqual({name:part.name,stdout:part.stdout+'complete\n'});
  const observed=await calls(join(directory,part.name+'.js'),source);expect({name:part.name,finite:observed.every(call=>call.choices!==null)}).toEqual({name:part.name,finite:true});const values=new Set(observed.flatMap(call=>call.choices??[]));for(const value of part.values)expect(values).toContain(value);if(part.exact)expect(values).toEqual(new Set(part.values));
 }
 const source=prelude+'const owner={body:String(Math.random())};executeSource(Reflect.get(owner,"body"));';const entry=join(directory,'unknown.js');expect((await calls(entry,source)).some(call=>call.choices===null)).toBe(true);
 const diagnostics:string[]=[];const rejected=await compile({entry,output:join(directory,'unknown'),noGc:true,isolatedScriptRoots:[entry],initializationEntries:[entry],diagnosticWriter:message=>diagnostics.push(message)});expect(rejected.exitCode).toBe(3);expect(diagnostics.join('')).toContain('unknown eval() source requires --runtime-code-manifest allow-list');
 }finally{await rm(directory,{recursive:true,force:true});}
});
function retainedGraph(depth:number):string{
 return 'const root={get body(){return this.text;}};'+Array.from({length:depth},(_,index)=>'const owner'+index+'=Object.create('+(index?'owner'+(index-1):'root')+');').join('\n')+'const receiver={text:"109;"};print(executeSource(Reflect.get(owner'+(depth-1)+',"body",receiver)));';
}
test('reflection source closure agrees with Node through one deep owner graph',async()=>{
 const source=prelude+partitions.map(part=>'{'+part.source+'}').join('\n')+retainedGraph(512)+'print("complete");',expected=partitions.map(part=>part.stdout).join('')+'109\ncomplete\n';expect(reference(source)).toBe(expected);
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-reflection-native-'));
 try{for(const noGc of [false,true]){
  const entry=join(directory,'source.js'),output=join(directory,'program-'+noGc),diagnostics:string[]=[];await writeFile(entry,source);
  const result=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/reflection-source#script',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(expected);
 }}finally{await rm(directory,{recursive:true,force:true});}
},600000);

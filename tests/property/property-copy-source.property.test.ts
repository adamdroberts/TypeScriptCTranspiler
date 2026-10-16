import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildProgram} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';
import {parseHostObservation} from '../test262/protocol';
const prelude='const executeSource=eval;';
const copies=[
 {name:'data',source:'const copy={...{body:"17;"}};print(executeSource(copy.body));',value:'17;',stdout:'17\n'},
 {name:'get',source:'let seen="";const copy={...{get body(){seen+="get";return "19;";}}};print(executeSource(copy.body));print(seen);',value:'19;',stdout:'19\nget\n'},
 {name:'symbol',source:'const key=Symbol("body"),copy={...{[key]:"23;"}};print(executeSource(copy[key]));',value:'23;',stdout:'23\n'},
 {name:'own-enumerable',source:'const source=Object.create({inherited:"97;"});Object.defineProperty(source,"hidden",{get(){throw "unreached";},enumerable:false});source.body="29;";const copy={...source};print(executeSource(copy.body));print("inherited" in copy);print("hidden" in copy);',value:'29;',stdout:'29\nfalse\nfalse\n'},
 {name:'primitive',source:'const copy={..."31;"};print(executeSource(copy[0]+copy[1]+copy[2]));',value:'31;',stdout:'31\n'},
 {name:'nullish',source:'const copy={...null,...undefined,body:"37;"};print(executeSource(copy.body));',value:'37;',stdout:'37\n'},
 {name:'unknown-key',source:'const key=String(Math.floor(Math.random())+109),copy={...{[key]:"41;"}};print(executeSource(copy[109]));',value:'41;',stdout:'41\n'},
 {name:'unknown-getter',source:'let seen="";const key=String(Math.floor(Math.random())+109),source={get [key](){seen+="get";return "53;";}},copy={...source};print(executeSource(copy[109]));print(seen);',value:'53;',stdout:'53\nget\n'},
 {name:'delete-presence',source:'let body="17;";const prototype={get 109(){body="47;";return 0;}},target=Object.create(prototype);Object.defineProperty(target,"109",{value:0,configurable:true});delete target[String(Math.floor(Math.random())+109)];target[109];print(executeSource(body));',value:'47;',choices:['17;','47;'],stdout:'47\n'},
 {name:'proto-key',source:'const copy={...{["__proto__"]:"43;"}};print(executeSource(copy.__proto__));print(Object.getPrototypeOf(copy)===Object.prototype);',value:'43;',stdout:'43\ntrue\n'},
];
const escapes=[
 {name:'unknown-native-getter',source:'const key=String(Math.floor(Math.random())+109);Object.defineProperty(Array.prototype,key,{get(){return read;},configurable:true});const callback=function(){return callback[109]("19;");};Object.setPrototypeOf(callback,Array.prototype);callback();'},
 {name:'unknown-descriptor',source:'const key=String(Math.floor(Math.random())+109),descriptor=Object.getOwnPropertyDescriptor({[key]:read},"109");const receiver={};Object.setPrototypeOf(receiver,descriptor);receiver.value("19;");'},
 {name:'spread-descriptor',source:'const descriptor=Object.getOwnPropertyDescriptor({...{callback:read}},"callback"),receiver={};Object.setPrototypeOf(receiver,descriptor);receiver.value("19;");'},
 {name:'proxy-copy',source:'const copy={...new Proxy({callback:read},{})};const receiver={};Object.setPrototypeOf(receiver,copy);receiver.callback("19;");'},
];
function reference(source:string):string{
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});return node.stdout.toString();
}
async function choices(entry:string,source:string,readBody=false){await writeFile(entry,source);return sourceEvaluationInvocations(buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]}).program,{roots:[entry]}).filter(call=>!readBody||call.node.getText()==='executeSource(body)').map(call=>call.choices&&[...call.choices].sort());}
test('own-value copying retains values, Get effects, property kinds and callback payloads',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-property-copy-source-'));
 try{
  for(const item of copies){const source=prelude+item.source+'print("complete");';expect(reference(source)).toBe(item.stdout+'complete\n');expect({name:item.name,calls:await choices(join(directory,item.name+'.js'),source)}).toEqual({name:item.name,calls:[[...(item.choices??[item.value])].sort()]});}
  for(const item of escapes){const source=prelude+'function read(body){print(executeSource(body));}read("17;");'+item.source+'print("complete");';expect(reference(source)).toBe('17\n19\ncomplete\n');const entry=join(directory,item.name+'.js');const calls=await choices(entry,source,true);expect(calls.length>0).toBe(true);for(const call of calls)if(call!==null&&call.length){expect(call).toContain('17;');expect(call).toContain('19;');}const diagnostics:string[]=[];const result=await compile({entry,output:join(directory,item.name),noGc:true,isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/property-copy#escape',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});if(result.exitCode===0){const native=Bun.spawnSync([join(directory,item.name)],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe('17\n19\ncomplete\n');}else{expect(result.exitCode).toBe(3);expect(diagnostics.join('')).toContain('unknown eval() source requires --runtime-code-manifest allow-list');}}
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('ordinary own-value copying matches Node in both native memory modes',async()=>{
 const source=prelude+copies.map(item=>'{'+item.source+'}').join('\n')+'print("complete");',expected=copies.map(item=>item.stdout).join('')+'complete\n';expect(reference(source)).toBe(expected);
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-property-copy-native-'));
 try{for(const noGc of [false,true]){
  const entry=join(directory,'source.js'),output=join(directory,'program-'+noGc),diagnostics:string[]=[];await writeFile(entry,source);
  const result=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/property-copy#script',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(expected);
 }}finally{await rm(directory,{recursive:true,force:true});}
},600000);

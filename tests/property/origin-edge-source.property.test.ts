import {nodeReferenceSync} from './node-reference';
import{expect,test}from'bun:test';
import ts from'typescript';
import{sourceEvaluationInvocations}from'../../src/source-value-flow';
import{finiteEvalScriptSourceGraph as graph}from'../test262/native-host';
const partitions=[
 {setup:'const owner={value:"17;"};',capture:'const saved=owner.value;',effect:'opaque(owner);',read:'saved'},
 {setup:'function make(value){return {value}};const owner=make("17;");',capture:'const saved=owner.value;',effect:'opaque(owner);',read:'saved'},
 {setup:'function make(value){return {value}};const owner=make("17;");',capture:'function saved(){return owner.value}',effect:'opaque(owner);',read:'saved()'},
 {setup:'const owner={value:"17;"};owner.self=owner;',capture:'const saved=owner.self.value;',effect:'opaque(owner);',read:'saved'},
 {setup:'const owner={value:"17;"};function read(){return owner.value}',capture:'const saved=read();',effect:'opaque(owner);',read:'saved'}
];
test('origin edges retain actual saved source through owner and invocation graphs',()=>{
 const sources=partitions.map(p=>p.setup+p.capture+p.effect+`eval(${p.read});`);
 const oracle=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");fs.writeSync(1,JSON.stringify(JSON.parse(process.argv[1]).map(source=>{let result;new vm.Script(source).runInNewContext({opaque(owner){owner.value="19;"},eval(value){result=value}});return result})));',JSON.stringify(sources)],{stdout:'pipe',stderr:'pipe'});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});const observed:string[]=JSON.parse(oracle.stdout.toString());
 for(const[index,source]of sources.entries()){
  const result=graph([{path:'main.js',source}]);const values=result.directEvalSources.map(entry=>entry.source);
  if(index===2)expect(result.error).toContain('direct eval source is not a finite static string expression');
  else {expect(result.error).toBeNull();expect(values).toContain(observed[index]);}
 }
 for(const p of partitions){const source=p.setup+p.effect+p.capture+`eval(${p.read});`;expect(graph([{path:'main.js',source}]).error).toContain('direct eval source is not a finite static string expression');}
},120000);

test('origin projection keeps one wide observed owner finite before opaque effects',()=>{
 const width=512,fields=Array.from({length:width},(_,index)=>`key${index}:"17;"`).join(','),reads=Array.from({length:width},(_,index)=>`const captured${index}=owner.key${index};opaque(owner);`).join('\n');
 const source=`const owner={${fields}};${reads}eval(captured0);eval(owner.key511);`;
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm"),fs=require("node:fs");const values=[];new vm.Script(process.argv[1]).runInNewContext({opaque(owner){owner.key511="19;"},eval(value){values.push(value)}});fs.writeSync(1,JSON.stringify(values));',source],{stdout:'pipe',stderr:'pipe'});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString(),stdout:oracle.stdout.toString()}).toEqual({code:0,stderr:'',stdout:'["17;","19;"]'});
 const name='input.js',options={allowJs:true,noLib:true,noEmit:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);
 host.getSourceFile=file=>file===name?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;host.readFile=file=>file===name?source:undefined;host.fileExists=file=>file===name;
 const calls=sourceEvaluationInvocations(ts.createProgram([name],options,host));
 expect(calls.find(call=>call.node.getText()==='eval(captured0)')?.choices).toEqual(['17;']);expect(calls.find(call=>call.node.getText()==='eval(owner.key511)')?.choices).toBeNull();
},120000);

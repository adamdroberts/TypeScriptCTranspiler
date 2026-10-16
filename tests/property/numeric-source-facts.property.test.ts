import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';import * as os from 'node:os';import * as path from 'node:path';
import ts from 'typescript';import {compile} from '../../src/compile';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';import {parseHostObservation} from '../test262/protocol';

function program(source:string):ts.Program {
 const name='source.js',options={allowJs:true,noLib:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);
 host.getSourceFile=file=>file===name?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>file===name?source:undefined;host.fileExists=file=>file===name;return ts.createProgram([name],options,host);
}
// Independent language spellings and value-kind partitions; the oracle does
// not import the compiler's operation descriptors or evaluator.
const operators=['+','-','*','/','%','**','&','|','^','<<','>>','>>>','<','<=','>','>=','==','!=','===','!=='];
const operands=[['7','3'],['-7','3'],['7n','3n'],['-7n','3n'],['7n','3'],['7','3n'],['1','-0'],['0','0'],['NaN','2'],['Infinity','-Infinity'],['"12"','"9"'],['"7"','3'],['null','true'],['undefined','false'],['Symbol.iterator','1'],['9007199254740993n','9007199254740992']];
const expressions=operators.flatMap(operator=>operands.map(([left,right])=>`(${left})${operator}(${right})`));
const initializationSources=[
 'var left=base;var base=3;eval("\'"+String(left*7)+"\'");',
 'var x;eval("\'"+String(x*7)+"\'");',
 'if(false){var x=3;}eval("\'"+String(x*7)+"\'");',
 'f();var x=3;function f(){eval("\'"+String(x*7)+"\'");}',
];
expressions.push(...['+','-','~'].flatMap(operator=>['0','-0','3','3n','"7"','null','undefined','Symbol.iterator'].map(value=>`${operator}(${value})`)));
expressions.push('1/(true?0:-0)','1/-0','({valueOf(){return 7;}})*({[Symbol.toPrimitive](hint){return hint==="number"?3:11;}})','({valueOf(){return {};},toString(){return "12";}})<"9"');
expressions.push('`value:${({toString(){return "12";}})}`');
function oracle():Array<{normal:boolean;value?:string}> {
 const child=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");const input=JSON.parse(process.argv[1]);fs.writeSync(1,JSON.stringify(input.map(source=>{try{return {normal:true,value:String(vm.runInNewContext(source))};}catch{return {normal:false};}})));',JSON.stringify(expressions)],{stdout:'pipe',stderr:'pipe'});
 expect({exitCode:child.exitCode,stderr:child.stderr.toString()}).toEqual({exitCode:0,stderr:''});return JSON.parse(child.stdout.toString());
}
test('finite numeric source facts preserve operand Types, signed zero and abrupt completion',()=>{
 const expected=oracle();
 for(const [index,expression] of expressions.entries()){
  const source=`eval("'"+String(${expression})+"'");`,choices=sourceEvaluationInvocations(program(source)).at(-1)?.choices;
  expect({expression,choices}).toEqual({expression,choices:expected[index]!.normal?[`'${expected[index]!.value}'`]:[]});
 }
 expect(sourceEvaluationInvocations(program('eval(String(1/(flag?0:-0)));')).at(-1)?.choices?.slice().sort()).toEqual(['-Infinity','Infinity']);
 for(const update of ['x++','x--','++x','--x'])expect(sourceEvaluationInvocations(program(`var x=1;eval(${update});`)).at(-1)?.choices).toEqual([]);
 expect(sourceEvaluationInvocations(program('eval(String((external?1:2)*7));')).at(-1)?.choices?.slice().sort()).toEqual(['14','7']);
 expect(sourceEvaluationInvocations(program('class C {}var first={},second={};String(first===second);eval(C.toString());')).at(-1)?.choices).toEqual(['class C {}']);
 const template='class C {}var first={toString(){throw "1065;";}},second={toString(){C.toString=external;return "bad";}};try{`${first}${second}`;}catch(source){eval(source);}eval(C.toString());';
 expect(Object.fromEntries(sourceEvaluationInvocations(program(template)).map(call=>[call.node.getText(),call.choices]))).toEqual({'eval(source)':['1065;'],'eval(C.toString())':['class C {}']});
 for(const source of initializationSources){
  const node=nodeReferenceSync(['node','-e','const values=[];require("node:vm").runInNewContext(process.argv[1],{eval:source=>values.push(source)});require("node:fs").writeSync(1,JSON.stringify(values));',source],{stdout:'pipe',stderr:'pipe'});
  expect(node.exitCode).toBe(0);const expected:string[]=JSON.parse(node.stdout.toString()),choices=sourceEvaluationInvocations(program(source)).flatMap(call=>call.choices??[]);
  expect({source,missing:expected.filter(value=>!choices.includes(value))}).toEqual({source,missing:[]});
 }
 for(const operator of ['*','/','<','<=','>','>=']){
  const source=`class C {}var first={valueOf(){throw "1061;";}},second={valueOf(){C.toString=external;return 3;}};try{first${operator}second;}catch(source){eval(source);}eval(C.toString());`;
  expect(Object.fromEntries(sourceEvaluationInvocations(program(source)).map(call=>[call.node.getText(),call.choices]))).toEqual({'eval(source)':['1061;'],'eval(C.toString())':['class C {}']});
 }
 // Relational operations have a finite Boolean normal-result domain even
 // when operand conversion is unknown or abrupt. Check the independent VM
 // completion domain before checking the source proof.
 for(const operator of ['<','<=','>','>=']){
  const source=`eval(String(external${operator}3));`;
  const script='const fs=require("node:fs"),vm=require("node:vm"),observed=[];for(const external of [undefined,null,false,true,-1,3,4,1n,"2","x",Symbol(),{valueOf(){return 5;}},{valueOf(){throw 1;}}]){try{vm.runInNewContext(process.argv[1],{external,eval:value=>{observed.push(value);}});}catch(error){}}fs.writeSync(1,JSON.stringify([...new Set(observed)].sort()));';
  const node=nodeReferenceSync(['node','-e',script,source],{stdout:'pipe',stderr:'pipe'});
  expect({code:node.exitCode,stderr:node.stderr.toString(),values:JSON.parse(node.stdout.toString())}).toEqual({code:0,stderr:'',values:['false','true']});
  expect(sourceEvaluationInvocations(program(source)).at(-1)?.choices?.slice().sort()).toEqual(['false','true']);
 }
 for(const source of ['eval(String(external*3));','var x=1;while(flag){x++;}eval(String(x));'])
  expect({source,choices:sourceEvaluationInvocations(program(source)).at(-1)?.choices}).toEqual({source,choices:null});
});
test('numeric source expressions and a deep operation tree match Node in both memory modes',async()=>{
 const pieces=['function observe(source){print(String(eval(source)));}'];
 for(const expression of expressions)pieces.push(`try{observe("'"+String(${expression})+"'");}catch(error){print(error instanceof TypeError?"TypeError":error instanceof RangeError?"RangeError":"other");}`);
 for(const [index,source] of initializationSources.entries())pieces.push(`function scope${index}(){${source.replaceAll('eval(','observe(')}}scope${index}();`);
 let deep='7';for(let index=0;index<512;index++)deep=`((${deep}*3)%1009)`;
 pieces.push(`observe("'"+String(${deep})+"'");`);
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-numeric-source-'));
 try{
  const entry=path.join(directory,'source.js');await fs.writeFile(entry,pieces.join('\n'));
  const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});',entry],{stdout:'pipe',stderr:'pipe'});
  expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const noGc of [false,true]){
   const output=path.join(directory,'program-'+noGc),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build-'+noGc),isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/numeric-source-facts.js#sloppy',setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString());
  }
 }finally{await fs.rm(directory,{recursive:true,force:true});}
},600_000);
test('unresolved numeric text keeps the stable source admission diagnostic',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-numeric-source-boundary-'));
 try{
  const entry=path.join(directory,'source.js'),diagnostics:string[]=[];await fs.writeFile(entry,'eval(String(external*3));');
  const result=await compile({entry,output:path.join(directory,'rejected'),noGc:true,buildDir:path.join(directory,'build'),isolatedScriptRoots:[entry],initializationEntries:[entry],diagnosticWriter:message=>diagnostics.push(message)});
  expect(result.exitCode).toBe(3);expect(diagnostics.join('')).toContain('unknown eval() source requires --runtime-code-manifest allow-list or gated --unsafe-eval embedded Node bridge');
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});

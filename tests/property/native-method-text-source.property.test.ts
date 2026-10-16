import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

function reference(source:string):string{
 const script='const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({print:value=>{fs.writeSync(1,String(value)+"\\n");}});';
 const node=nodeReferenceSync(['node','-e',script],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});return node.stdout.toString();
}
const methods=['Object.hasOwn','Object.is','Object.prototype.hasOwnProperty','Reflect.apply','Array.prototype.values','Function.prototype.call','Function.prototype.toString','String.fromCodePoint','JSON.stringify','Function.prototype[Symbol.hasInstance]'];
const programs=[
 ...methods.map(method=>'{const value='+method+';print(eval(JSON.stringify(value.toString())));}'),
 '{const value=Object.hasOwn,descriptor=Object.getOwnPropertyDescriptor(value,"name");Object.defineProperty(value,"name",{get(){throw "name read";},configurable:true});print(eval(JSON.stringify(Function.prototype.toString.call(value))));Object.defineProperty(value,"name",descriptor);}',
 '{const value=Object.is,text=Function.prototype.toString;Function.prototype.toString=function(){return "71;";};print(eval(value.toString()));print(eval(JSON.stringify(text.call(value))));Function.prototype.toString=text;}',
 '{const value=new Proxy(Object.hasOwn,{get(){throw "proxy Get";}});print(eval(JSON.stringify(Function.prototype.toString.call(value))));}',
 '{const value=Object.hasOwn.bind(null);print(eval(JSON.stringify(value.toString())));}',
];
// NativeFunction spelling is implementation-defined for this intrinsic.
// The core profile retains its anonymous initial-name form; both engines
// independently satisfy the NativeFunction grammar.
const grammarSource='{const value=Object.getOwnPropertyDescriptor(Function.prototype,"caller").get;print(/^function(?:\\s+(?:(?:get|set)\\s+)?[A-Za-z_$][\\w$]*)?\\s*\\([^)]*\\)\\s*\\{\\s*\\[native code\\]\\s*\\}$/.test(eval(JSON.stringify(value.toString()))));}';
const coreSource='{const value=Object.getOwnPropertyDescriptor(Function.prototype,"caller").get;print("core-native:"+eval(JSON.stringify(value.toString())));}';
const nativeGrammar=/^function(?:\s+(?:(?:get|set)\s+)?[A-Za-z_$][\w$]*)?\s*\([^)]*\)\s*\{\s*\[native code\]\s*\}$/;
function normalized(stdout:string):string{return stdout.split('\n').map(line=>{if(!line.startsWith('core-native:'))return line;expect(nativeGrammar.test(line.slice('core-native:'.length))).toBe(true);return 'core-native:valid';}).join('\n');}
test('native method text uses initial descriptor names through ordinary callable routes',()=>{
 for(const source of programs){const expected=reference(source),result=graph([{path:'subject.js',source}]);expect({source,error:result.error}).toEqual({source,error:null});const admitted=result.directEvalSources.map(item=>item.source);
  for(const line of expected.trimEnd().split('\n'))expect({source,admitted}).toMatchObject({admitted:expect.arrayContaining([line==='71'?'71;':JSON.stringify(line)])});
 }
 expect(reference(grammarSource)).toBe('true\n');
 const core=graph([{path:'subject.js',source:coreSource}]);expect(core.error).toBeNull();expect(core.directEvalSources.map(value=>value.source)).toContain(JSON.stringify('function () { [native code] }'));
 for(const source of ['print(eval(external.toString()));','print(eval(JSON.stringify(Object.hasOwn.toString())));Object.hasOwn=external;print(eval(Object.hasOwn.toString()));'])expect({source,error:graph([{path:'subject.js',source}]).error}).toEqual({source,error:expect.stringContaining('direct eval source is not a finite static string expression')});
});
function retainedSource():string{
 const aliases=Array.from({length:512},(_,index)=>'const value'+(index+1)+'=value'+index+';').join('\n');
 return '{const value0=Object.prototype.hasOwnProperty;'+aliases+'COLLECT print(eval(JSON.stringify(Function.prototype.toString.call(value512))));print("native-method-text-complete");}';
}
test('a RegExp observer before the retained callable read remains a recorded admission gap',()=>{
 const source=programs.join('\n')+'\n'+grammarSource+'\n'+retainedSource().replace('COLLECT','');
 expect(reference(source).endsWith('native-method-text-complete\n')).toBe(true);
 expect(graph([{path:'subject.js',source}]).error).toContain('direct eval source is not a finite static string expression');
});
test('one retained native callable graph matches complete Node and native output',async()=>{
 const source=programs.join('\n')+'\n'+coreSource+'\n'+retainedSource(),expected=reference(source.replace('COLLECT',''));expect(expected.endsWith('function hasOwnProperty() { [native code] }\nnative-method-text-complete\n')).toBe(true);
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-native-method-text-'));
 try{for(const noGc of [false,true]){
  const entry=join(directory,'subject.js'),output=join(directory,'program-'+noGc),diagnostics:string[]=[];await writeFile(entry,source.replace('COLLECT',noGc?'':'$262.gc();'));
  const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/native-method-text.js#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toContain('core-native:function () { [native code] }\n');expect(normalized(observation.stdout??'')).toBe(normalized(expected));
 }}finally{await rm(directory,{recursive:true,force:true});}
},900000);

test('native function text remains a runtime SyntaxError when evaluated as ECMAScript source',async()=>{
 const source='{try{eval(Object.hasOwn.toString());print("unexpected");}catch(error){print(error instanceof SyntaxError);}print("native-text-abrupt-complete");}';
 const expected=reference(source);expect(expected).toBe('true\nnative-text-abrupt-complete\n');
 const result=graph([{path:'subject.js',source}]);expect(result.error).toBeNull();expect(result.directEvalSources.map(value=>value.source)).toContain('function hasOwn() { [native code] }');
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-native-text-abrupt-'));
 try{for(const noGc of [false,true]){
  const entry=join(directory,'subject.js'),output=join(directory,'program-'+noGc),diagnostics:string[]=[];await writeFile(entry,source);
  const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/native-text-abrupt.js#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(parseHostObservation(JSON.parse(native.stdout.toString()))).toMatchObject({kind:'normal',stdout:expected});
 }}finally{await rm(directory,{recursive:true,force:true});}
},900000);

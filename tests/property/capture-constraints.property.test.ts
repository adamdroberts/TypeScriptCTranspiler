import {expect,test} from 'bun:test';
import ts from 'typescript';
import fs from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {sourceConstructorFacts} from '../../src/source-value-flow';
import {nodeReferenceSync} from './node-reference';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';
function reference(source:string,completion=false,setup='function external(){return "19;";}'):string{
 const script='const fs=require("node:fs"),vm=require("node:vm"),write=value=>{fs.writeSync(1,String(value)+"\\n");};const result=new vm.Script('+JSON.stringify(setup)+'+fs.readFileSync(0,"utf8")).runInNewContext({print:write,console:{log:(...values)=>{write(values.join(" "));}},setImmediate});'+(completion?'Promise.resolve(result).then(()=>write("oracle-probe-complete"));':'');
 const node=nodeReferenceSync(['node','-e',script],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});return node.stdout.toString();
}
const wrap=(body:string)=>'{const evaluate=code=>{print(code);return eval(code);};'+body+'}';
function program(source:string):ts.Program {const name='subject.js',options={allowJs:true,noLib:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);host.getSourceFile=file=>file===name?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;host.readFile=file=>file===name?source:undefined;host.fileExists=file=>file===name;return ts.createProgram([name],options,host);}
test('capture constraints retain inactivity, scalar snapshots and conservative overlapping writes',()=>{
 const cases=[
  {source:wrap('const run=async body=>{const saved=body;await 0;body=external();evaluate(saved);};run("17;");'),output:'17;\n'},
  {source:wrap('const run=function*(body){const saved=body;yield 0;body=external();evaluate(saved);};const iterator=run("17;");iterator.next();iterator.next();'),output:'17;\n'},
  {source:wrap('const run=body=>{for(let index=0;index<2;index++){const saved=body;body=external();evaluate(saved);}};run("17;");'),output:'17;\n19;\n',unknown:true},
  {source:wrap('let body="17;";const run=async()=>{const saved=body;await 0;body=external();evaluate(saved);};run().then(()=>run());'),output:'17;\n19;\n',unknown:true},
 ];
 for(const item of cases){expect(reference(item.source,true)).toBe(item.output+'oracle-probe-complete\n');const result=graph([{path:'subject.js',source:item.source}]);if('unknown'in item)expect(result.error).toContain('direct eval source is not a finite static string expression');else{expect(result.error).toBeNull();expect(result.directEvalSources.map(value=>value.source)).toContain('17;');}}
 for(const kind of ['async function','function*','function']){const source='{const unused='+kind+'(){eval(external());};print("inactive");}';expect(reference(source,true)).toBe('inactive\noracle-probe-complete\n');const result=graph([{path:'subject.js',source}]);expect(result.error).toBeNull();expect(result.directEvalSources).toEqual([]);}
 // A selected write can contain a repeated RHS read. Projecting only the
 // outer write event would register later, unreachable constructor source.
 const source='{async function run(body){let code=body;for(let index=0;index<1;index++){code=code;}const saved=code;code="19;";print(saved);return Function(saved)();}run("17;");}';
 expect(reference(source,true)).toBe('17;\noracle-probe-complete\n');expect(sourceConstructorFacts(program(source))).toEqual([{kind:'ordinary',arguments:[['17;']],complete:true}]);
});
const conjunctions=["left+right","right+left"].map(expression=>({
 source:'{async function run(a,b){let left=a,right=b;left=right+left;const saved='+expression+';await 0;left=String(Math.random());right=String(Math.random());print(eval(saved));return Function("return("+saved+")")();}run("17","19").then(()=>print("capture-conjunction-complete"));}',
 expected:(expression==="left+right"?"191719":"191917")+'\ncapture-conjunction-complete\n',
 actual:expression==="left+right"?"191719":"191917",
}));
test('interleaved scalar masks retain their conjunction through RHS operations and actual return substitution',()=>{
 for(const item of conjunctions){
  expect(reference(item.source,true)).toBe(item.expected+'oracle-probe-complete\n');
  const result=graph([{path:'subject.js',source:item.source}]);expect(result.error).toBeNull();expect(result.directEvalSources.map(value=>value.source)).toContain(item.actual);
  expect(sourceConstructorFacts(program(item.source))).toContainEqual({kind:'ordinary',arguments:[expect.arrayContaining(['return('+item.actual+')'])],complete:true});
  const unknown=item.source.replace('const saved='+ (item.source.includes('saved=left+right')?'left+right':'right+left')+';await 0;left=String(Math.random());right=String(Math.random());','left=String(Math.random());right=String(Math.random());const saved=left+right;await 0;');
  expect(reference(unknown,true,'Math.random=()=>19;')).toBe('1919\ncapture-conjunction-complete\noracle-probe-complete\n');
  expect(graph([{path:'subject.js',source:unknown}]).error).toContain('direct eval source is not a finite static string expression');
 }
});
function retainedSource():string {const aliases=Array.from({length:512},(_,index)=>'const value'+(index+1)+'=value'+index+';').join('\n');return '{const run=function*(body){const value0=body;'+aliases+'yield 0;print(eval(value512));print("source-gate-complete");};const iterator=run("31;");iterator.next();COLLECT iterator.next();}';}
test('one retained suspended source graph matches complete Node and native output',async()=>{
 const subjects=[{source:retainedSource(),expected:'31\nsource-gate-complete\n'},...conjunctions];const directory=await fs.mkdtemp(join(tmpdir(),'tsc2c-capture-constraints-'));
 try{for(const {source,expected}of subjects){expect(reference(source.replace('COLLECT',''))).toBe(expected);for(const noGc of [false,true]){const entry=join(directory,'subject.js'),output=join(directory,'program-'+noGc),diagnostics:string[]=[];await fs.writeFile(entry,source.replace('COLLECT',noGc?'':'$262.gc();'));
  const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/capture-constraints.js#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(parseHostObservation(JSON.parse(native.stdout.toString()))).toMatchObject({kind:'normal',stdout:expected});
 }}}finally{await fs.rm(directory,{recursive:true,force:true});}
},900000);
test('the unchanged original async suspension consumer matches independent Node in both memory modes',async()=>{
 const entry=join(process.cwd(),'tests/e2e/cases/async_await_branch_post_await_nested_suspend/in.ts'),source=await fs.readFile(entry,'utf8'),erased=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText,expected=reference(erased);expect(expected).toBe(await fs.readFile(join(entry,'../expected.stdout'),'utf8'));expect(expected.length).toBeGreaterThan(0);
 const directory=await fs.mkdtemp(join(tmpdir(),'tsc2c-original-async-'));try{for(const noGc of [false,true]){const output=join(directory,'program-'+noGc),diagnostics:string[]=[],built=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:message=>diagnostics.push(message)});expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:expected});}}finally{await fs.rm(directory,{recursive:true,force:true});}
},900000);

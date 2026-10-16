import {expect,test} from 'bun:test';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ts from 'typescript';
import {buildProgram} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';
import {parseHostObservation} from '../test262/protocol';

function reference(source:string):string{
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({console:{log:(...values)=>fs.writeSync(1,require("node:util").format(...values)+"\\n")},print:v=>fs.writeSync(1,String(v)+"\\n")});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});return node.stdout.toString();
}
async function choices(directory:string,source:string){
 const entry=join(directory,'subject.js');await writeFile(entry,source);
 const built=buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]});
 return sourceEvaluationInvocations(built.program,{roots:[entry]}).map(call=>call.choices);
}
const routes=[
 'Object.hasOwn(owner,key)',
 'Object.prototype.hasOwnProperty.call(owner,key)',
 'Reflect.apply(Object.hasOwn,undefined,[owner,key])',
 'Object.hasOwn.bind(null,owner)(key)',
 'Object.prototype.hasOwnProperty.apply(owner,[key])',
];
test('own-property source queries preserve own locations, primitive exotics and actual argument routing',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-own-property-source-'));
 try{
  const partitions=[
   'const owner={own:1},key="own";',
   'const owner=Object.create({own:1}),key="own";',
   'const owner={},key="own";owner.own=1;',
   'const owner={own:1},key="own";delete owner.own;',
   'const owner="\ud83d\ude00",key="1";',
   'const owner="text",key="length";',
   'const owner="text",key="4";',
   'const owner=17,key="own";',
   'const owner=17n,key="own";',
   'const owner=Symbol("value"),key="own";',
   'const key=Symbol("key"),owner={[key]:1};',
  ];
  for(const setup of partitions)for(const route of routes){
   const source=setup+'print(eval('+route+'?"17;":"19;"));',expected=reference(source).trimEnd()+';';
   expect(['17;','19;']).toContain(expected);expect({setup,route,choices:await choices(directory,source)}).toEqual({setup,route,choices:[expect.arrayContaining([expected])]});
  }
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('presence inspection orders key conversion and excludes inherited property reads and callback escape',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-own-property-effects-'));
 try{
  for(const route of ['Object.hasOwn(null,key)','Object.prototype.hasOwnProperty.call(null,key)']){
   const source='let body="17;";const key={toString(){body="19;";return "own";}};try{'+route+';}catch(error){if(!(error instanceof TypeError))throw error;}print(eval(body));';
   const expected=reference(source).trimEnd()+';';expect(await choices(directory,source)).toEqual([expect.arrayContaining([expected])]);
  }
  for(const setup of [
   'const owner={get own(){body=String(Math.random());return 1;}};',
   'const owner=Object.create(new Proxy({},{get(){body=String(Math.random());return 1;}}));',
   'const owner={callback(){body=String(Math.random());}};',
  ])for(const route of routes){
   const source='let body="17;";'+setup+'const key=String(Math.random());'+route+';print(eval(body));';
   expect(reference(source)).toBe('17\n');expect({setup,route,choices:await choices(directory,source)}).toEqual({setup,route,choices:[['17;']]});
  }
  for(const source of [
   'let body="17;";Object.hasOwn({}, {toString(){body=String(Math.random());return "own";}});eval(body);',
   'let body="17;";Object.hasOwn(new Proxy({},{getOwnPropertyDescriptor(){body=String(Math.random());return undefined;}}),"own");eval(body);',
   'let body="17;";const owner=["value"],key={toString(){owner.length=0;return "0";}};if(!Object.hasOwn(owner,key))body=String(Math.random());eval(body);',
   'let body="17;";const owner=["value"];owner.length=0;if(!Object.prototype.hasOwnProperty.call(owner,"0"))body=String(Math.random());eval(body);',
  ])expect({source,choices:await choices(directory,source)}).toEqual({source,choices:[null]});
 }finally{await rm(directory,{recursive:true,force:true});}
});
function nativeSource():string{
 return routes.map(route=>'{const events=[],owner={own:1,get ignored(){throw "unexpected Get";}},key={toString(){events.push("key");return "own";}};print('+route+');print(events.join("|"));}').join('\n')+
 '\n{const events=[],key={toString(){events.push("key");return "x";}};try{Object.hasOwn(null,key);}catch(error){events.push(error.name);}print(events.join("|"));events.length=0;try{Object.prototype.hasOwnProperty.call(null,key);}catch(error){events.push(error.name);}print(events.join("|"));}'+
 '\n{let body="23;";const owner={get own(){throw "unexpected Get";}};Object.hasOwn(owner,"own",(body="29;"));print(eval(body));print(Object.hasOwn.name+":"+Object.hasOwn.length+":"+Object.prototype.hasOwnProperty.name+":"+Object.prototype.hasOwnProperty.length);try{new Object.hasOwn({},"own");}catch(error){print(error.name);}}'+
 '\nlet owner={code:"31;"};'+Array.from({length:512},()=> 'owner={next:owner};').join('\n')+
 '\nconst kept=owner;COLLECT for(let index=0;index<512;index++)owner=owner.next;if(Object.hasOwn(owner,"code"))print(eval(owner.code));print(kept!==owner);print("own-property-complete");';
}
test('own-property queries and the complete original Annex B program match Node and native execution',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-own-property-native-'));
 const original=await readFile(join(process.cwd(),'tests/e2e/cases/annex_b_variable_reference/in.ts'),'utf8');
 const originalJavaScript=ts.transpileModule(original,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
 const programs=[{source:nativeSource(),expected:reference(nativeSource().replace('COLLECT','')),typescript:false},{source:original,expected:reference(originalJavaScript),typescript:true}];
 expect(programs[0]!.expected.endsWith('31\ntrue\nown-property-complete\n')).toBe(true);expect(programs[1]!.expected).toBe('global: global\nlocal: local\nisolated: true\n');
 try{for(const program of programs)for(const noGc of [false,true]){
  const entry=join(directory,program.typescript?'original.ts':'subject.js'),output=join(directory,'program-'+program.typescript+'-'+noGc),diagnostics:string[]=[];await writeFile(entry,program.source.replace('COLLECT',noGc?'':'$262.gc();'));
  const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/own-property-source.js#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({exitCode:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(program.expected);
 }}finally{await rm(directory,{recursive:true,force:true});}
},900000);

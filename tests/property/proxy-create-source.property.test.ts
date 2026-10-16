import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildProgram} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';
import {parseHostObservation} from '../test262/protocol';

const domains=['undefined','null','false','17','"text"','17n','Symbol("value")','{}','[]','function(){}'];
const valid=[
 'new Proxy({},{});',
 'new Proxy(function(){},{});',
 'new Proxy({},{get get(){throw "unexpected getter";}});',
 'new Proxy(new Proxy({}, {get(){throw "unexpected target read";}}),new Proxy({}, {get(){throw "unexpected handler read";}}));',
 'Reflect.construct(Proxy,[{},{}],new Proxy(function(){},{get(target,key){if(key==="prototype")throw "unexpected newTarget read";return Reflect.get(target,key);}}));',
 'const create=Proxy.bind(null,{});new create({});',
 'function create(target,handler){return new Proxy(target,handler);}create({},{});',
];
const reference=(source:string)=>{
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({external:"23;",print:v=>fs.writeSync(1,String(v)+"\\n")});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});return node.stdout.toString();
};
async function choices(directory:string,source:string){
 const entry=join(directory,'subject.js');await writeFile(entry,source);
 const built=buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]});
 return sourceEvaluationInvocations(built.program,{roots:[entry]}).map(call=>call.choices);
}
test('ProxyCreate retains object validation without invoking target, handler or newTarget hooks',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-proxy-create-source-'));
 try{
  for(const target of domains)for(const handler of domains){
   const source='let body="17;";try{new Proxy('+target+','+handler+');}catch(error){body=error instanceof TypeError?"19;":"29;";}print(eval(body));';
   const expected=reference(source);expect(expected).toMatch(/^(17|19)\n$/);
   expect(await choices(directory,source)).toEqual([expect.arrayContaining([expected.trimEnd()+';'])]);
  }
  for(const expression of valid){
   const source='let body="17;";try{'+expression+'}catch(error){body=external;}print(eval(body));';
   expect(reference(source)).toBe('17\n');expect({expression,choices:await choices(directory,source)}).toEqual({expression,choices:[['17;']]});
  }
  const noNew='let body="17;";try{Proxy({},{});}catch(error){body="19;";}print(eval(body));';
  expect(reference(noNew)).toBe('19\n');expect(await choices(directory,noNew)).toEqual([expect.arrayContaining(['19;'])]);
  for(const expression of ['new Proxy(external,{});','new Proxy({},external);','Reflect.construct(Proxy,[{},{}],{});','const owner=new Proxy({},{get(){return external;}});body=owner.code;']){
   const source='let body="17;";try{'+expression+'}catch(error){body=external;}eval(body);';
   expect(await choices(directory,source)).toEqual([null]);
  }
  const inherited='let body="17;";const inherited=new Proxy({value:1},{get(){body=external;return 1;}});Object.defineProperty({},"x",Object.create(inherited));eval(body);';
  expect(await choices(directory,inherited)).toEqual([null]);
  const invariant='let body="17;";const target=new Proxy({},{getOwnPropertyDescriptor(){body=external;return undefined;}});Object.defineProperty({},"x",new Proxy(target,{has(){return false;}}));eval(body);';
  expect(await choices(directory,invariant)).toEqual([null]);
  expect(await choices(directory,'eval(Proxy.bind(null,{}).name);')).toEqual([null]);
 }finally{await rm(directory,{recursive:true,force:true});}
});
function nativeSource():string{
 const depth=512;
 return valid.map(expression=>'{let body="17;";try{'+expression+'}catch(error){body=external;}print(eval(body));}').join('\n')+
 '\nconst events=[];try{new Proxy((events.push("target"),17),(events.push("handler"),{}),(events.push("ignored"),0));}catch(error){print(error instanceof TypeError);}print(events.join("|"));'+
 '\nlet owner={code:"31;"};'+Array.from({length:depth},()=> 'owner={next:owner};').join('\n')+
 '\nconst saved=new Proxy(owner,{get(){throw "unexpected trap";}});COLLECT for(let index=0;index<'+depth+';index++)owner=owner.next;print(eval(owner.code));print(typeof saved);print("proxy-create-complete");';
}
test('Proxy creation and retained operands match complete Node execution in both memory modes',async()=>{
 const source=nativeSource(),expected=reference(source.replace('COLLECT',''));expect(expected.endsWith('31\nobject\nproxy-create-complete\n')).toBe(true);
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-proxy-create-native-'));
 try{for(const noGc of [false,true]){
  const entry=join(directory,'subject.js'),output=join(directory,'program-'+noGc),diagnostics:string[]=[];await writeFile(entry,source.replace('COLLECT',noGc?'':'$262.gc();'));
  const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/proxy-create-source.js#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({exitCode:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(expected);
 }}finally{await rm(directory,{recursive:true,force:true});}
},600000);

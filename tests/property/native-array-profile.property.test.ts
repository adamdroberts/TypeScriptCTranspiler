import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildProgram} from '../../src/program';
import {compile} from '../../src/compile';
import {runtimeArrayPrototypeMethods} from '../../src/global-bindings';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {nodeReferenceSync} from './node-reference';
import {parseHostObservation} from '../test262/protocol';

const partitions=[
 {name:'array-text',source:'print(eval(["17;"].toString()));',choices:['17;'],stdout:'17\n'},
 {name:'join',source:'print(eval(Array.prototype.join.call({0:"19;",length:1},"")));',choices:['19;'],stdout:'19\n'},
 {name:'absence',source:'print(eval(Array.prototype.then===undefined?"23;":unknownSource));',choices:['23;'],stdout:'23\n'},
 {name:'callability',source:'print(eval(typeof [].map==="function"?"29;":unknownSource));',choices:['29;'],stdout:'29\n'},
 {name:'metadata',source:'print(eval(Array.prototype.map.name==="map"&&Array.prototype.map.length===1?"31;":unknownSource));',choices:['31;'],stdout:'31\n'},
 {name:'custom-join',source:'const owner={join(){return "37;"}};print(eval(Array.prototype.toString.call(owner)));',choices:['37;'],stdout:'37\n'},
 {name:'noncallable-join',source:'const owner={join:17};print(eval(Array.prototype.toString.call(owner)==="[object Object]"?"41;":unknownSource));',choices:['41;'],stdout:'41\n'},
 {name:'prototype-text',source:'print(eval(Array.prototype.toString.call(Array.prototype)===""?"43;":unknownSource));',choices:['43;'],stdout:'43\n'},
 {name:'normal-value',source:'const owner={join(){return 47;}};print(eval(Array.prototype.toString.call(owner)));',choices:[],stdout:'47\n'},
 {name:'abrupt-join',source:'const marker={};const owner={get join(){throw marker;}};try{eval(Array.prototype.toString.call(owner));}catch(error){print(error===marker);}',choices:[],stdout:'true\n'},
 {name:'primitive-receiver',source:'print(eval(Array.prototype.toString.call(17)==="[object Number]"?"53;":unknownSource));',choices:['53;'],stdout:'53\n'},
 {name:'invalid-callable',source:'const owner={join:class C{}};try{eval(Array.prototype.toString.call(owner));}catch(error){print(error instanceof TypeError);}',choices:[],stdout:'true\n'},
 {name:'noncallable-proxy',source:'const marker={};const owner={join:new Proxy({},{get(){throw marker;}})};print(eval(Array.prototype.toString.call(owner)==="[object Object]"?"59;":unknownSource));',choices:['59;'],stdout:'59\n'},
 {name:'boxed-getter',source:"Object.defineProperty(Number.prototype,\"join\",{configurable:true,get:function(){\"use strict\";if(typeof this!==\"object\")throw \"getter receiver\";if(typeof NATIVE_GC!==\"undefined\"&&NATIVE_GC)$262.gc();return function(){\"use strict\";if(typeof this!==\"object\")throw \"call receiver\";return \"67;\";};}});\nconst result=Array.prototype.toString.call(17);\ndelete Number.prototype.join;\nprint(eval(result===\"67;\"?\"67;\":\"71;\"));",choices:['67;'],stdout:'67\n'},
];
function reference(source:string):string {
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30_000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});return node.stdout.toString();
}
async function graph(directory:string,name:string,source:string){
 const entry=join(directory,name+'.js');await writeFile(entry,source);
 const built=buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]});
 return sourceEvaluationInvocations(built.program,{roots:[entry]});
}
test('native Array profiles preserve absence, callable metadata and actual join completions',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-native-array-source-'));
 try{for(const part of partitions){
  expect({name:part.name,stdout:reference(part.source)}).toEqual({name:part.name,stdout:part.stdout});
  const calls=await graph(directory,part.name,part.source);expect({name:part.name,choices:calls.map(call=>call.choices)}).toEqual({name:part.name,choices:[part.choices]});
 }}finally{await rm(directory,{recursive:true,force:true});}
});
test('unrepresented native callback arguments and Proxy calls retain stable source uncertainty',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-native-array-opaque-'));
 try{for(const source of [
  'function read(body){print(eval(body));}read("17;");["19;"].forEach(read);',
  'const owner={join:new Proxy(function(){return "53;"},{})};print(eval(Array.prototype.toString.call(owner)));',
 ]){
  expect(reference(source)).toBe(source.includes('forEach')?'17\n19\n':'53\n');
  const calls=await graph(directory,'opaque',source);expect(calls.some(call=>call.choices===null)).toBe(true);
  const entry=join(directory,'opaque.js'),diagnostics:string[]=[];
  const built=await compile({entry,output:join(directory,'rejected'),buildDir:join(directory,'rejected-build'),isolatedScriptRoots:[entry],initializationEntries:[entry],diagnosticWriter:message=>diagnostics.push(message)});
  expect(built.exitCode).toBe(3);expect(diagnostics.join('')).toContain('unknown eval() source requires --runtime-code-manifest allow-list');
 }}finally{await rm(directory,{recursive:true,force:true});}
});
const metadata=`
const names=Object.getOwnPropertyNames(Array.prototype).sort();
print(JSON.stringify(names));
for(const name of names){const descriptor=Object.getOwnPropertyDescriptor(Array.prototype,name);
 if(typeof descriptor.value==='function')print(name+':'+descriptor.value.name+':'+descriptor.value.length+':'+descriptor.writable+':'+descriptor.enumerable+':'+descriptor.configurable);}
print('iterator:'+ (Array.prototype.values===Array.prototype[Symbol.iterator]));
const unscopables=Object.getOwnPropertyDescriptor(Array.prototype,Symbol.unscopables);
print('unscopables:'+unscopables.writable+':'+unscopables.enumerable+':'+unscopables.configurable);
print('profile-complete');`;
test('the shared native method collection agrees with independent Node descriptors',()=>{
 const lines=reference(metadata).trimEnd().split('\n');
 expect(new Set(JSON.parse(lines[0]!))).toEqual(new Set(['length','constructor',...runtimeArrayPrototypeMethods.keys()]));
 const descriptors=new Map(lines.slice(1,-3).map(line=>[line.split(':')[0]!,line]));
 for(const[name,descriptor]of runtimeArrayPrototypeMethods)expect(descriptors.get(name)).toBe(name+':'+name+':'+descriptor.length+':true:false:true');
 expect(lines.slice(-3)).toEqual(['iterator:true','unscopables:false:false:true','profile-complete']);
});
function program():string {
 const depth=256;
 return 'const executeSource=eval;'+partitions.map(part=>'{'+part.source.replaceAll('eval(', 'executeSource(')+'}').join('\n')+'\n'+
  'const p0={__proto__:Array.prototype,length:1,0:"61;"};'+Array.from({length:depth},(_,index)=>'const p'+(index+1)+'=Object.create(p'+index+');').join('\n')+
  'if(NATIVE_GC)$262.gc();print(executeSource(p'+depth+'.toString()));\n'+metadata;
}
test('native Array profiles and one retained prototype graph match Node in both memory modes',async()=>{
 const source=program(),expected=reference(source.replaceAll('NATIVE_GC','false'));
 expect(expected.startsWith(partitions.map(part=>part.stdout).join('')+'61\n')).toBe(true);expect(expected.endsWith('profile-complete\n')).toBe(true);
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-native-array-profile-'));
 try{for(const noGc of [false,true]){
  const entry=join(directory,'subject.js'),output=join(directory,'program-'+noGc),diagnostics:string[]=[];
  await writeFile(entry,source.replaceAll('NATIVE_GC',String(!noGc)));
  const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/native-array-profile.js#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({exitCode:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(expected);
 }}finally{await rm(directory,{recursive:true,force:true});}
},600_000);

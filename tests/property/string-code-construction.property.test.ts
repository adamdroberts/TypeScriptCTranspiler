import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildProgram} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {compile} from '../../src/compile';
import {runtimeStringStaticMethods} from '../../src/global-bindings';
import {nodeReferenceSync} from './node-reference';
import {parseHostObservation} from '../test262/protocol';
const parts=[
 {name:'unit',source:'print(eval(String.fromCharCode(49,55,59)));',choices:['17;'],stdout:'17\n'},
 {name:'point',source:'print(eval(String.fromCodePoint(49,57,59)));',choices:['19;'],stdout:'19\n'},
 {name:'empty',source:'print(eval(String.fromCharCode())===undefined);',choices:[''],stdout:'true\n'},
 {name:'coercion',source:'const value={valueOf(){return 49;}};print(eval(String.fromCharCode(value,55,59)));',choices:['17;'],stdout:'17\n'},
 {name:'forward-call',source:'print(eval(String.fromCharCode.call(null,50,51,59)));',choices:['23;'],stdout:'23\n'},
 {name:'forward-apply',source:'print(eval(Reflect.apply(String.fromCodePoint,null,[50,57,59])));',choices:['29;'],stdout:'29\n'},
 {name:'bound',source:'const build=String.fromCharCode.bind(null,51);print(eval(build(49,59)));',choices:['31;'],stdout:'31\n'},
 {name:'source-key',source:'const execute=eval;const owner={m(body){return execute(body);}};print(owner[String.fromCharCode(109)]("37;"));',choices:['37;'],stdout:'37\n'},
];
function reference(source:string):string {
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});return node.stdout.toString();
}
async function invocations(directory:string,name:string,source:string){
 const entry=join(directory,name+'.js');await writeFile(entry,source);const program=buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]}).program;
 return sourceEvaluationInvocations(program,{roots:[entry]}).map(call=>call.choices);
}
test('numeric String construction retains source text through actual argument Lists and forwarding',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-string-codes-source-'));
 try{for(const part of parts){expect(reference(part.source)).toBe(part.stdout);expect({name:part.name,calls:await invocations(directory,part.name,part.source)}).toEqual({name:part.name,calls:[part.choices]});}}
 finally{await rm(directory,{recursive:true,force:true});}
});
const completions=[
 ...['String.fromCharCode(Symbol())','String.fromCharCode(1n)','String.fromCodePoint(-1)','String.fromCodePoint(1.5)','String.fromCodePoint(0x110000)','new String.fromCharCode(49)'].map(expression=>'let body="41;";try{'+expression+';}catch(error){body="43;";}print(eval(body));'),
 'const execute=eval;function read(body){print(execute(body));}read("47;");try{String.fromCodePoint(1.5,{valueOf(){read("53;");return 65;}});}catch(error){print(error instanceof RangeError);}',
 'const execute=eval;function read(body){print(execute(body));}read("59;");function argument(){read("61;");return 65;}try{String.fromCodePoint(1.5,argument());}catch(error){print(error instanceof RangeError);}',
 'print(JSON.stringify(String.fromCharCode(NaN,Infinity,-Infinity,65537,-65535,1.9,0xd83d,0xde00,0xd800)));print(JSON.stringify(String.fromCodePoint(0,0xffff,0x10000,0x10ffff,0xd800)));',
 'String.fromCharCode=function(){return "67;";};print(eval(String.fromCharCode(49)));',
];
const metadata=`for(const name of Object.getOwnPropertyNames(String)){const descriptor=Object.getOwnPropertyDescriptor(String,name);if(typeof descriptor.value==='function')print(name+':'+descriptor.value.name+':'+descriptor.value.length+':'+descriptor.writable+':'+descriptor.enumerable+':'+descriptor.configurable);}print('string-codes-complete');`;
test('String static method source metadata agrees with the independent native installer profile',()=>{
 const lines=reference(metadata).trimEnd().split('\n');for(const[name,descriptor]of runtimeStringStaticMethods)expect(lines).toContain(name+':'+name+':'+descriptor.length+':true:false:true');expect(lines.at(-1)).toBe('string-codes-complete');
});
test('String code construction, conversion failures and one large List match native execution in both modes',async()=>{
 const statements=parts.map(part=>'{'+part.source+'}').join('\n')+'\n'+completions.map(source=>'{'+source+'}').join('\n');
 // Retain the actual native Reference before the intentional writable-member
 // mutation above; the List has no argument-count-specific lowering path.
 const source='const buildUnits=String.fromCharCode;\n'+statements+'\nconst codes=['+Array.from({length:1365},()=>'49,55,59').join(',')+'];if(NATIVE_GC)$262.gc();print(eval(buildUnits(...codes)));\n'+metadata;
 const expected=reference(source.replaceAll('NATIVE_GC','false'));expect(expected.startsWith(parts.map(part=>part.stdout).join(''))).toBe(true);expect(expected.includes('\n17\nfromCharCode:')).toBe(true);expect(expected.endsWith('string-codes-complete\n')).toBe(true);
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-string-codes-native-'));
 try{for(const noGc of [false,true]){
  const entry=join(directory,'subject.js'),output=join(directory,'program-'+noGc),diagnostics:string[]=[];await writeFile(entry,source.replaceAll('NATIVE_GC',String(!noGc)));
  const result=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/string-codes.js#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(expected);
 }}finally{await rm(directory,{recursive:true,force:true});}
},600000);

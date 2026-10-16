import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const wrap=(body:string)=>'{const evaluate=code=>{print(code);return eval(code);};const run=function(body){'+body+'};run("17;");print("class-order-complete");}';
function reference(source:string):string{
 const script='const fs=require("node:fs"),vm=require("node:vm");new vm.Script(\'function external(){return "19;";}\'+fs.readFileSync(0,"utf8")).runInNewContext({print:value=>{fs.writeSync(1,String(value)+"\\n");}});';
 const node=nodeReferenceSync(['node','-e',script],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});
 expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});return node.stdout.toString();
}
const unknownBody='let saved;class Owner{static value=(saved=body);[body=String(Math.random())+";"](){}}evaluate(saved);';
test('class source phases retain computed keys before static initialization and separate deferred activations',()=>{
 const cases=[
  ...['static value=(saved=body);','static {saved=body;}'].flatMap(initialize=>[
   ...['[body=VALUE](){}','get [body=VALUE](){return 1;}','[body=VALUE]=0;','static [body=VALUE]=0;'].flatMap(key=>[
    {body:'let saved;class Owner{'+initialize+key.replace('VALUE','"19;"')+'}evaluate(saved);',expected:'19;'},
    {body:'let saved;class Owner{'+initialize+key.replace('VALUE','external()')+'}evaluate(saved);',expected:'19;',unknown:true},
   ]),
   {body:'let saved;class Owner{'+initialize+'[body="19;"](){}[saved=body](){}static later=(body=external());}evaluate(saved);',expected:'19;'},
  ]),
  {body:'let saved;class Owner{static {try{throw "19;";}catch(code){saved=code;}}}evaluate(saved);',expected:'19;'},
  {body:'let saved;try{class Owner{static {saved=body;throw 1;saved=external();}[body="19;"](){}}}catch(error){}evaluate(saved);',expected:'19;'},
  {body:'let saved;class Owner extends (body="19;",Object){static value=(saved=body);[body="23;"](){}}evaluate(saved);',expected:'23;'},
  {body:'let saved;class Owner{static value=class Inner{static value=(saved=body);[body="29;"](){}};[body="23;"](){}}evaluate(saved);',expected:'29;'},
  {body:'let saved;class Owner{[saved=body](){}static value=(body=external());}evaluate(saved);',expected:'17;'},
  {body:'let saved;class Owner{static value=(saved=body);field=(body=external());method(){body=external();}}evaluate(saved);',expected:'17;'},
 ];
 for(const item of cases){const source=wrap(item.body);expect(reference(source)).toBe(item.expected+'\nclass-order-complete\n');const result=graph([{path:'subject.js',source}]);
  if('unknown' in item&&item.unknown)expect({source,error:result.error}).toEqual({source,error:expect.stringContaining('direct eval source is not a finite static string expression')});
  else {expect({source,error:result.error}).toEqual({source,error:null});expect(result.directEvalSources.map(value=>value.source)).toContain(item.expected);}
 }
 const source=wrap(unknownBody),observed=reference(source);expect(observed).toMatch(/^0\.[0-9]+;\nclass-order-complete\n$/);expect(graph([{path:'subject.js',source}]).error).toContain('direct eval source is not a finite static string expression');
});
test('a later child constructor write remains a retained source-admission gap',()=>{
 const source=wrap('let saved;class Owner{[saved=body](){}field=(body=external());}new Owner();evaluate(saved);');
 expect(reference(source)).toBe('17;\nclass-order-complete\n');
 expect(graph([{path:'subject.js',source}]).error).toContain('direct eval source is not a finite static string expression');
});
function retainedSource():string{
 const keys=Array.from({length:512},(_,index)=>'[(body="31;","key'+index+'")](){}').join('\n');
 return wrap('let saved;class Owner{static value=(saved=body);'+keys+'}COLLECT evaluate(saved);');
}
test('one retained class key plan matches complete Node and native output and rejects the original opaque input',async()=>{
 const source=retainedSource(),expected=reference(source.replace('COLLECT',''));expect(expected).toBe('31;\nclass-order-complete\n');
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-class-source-order-'));
 try{for(const noGc of [false,true]){
  const entry=join(directory,'subject.js'),output=join(directory,'program-'+noGc),diagnostics:string[]=[];await writeFile(entry,source.replace('COLLECT',noGc?'':'$262.gc();'));
  const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/class-source-order.js#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(parseHostObservation(JSON.parse(native.stdout.toString()))).toMatchObject({kind:'normal',stdout:expected});
  const rejected=join(directory,'unknown.js'),messages:string[]=[];await writeFile(rejected,wrap(unknownBody));
  const result=await compile({entry:rejected,output:join(directory,'rejected-'+noGc),noGc,buildDir:join(directory,'rejected-build-'+noGc),isolatedScriptRoots:[rejected],initializationEntries:[rejected],diagnosticWriter:message=>messages.push(message)});
  expect(result.exitCode).toBe(3);expect(messages.join('')).toContain('unknown eval() source requires --runtime-code-manifest allow-list or gated --unsafe-eval embedded Node bridge');
 }}finally{await rm(directory,{recursive:true,force:true});}
},900000);

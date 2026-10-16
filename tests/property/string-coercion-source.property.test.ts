import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {buildProgram} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {nodeReferenceSync} from './node-reference';
import {parseHostObservation} from '../test262/protocol';
const root=process.cwd();
const prelude='const executeSource=eval;';
const cases=[
 {name:'identity',source:'print(executeSource(String("19;")));',choices:['19;'],stdout:'19\n'},
 {name:'number',source:'print(executeSource(String(23)));',choices:['23'],stdout:'23\n'},
 {name:'bigint',source:'print(executeSource(String(29n)));',choices:['29'],stdout:'29\n'},
 {name:'symbol',source:'print(typeof executeSource(String(Symbol("17")))==="symbol");',choices:['Symbol(17)'],stdout:'true\n'},
 {name:'boxed-symbol',source:'try{executeSource(String(Object(Symbol("marker"))));}catch(error){print(error instanceof TypeError);}',choices:[],stdout:'true\n'},
 {name:'converted-symbol',source:'try{executeSource(String({[Symbol.toPrimitive](){return Symbol("marker");}}));}catch(error){print(error instanceof TypeError);}',choices:[],stdout:'true\n'},
 {name:'joined-symbol',source:'const symbol=Symbol("17");let body="17;";for(const value of [symbol,{[Symbol.toPrimitive](){return symbol;}}]){try{String(value);}catch(error){body="41;";}}print(executeSource(body));',choices:['17;','41;'],stdout:'41\n'},
 {name:'ordinary',source:'const value={toString(){return "31;";}};print(executeSource(String(value)));',choices:['31;'],stdout:'31\n'},
 {name:'fallback',source:'const value={toString(){return {};},valueOf(){return "37;";}};print(executeSource(String(value)));',choices:['37;'],stdout:'37\n'},
 {name:'abrupt',source:'const marker={};try{executeSource(String({[Symbol.toPrimitive](){throw marker;}}));}catch(error){print(error===marker);}',choices:[],stdout:'true\n'},
];
function reference(source:string):string{
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});return node.stdout.toString();
}
async function choices(entry:string,source:string){await writeFile(entry,source);return sourceEvaluationInvocations(buildProgram({entry,packageRoot:root,retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]}).program,{roots:[entry]}).map(call=>call.choices&&[...call.choices].sort());}
function numericKey(depth:number):string{
 const pieces=['let body="17;";const owner={109(){},constructor(){body=String(Math.random());}};const key0=Math.floor(Math.random())+109;'];
 for(let index=0;index<depth;index++)pieces.push('const key'+(index+1)+'=String(key'+index+');');
 pieces.push('owner[key'+depth+']();if(NATIVE_GC)$262.gc();print(executeSource(body));');return pieces.join('\n');
}
test('String conversion preserves primitive domains, Symbol rules and abrupt completion',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-string-coercion-source-'));
 try{
  for(const item of cases){const source=prelude+item.source+'print("complete");';expect(reference(source)).toBe(item.stdout+'complete\n');expect({name:item.name,calls:await choices(join(directory,item.name+'.js'),source)}).toEqual({name:item.name,calls:[[...item.choices].sort()]});}
  const source=prelude+numericKey(1).replaceAll('NATIVE_GC','false')+'print("complete");';expect(reference(source)).toBe('17\ncomplete\n');expect(await choices(join(directory,'domain.js'),source)).toEqual([['17;']]);
  const unknown=prelude+'const value=executeSource(String(Math.random()));print(typeof value==="number");print("complete");';expect(reference(unknown)).toBe('true\ncomplete\n');const entry=join(directory,'unknown.js');expect(await choices(entry,unknown)).toEqual([null]);const diagnostics:string[]=[];const result=await compile({entry,output:join(directory,'rejected'),noGc:true,emitCOnly:true,isolatedScriptRoots:[entry],initializationEntries:[entry],diagnosticWriter:message=>diagnostics.push(message)});expect(result.exitCode).toBe(3);expect(diagnostics.join('')).toContain('unknown eval() source requires --runtime-code-manifest allow-list');
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('one retained conversion graph preserves a numeric property-key domain in native execution',async()=>{
 const source=prelude+cases.map(item=>'{'+item.source+'}').join('\n')+numericKey(512)+'print("complete");',expected=cases.map(item=>item.stdout).join('')+'17\ncomplete\n';expect(reference(source.replaceAll('NATIVE_GC','false'))).toBe(expected);
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-string-coercion-native-'));
 try{for(const noGc of [false,true]){
  const entry=join(directory,'source.js'),output=join(directory,'program-'+noGc),diagnostics:string[]=[];await writeFile(entry,source.replaceAll('NATIVE_GC',String(!noGc)));
  const result=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/string-coercion#script',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout).toBe(expected);
 }}finally{await rm(directory,{recursive:true,force:true});}
},600000);

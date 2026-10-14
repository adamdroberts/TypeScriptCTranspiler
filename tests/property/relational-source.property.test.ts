import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {sourceConstructorInvocations} from '../../src/source-value-flow';
import {relationalSourceInput} from '../e2e/generated-cases';
import {parseHostObservation} from '../test262/protocol';

function facts(source:string){
 const options:ts.CompilerOptions={noLib:true,allowJs:true,noEmit:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);
 host.getSourceFile=file=>file==='/model.js'?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>file==='/model.js'?source:undefined;host.fileExists=file=>file==='/model.js';
 return sourceConstructorInvocations(ts.createProgram(['/model.js'],options,host),{roots:['/model.js']});
}

test('relational source conversion preserves primitive Types and number hints',()=>{
 const values=['7n','3n',"'12'","'9'",'1','NaN'];
 for(const left of values)for(const right of values)for(const operator of ['<','<=','>','>=']){
  const expression=`(${left})${operator}(${right})`,expected=Function('return '+expression)();
  expect({expression,facts:facts(`Function('return '+(${expression})+';');`)}).toEqual({expression,facts:[{kind:'ordinary',choices:[[`return ${expected};`]]}]});
 }
 expect(facts("const left={[Symbol.toPrimitive](hint){return hint==='number'?7n:99n}};Function('return '+(left<9n)+';');")).toEqual([{kind:'ordinary',choices:[['return true;']]}]);
 expect(facts("const list=['return 61;'];const first={valueOf(){throw 'stop'}},later={valueOf(){mutate(list);return 1}};try{first>later}catch(error){}Function(...list);")).toEqual([{kind:'ordinary',choices:[['return 61;']]}]);
 expect(facts("const list=['return 61;'];const left={valueOf(){mutate(list);return 7n}};left<9n;Function(...list);").some(value=>value.choices===null)).toBe(true);
});
test('Relational source owners match independent Node through native invocation',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-relational-source-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const input=relationalSourceInput(typed&&!noGc?512:3)+`\nconst values:any[]=[undefined,null,false,true,-0,1,7,NaN,Infinity,0n,3n,7n,'3','12','x',''];for(const left of values)for(const right of values)console.log('relation:',left<right,left<=right,left>right,left>=right);let order='';const left:any={[Symbol.toPrimitive](hint:any){order+='L'+hint;return 7n}},right:any={valueOf(){order+='R';return '9'}};console.log('coercion:',left<right,order);order='';const first:any={valueOf(){order+='L';throw 'stop'}},later:any={valueOf(){order+='R';return 1}};try{console.log(first>later)}catch(error){console.log('abrupt:',error==='stop',order)}const symbol:any=Symbol();try{console.log(symbol<1)}catch(error){console.log('symbol:',error instanceof TypeError)}`,erased=ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
  const oracle=join(root,`oracle-${typed}-${noGc}.js`),oracleOutput=oracle+'.stdout';await writeFile(oracle,erased);
  const node=Bun.spawnSync(['node',oracle],{stdout:Bun.file(oracleOutput),stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?input:erased);
  const result=await compile({entry,output,noGc,initializationEntries:[entry],buildDir:output+'-build',test262Observation:{kind:'test262-native-observation',scenarioId:'property/relational-source.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(await readFile(oracleOutput,'utf8'));
 }}finally{await rm(root,{recursive:true,force:true})}
},900000);

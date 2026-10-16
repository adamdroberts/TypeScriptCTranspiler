import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';
import {compile} from '../../src/compile';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

function reference(source:string,external:string):string {
 const code='const fs=require("node:fs"),vm=require("node:vm");const context=vm.createContext({print:v=>fs.writeSync(1,String(v)+"\\n")});new vm.Script('+JSON.stringify('function external(){'+external+'}')+').runInContext(context);new vm.Script(fs.readFileSync(0,"utf8")).runInContext(context);';
 const node=nodeReferenceSync(['node','-e',code],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});return node.stdout.toString();
}
test('opaque same-Realm calls retain source callbacks published through native owners and global lexical bindings',()=>{
 const local='const read=body=>print(eval(body));read("17;");';
 const paths=[
  {publish:'Array.prototype.callback=read;',invoke:'Array.prototype.callback("19;");'},
  {publish:'Object.callback=read;',invoke:'Object.callback("19;");'},
  {publish:'Reflect.callback=read;',invoke:'Reflect.callback("19;");'},
  {publish:'Function.prototype.callback=read;',invoke:'Function.prototype.callback("19;");'},
  {publish:'Object.defineProperty(Array.prototype,"callback",{get(){return read;},configurable:true});',invoke:'Array.prototype.callback("19;");'},
  {publish:'Array.prototype[Symbol.for("callback")]=read;',invoke:'Array.prototype[Symbol.for("callback")]("19;");'},
 ];
 for(const path of paths){const source='{'+local+path.publish+'}external();';expect(reference(source,path.invoke)).toBe('17\n19\n');expect({source,error:graph([{path:'subject.js',source}]).error}).toEqual({source,error:expect.stringContaining('direct eval source is not a finite static string expression')});}
 const lexical=local+'external();';expect(reference(lexical,'read("19;");')).toBe('17\n19\n');expect(graph([{path:'subject.js',source:lexical}]).error).toContain('direct eval source is not a finite static string expression');
 const privateControl='{'+local+'}external();';expect(reference(privateControl,'')).toBe('17\n');const finite=graph([{path:'subject.js',source:privateControl}]);expect(finite.error).toBeNull();expect(finite.directEvalSources.map(value=>value.source)).toEqual(['17;']);
});
test('ordinary prototype writes do not invoke public callbacks or replace unrelated globals',()=>{
 for(const owner of ['Object','Reflect']){
  const source='const execute=eval;function read(body="17;"){print(execute(body));}read();Array.prototype.callback=read;const target=function(){};'+owner+'.setPrototypeOf(target,{});print("complete");';
  expect(reference(source,'')).toBe('17\ncomplete\n');const finite=graph([{path:'subject.js',source}]);expect(finite.error).toBeNull();expect(finite.indirectEvalSources.map(value=>value.source)).toEqual(['17;']);
 }
 const opaque='{const read=body=>print(eval(body));read("17;");const target=new Proxy({},{setPrototypeOf(){read(external());return true;}});Object.setPrototypeOf(target,{});}';
 expect(graph([{path:'subject.js',source:opaque}]).error).toContain('direct eval source is not a finite static string expression');
});

test('opaque same-Realm writes invalidate mutable global lexical sources while retaining constants and earlier captures',()=>{
 for(const declaration of ['let body="17;";','let {body}={body:"17;"};','let [body]=["17;"];','class body{}']){
  const initial=declaration.startsWith('class')?'body="17;";':'',source='const execute=eval;'+declaration+initial+'opaque();print(eval(body));';
  expect(reference(source.replace('opaque();','external();'),'body="19;";')).toBe('19\n');expect(graph([{path:'subject.js',source}]).error).toContain('eval source is not a finite static string expression');
 }
 for(const source of ['const execute=eval;const body="17;";opaque();print(execute(body));','const execute=eval;let body="17;";const saved=body;opaque();print(execute(saved));']){
  const constant=source.includes('const body='),setup=constant?'':'body="19;";';expect(reference(source.replace('opaque();','external();'),setup)).toBe('17\n');const finite=graph([{path:'subject.js',source}]);expect(finite.error).toBeNull();expect(finite.indirectEvalSources.map(value=>value.source)).toEqual(['17;']);
 }
});
test('an unresolved mutable lexical source retains the compiler diagnostic for a captured eval alias',async()=>{
 const source='const execute=eval;let body="17;";external();print(execute(body));';expect(reference(source,'body="19;";')).toBe('19\n');
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-global-lexical-source-'));
 try{
  const entry=join(directory,'subject.js'),diagnostics:string[]=[];await writeFile(entry,source);
  const result=await compile({entry,output:join(directory,'program'),noGc:true,emitCOnly:true,buildDir:join(directory,'build'),isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/global-lexical-source.js#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect(result.exitCode).toBe(3);expect(diagnostics.join('')).toContain('unknown eval() source requires --runtime-code-manifest allow-list');
 }finally{await rm(directory,{recursive:true,force:true});}
},60000);

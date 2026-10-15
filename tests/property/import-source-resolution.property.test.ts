import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm}from'node:fs/promises';
import {tmpdir}from'node:os';import{join}from'node:path';
import{buildProgram,resolvePackageRoot}from'../../src/program';
import{sourceEvaluationInvocations}from'../../src/source-value-flow';
import{finiteEvalScriptSourceGraph as graph}from'../test262/native-host';

test('finite missing relative imports reject without inventing callable namespaces',()=>{
 const oracle=nodeReferenceSync(['node','--input-type=module','-e','const fs=await import("node:fs");let synchronous=true;const promise=import("file:///__tsc2c_missing_source_record__/absent.mjs");const thenable=promise instanceof Promise;synchronous=false;const rejected=await promise.then(()=>false,()=>!synchronous);fs.writeSync(1,String(thenable&&rejected));'],{stdout:'pipe',stderr:'pipe'});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString(),stdout:oracle.stdout.toString()}).toEqual({code:0,stderr:'',stdout:'true'});
 for(const specifier of ['./missing.mjs','../missing.json']){
  const source=`const owner={body:'17;'};const saved=owner.body;import(${JSON.stringify(specifier)}).catch(()=>{});eval(saved);`;
  expect(graph([{path:'/tmp/tsc2c-missing-import/main.mjs',source,goal:'module'}]).error).toBeNull();
 }
 for(const specifier of ['unknown-package','node:unknown-host']){
  const source=`import(${JSON.stringify(specifier)}).then(namespace=>{eval(namespace.code)});`;
  expect(graph([{path:'/tmp/tsc2c-opaque-import/main.mjs',source,goal:'module'}]).error).toContain('direct eval source is not a finite static string expression');
 }
});
test('JSON module source records keep namespace shape without checker symbols',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-import-source-record-'));
 try{
  const payload=join(root,'data.json');await writeFile(payload,'{"value":23}');
  const entry=join(root,'main.mjs');
  for(const source of [
   `let body='17;';const attributes={type:'json',get [Symbol.iterator](){body=opaque()}};import('./data.json',{with:attributes}).catch(()=>{});eval(body);`,
   `import('./data.json',{with:{type:'json'}}).then(namespace=>{eval(String(namespace.default.value));});`
  ]){
   await writeFile(entry,source);const built=buildProgram({entry,packageRoot:resolvePackageRoot(),moduleRoots:[entry,payload]});
   const calls=sourceEvaluationInvocations(built.program);expect(calls.some(call=>call.choices===null)).toBe(false);expect(calls.flatMap(call=>call.choices??[])).toContain(source.includes('namespace.default')?'23':'17;');
  }
 }finally{await rm(root,{recursive:true,force:true});}
});

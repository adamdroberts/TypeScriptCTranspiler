import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {parseHostObservation} from '../test262/protocol';

const opaque=[
 "const p=(async()=>23)();p.then(()=>{body=opaque()});",
 "const p=(async()=>{throw '23;'})();p.catch(()=>{body=opaque()});",
 "const p=(async()=>23)();Object.defineProperty(p,'then',{get(){body=opaque();return ()=>{}}});p.catch(()=>{});",
 "const p=(async()=>23)();Object.defineProperty(p,'constructor',{get(){body=opaque();return Promise}});p.then(()=>{});",
 "const p=(async()=>23)();p.constructor={get [Symbol.species](){body=opaque();return Promise}};p.then(()=>{});",
 "const p=(async()=>23)();function C(executor){body=opaque();executor(()=>{},()=>{})}p.constructor={[Symbol.species]:C.bind(null)};p.then(()=>{});",
 "Promise.prototype.finally.call({then(){body=opaque();return 1}},()=>{});",
];
test('Promise source owners retain handler, mutable method and species effect boundaries',()=>{
 for(const operation of opaque)expect(graph([{path:'main.mjs',source:`let body='17;';${operation}eval(body);`,goal:'module'}]).error).toContain('direct eval source is not a finite static string expression');
 const early="let body='17;';try{Promise.prototype.finally.call({get constructor(){throw '23;'},get then(){body=opaque();return ()=>{}}},()=>{})}catch(error){}eval(body);";
 expect(graph([{path:'main.mjs',source:early,goal:'module'}]).error).toBeNull();
});

const program=`
 export {};
 const p=(async()=>"23;")();
 console.log('tag:'+Object.prototype.toString.call(p));
 console.log('then:'+eval(await p.then(text=>text)));
 console.log('catch:'+eval(await (async()=>{throw '29;'})().catch(reason=>reason)));
 console.log('finally-value:'+eval(await p.finally(()=>17)));
 try{await p.finally(async()=>{throw '31;'})}catch(reason){console.log('finally-rejection:'+eval(reason))}
 let body='17;';
 await p.then(()=>({get then(){body='37;';return undefined}}));console.log('thenable-get:'+eval(body));
 const receiver={then(fulfilled,rejected){return [fulfilled.length,rejected.name,fulfilled('41;')]}};
 const borrowed=Promise.prototype.finally.call(receiver,()=>17);console.log('borrowed:'+borrowed[0]+':'+borrowed[1]+':'+eval(await borrowed[2]));
 const mutable=(async()=>17)();Object.defineProperty(mutable,'then',{get(){body='43;';return function(first,second){return second('47;')}}});
 console.log('mutable:'+eval(mutable.catch(reason=>reason))+':'+eval(body));
`;
test('Promise source methods preserve native result and owner semantics against Node',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-promise-source-owner-'));
 try{for(const typed of [false,true])for(const noGc of [false,true]){
  const directory=path.join(temporary,`${typed}-${noGc}`);await fs.mkdir(directory);const oracle=path.join(directory,'oracle.mjs');await fs.writeFile(oracle,program);
  const oracleOutput=path.join(directory,'oracle.stdout');
  const node=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=value=>fs.writeSync(1,String(value)+"\\n");import(process.argv[1]);',oracle],{stdout:Bun.file(oracleOutput),stderr:'pipe',timeout:120_000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const expected=await fs.readFile(oracleOutput,'utf8');expect(expected.endsWith('mutable:47:43\n')).toBe(true);
  const entry=path.join(directory,typed?'main.ts':'main.mjs');await fs.writeFile(entry,(typed?'// @ts-nocheck\n':'')+program);const output=path.join(directory,'program'),diagnostics:string[]=[];
  const built=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),moduleRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'promise-source-owner#module',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,code:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({typed,noGc,code:0,diagnostics:''});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(parseHostObservation(JSON.parse(native.stdout.toString()))).toMatchObject({kind:'normal',stdout:expected});
 }}finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

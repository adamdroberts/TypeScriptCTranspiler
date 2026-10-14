import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nativePromiseArrayInput} from '../e2e/generated-cases';
import {parseHostObservation} from '../test262/protocol';

test('native Promise array settlement preserves element representation and owner mutation',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-native-promise-array-'));
 try{for(const typed of [true,false])for(const noGc of [false,true]){
  const source=nativePromiseArrayInput(typed&&!noGc?512:3).replace('verifyNativePromiseArray();','verifyNativePromiseArray().then(()=>verifyBoxedRecords());')+`
async function verifyBoxedRecords():Promise<void>{const records:any=await dns.lookup('127.0.0.1',{family:4,all:true});console.log('native Promise records:',Array.isArray(records),typeof records[0],records[0].address,records[0].family);const strings:any=await dns.resolve4('127.0.0.1');console.log('native Promise any:',typeof strings[0],strings[0]);}
`,input=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
  // Node lookup supplies the same deterministic loopback String array; the
  // native host's resolve4 uses getaddrinfo rather than Node DNS wire queries.
  const oracleInput=input.replace("import * as dns from 'node:dns/promises';","import {lookup} from 'node:dns/promises';const dns={lookup,resolve4:async()=> (await lookup('127.0.0.1',{family:4,all:true})).map(record=>record.address)};");
  expect(oracleInput).not.toBe(input);
  const oracle=join(root,`oracle-${typed}-${noGc}.mjs`),oracleOutput=oracle+'.stdout';await writeFile(oracle,oracleInput);
  const node=Bun.spawnSync(['node',oracle],{stdout:Bun.file(oracleOutput),stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=join(root,`main-${typed}-${noGc}.ts`),output=entry+'-native',diagnostics:string[]=[];const erasedScript=input.replace("import * as dns from 'node:dns/promises';",'').replaceAll('dns.resolve4(', 'dns.promises.resolve4(').replaceAll('dns.lookup(', 'dns.promises.lookup(');await writeFile(entry,typed?source:erasedScript);
  const result=await compile({entry,output,noGc,...(typed?{moduleRoots:[entry]}:{}),initializationEntries:[entry],buildDir:output+'-build',...(typed?{test262Observation:{kind:'test262-native-observation',scenarioId:'property/native-promise-array.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
  expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  const observation=typed?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation.kind).toBe('normal');expect(observation?observation.stdout:native.stdout.toString()).toBe(await readFile(oracleOutput,'utf8'));
 }}finally{await rm(root,{recursive:true,force:true})}
},900000);

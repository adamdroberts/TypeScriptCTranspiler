import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

const subject=String.raw`
function check(value,label){if(!value)throw label}
function reject(action,constructor){try{action();return false}catch(error){return error instanceof constructor}}
const valid=['null','true','false','0','-0','1.25','1e+90','1E-9','9007199254740993123456789','1e999','"text"','"\\ud800"','"\\udc00"','"\\ud83d\\udc9b"','"💛"','" \\t \\n "'];
for(let seed=0;seed<23;seed++)valid.push(String(seed*seed)+'e-'+String(seed));
for(const text of valid){
 const raw=JSON.rawJSON(text),descriptor=Object.getOwnPropertyDescriptor(raw,'rawJSON');
 check(JSON.isRawJSON(raw)&&!JSON.isRawJSON(text)&&Object.getPrototypeOf(raw)===null,'raw-brand');
 check(Object.isFrozen(raw)&&!Object.isExtensible(raw)&&Reflect.ownKeys(raw).join('|')==='rawJSON','raw-shape');
 check(descriptor.value===text&&descriptor.enumerable&&!descriptor.writable&&!descriptor.configurable,'raw-descriptor');
 check(!Reflect.set(raw,'rawJSON','0')&&!Reflect.deleteProperty(raw,'rawJSON')&&!Reflect.defineProperty(raw,'extra',{value:1}),'frozen-reflection');
 check(JSON.stringify(raw)===text&&JSON.stringify([raw,raw])==='['+text+','+text+']','raw-output');
 console.log('scalar',text,JSON.stringify({value:raw}));
}
const invalid=['',' ','\n1','1\n','1\t','1 ',' 1','{}','[]','[1]','{"x":1}','undefined','NaN','Infinity','-Infinity','01','+1','1.','1e','1e+','--1','tru','true false','nullx','"unterminated','"\\x00"','"line\nfeed"'];
for(const text of invalid)check(reject(()=>JSON.rawJSON(text),SyntaxError),'invalid-grammar');
for(const value of [undefined,NaN,Infinity,-Infinity])check(reject(()=>JSON.rawJSON(value),SyntaxError),'invalid-coercion');
check(reject(()=>JSON.rawJSON(Symbol('x')),TypeError),'symbol-coercion');
for(const value of [null,true,false,0,-0,1.25,9007199254740993123456789n])check(JSON.stringify(JSON.rawJSON(value))===String(value),'primitive-coercion');
let trace='';const marker={};
const input={[Symbol.toPrimitive](hint){trace+=hint;return '17'}};
const saved=JSON.rawJSON,brand=JSON.isRawJSON;
const raw=Reflect.apply(saved,marker,[input,(trace+='|argument',0)]);
check(trace==='|argumentstring'&&raw.rawJSON==='17'&&brand.call(null,raw),'call-order');
check(reject(()=>Reflect.construct(saved,['1']),TypeError)&&reject(()=>Reflect.construct(brand,[raw]),TypeError),'non-constructors');
for(const name of ['rawJSON','isRawJSON']){const descriptor=Object.getOwnPropertyDescriptor(JSON,name);check(descriptor.writable&&!descriptor.enumerable&&descriptor.configurable&&JSON[name].name===name&&JSON[name].length===1,'method-metadata')}
const thrown={tag:'thrown'};check((()=>{try{saved({toString(){throw thrown}})}catch(error){return error===thrown}})(),'coercion-abrupt');
let traps=0;const proxy=new Proxy(raw,{get(target,key,receiver){traps++;return Reflect.get(target,key,receiver)}});
check(!brand(proxy)&&traps===0&&!brand(new Proxy(raw,{get(){throw thrown}})),'proxy-brand');
const revoked=Proxy.revocable(raw,{});revoked.revoke();check(!brand(revoked.proxy),'revoked-brand');
check(!brand({rawJSON:'17'})&&!brand(Object.create(raw))&&!brand([])&&!brand(function(){})&&!brand(Symbol()),'unbranded-values');
console.log('proxy',JSON.stringify(proxy),traps);
const supplied={toJSON(key){trace+='|toJSON:'+key;return raw}};trace='';
const output=JSON.stringify({value:supplied},function(key,value){trace+='|replace:'+key;if(key==='value'){check(value===raw,'toJSON-before-replacer');return JSON.rawJSON('19')}return value},2);
console.log('hooks',output,trace);
console.log('property-list',JSON.stringify({x:raw,y:JSON.rawJSON('23')},['y','x'],1));
const large=BigInt(Number.MAX_SAFE_INTEGER)+2n;
const embedded=JSON.stringify({large},function(key,value){return typeof value==='bigint'?JSON.rawJSON(value):value});
check(embedded==='{"large":'+String(large)+'}','bigint-replacer');console.log('bigint-replacer',embedded);
check(JSON.stringify(raw,()=>undefined)===undefined&&JSON.stringify(raw,()=>null)==='null','replacer-before-raw');
const fake={rawJSON:'17'};console.log('unbranded-output',JSON.stringify(fake));
const foreign=$262.createRealm(),foreignRaw=foreign.evalScript('JSON.rawJSON("83")');
check(JSON.isRawJSON(foreignRaw)&&foreign.global.JSON.isRawJSON(raw)&&Object.getPrototypeOf(foreignRaw)===null,'cross-realm-brand');
check(JSON.stringify(foreignRaw)==='83'&&foreign.global.JSON.stringify(raw)==='17','cross-realm-serialization');
const foreignMethod=foreign.global.JSON.rawJSON;
check(JSON.isRawJSON(foreignMethod.call(null,'89')),'borrowed-foreign-method');
try{foreignMethod('[]');throw 'missing syntax error'}catch(error){check(error instanceof foreign.global.SyntaxError&&!(error instanceof SyntaxError),'method-realm-error')}
await Promise.resolve();COLLECT
check(raw.rawJSON==='17'&&saved===JSON.rawJSON,'retained-owner');
console.log('finite-text',JSON.stringify(JSON.rawJSON('29')));
let deep=JSON.rawJSON('9007199254740993123456789');for(let depth=0;depth<16384;depth++)deep={child:deep};
COLLECT
// The bracket projection is independent of Node's recursive serializer limit.
const serialized=JSON.stringify(deep),expected='{"child":'.repeat(16384)+'9007199254740993123456789'+'}'.repeat(16384);
check(serialized===expected,'deep-serialization-worklist');console.log('raw-json-complete',serialized.length);
`;

test('Raw JSON scalar grammar and immutable owners share the serialization worklist',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-json-raw-'));
 try{
  const referenceEntry=path.join(temporary,'reference.mjs');
  // Node supplies all ordinary semantic partitions. The deep expected text is
  // built independently because its native JSON walker has a stack limit.
  const referenceSource=subject.replaceAll('COLLECT','').replace('const serialized=JSON.stringify(deep),expected=', 'const serialized=\'{"child":\'.repeat(16384)+\'9007199254740993123456789\'+\'}\'.repeat(16384),expected=');
  const nodeHost=`import vm from 'node:vm';globalThis.$262={createRealm(){const context=vm.createContext();return {global:vm.runInContext('globalThis',context),evalScript(source){return vm.runInContext(source,context)}}}};\n`;
  await fs.writeFile(referenceEntry,nodeHost+referenceSource);
  const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',referenceEntry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject.replaceAll('COLLECT',noGc?'':'$262.gc();'));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),test262Observation:{kind:'test262-native-observation',scenarioId:'json-raw#module',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({mode,noGc,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({mode,noGc,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({mode,noGc,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({mode,noGc,exitCode:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));
   expect({mode,noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({mode,noGc,kind:'normal'});
   expect(observation.stdout).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},600_000);

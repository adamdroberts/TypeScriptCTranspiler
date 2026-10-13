import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

const subject=String.raw`
function check(value,label){if(!value)throw label}
const texts=[' -0 ',' 1e999 ','9007199254740993123456789','"\\ud800"','"💛"','true','null','[]','{}','{"2":2,"1":1,"z":[0,{"x":3}],"a":false}','{"a":1,"a":1e+0,"\\u0061":2e0}','{"__proto__":1,"__proto__":2}'];
for(let seed=0;seed<17;seed++)texts.push('{"a":'+String(seed)+'e0,"b":['+String(seed+1)+',null]}');
for(const text of texts){
 const trace=[],contexts=[],holders=[];
 const parsed=JSON.parse(text,function(key,value,context){
  check(arguments.length===3&&Object.getPrototypeOf(context)===Object.prototype&&Object.isExtensible(context),'context-object');
  check(!contexts.includes(context),'fresh-context');contexts.push(context);holders.push(this);
  const descriptor=Object.getOwnPropertyDescriptor(context,'source');
  if(descriptor)check(descriptor.writable&&descriptor.enumerable&&descriptor.configurable&&typeof descriptor.value==='string','source-descriptor');
  check(Reflect.ownKeys(context).join('|')===(descriptor?'source':''),'context-own-keys');
  const tag=typeof value==='object'&&value!==null?(Array.isArray(value)?'array':'object'):Object.is(value,-0)?'-0':String(value);
  trace.push(key+':'+tag+':'+(descriptor?descriptor.value:'absent'));return value;
 });
 check(holders[holders.length-1]['']===parsed&&Object.keys(holders[holders.length-1]).join('|')==='','root-holder');
 console.log('trace',JSON.stringify(trace));
}
function mutate(text,action){const trace=[];const result=JSON.parse(text,function(key,value,context){action.call(this,key,value);trace.push([key,typeof value,context.source]);return value});console.log('mutated',JSON.stringify(result),JSON.stringify(trace))}
mutate('{"a":0,"b":1,"c":2}',function(key){if(key==='a'){this.b=17;delete this.c;this.d=3}});
mutate('{"a":0,"b":1}',function(key){if(key==='a')Object.defineProperty(this,'b',{get(){return 1},configurable:true,enumerable:true})});
mutate('{"a":0,"b":-0,"c":1}',function(key){if(key==='a'){this.b=0;Object.defineProperty(this,'c',{value:1,writable:false,enumerable:true,configurable:false})}});
mutate('[0,1,2]',function(key){if(key==='0'){this.length=1;this[4]=4}});
mutate('{"a":0,"b":{"x":1}}',function(key){if(key==='a')this.b={x:1,y:2}});
const removed=JSON.parse('[0,1,2]',function(key,value){return key==='1'?undefined:value});check(removed.length===3&&!Object.hasOwn(removed,'1'),'array-hole');
const object=JSON.parse('{"keep":1,"drop":2}',function(key,value){return key==='drop'?undefined:value});check(Object.keys(object).join('|')==='keep','object-deletion');
check(JSON.parse('1',()=>undefined)===undefined&&JSON.parse('{}',()=>17)===17,'root-replacement');
const frozen=JSON.parse('{"a":1,"b":2}',function(key,value){if(key==='a')Object.freeze(this);return key==='b'?undefined:value});check(frozen.b===2&&Object.isFrozen(frozen),'failed-delete-ignored');
const sealed=JSON.parse('{"a":1,"b":2}',function(key,value){if(key==='a')Object.defineProperty(this,'b',{value:2,writable:false,configurable:false});return key==='b'?7:value});check(sealed.b===2,'failed-define-ignored');
let getterCalls=0,setterCalls=0;
const accessor=JSON.parse('{"a":0,"b":1}',function(key,value){if(key==='a')Object.defineProperty(this,'b',{get(){getterCalls++;return 1},set(){setterCalls++},enumerable:true,configurable:true});return key==='b'?3:value});
check(accessor.b===3&&getterCalls===1&&setterCalls===0,'create-data-property');
const thrown={tag:'thrown'};try{JSON.parse('[1]',()=>{throw thrown});throw 'missing throw'}catch(error){check(error===thrown,'reviver-abrupt')}
try{JSON.parse('{"a":0,"b":1}',function(key,value){if(key==='a')Object.defineProperty(this,'b',{get(){throw thrown},enumerable:true});return value});throw 'missing getter throw'}catch(error){check(error===thrown,'live-get-abrupt')}
let order='';const input={[Symbol.toPrimitive](hint){order+='convert:'+hint;return '3'}};function argument(label,value){order+=label;return value}
const parsed=JSON.parse(argument('text|',input),argument('reviver|',function(key,value,context){order+='call|';check(this['']===3&&context.source==='3','root-source');return value}),argument('extra|',0));
check(parsed===3&&order==='text|reviver|extra|convert:stringcall|','actual-list-before-coercion');
for(const ignored of [undefined,null,{},new Proxy({},{get(){throw thrown}})])check(JSON.parse('17',ignored)===17,'non-callable-reviver');
const exact=JSON.parse('9007199254740993',(key,value,context)=>typeof value==='number'?BigInt(context.source):value);check(exact===9007199254740993n,'source-bigint');
let nestedCalls=0;JSON.parse('[1]',function(key,value){nestedCalls++;check(JSON.parse('2',(key,value,context)=>Number(context.source))===2,'nested-parse');return value});check(nestedCalls===2,'independent-state');
const proxyTrace=[];
const proxyResult=JSON.parse('{"a":0,"b":{"x":1}}',function(key,value,context){if(key==='a')this.b=new Proxy({x:1},{ownKeys(target){proxyTrace.push('keys');return Reflect.ownKeys(target)},getOwnPropertyDescriptor(target,key){proxyTrace.push('descriptor:'+key);return Reflect.getOwnPropertyDescriptor(target,key)},get(target,key,receiver){proxyTrace.push('get:'+key);return Reflect.get(target,key,receiver)},defineProperty(target,key,descriptor){proxyTrace.push('define:'+key);return Reflect.defineProperty(target,key,descriptor)}});return value});
console.log('proxy',JSON.stringify(proxyTrace),proxyResult.b.x);
const foreign=$262.createRealm();let foreignContext;
const foreignParse=foreign.global.JSON.parse;
const foreignValue=foreignParse('{"x":1}',function(key,value,context){foreignContext=context;check(Object.getPrototypeOf(context)===foreign.global.Object.prototype,'parse-context-realm');return value});
check(Object.getPrototypeOf(foreignValue)===foreign.global.Object.prototype&&JSON.stringify(foreignValue)==='{"x":1}','parse-value-realm');
await Promise.resolve();COLLECT
let calls=0,sourceCount=0;const depth=16384;const text='['.repeat(depth)+'17'+']'.repeat(depth);
const deep=JSON.parse(text,function(key,value,context){calls++;if(Object.hasOwn(context,'source')){sourceCount++;check(context.source==='17'&&value===17,'deep-source')}return value});
COLLECT
let cursor=deep,observedDepth=0;while(Array.isArray(cursor)){cursor=cursor[0];observedDepth++}
check(observedDepth===depth&&cursor===17&&calls===depth+1&&sourceCount===1,'deep-postorder-worklist');console.log('reviver-complete',calls,sourceCount);
`;

test('JSON reviver reads live properties against retained parse records',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-json-reviver-'));
 try{
  const referenceEntry=path.join(temporary,'reference.mjs');
  const nodeHost=`import vm from 'node:vm';globalThis.$262={createRealm(){const context=vm.createContext();return {global:vm.runInContext('globalThis',context)}}};\n`;
  // Node supplies semantic observations; the one high-depth case exceeds its
  // recursive reviver limit and is verified by the independent scalar/depth projection.
  const referenceSource=subject.replaceAll('COLLECT','').replace("const deep=JSON.parse(text,function(key,value,context){calls++;if(Object.hasOwn(context,'source')){sourceCount++;check(context.source==='17'&&value===17,'deep-source')}return value});","let deep=17;for(let index=0;index<depth;index++)deep=[deep];calls=depth+1;sourceCount=1;");
  await fs.writeFile(referenceEntry,nodeHost+referenceSource);
  const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',referenceEntry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject.replaceAll('COLLECT',noGc?'':'$262.gc();'));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),test262Observation:{kind:'test262-native-observation',scenarioId:'json-reviver#module',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({mode,noGc,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({mode,noGc,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({mode,noGc,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({mode,noGc,exitCode:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));
   expect({mode,noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({mode,noGc,kind:'normal'});
   expect(observation.stdout).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},600_000);

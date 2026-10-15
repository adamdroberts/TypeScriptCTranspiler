import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';
import {jsonMethods} from '../../src/json-methods';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';

const subject=String.raw`
function check(value,label){if(!value)throw label}
function throwsType(action){try{action();return false}catch(error){return error instanceof TypeError}}
const owner=JSON,saved={parse:JSON.parse,stringify:JSON.stringify,rawJSON:JSON.rawJSON,isRawJSON:JSON.isRawJSON};
check(Object.getPrototypeOf(owner)===Object.prototype&&Object.isExtensible(owner),'namespace-owner');
check(throwsType(()=>owner())&&throwsType(()=>Reflect.construct(owner,[])),'namespace-non-callable');
const tag=Object.getOwnPropertyDescriptor(owner,Symbol.toStringTag);
check(tag.value==='JSON'&&!tag.writable&&!tag.enumerable&&tag.configurable&&Object.prototype.toString.call(owner)==='[object JSON]','tag-descriptor');
check(Object.getOwnPropertyNames(owner).join('|')==='parse|stringify|rawJSON|isRawJSON'&&Object.keys(owner).length===0&&Object.getOwnPropertySymbols(owner).length===1,'namespace-keys');
for(const [name,length] of [['parse',2],['stringify',3],['rawJSON',1],['isRawJSON',1]]){
 const method=saved[name],descriptor=Object.getOwnPropertyDescriptor(owner,name);
 check(descriptor.value===method&&descriptor.writable&&!descriptor.enumerable&&descriptor.configurable,'member-descriptor');
 check(Object.getPrototypeOf(method)===Function.prototype&&!Object.hasOwn(method,'prototype')&&method.name===name&&method.length===length,'method-owner');
 for(const field of ['name','length']){const property=Object.getOwnPropertyDescriptor(method,field);check(!property.writable&&!property.enumerable&&property.configurable,'method-metadata')}
 const initial=Function.prototype.toString.call(method);check(initial==='function '+name+'() { [native code] }','native-initial-name');
 Object.defineProperty(method,'name',{get(){throw 'toString consulted mutable name'},configurable:true});check(Function.prototype.toString.call(method)===initial,'native-name-slot');
 Object.defineProperty(method,'name',{value:name,writable:false,enumerable:false,configurable:true});
 check(throwsType(()=>Reflect.construct(method,[])),'method-non-constructor');
}
let events='';const replacement=function(...args){events+='c';check(this===owner&&args.join('|')==='value|1|2','replacement-actual-list');return 'replaced'};
Object.defineProperty(owner,'parse',{get(){events+='g';return saved.parse},configurable:true});
async function argument(){events+='a';await Promise.resolve();Object.defineProperty(owner,'parse',{value:replacement,writable:true,configurable:true});events+='b';return '17'}
check(owner.parse(await argument())===17&&events==='gab','reference-retained');
check(owner.parse('value',1,2)==='replaced'&&events==='gabc','mutable-method');
Object.defineProperty(owner,'parse',{value:saved.parse,writable:true,enumerable:false,configurable:true});
globalThis.JSON={parse(){return 'global replacement'}};check(JSON!==owner&&owner.parse('19')===19&&JSON.parse()==='global replacement','global-owner-reference');globalThis.JSON=owner;
check(Reflect.deleteProperty(owner,Symbol.toStringTag)&&Object.prototype.toString.call(owner)==='[object Object]','tag-deletion');
Object.defineProperty(owner,Symbol.toStringTag,{get(){events+='t';return 'Changed'},configurable:true});check(Object.prototype.toString.call(owner)==='[object Changed]','tag-live-getter');
Object.defineProperty(owner,Symbol.toStringTag,tag);
const foreign=$262.createRealm(),foreignJSON=foreign.global.JSON;
check(foreignJSON!==owner&&foreignJSON.parse!==saved.parse&&Object.getPrototypeOf(foreignJSON)===foreign.global.Object.prototype,'realm-owner');
for(const name of Object.getOwnPropertyNames(owner))check(Object.getPrototypeOf(foreignJSON[name])===foreign.global.Function.prototype,'realm-method');
check(foreignJSON[Symbol.toStringTag]==='JSON'&&Object.prototype.toString.call(foreignJSON)==='[object JSON]','realm-tag');
check(saved.parse.call(foreignJSON,'23')===23&&foreignJSON.parse.call(owner,'29')===29,'borrowed-method');
try{foreignJSON.parse('invalid');throw 'missing syntax error'}catch(error){check(error instanceof foreign.global.SyntaxError&&!(error instanceof SyntaxError),'method-realm-error')}
const args=['31'];for(let index=0;index<4096;index++)args.push(index);
const rawArgs=['37',...args],raw=Reflect.apply(saved.rawJSON,null,rawArgs);
check(Reflect.apply(saved.parse,null,args)===31&&Reflect.apply(saved.stringify,null,[raw,undefined,undefined,...args])==='37'&&Reflect.apply(saved.isRawJSON,null,[raw,...args]),'wide-actual-lists');
let chain={owner,methods:saved,previous:null};for(let depth=0;depth<4096;depth++)chain={owner,methods:saved,previous:chain};
await Promise.resolve();COLLECT
let retained=0;for(let node=chain;node;node=node.previous){check(node.owner===owner&&node.methods.parse===saved.parse,'retained-owner');retained++}
console.log('JSON namespace complete',retained,events);
`;

test('JSON namespace methods and tag retain ordinary per-Realm owners',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-json-namespace-'));
 try{
  const referenceEntry=path.join(temporary,'reference.mjs');const host=`import vm from 'node:vm';globalThis.$262={createRealm(){const context=vm.createContext();return {global:vm.runInContext('globalThis',context)}}};\n`;
  await fs.writeFile(referenceEntry,host+subject.replaceAll('COLLECT',''));
  const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(...args)=>fs.writeSync(1,require("node:util").format(...args)+"\\n");import(process.argv[1]);',referenceEntry],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}`);await fs.mkdir(directory);const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject.replaceAll('COLLECT',noGc?'':'$262.gc();'));
   const output=path.join(directory,'program'),diagnostics:string[]=[];const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),test262Observation:{kind:'test262-native-observation',scenarioId:'json-namespace-owner#module',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({mode,noGc,code:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({mode,noGc,code:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});expect({mode,noGc,code:native.exitCode,stderr:native.stderr.toString()}).toEqual({mode,noGc,code:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect({mode,noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({mode,noGc,kind:'normal'});expect(observation.stdout).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},600_000);

test('canonical JSON method source owners retain metadata and initial-name text',()=>{
 for(const descriptor of jsonMethods.values())for(const field of ['name','length'] as const){
  const source=`eval(JSON.stringify(JSON[${JSON.stringify(descriptor.name)}][${JSON.stringify(field)}]));`,result=graph([{path:'main.js',source}]);expect({source,error:result.error}).toEqual({source,error:null});expect(result.directEvalSources.map(entry=>entry.source)).toEqual([JSON.stringify(field==='name'?descriptor.name:descriptor.length)]);
 }
 for(const source of ['eval(JSON.stringify(JSON[Symbol.toStringTag]));','Object.defineProperty(JSON.parse,"name",{get(){return "41;"}});eval(JSON.parse.name);','Object.defineProperty(JSON.parse,"name",{get(){throw "43;"}});try{JSON.parse.name}catch(body){eval(body)}','Object.defineProperty(JSON.parse,"name",{get(){return opaque()}});eval(JSON.parse.name);']){
  const result=graph([{path:'main.js',source}]);if(source.includes('opaque()'))expect(result.error).toContain('direct eval source is not a finite static string expression');else expect({source,error:result.error}).toEqual({source,error:null});
 }
 const source='Object.defineProperty(JSON.parse,"name",{get(){throw "must not run"}});eval(JSON.stringify(Function.prototype.toString.call(JSON.parse)));';const result=graph([{path:'main.js',source}]);expect({source,error:result.error}).toEqual({source,error:null});expect(result.directEvalSources.map(entry=>entry.source)).toEqual([JSON.stringify('function parse() { [native code] }')]);
});

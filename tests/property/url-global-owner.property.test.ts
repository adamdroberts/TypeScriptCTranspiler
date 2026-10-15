import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(profile:boolean,collect:boolean):string{return `
import {URL as ImportedURL, URLSearchParams as ImportedParams} from 'node:url';
import * as urlModule from 'node:url';
function check(value,label){if(!value)throw label;${profile?'print':'console.log'}(label+':true')}
function throwsType(action){try{action()}catch(error){return error instanceof TypeError}return false}
check(ImportedURL===URL&&ImportedParams===URLSearchParams&&urlModule.URL===URL&&urlModule.URLSearchParams===URLSearchParams,'imported-constructor-identity');
for(const [name,ctor,length] of [['URL',URL,1],['URLSearchParams',URLSearchParams,0]]){
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,name);
 check(ctor.name===name&&ctor.length===length&&descriptor.writable&&descriptor.configurable&&!descriptor.enumerable,'constructor-descriptor-'+name);
 check(Object.getPrototypeOf(ctor.prototype)===Object.prototype&&ctor.prototype.constructor===ctor,'prototype-owner-'+name);
 check(throwsType(()=>Reflect.apply(ctor,undefined,[])),'constructor-requires-new-'+name);
}
const url=new ImportedURL('https://example.com/path?a=1&a=2#fragment');
check(Object.getPrototypeOf(url)===URL.prototype&&url.href==='https://example.com/path?a=1&a=2#fragment','ordinary-url-owner');
const params=url.searchParams;check(params===url.searchParams&&params instanceof ImportedParams,'cached-search-params-owner');
params.append('b','three four');check(url.search==='?a=1&a=2&b=three+four'&&url.href==='https://example.com/path?a=1&a=2&b=three+four#fragment','params-write-through');
url.search='?next=4';check(url.searchParams===params&&params.toString()==='next=4','url-write-through');
url.href='https://example.com/other?final=5';check(url.searchParams===params&&params.get('final')==='5','href-preserves-params-owner');
const savedURL=globalThis.URL;globalThis.URL=function replacement(){};
check(ImportedURL===savedURL&&urlModule.URL===savedURL,'import-owner-independent-global-binding');globalThis.URL=savedURL;
const savedParams=globalThis.URLSearchParams;let constructed=0;globalThis.URLSearchParams=function replacement(){constructed++};new URLSearchParams('ignored');globalThis.URLSearchParams=savedParams;
check(constructed===1,'unused-construction-retains-mutable-owner');
const savedCanParse=URL.canParse;URL.canParse=function(input){return this===URL&&input==='replacement'};
check(URL.canParse('replacement'),'mutable-static-reference');URL.canParse=savedCanParse;
const events=[];const input={toString(){events.push('input');return '/relative'}},base={toString(){events.push('base');return 'https://example.com/root/'}};
check(URL.canParse(input,base,events.push('argument'))&&events.join(',')==='argument,input,base','argument-evaluation-before-coercion');
check(throwsType(()=>URL.canParse())&&throwsType(()=>new URL('invalid')),'constructor-and-static-type-errors');
const getter=Object.getOwnPropertyDescriptor(URL.prototype,'href').get;
for(const receiver of [null,{},[],function(){},URL.prototype,new Proxy(url,{})])check(throwsType(()=>Reflect.apply(getter,receiver,[])),'url-brand-check');
check(throwsType(()=>new URL.prototype.toString())&&throwsType(()=>new URLSearchParams.prototype.append()),'methods-not-constructors');
function Alternate(){}const alternate=Reflect.construct(ImportedURL,['https://example.com/alternate'],Alternate);
check(Object.getPrototypeOf(alternate)===Alternate.prototype&&Reflect.apply(getter,alternate,[])==='https://example.com/alternate','new-target-prototype');
for(const initial of ['a=1&a=2',{a:'1',b:'two'},[['a','1'],['a','2']]]){
 const value=new URLSearchParams(initial);check(Array.from(value).length===value.size,'constructor-input-partition');
 const copy=new URLSearchParams(value);check(copy.toString()===value.toString(),'iterable-copy-owner');
}
const ignored={toString(){throw 'ignored argument was coerced'}},ignoredParams=new URLSearchParams('a=1&a=2');
check(ignoredParams.get('a',ignored)==='1'&&ignoredParams.getAll('a',ignored).join(',')==='1,2','ignored-arguments-are-not-coerced');
check(ignoredParams.has('a',undefined),'optional-undefined-value');ignoredParams.delete('a',undefined);check(ignoredParams.size===0,'optional-undefined-delete');
const record={};record[String.fromCharCode(0xd800)]='first';record[String.fromCharCode(0xdc00)]='last';
check(new URLSearchParams(record).toString()==='%EF%BF%BD=last','usv-record-key-collision');
const live=new URLSearchParams('a=1');const iterator=live.entries();
check(iterator[Symbol.iterator]()===iterator&&iterator.next().value.join(',')==='a,1','iterator-owner');
const iteratorPrototype=Object.getPrototypeOf(iterator);
check(!Object.hasOwn(iteratorPrototype,Symbol.iterator)&&iteratorPrototype[Symbol.iterator]===Object.getPrototypeOf(iteratorPrototype)[Symbol.iterator],'shared-inherited-iterator-method');
live.append('b','2');check(iterator.next().value.join(',')==='b,2'&&iterator.next().done,'iterator-live-list');
live.append('c','3');check(iterator.next().value.join(',')==='c,3','iterator-resumes-appended-list');
const context={tag:'receiver'},visits=[];live.forEach(function(value,name,parent){visits.push(name+value);if(name==='a')parent.append('d','4');check(this===context&&parent===live,'foreach-this-and-owner')},context);
check(visits.join(',')==='a1,b2,c3,d4','foreach-live-list');
check(throwsType(()=>new URLSearchParams().forEach(null))&&throwsType(()=>Reflect.apply(URLSearchParams.prototype.append,[],['a','1'])),'params-brand-and-callback-errors');
const closeEvents=[],sentinel={sentinel:true};
function throwingPair(){return {[Symbol.iterator](){let index=0;return {next(){return index++===0?{value:{toString(){closeEvents.push('convert');throw sentinel}},done:false}:{done:true}},return(){closeEvents.push('inner-close');return {done:true}}}}}}
const outer={[Symbol.iterator](){let index=0;return {next(){return index++===0?{value:throwingPair(),done:false}:{done:true}},return(){closeEvents.push('outer-close');return {done:true}}}}};
let caught;try{new URLSearchParams(outer)}catch(error){caught=error}
check(caught===sentinel&&closeEvents.join(',')==='convert,inner-close,outer-close','nested-iterator-close');
const originalAppend=URLSearchParams.prototype.append;URLSearchParams.prototype.append=function(name,value){return Reflect.apply(originalAppend,this,[name,value+'!'])};
const replaced=new URLSearchParams();replaced.append('x','value');check(replaced.get('x')==='value!','mutable-instance-method-reference');URLSearchParams.prototype.append=originalAppend;
async function retained(){const ctor=ImportedURL;const value=new ctor(await Promise.resolve('https://example.com/await?a=1'));const method=value.searchParams.append;await Promise.resolve();Reflect.apply(method,value.searchParams,['b','2']);return value}
check((await retained()).search==='?a=1&b=2','retained-owner-through-suspension');
let chain={previous:null,url,params};for(let index=0;index<4096;index++)chain={previous:chain,url:new URL('https://example.com/deep?index='+index),params:new URLSearchParams('index='+index)};
${collect?'$262.gc();':''}
let count=0,valid=true;for(let owner=chain;owner;owner=owner.previous){valid=valid&&owner.url.searchParams===owner.url.searchParams&&(count===4096||owner.params.get('index')===String(4096-count-1));count++}
check(valid&&count===4097&&chain.url.href==='https://example.com/deep?index=4095','deep-retained-owner-graph');
`}

test('URL host owners use ordinary References and one live parameter list',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-url-owner-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false,false));
  const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile,profile&&!noGc));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'url-global-owner.mjs#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({mode,noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({mode,noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({mode,noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({mode,noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect({mode,noGc,observationKind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({mode,noGc,observationKind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

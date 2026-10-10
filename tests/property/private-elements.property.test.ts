import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(profile:boolean,stress:boolean):string{return `
// @ts-nocheck
export {};
const host=globalThis;const events=[];
function check(value,label){if(!value)throw label;${profile?'host.print':'console.log'}(label+':true')}
function typeError(action){try{action();return false}catch(error){return error instanceof TypeError}}
function make(){return class Owner {
 #value=3; ['#value']=11; #fn=function(){return this.#value}; static #s=7;
 get #pair(){events.push('get');return this.#value} set #pair(value){events.push('set');this.#value=value}
 #method(value){return this.#value+value} get #readonly(){return 12} set #writeonly(value){this.#value=value}
 read(){return this.#value} write(value){return this.#value=value} has(value){return #value in value}
 invoke(){return this.#method(2)+this.#fn()} tagged(){return this.#fn\`tag\`} names(){return [this.#fn.name,this.#method.name,this.#method.length].join(',')}
 mutate(){this.#value+=2;this.#pair++;this.#value&&=8;this.#value||=99;this.#value??=99;[this.#value]=[9];return this.#pair}
 bad(value){return typeError(()=>value.#method=1)&&typeError(()=>value.#readonly=1)&&typeError(()=>value.#writeonly)}
 static read(){return this.#s} static has(value){return #s in value}
 closure(){return ()=>this.#value}
 async resume(){this.#value+=await Promise.resolve(3);return this.#pair} async resumeCall(){return this.#method(await Promise.resolve(2))}
 *gen(){this.#pair=yield this.#value;return this.#pair}
 async *agen(){this.#value+=await Promise.resolve(1);yield this.#value;return this.#value}
 optional(value){return value?.#method?.(2)}
 nested(){return class Inner extends (this.#value,Object){#value=23;read(){return this.#value}}}
 }}
const Owner=make(),Other=make(),owner=new Owner(),other=new Other();
check(owner.read()===3&&owner['#value']===11&&Reflect.ownKeys(owner).join(',')==='#value','separate-private-elements');
check(owner.has(owner)&&!owner.has(other)&&!Owner.has(owner)&&Owner.has(Owner)&&!Owner.has(Other),'evaluation-and-static-brand');
check(owner.invoke()===8&&owner.tagged()===3&&owner.optional(owner)===5&&owner.optional(null)===undefined,'private-call-receiver');
check(owner.names()==='#fn,#method,1','private-callable-names');
check(owner.mutate()===9&&events.join(',')==='get,set,get','reference-operators-and-accessor-order');
check(owner.bad(owner)&&typeError(()=>owner.read.call({}))&&typeError(()=>Owner.read.call(Other))&&typeError(()=>owner.has(1)),'private-get-set-brand-errors');
const proxy=new Proxy(owner,{});check(!owner.has(proxy)&&typeError(()=>owner.read.call(proxy)),'proxy-has-independent-brand');
Object.freeze(owner);check(owner.write(13)===13&&owner.read()===13,'nonbrowser-frozen-private-field');
const saved=owner.closure();const Nested=owner.nested();check(new Nested().read()===23&&saved()===13,'nested-scope-heritage-and-closure');
class Ordered { #first=(events.push('first'),this.#method()); #method(){return 17} #later=19;
 static #staticFirst=Ordered.#staticMethod();static #staticMethod(){return 21}static get #staticPair(){return 22}
 read(){return this.#first}static read(){return [this.#staticFirst,this.#staticPair].join(',')}
}
check(new Ordered().read()===17&&Ordered.read()==='21,22','method-brands-before-fields');
class ReturnBase {constructor(value){return value}}class Stamp extends ReturnBase {#x=29;read(){return this.#x}static has(value){return #x in value}}
const returned={};new Stamp(returned);check(Stamp.has(returned)&&Stamp.prototype.read.call(returned)===29&&typeError(()=>new Stamp(returned)),'returned-object-and-duplicate-field');
for(const receiver of [[],function Receiver(){},new Proxy({}, {})]){new Stamp(receiver);check(Stamp.has(receiver)&&Stamp.prototype.read.call(receiver)===29,'object-category-brand');}
class Reentrant {#first=(()=>{try{return this.#later}catch(error){return error.name}})();#later=1;read(){return this.#first}}
check(new Reentrant().read()==='TypeError','field-initialization-brand-order');
let rhs=0;class Primitive {#x;assign(value){return value.#x=(rhs++,5)}compound(value){return value.#x+=(rhs++,5)}}
const primitive=new Primitive();check(typeError(()=>primitive.assign(1))&&rhs===1&&typeError(()=>primitive.compound(1))&&rhs===1,'private-reference-abrupt-order');
async function main(){
 const resumed=await owner.resume();check(resumed===16&&saved()===16,'retained-await-reference');
 check(await owner.resumeCall()===18,'private-call-through-suspension');
 const iterator=owner.gen();check(iterator.next().value===16&&iterator.next(31).value===31,'retained-yield-reference');
 const asyncIterator=owner.agen();const yielded=await asyncIterator.next();const completed=await asyncIterator.next();check(yielded.value===32&&completed.value===32&&completed.done,'retained-async-generator');
 ${stress?`let retained={owner,saved};for(let depth=0;depth<4096;depth++)retained={next:retained};${profile?'host.$262.gc();':''}for(let depth=0;depth<4096;depth++)retained=retained.next;check(retained.owner.read()===retained.saved(),'deep-retained-private-owner');`:''}
}
await main();
`}

test('private names retain class identity through canonical References',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-private-elements-'));
 try{for(const profile of [false,true])for(const noGc of [false,true]){
  const stress=profile&&!noGc,directory=path.join(temporary,`${profile}-${noGc}`);await fs.mkdir(directory);
  const source=subject(profile,stress),entry=path.join(directory,'main.mjs'),reference=path.join(directory,'reference.mjs');await fs.writeFile(entry,source);
  await fs.writeFile(reference,subject(false,stress));
  const oracle=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");import(process.argv[1]);',reference],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  const diagnostics:string[]=[],output=path.join(directory,'program');const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),moduleRoots:[entry],initializationEntries:[entry],...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/private-elements.mjs#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
  expect({profile,noGc,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({profile,noGc,exitCode:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});expect({profile,noGc,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({profile,noGc,exitCode:0,stderr:''});
  const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation.kind).toBe('normal');expect(observation?observation.stdout:native.stdout.toString()).toBe(oracle.stdout.toString());
 }}finally{await fs.rm(temporary,{recursive:true,force:true})}
},600_000);

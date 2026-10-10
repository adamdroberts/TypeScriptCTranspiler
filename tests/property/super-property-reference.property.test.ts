import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(profile:boolean,noGc:boolean,stress:boolean):string {
 const protocols=['plain','async','generator','async-generator'];
 const definitions=protocols.flatMap(protocol=>['class-instance','class-static','object'].map(owner=>{
  const name=`make_${protocol.replaceAll('-','_')}_${owner.replaceAll('-','_')}`;
  const prefix=protocol==='plain'?'':protocol==='async'?'async ':protocol==='generator'?'*':'async *';
  const pause=protocol==='plain'?'':protocol==='async'?'await Promise.resolve(0);':'yield "pause";';
  const modifier=owner==='class-static'?'static ':'';
  const member=`${modifier}${prefix}query(key:any,reader:any=()=>super[key]):any{${pause}return [super[key],this,reader,()=>super[key]];}`;
  const factory=owner==='object'?`return {marker:label,${member}};`:`const C=class {${modifier}marker=label;${member}};return C;`;
  return {protocol,owner,name,source:`function ${name}(label:any):any{${factory}}`};
 }));
 const chain='()=>'.repeat(stress?256:2)+'super.read()';
 return `// @ts-nocheck
 "use strict";
 const host=globalThis;function output(value:any):void{${profile?'host.print':'console.log'}(value)}
 function collect():void{${profile&&!noGc?'host.$262.gc();':''}}
 function check(value:any,label:string):void{if(!value)throw label;output(label+':true')}
 ${definitions.map(row=>row.source).join('\n')}
 const definitions:any[]=[${definitions.map(row=>`{protocol:'${row.protocol}',owner:'${row.owner}',make:${row.name}}`).join(',')}];
 async function main():Promise<void>{
 const key=Symbol('actual-key'),label=Symbol('retained-label');
 const base:any={get [key](){return this.marker},get read(){return this.marker}};
 for(const row of definitions){
  const C=row.make(label),home=row.owner==='object'||row.owner==='class-static'?C:C.prototype;
  Object.setPrototypeOf(home,base);const receiver=row.owner==='class-instance'?new C():C;
  let result:any;
  if(row.protocol==='plain')result=receiver.query(key);else if(row.protocol==='async')result=await receiver.query(key);
  else{const iterator=receiver.query(key);const first=row.protocol==='generator'?iterator.next():await iterator.next();check(first.value==='pause'&&!first.done,'suspension-'+row.protocol+'-'+row.owner);const last=row.protocol==='generator'?iterator.next():await iterator.next();result=last.value;}
  check(result[0]===label&&result[1]===receiver&&result[2]()===label&&result[3]()===label,'retained-home-'+row.protocol+'-'+row.owner);
  const next={get [key](){return this.marker+'-next'}};receiver.marker='changed';Object.setPrototypeOf(home,next);collect();
  check(result[2]()==='changed-next'&&result[3]()==='changed-next','live-prototype-'+row.protocol+'-'+row.owner);
 }
 const events:any[]=[];let phase=0;
 const changingKey:any={[Symbol.toPrimitive](){events.push('key'+phase);return phase++===0?'first':'second'}};
 const first:any={first:2,second:30,read(){return this.marker},tag(parts:any,...args:any[]){return [this.marker,parts[0],args[0]]}};
 const object:any={marker:4,read(){return super.read()},write(key:any){super[key]=(events.push('rhs'),8)},compound(key:any){return super[key]+=(events.push('rhs'),3)},update(key:any){return super[key]++},pattern(key:any,value:any){[super[key]]=[value]},tag(){return super.tag\`value:${'${this.marker}'}\`},remove(key:any){return delete super[key]}};
 Object.setPrototypeOf(object,first);object.write(changingKey);check(events.join(',')==='rhs,key0'&&object.first===8,'delayed-put-key-conversion');
 events.length=0;check(object.compound('second')===33&&object.second===33&&first.second===30&&events.join(',')==='rhs','get-put-reference');
 events.length=0;check(object.update('second')===30&&object.second===31&&first.second===30,'update-reference');
 object.pattern('first',12);check(object.first===12&&first.first===2,'pattern-super-reference');
 check(object.tag().join(',')==='4,value:,4','tagged-super-receiver');
 events.length=0;phase=0;let removed=false;try{object.remove(changingKey)}catch(e){removed=e instanceof ReferenceError}check(removed&&events.length===0,'delete-super-reference');
 const frozen={first:2};Object.defineProperty(frozen,'first',{writable:false});Object.setPrototypeOf(object,frozen);let rejected=false;try{object.write('first')}catch(e){rejected=e instanceof TypeError}check(rejected&&object.first===12,'strict-object-super-write');
 function makeStrict():any{return class {write(){super.first=9}}}const Strict=makeStrict();Object.setPrototypeOf(Strict.prototype,frozen);let strict=false;try{new Strict().write()}catch(e){strict=e instanceof TypeError}check(strict,'strict-super-write');

 const resumeEvents:any[]=[];const resumeBase:any={value:2},replacement:any={value:20};
 const suspended:any={async edit(key:any):Promise<any>{return super[await Promise.resolve(key)]+=await (Object.setPrototypeOf(suspended,replacement),Promise.resolve(3))},*editGenerator():any{return super[yield "key"]+=yield "right"}};
 Object.setPrototypeOf(suspended,resumeBase);const edited=await suspended.edit('value');check(edited===5&&suspended.value===5&&resumeBase.value===2&&replacement.value===20,'awaited-key-and-put-reference');
 Object.setPrototypeOf(suspended,resumeBase);const generator=suspended.editGenerator();check(generator.next().value==='key'&&generator.next('value').value==='right','yielded-key-and-right');Object.setPrototypeOf(suspended,replacement);check(generator.next(4).value===6&&suspended.value===6&&resumeBase.value===2,'yielded-reference-retention');
 const absent:any=null,optionalEvents:any[]=[];let optionalFailure=false;try{(absent?.method)(await (optionalEvents.push('argument'),Promise.resolve(1)))}catch(e){optionalFailure=e instanceof TypeError}check(optionalFailure&&optionalEvents.join(',')==='argument','parenthesized-optional-callee');
 const borrowed:any={marker:11};Object.setPrototypeOf(object,first);check(object.read.call(borrowed)===11&&object.read.bind(borrowed)()===11,'borrowed-home-and-receiver');
 function makeDeep(marker:any):any{return class Deep {marker=marker;read(){return ${chain}}}}
 const Deep=makeDeep(label),deepBase={read(){return this.marker}};Object.setPrototypeOf(Deep.prototype,deepBase);
 let reader:any=new Deep().read();for(let i=1;i<${stress?256:2};i++)reader=reader();
 let owner:any={reader,Deep,deepBase};for(let i=0;i<${stress?8192:2};i++)owner={owner};collect();for(let i=0;i<${stress?8192:2};i++)owner=owner.owner;
 check(owner.reader()===label&&Object.getPrototypeOf(owner.Deep.prototype)===owner.deepBase,'deep-super-home-owner-graph');
 }main();
 `;
}

test('Super References retain home objects and actual receivers across suspension',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-super-property-reference-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try{
  const plans=[true,false].flatMap(typed=>[false,true].flatMap(profile=>[false,true].map(noGc=>({typed,profile,noGc,stress:false}))));plans.push({typed:true,profile:true,noGc:false,stress:true});
  const expected=new Map<string,string[]>();
  for(const key of new Set(plans.map(plan=>`${plan.profile}-${plan.stress}-${plan.typed}`))){
   const [profile,stress]=key.split('-').map(value=>value==='true');
   const entry=path.join(temporary,`reference-${key}.mjs`);await fs.writeFile(entry,erase(subject(profile!,true,stress!)));
   const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");globalThis.print=console.log;import(process.argv[1]);',entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const lines=reference.stdout.toString().trimEnd().split('\n');expect(lines.at(-1)).toBe('deep-super-home-owner-graph:true');expected.set(key,lines);
  }
  for(const {typed,profile,noGc,stress} of plans){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}-${stress}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(profile,noGc,stress);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/super-property-reference.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,stress,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({typed,profile,noGc,stress,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect({typed,profile,noGc,stress,...observation}).toMatchObject({typed,profile,noGc,stress,kind:'normal',scenarioId:'property/super-property-reference.js#module'});
   expect({typed,profile,noGc,stress,lines:(observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')}).toEqual({typed,profile,noGc,stress,lines:expected.get(`${profile}-${stress}-${typed}`)!});
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

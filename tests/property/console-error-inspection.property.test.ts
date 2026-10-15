import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

// The native console contract uses a compact diagnostic header, without host
// stacks. Node independently supplies Error header and ordinary property text.
const subject=String.raw`
function check(value,label){if(!value)throw label}
function emit(label,error){console.log(label,error)}
for(const constructor of [Error,TypeError,RangeError,AggregateError]){
 for(const message of [undefined,'','text']){
  const error=constructor===AggregateError?new constructor([],message):new constructor(message);
  emit(constructor.name+'-'+String(message),error);
  error.extra=17;emit('property',error);delete error.extra;
  error.name='Renamed';error.message='after';emit('mutation',error);
  delete error.message;emit('deleted-message',error);
 }
}
const empty=new Error('discarded');empty.name='';empty.message='only';emit('empty-name',empty);
empty.message='';emit('empty-fields',empty);
let calls=0;const guarded=new TypeError('before');
Object.defineProperty(guarded,'message',{get(){calls++;throw 'message invoked'},configurable:true});
Object.defineProperty(guarded,'extra',{get(){calls++;throw 'extra invoked'},enumerable:true});
guarded.toString=function(){calls++;throw 'toString invoked'};
// Keep the override hidden; inspection must never invoke it.
Object.defineProperty(guarded,'toString',{enumerable:false});
emit('accessors',guarded);check(calls===0,'inspection-accessors');
const nested=new Error('outer');nested.child=new RangeError('inner');emit('nested',nested);
const shared=new Error('shared');shared.left={value:1};shared.right=shared.left;emit('aliases',shared);
const cycle=new Error('cycle');cycle.self=cycle;emit('cycle',cycle);
console.log('formats %s|%O',new Error('formatted'),new Error('formatted'));
console.log('type:',new TypeError('bad'));
let retained=new Error('leaf');for(let index=0;index<4096;index++){const next=new Error('node');next.previous=retained;retained=next}
await Promise.resolve();COLLECT
let depth=0;for(let node=retained;node.previous;node=node.previous)depth++;
check(depth===4096,'retained-error-graph');emit('deep',retained);
console.log('accessor-count',calls,'retained-depth',depth);
`;

const oracle=String.raw`
import {formatWithOptions} from 'node:util';
import {writeSync} from 'node:fs';
const originalError=Error;
const constructors=[Error,TypeError,RangeError,AggregateError];
function diagnostic(error){
 const fields=Object.getOwnPropertyDescriptors(error);
 const native=constructors.find(constructor=>Object.getPrototypeOf(error)===constructor.prototype).prototype.name;
 const name=typeof fields.name?.value==='string'?fields.name.value:native;
 const message=typeof fields.message?.value==='string'?fields.message.value:'';
 return name===''?message:message===''?name:name+': '+message;
}
// Stack omission and compact headers are intentional native host behavior.
function inspect(value,depth=2,ancestors=[]){
 if(!(value instanceof originalError))return formatWithOptions({depth,breakLength:Infinity,compact:true},'%O',value);
 if(ancestors.includes(value))return '[Circular]';
 if(depth<0)return '[Object]';
 const header=diagnostic(value),fields=Object.getOwnPropertyDescriptors(value),properties=[];
 for(const key of Object.keys(fields)){
  const field=fields[key];if(!field.enumerable)continue;
  const text=('get' in field)?(field.get?(field.set?'[Getter/Setter]':'[Getter]'):'[Setter]'):inspect(field.value,depth-1,[...ancestors,value]);
  properties.push(key+': '+text);
 }
 return header+(properties.length?' { '+properties.join(', ')+' }':'');
}
console.log=(...args)=>{
 if(args[0]==='formats %s|%O')writeSync(1,'formats '+inspect(args[1],0)+'|'+inspect(args[2])+'\n');
 else writeSync(1,args.map(value=>value instanceof originalError?inspect(value):String(value)).join(' ')+'\n');
};
console.error=(...args)=>writeSync(2,args.map(value=>value instanceof originalError?inspect(value):String(value)).join(' ')+'\n');
`;

test('console Error headers share descriptor inspection without user conversion',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-console-error-'));
 try{
  const referenceEntry=path.join(temporary,'reference.mjs');await fs.writeFile(referenceEntry,oracle+subject.replace('COLLECT',''));
  const reference=nodeReferenceSync(['node',referenceEntry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');
   await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject.replace('COLLECT',noGc?'':'$262.gc();'));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),test262Observation:{kind:'test262-native-observation',scenarioId:'console-error-inspection#module',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({mode,noGc,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({mode,noGc,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({mode,noGc,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({mode,noGc,exitCode:0,stderr:reference.stderr.toString()});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect({mode,noGc,kind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({mode,noGc,kind:'normal'});
   expect(observation.stdout).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},600_000);

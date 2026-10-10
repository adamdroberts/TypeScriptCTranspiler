import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(profile:boolean,collect:boolean,fsRoot:string):string{return `
import fs from 'node:fs';import * as fsNamespace from 'fs';import {Dirent as ImportedDirent} from 'fs';
function check(value,label){if(!value)throw label}
function throwsType(action){try{action();return false}catch(error){return error instanceof TypeError}}
const root=${JSON.stringify(fsRoot)};fs.mkdirSync(root,{recursive:true});fs.writeFileSync(root+'/file','data');fs.mkdirSync(root+'/folder');fs.symlinkSync(root+'/file',root+'/link');
const entries=fs.readdirSync(root,{withFileTypes:true});const file=entries.find(entry=>entry.name==='file'),folder=entries.find(entry=>entry.name==='folder'),link=entries.find(entry=>entry.name==='link');
const Ctor=fs.Dirent,proto=Ctor.prototype;
check(Ctor===fsNamespace.Dirent&&Ctor===ImportedDirent&&Ctor.name==='Dirent'&&Ctor.length===3&&proto.constructor===Ctor&&file.constructor===Ctor&&file instanceof Ctor,'constructor-owner');
check(Object.getPrototypeOf(proto)===Object.prototype&&Object.getPrototypeOf(file)===proto&&Object.prototype.toString.call(file)==='[object Object]','prototype-owner');
check(Object.keys(file).join('|')==='name|parentPath'&&file.parentPath===root&&!('path' in file),'data-fields');
for(const name of ['name','parentPath']){const d=Object.getOwnPropertyDescriptor(file,name);check(d.writable&&d.enumerable&&d.configurable,'data-descriptors');}
const symbol=Object.getOwnPropertySymbols(file)[0];check(symbol.description==='type'&&Reflect.ownKeys(file).length===3,'kind-symbol');const sd=Object.getOwnPropertyDescriptor(file,symbol);check(sd.writable&&sd.enumerable&&sd.configurable,'symbol-descriptor');
const methods=['isDirectory','isFile','isBlockDevice','isCharacterDevice','isSymbolicLink','isFIFO','isSocket'];const types=[2,1,7,6,3,4,5];
for(let i=0;i<methods.length;i++){const name=methods[i],method=proto[name],d=Object.getOwnPropertyDescriptor(proto,name);check(method.name===name&&method.length===0&&d.writable&&!d.enumerable&&d.configurable&&throwsType(()=>Reflect.construct(method,[])),'method-metadata');check(method.call({})===false&&throwsType(()=>method.call(null)),'ordinary-receiver');for(const type of [undefined,0,1,2,3,4,5,6,7,'1',true])check(method.call({[symbol]:type})===(type===types[i]),'kind-partitions');}
check(file.isFile()&&!file.isDirectory()&&folder.isDirectory()&&link.isSymbolicLink(),'backend-kinds');
const borrowed=proto.isFile;check(borrowed.call(new Proxy(file,{}))&&borrowed.call({[symbol]:1}),'borrowed-method-and-proxy');
file[symbol]=2;check(file.isDirectory()&&!file.isFile(),'kind-mutation');file[symbol]=1;
file.name='changed';file.parentPath='changed-parent';check(file.name==='changed'&&file.parentPath==='changed-parent','field-mutation');
const made=new Ctor('constructed',1,'parent');check(made.name==='constructed'&&made.parentPath==='parent'&&made.isFile(),'source-construction');
const empty=new Ctor();check(empty.name===undefined&&empty.parentPath===undefined&&!empty.isFile(),'constructor-undefined-fields');
function Alternate(){};check(Object.getPrototypeOf(Reflect.construct(Ctor,['other',2,'path'],Alternate))===Alternate.prototype,'new-target');
class Derived extends Ctor{marker='derived'}const derived=new Derived('child',2,'parent');check(derived instanceof Derived&&derived instanceof Ctor&&derived.isDirectory()&&derived.marker==='derived','derived-construction');
let head,last;for(let i=0;i<4096;i++){const entry=new Ctor('entry'+i,types[i%types.length],'parent');if(last)last.next=entry;else head=entry;last=entry;}
${collect?'$262.gc();':''}
let cursor=head,position=0;while(cursor){check(cursor.name==='entry'+position&&proto[methods[position%methods.length]].call(cursor),'deep-owner-retention');cursor=cursor.next;position++;}check(position===4096,'deep-owner-chain');
fs.Dirent=function(){throw 'mutated'};check(file.constructor===Ctor&&head.constructor===Ctor,'original-constructor-retention');fs.Dirent=Ctor;
const handle=fs.opendirSync(root);const read=handle.readSync();check(Object.getPrototypeOf(read)===proto&&read.constructor===Ctor,'directory-handle-shares-owner');handle.closeSync();
async function resume(){const results=await fs.promises.readdir(root,{withFileTypes:true});const retained=results.find(entry=>entry.name==='file');await Promise.resolve();check(retained.isFile()&&Object.getPrototypeOf(retained)===proto&&borrowed.call(retained),'promise-and-suspended-owner');const bufferResults=await fs.promises.readdir(root,{withFileTypes:true,encoding:'buffer'});check(Buffer.isBuffer(bufferResults[0].name)&&Object.getPrototypeOf(bufferResults[0])===proto,'encoded-promise-owner');fs.rmSync(root,{recursive:true,force:true});console.log('dirent owners ok');}
resume();
`}
test('Directory results share ordinary owners and one kind projection through source References',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-dirent-owner-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false,false,path.join(temporary,"reference-root")));
  const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile,profile&&!noGc,path.join(directory,"fs-root")));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'weak-collection-owner.mjs#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({mode,noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({mode,noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({mode,noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({mode,noGc,profile,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect({mode,noGc,observationKind:observation.kind,...(observation.kind==='normal'?{}:{observation})}).toEqual({mode,noGc,observationKind:'normal'});
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);

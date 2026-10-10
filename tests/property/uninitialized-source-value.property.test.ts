import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

const annotations=['number','boolean','string','bigint','symbol','{value:number}','number[]','()=>number','Promise<number>'];
function subject(profile:boolean,noGc:boolean,stress:boolean):string {
 const declarations=annotations.flatMap((annotation,index)=>['var','let'].map(kind=>`(function(){
  ${kind} value:${annotation};const read=()=>value;collect();check(read()===undefined&&typeof read()==='undefined','declaration-initial-${kind}-${index}');
  for(const next of writes){value=next;collect();check(Object.is(read(),next)&&typeof read()===typeof next,'declaration-write-${kind}-${index}');}
 })();`)).join('\n');
 const aliases=stress?Array.from({length:2048},(_,index)=>`const retained${index}:()=>number=${index?'retained'+(index-1):'read'};`).join('\n'):'const retained:()=>number=read;';
 return `// @ts-nocheck
 export {};
 const host=globalThis,collectHook=${profile&&!noGc?'host.$262.gc':'undefined'};
 function output(value:any):void{${profile?'host.print':'console.log'}(value);}
 function collect():void{${profile&&!noGc?'collectHook();':''}}
 function check(value:boolean,label:string):void{if(!value)throw label;output(label+':true');}
 const writes:any[]=[undefined,null,false,'changed',17n,Symbol('write'),{},[],function(){return 3;}];
 ${declarations}
 function hoisted():void {function read():any{return value;}check(read()===undefined&&typeof read()==='undefined','hoisted-binding-before-initializer');var value:number=3;var value:number;check(read()===3,'var-redeclaration-preserves-initialized-value');}
 hoisted();
 let moduleValue:number;check(moduleValue===undefined&&typeof moduleValue==='undefined','module-declaration-undefined');
 class Holder {number:number;boolean:boolean;string:string;bigint:bigint;symbol:symbol;object:{value:number};array:number[];callable:()=>number;static number:number;}
 const holder:any=new Holder();
 for(const key of ['number','boolean','string','bigint','symbol','object','array','callable'])check(Object.prototype.hasOwnProperty.call(holder,key)&&holder[key]===undefined&&typeof holder[key]==='undefined','field-undefined-'+key);
 check(Object.prototype.hasOwnProperty.call(Holder,'number')&&Holder.number===undefined,'static-field-undefined');
 const initialReaders:any[]=[],writtenReaders:any[]=[];
 for(let index=0;index<3;index++){let scoped:number;initialReaders.push(()=>scoped);check(scoped===undefined,'iteration-declaration-undefined');scoped=index;writtenReaders.push(()=>scoped);}
 collect();check(initialReaders[0]()===0&&writtenReaders[1]()===1&&writtenReaders[2]()===2,'retained-iteration-declarations');
 let caught:any;try{before;let before:number;}catch(error){caught=error;}check(caught instanceof ReferenceError,'pre-declaration-tdz');
 let value:number;const read=()=>value;
 ${aliases}
 const retainedRead=${stress?'retained2047':'retained'};collect();check(retainedRead()===undefined&&typeof retainedRead()==='undefined','retained-uninitialized-dependency-graph');
 value=BigInt('9007199254740993');collect();check(retainedRead()===9007199254740993n&&typeof retainedRead()==='bigint','retained-later-actual-domain');
 async function suspended():Promise<void>{let local:number;const reader=()=>local;await Promise.resolve();collect();check(reader()===undefined,'suspended-uninitialized-declaration');local='later';await Promise.resolve();collect();check(reader()==='later'&&retainedRead()===9007199254740993n,'suspended-later-write-domain');}
 suspended();
 `;
}

test('Uninitialized declarations and fields share actual undefined storage through the source graph',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-uninitialized-source-value-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try{
  const plans=[true,false].flatMap(typed=>[false,true].flatMap(profile=>[false,true].map(noGc=>({typed,profile,noGc,stress:false}))));plans.push({typed:true,profile:true,noGc:false,stress:true});
  const expected=new Map<string,string[]>();
  for(const key of new Set(plans.map(plan=>`${plan.profile}-${plan.stress}`))){
   const [profile,stress]=key.split('-').map(value=>value==='true');
   const entry=path.join(temporary,`reference-${key}.mjs`);await fs.writeFile(entry,erase(subject(profile!,true,stress!)));
   const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");globalThis.print=console.log;import(process.argv[1]);',entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const lines=reference.stdout.toString().trimEnd().split('\n');expect(lines.at(-1)).toBe('suspended-later-write-domain:true');expected.set(key,lines);
  }
  for(const {typed,profile,noGc,stress} of plans){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}-${stress}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(profile,noGc,stress);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/uninitialized-source-value.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,stress,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({typed,profile,noGc,stress,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:'normal',scenarioId:'property/uninitialized-source-value.js#module'});
   expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')).toEqual(expected.get(`${profile}-${stress}`)!);
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

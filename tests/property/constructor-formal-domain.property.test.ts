import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

const annotations=['number','boolean','string','bigint','symbol','object','()=>string','string[]','Promise<string>'];
function subject(profile:boolean,noGc:boolean,stress:boolean):string {
 const declarations=annotations.map((annotation,index)=>`class Carrier${index} {received:any;reader:()=>any;constructor(value:${annotation}){collect();this.received=value;this.reader=()=>value;}}`).join('\n');
 return `// @ts-nocheck
 const host=globalThis,collectHook=${profile&&!noGc?'host.$262.gc':'undefined'};
 function output(value:any):void{${profile?'host.print':'console.log'}(value);}
 function collect():void{${profile&&!noGc?'collectHook();':''}}
 function check(value:boolean,label:string):void{if(!value)throw label;output(label+':true');}
 ${declarations}
 class ParameterProperty {constructor(public readonly value:number){collect();}}
 class Mutable {reader:()=>any;writer:(next:any)=>void;constructor(value:number){this.reader=()=>value;this.writer=(next:any)=>{value=next;};value='changed' as any;}}
 class Defaults {received:any;reader:()=>any;constructor(value:number='default' as any,read:()=>any=()=>value){collect();this.received=value;this.reader=read;}}
 class Pattern {received:any;constructor({value}:{value:number}){collect();this.received=value;}}
 class Rest {received:any;constructor(...values:number[]){collect();this.received=values;}}
 class Actuals {received:any;constructor(value:number){collect();this.received=[value,arguments.length,arguments[1]];}}
 function fresh(kind:number):any{
  if(kind===0)return undefined;if(kind===1)return null;if(kind===2)return -0;if(kind===3)return NaN;
  if(kind===4)return 'fresh:'+String(7);if(kind===5)return BigInt('9007199254740993');if(kind===6)return Symbol('fresh');
  if(kind===7)return{value:'object:'+String(7)};if(kind===8)return['array:'+String(7)];
  if(kind===9)return function(){return 'callable:'+String(7);};return Promise.resolve('promise:'+String(7));
 }
 function retained():any{let node:any={value:'leaf:'+String(7)};for(let depth=0;depth<${stress?8192:8};depth++)node={previous:node};return node;}
 const constructors:any[]=[${annotations.map((_,index)=>'Carrier'+index).join(',')}];
 for(let annotation=0;annotation<constructors.length;annotation++)for(let kind=0;kind<11;kind++){
  const input=fresh(kind),Constructor=constructors[annotation],owner=new Constructor(input);collect();
  check(Object.is(owner.received,input)&&Object.is(owner.reader(),input),'actual-constructor-domain-'+annotation+'-'+kind);
 }
 for(let kind=0;kind<11;kind++){const input=fresh(kind),owner=new ParameterProperty(input as any);collect();check(Object.is(owner.value,input),'parameter-property-domain-'+kind);}
 const missing=new Carrier0();check(missing.received===undefined&&missing.reader()===undefined,'absent-constructor-domain');
 const original=fresh(4);const aliased=new Carrier0(original as any);check(aliased.received===original&&aliased.reader()===original,'direct-constructor-alias-domain');
 const mutable=new Mutable(1);check(mutable.reader()==='changed','constructor-shared-capture-cell');const replacement=fresh(7);mutable.writer(replacement);collect();check(mutable.reader()===replacement,'constructor-capture-write-root');
 const directDefault=new Defaults(),Default:any=Defaults,boxedDefault=new Default(undefined);check(directDefault.received==='default'&&directDefault.reader()==='default'&&boxedDefault.reader()==='default','constructor-entry-default');
 const pattern=new Pattern({value:original} as any);check(pattern.received===original,'constructor-binding-tree-domain');
 const RestAlias:any=Rest,rest=new RestAlias(original,replacement,undefined);collect();check(rest.received.length===3&&rest.received[0]===original&&rest.received[1]===replacement&&rest.received[2]===undefined&&RestAlias.length===0&&Default.length===0,'constructor-retained-rest-list');
 const actuals=new Actuals(undefined,replacement);check(actuals.received[0]===undefined&&actuals.received[1]===2&&actuals.received[2]===replacement,'constructor-actual-argument-list');
 const deep=new Carrier0(retained() as any);collect();let node:any=deep.reader();for(let depth=0;depth<${stress?8192:8};depth++)node=node.previous;check(node.value==='leaf:7','deep-constructor-owner-graph');
 `;
}

test('Constructor formal storage follows actual domains through the canonical owner graph',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-constructor-formal-domain-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try{
  const plans=[true,false].flatMap(typed=>[false,true].flatMap(profile=>[false,true].map(noGc=>({typed,profile,noGc,stress:false}))));plans.push({typed:true,profile:true,noGc:false,stress:true});
  const expected=new Map<string,string[]>();
  for(const key of new Set(plans.map(plan=>`${plan.profile}-${plan.stress}-${plan.typed}`))){
   const [profile,stress]=key.split('-').map(value=>value==='true');
   const entry=path.join(temporary,`reference-${key}.mjs`);await fs.writeFile(entry,erase(subject(profile!,true,stress!)));
   const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");globalThis.print=console.log;import(process.argv[1]);',entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const lines=reference.stdout.toString().trimEnd().split('\n');expect(lines.at(-1)).toBe('deep-constructor-owner-graph:true');expected.set(key,lines);
  }
  for(const {typed,profile,noGc,stress} of plans){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}-${stress}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(profile,noGc,stress);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/constructor-formal-domain.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,stress,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({typed,profile,noGc,stress,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect({typed,profile,noGc,stress,...observation}).toMatchObject({typed,profile,noGc,stress,kind:'normal',scenarioId:'property/constructor-formal-domain.js#module'});
   expect({typed,profile,noGc,stress,lines:(observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')}).toEqual({typed,profile,noGc,stress,lines:expected.get(`${profile}-${stress}-${typed}`)!});
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

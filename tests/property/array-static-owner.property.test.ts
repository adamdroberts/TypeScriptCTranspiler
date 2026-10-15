import {nodeReferenceSync} from './node-reference';
import {expect,test} from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";

function subject(strict:boolean,profile:boolean,noGc:boolean):string{
 const depth=128;
 return `${strict?'export {};':''}
 const marker:any={token:11},key=Symbol('key'),callable=()=>marker;
 function emit(value:any):void{${profile?'(globalThis as any).print':'console.log'}(value);}
 function check(value:boolean,label:string):void{if(!value)throw label;emit(label+':true');}
 function collect():void{${profile&&!noGc?'(globalThis as any).$262.gc();':''}}
 function throws(callback:()=>any,label:string):void{try{callback();throw 'missing';}catch(error){check(error instanceof TypeError,label);}}
 async function verify():Promise<void>{
  const Constructor=Array,of=Constructor.of;
  const values:any[]=[undefined,null,false,0,'word',37n,key,marker,callable,[]];
  const actual:number[]=Array.of<number>(...values);const aliased:number[]=of<number>(...values);collect();
  for(let index=0;index<values.length;index++)check((actual as any)[index]===values[index]&&(aliased as any)[index]===values[index],'actual-factory-value-kind');
  check(actual.length===values.length&&aliased.length===values.length,'actual-factory-list');
  const text:string='A💡Z',copied=Array.from(text);check(copied.length===3&&copied[1]==='💡','ordinary-string-iterator');
  const mapped:any[]=Array.from(text,function(this:any,value:string,index:number):any{collect();return [value,index,this,arguments.length];},marker);
  check(mapped[1][0]==='💡'&&mapped[1][1]===1&&mapped[1][2]===marker&&mapped[1][3]===2,'string-mapper-actual-activation');
  const set=new Set<number>();set.add(1);const live=Array.from(set,(value:number):number=>{set.add(2);collect();return value;});check(live.length===2&&live[0]===1&&live[1]===2,'live-native-set-iterator');
  const map=new Map<number,any>();map.set(1,marker);
  const pairs:any[]=Constructor.from(map,(entry:any):any=>{map.set(2,key);collect();return entry;});
  check(pairs.length===2&&pairs[0][0]===1&&pairs[0][1]===marker&&pairs[1][0]===2&&pairs[1][1]===key,'live-native-map-entry-values');
  const originalFrom:any=Array.from,originalOf:any=Array.of,originalPredicate:any=Array.isArray;let calls=0,trace='';
  function operand(label:string):any{trace+=label;collect();return marker;}
  Object.defineProperty(Array,'from',{configurable:true,get(){trace+='G';collect();return function(this:any,...actual:any[]):any{calls++;return [this,actual];};}});
  const replaced:string[]=Array.from(text,operand('M'),operand('T'),operand('X'));collect();
  check(calls===1&&(replaced as any)[0]===Array&&(replaced as any)[1][0]===text&&(replaced as any)[1][1]===marker&&(replaced as any)[1].length===4&&trace==='GMTX','mutable-factory-callee-and-actual-list');
  const unused:string[]=Array.from('ignored');check(calls===2,'unused-factory-call-effect');
  Object.defineProperty(Array,'from',{value:originalFrom,writable:true,enumerable:false,configurable:true});
  (Array as any).of=function(this:any,...actual:any[]):any{calls++;collect();return [this,actual];};
  const replacedOf:number[]=Array.of<number>(marker);check((replacedOf as any)[0]===Array&&(replacedOf as any)[1][0]===marker,'mutable-of-owner');(Array as any).of=originalOf;
  (Array as any).isArray=()=>marker;const predicate:boolean=Array.isArray([]);check((predicate as any)===marker,'mutable-predicate-result-value');(Array as any).isArray=originalPredicate;
  check(Array.isArray(Array.prototype)&&Array.isArray(actual)&&!Array.isArray(marker),'ordinary-array-brand');
  const proxy:any=Proxy.revocable(actual,{});check(Array.isArray(proxy.proxy),'proxy-array-brand');proxy.revoke();throws(()=>Array.isArray(proxy.proxy),'revoked-proxy-array-brand');
  throws(()=>Array.from(null as any),'factory-nullish-input');throws(()=>Array.from(text,1 as any),'mapper-validation');
  // @ts-ignore - absent ECMAScript actuals are checked by the runtime callable.
  throws(()=>Array.from(),'factory-absent-actual');
  const empty=Array.of();check(empty.length===0,'empty-actual-list');
  // @ts-ignore - the ordinary predicate receives undefined for an absent actual.
  check(Array.isArray()===false,'predicate-absent-actual');
  const promised:any=Promise.resolve(marker),pending:any[]=Array.from(text,()=>promised);check(pending[0]===promised,'synchronous-mapper-result-is-not-awaited');
  await Promise.resolve(0);collect();check(actual[7]===marker&&(aliased as any)[6]===key,'retained-factory-values');
  let nested:any=marker;for(let level=0;level<${depth};level++)nested=[nested];const retained:number[]=Array.of<number>(nested);collect();let cursor:any=retained[0];for(let level=0;level<${depth};level++)cursor=cursor[0];check(cursor===marker,'deep-factory-value-owner');
 }
 verify().catch((error:any)=>{emit('failure:'+String(error));throw error;});`;
}

test("Array constructor members share ordinary owners and actual value Lists",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-array-static-owner-"));
    const erase=(source:string,module:ts.ModuleKind)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module}}).outputText;
    try{
        for(const strict of [false,true]){
            const referenceFile=path.join(temporary,`reference-${strict}.cjs`);await fs.writeFile(referenceFile,erase(subject(strict,false,true),ts.ModuleKind.CommonJS));
            const reference=nodeReferenceSync(["node","-e",'const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");require(process.argv[1]);',referenceFile],{stdout:"pipe",stderr:"pipe",timeout:120_000});
            expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const expected=reference.stdout.toString().trimEnd().split("\n");expect(expected.at(-1)).toBe("deep-factory-value-owner:true");
            for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]){
                const directory=path.join(temporary,`${strict}-${typed}-${profile}-${noGc}`);await fs.mkdir(directory);
                const entry=path.join(directory,typed?"main.ts":strict?"main.mjs":"main.js"),output=path.join(directory,"program"),diagnostics:string[]=[];
                const source=subject(strict,profile,noGc);await fs.writeFile(entry,typed?source:erase(source,ts.ModuleKind.ESNext));
                const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),...(strict?{moduleRoots:[entry]}:{}),initializationEntries:[entry],
                    ...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/array-static-owner.js#"+(strict?"module":"sloppy"),setupEntries:[],testEntry:entry,async:false,scriptEntries:strict?[]:[entry]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
                expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
                const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
                expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
                const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:"normal"});
                expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split("\n")).toEqual(expected);
            }
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

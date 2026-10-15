import {nodeReferenceSync} from './node-reference';
import {expect,test} from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";

function subject(strict:boolean,profile:boolean,noGc:boolean):string{
 const depth=128,owners='return ()=>{'.repeat(depth)+'return async()=>{await Promise.resolve(0);collect();return value;};'+'};'.repeat(depth);
 return `${strict?'export {};':''}
 const marker:any={token:11},replacement:any={token:13},key=Symbol('key');
 function emit(value:any):void{${profile?'(globalThis as any).print':'console.log'}(value);}
 function check(value:boolean,label:string):void{if(!value)throw label;emit(label+':true');}
 function collect():void{${profile&&!noGc?'(globalThis as any).$262.gc();':''}}
 function formal(prefix:string):any{return async (first:string,second:string):Promise<any>=>{const one=await Promise.resolve(first);collect();prefix=prefix+one;const two=await Promise.resolve(second);collect();prefix=prefix+two;return prefix;};}
 function mutable(value:any):any{
  var shared:any=value;let lexical:any=value;const immutable:any=value;
  const read=()=>[shared,lexical,immutable,value];
  const run=async function():Promise<any>{await Promise.resolve(0);collect();shared=replacement;lexical=key;value=null;await Promise.resolve(0);collect();return [shared,lexical,immutable,value,read];};
  return [run,read];
 }
 function evaluated(value:any=marker):any{return async()=>{await Promise.resolve(0);collect();return [value,()=>value];};}
 function nested(value:any):any{return async()=>{await Promise.resolve(0);collect();return async()=>{await Promise.resolve(0);collect();value=key;return ()=>value;};};}
 function generator(value:any):any{return function*(){yield value;collect();value=replacement;yield value;collect();return value;};}
 function asynchronous(value:any):any{return async function*(){await Promise.resolve(0);collect();yield value;value=key;await Promise.resolve(0);collect();return value;};}
 function counter(value:number):any{return async()=>{await Promise.resolve(0);const old=value++;collect();await Promise.resolve(0);value+=2;return [old,value];};}
 function deep(value:any):any{${owners}}
 async function verify():Promise<void>{
  const append=formal('start:');check(await append('A','B')==='start:AB','captured-formal-read-and-write');check(await append('C','D')==='start:ABCD','shared-formal-across-activations');
  const owner=mutable(marker),run=owner[0],outer=owner[1];collect();const actual=await run();collect();const observed=outer();
  check(actual[0]===replacement&&actual[1]===key&&actual[2]===marker&&actual[3]===null&&observed[0]===replacement&&observed[1]===key&&observed[2]===marker&&observed[3]===null,'formal-var-lexical-cell-identity');
  const retained=actual[4]();check(retained[0]===replacement&&retained[1]===key&&retained[2]===marker&&retained[3]===null,'returned-reader-retains-active-cells');
  const initialized=await evaluated()();collect();check(initialized[0]===marker&&initialized[1]()===marker,'evaluated-formal-cell');
  const next=await nested(marker)();collect();const read=await next();collect();check(read()===key,'nested-async-owner');
  const generate=generator(marker),iterator=generate();collect();check(iterator.next().value===marker,'generator-captured-entry');collect();check(iterator.next().value===replacement&&iterator.next().value===replacement,'generator-captured-write');
  const sequence=asynchronous(marker)();check((await sequence.next()).value===marker,'async-generator-captured-entry');collect();check((await sequence.next()).value===key,'async-generator-captured-write');
  const count=counter(17);const first=await count(),second=await count();check(first[0]===17&&first[1]===20&&second[0]===20&&second[1]===23,'captured-update-reference');
  const root=deep(marker);let leaf:any=root;for(let level=0;level<${depth};level++){leaf=leaf();collect();}check(await leaf()===marker,'deep-continuation-binding-owner');
 }
 verify().catch((error:any)=>{emit('failure:'+String(error));throw error;});`;
}

test("continuations resolve retained binding owners through active state cells",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-continuation-binding-owner-"));
    const erase=(source:string,module:ts.ModuleKind)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module}}).outputText;
    try{
        for(const strict of [false,true]){
            const referenceFile=path.join(temporary,`reference-${strict}.cjs`);await fs.writeFile(referenceFile,erase(subject(strict,false,true),ts.ModuleKind.CommonJS));
            const reference=nodeReferenceSync(["node","-e",'const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");require(process.argv[1]);',referenceFile],{stdout:"pipe",stderr:"pipe",timeout:120_000});
            expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const expected=reference.stdout.toString().trimEnd().split("\n");expect(expected.at(-1)).toBe("deep-continuation-binding-owner:true");
            for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]){
                const directory=path.join(temporary,`${strict}-${typed}-${profile}-${noGc}`);await fs.mkdir(directory);
                const entry=path.join(directory,typed?"main.ts":strict?"main.mjs":"main.js"),output=path.join(directory,"program"),diagnostics:string[]=[];
                const source=subject(strict,profile,noGc);await fs.writeFile(entry,typed?source:erase(source,ts.ModuleKind.ESNext));
                const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),...(strict?{moduleRoots:[entry]}:{}),initializationEntries:[entry],
                    ...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/continuation-binding-owner.js#"+(strict?"module":"sloppy"),setupEntries:[],testEntry:entry,async:false,scriptEntries:strict?[]:[entry]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
                expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
                const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
                expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
                const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:"normal"});
                expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split("\n")).toEqual(expected);
            }
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

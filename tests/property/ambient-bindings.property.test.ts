import {expect,test} from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";

function subject(strict:boolean,profile:boolean,noGc:boolean,typed:boolean=true,depth:number=3):string{
 return `${strict?'export {};':''}
 declare var Array:ArrayConstructor;
 declare var Object:ObjectConstructor;
 declare const AbortController:{new():any};
 function emit(value:any):void{${profile?'(globalThis as any).print':'console.log'}(value);}
 function check(value:boolean,label:string):void{if(!value)throw label;emit(label+':true');}
 function collect():void{${profile&&!noGc?'(globalThis as any).$262.gc();':''}}
 const marker:any={token:11};
 function realBindings(Array:any,Object:any):any{return [Array,Object,()=>Array];}
 async function verify():Promise<void>{
  const constructed:any=new Array(2);check(constructed.length===2&&!Object.hasOwn(constructed,'0'),'ambient-native-construction');
  const result:any=Array.from([marker]);check(result[0]===marker,'ambient-native-static-method');
  const actual:any=realBindings(marker,Array);collect();check(actual[0]===marker&&actual[1]===Array&&actual[2]()===marker,'real-source-shadowing');
  ${profile||!typed?'':`  const controller:any=new AbortController();const reason:any={token:17};let receiver:any,event:any;
  controller.signal.addEventListener('abort',function(this:any,value:any):void{receiver=this;event=value;collect();});
  controller.abort(reason);check(controller.signal.aborted&&controller.signal.reason===reason&&receiver===controller.signal&&event.type==='abort','ambient-host-owner');
`}
  const value:any=await Array.fromAsync([new Promise((resolve:any)=>queueMicrotask(()=>resolve(marker)))]);check(value[0]===marker,'ambient-suspended-constructor-owner');
  let retained:any=()=>marker;for(let depth=0;depth<${depth};depth++){const earlier:any=retained;retained=()=>{collect();return earlier();};}collect();check(retained()===marker,'deep-real-binding-worklist');
 }
 verify().catch((error:any)=>{emit('failure:'+String(error));throw error;});`;
}

test("ambient type declarations do not create runtime source bindings",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-ambient-bindings-"));
    const erase=(source:string,module:ts.ModuleKind)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module}}).outputText;
    try{
        for(const strict of [false,true]){
            const referenceFile=path.join(temporary,`reference-${strict}.cjs`);await fs.writeFile(referenceFile,erase(subject(strict,false,true),ts.ModuleKind.CommonJS));
            const reference=Bun.spawnSync(["node","-e",'const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");require(process.argv[1]);',referenceFile],{stdout:"pipe",stderr:"pipe",timeout:120_000});
            expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const expected=reference.stdout.toString().trimEnd().split("\n");expect(expected.at(-1)).toBe("deep-real-binding-worklist:true");
            for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]){
                const directory=path.join(temporary,`${strict}-${typed}-${profile}-${noGc}`);await fs.mkdir(directory);
                const entry=path.join(directory,typed?"main.ts":strict?"main.mjs":"main.js"),output=path.join(directory,"program"),diagnostics:string[]=[];
                const representative=strict&&typed&&profile&&!noGc,depth=representative?128:3;
                const source=subject(strict,profile,noGc,typed,depth);await fs.writeFile(entry,typed?source:erase(source,ts.ModuleKind.ESNext));
                if(representative){
                    const deepReference=path.join(directory,'reference.cjs');
                    await fs.writeFile(deepReference,erase(subject(strict,profile,noGc,typed,depth),ts.ModuleKind.CommonJS));
                    const node=Bun.spawnSync(['node','--expose-gc','-e','const fs=require("node:fs");globalThis.print=value=>fs.writeSync(1,String(value)+"\\n");globalThis.$262={gc:globalThis.gc};require(process.argv[1]);',deepReference],{stdout:'pipe',stderr:'pipe',timeout:120_000});
                    expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});
                    expect(node.stdout.toString().trimEnd().split('\n')).toEqual(expected.filter(line=>line!=="ambient-host-owner:true"));
                }
                const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),...(strict?{moduleRoots:[entry]}:{}),initializationEntries:[entry],
                    ...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/ambient-bindings.js#"+(strict?"module":"sloppy"),setupEntries:[],testEntry:entry,async:false,scriptEntries:strict?[]:[entry]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
                expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
                const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
                expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
                const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:"normal"});
                expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split("\n")).toEqual(profile||!typed?expected.filter(line=>line!=="ambient-host-owner:true"):expected);
            }
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

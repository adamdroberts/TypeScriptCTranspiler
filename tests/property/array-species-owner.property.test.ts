import {expect,test} from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";
import {finiteEvalScriptSourceGraph} from "../test262/native-host";

function subject(strict:boolean,profile:boolean,noGc:boolean):string{
 return `${strict?'export {};':''}
 const marker:any={token:11};const proto:any=Array.prototype;let trace='';
 function emit(value:any):void{${profile?'(globalThis as any).print':'console.log'}(value);}
 function collect():void{${profile&&!noGc?'(globalThis as any).$262.gc();':''}}
 function check(value:boolean,label:string):void{if(!value)throw label;emit(label+':true');}
 function throws(callback:()=>any,constructor:any,label:string):void{try{callback();throw 'missing';}catch(error){check(error instanceof constructor,label);}}
 for(const method of ['map','filter','flat','flatMap','concat','slice','splice']){
  trace='';let suppliedLength:any=-1;const target:any={};
  const resultOwner=new Proxy(target,{
   defineProperty(object:any,key:any,descriptor:any):boolean{trace+='D'+String(key)+';';collect();check(descriptor.writable===true&&descriptor.enumerable===true&&descriptor.configurable===true,'fresh-result-data-descriptor');return Reflect.defineProperty(object,key,descriptor);},
   set(object:any,key:any,value:any):boolean{trace+='S'+String(key)+';';collect();return Reflect.set(object,key,value);}
  });
  function Result(this:any,length:number):any{suppliedLength=length;trace+='K'+String(length)+';';collect();check(new.target===Result,'actual-species-new-target');return resultOwner;}
  const holder:any={get [Symbol.species](){trace+='species;';collect();return Result;}};
  const source:any[]=[marker,,2];Object.defineProperty(source,'constructor',{get(){trace+='constructor;';collect();return holder;}});
  const actual:any[]=method==='map'?[(value:any)=>value]:method==='filter'?[()=>true]:method==='flatMap'?[(value:any)=>[value]]:method==='splice'?[0,2]:[];
  const result=Reflect.apply(proto[method],source,actual);collect();check(result===resultOwner&&target[0]===marker,'actual-species-result-owner');emit(method+':'+trace+':'+Object.keys(target).join('|')+':'+String(suppliedLength));
 }
 const plain:any={length:2,0:marker,get constructor(){throw marker;}};const ordinary=proto.slice.call(plain);check(Array.isArray(ordinary)&&ordinary.length===2&&ordinary[0]===marker&&!(1 in ordinary),'non-array-skips-constructor');
 const source:any[]=[marker];for(const constructor of [undefined,{[Symbol.species]:undefined},{[Symbol.species]:null}]){Object.defineProperty(source,'constructor',{value:constructor,configurable:true});const result=source.map(value=>value);check(Array.isArray(result)&&result!==source&&result[0]===marker,'default-species-result');}
 for(const constructor of [null,false,7,'word',37n,Symbol('invalid'),{[Symbol.species]:0},{[Symbol.species]:()=>marker}]){Object.defineProperty(source,'constructor',{value:constructor,configurable:true});throws(()=>source.map(value=>value),TypeError,'non-constructable-species-abrupt');}
 const abrupt:any[]=[marker];Object.defineProperty(abrupt,'constructor',{get(){throw marker;}});for(const method of ['map','filter','flat','flatMap','concat','slice','splice']){try{Reflect.apply(proto[method],abrupt,method==='map'||method==='filter'||method==='flatMap'?[(value:any)=>value]:[]);throw 'missing';}catch(error){check(error===marker,'species-get-abrupt');}}
 // Change-by-copy methods use intrinsic ArrayCreate and never consult species.
 for(const method of ['with','toSorted','toReversed','toSpliced']){const result=Reflect.apply(proto[method],abrupt,method==='with'?[0,marker]:[]);check(Array.isArray(result)&&result!==abrupt&&result[0]===marker,'copy-method-skips-species');}
 const rejected:any[]=[marker];function Reject(this:any,length:number):any{return new Proxy({},{defineProperty(){collect();return false;}});}Object.defineProperty(rejected,'constructor',{value:{[Symbol.species]:Reject}});throws(()=>rejected.map(value=>value),TypeError,'result-define-false-abrupt');
 const blocked:any[]=[marker];function Block(this:any,length:number):any{return new Proxy({},{defineProperty(){throw marker;}});}Object.defineProperty(blocked,'constructor',{value:{[Symbol.species]:Block}});try{blocked.map(value=>value);throw 'missing';}catch(error){check(error===marker,'result-define-throw-preserved');}
 const failedConstruction:any[]=[marker];function Fail(this:any,length:number):any{collect();throw marker;}Object.defineProperty(failedConstruction,'constructor',{value:{[Symbol.species]:Fail}});try{failedConstruction.slice();throw 'missing';}catch(error){check(error===marker,'species-construct-throw-preserved');}
 const failedLength:any[]=[marker];function Length(this:any,length:number):any{return new Proxy({},{set(object:any,key:any,value:any){collect();return key!=='length';}});}Object.defineProperty(failedLength,'constructor',{value:{[Symbol.species]:Length}});throws(()=>failedLength.slice(),TypeError,'result-length-set-false-abrupt');
 const alias:any[]=[1,2];function Alias(this:any,length:number):any{return alias;}Object.defineProperty(alias,'constructor',{value:{[Symbol.species]:Alias}});const aliased=alias.map((value:any,index:number)=>{collect();return index===0?marker:value;});check(aliased===alias&&alias[0]===marker,'species-output-input-alias');
 async function verify():Promise<void>{
  let constructor:any=function Result(this:any,length:number):any{return {length};};for(let level=0;level<128;level++)constructor=constructor.bind(null);await Promise.resolve(constructor);collect();const source:any[]=[marker];Object.defineProperty(constructor,Symbol.species,{value:constructor});Object.defineProperty(source,'constructor',{value:constructor});const result=source.map(value=>value);collect();check(result[0]===marker&&result.length===1,'deep-species-constructor-owner');
 }
 verify().catch((error:any)=>{emit('failure:'+String(error));throw error;});`;
}

test("Array species retain an actual constructor and result property owner",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-array-species-owner-"));
    const erase=(source:string,module:ts.ModuleKind)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module}}).outputText;
    try{
        for(const strict of [false,true]){
            const referenceFile=path.join(temporary,`reference-${strict}.cjs`);await fs.writeFile(referenceFile,erase(subject(strict,false,true),ts.ModuleKind.CommonJS));
            const reference=Bun.spawnSync(["node","-e",'const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");require(process.argv[1]);',referenceFile],{stdout:"pipe",stderr:"pipe",timeout:120_000});
            expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const expected=reference.stdout.toString().trimEnd().split("\n");expect(expected.at(-1)).toBe("deep-species-constructor-owner:true");
            for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]){
                const directory=path.join(temporary,`${strict}-${typed}-${profile}-${noGc}`);await fs.mkdir(directory);
                const entry=path.join(directory,typed?"main.ts":strict?"main.mjs":"main.js"),output=path.join(directory,"program"),diagnostics:string[]=[];
                const source=subject(strict,profile,noGc);await fs.writeFile(entry,typed?source:erase(source,ts.ModuleKind.ESNext));
                const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),...(strict?{moduleRoots:[entry]}:{}),initializationEntries:[entry],
                    ...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/array-species-owner.js#"+(strict?"module":"sloppy"),setupEntries:[],testEntry:entry,async:false,scriptEntries:strict?[]:[entry]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
                expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
                const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
                expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
                const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:"normal"});
                expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split("\n")).toEqual(expected);
            }
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

test("Array species distinguish the active Realm's intrinsic constructor from foreign owners",async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-array-species-realm-'));
 const program=`const host:any=globalThis;const marker:any={token:11};
 function collect():void{GC}
 function check(value:boolean,label:string):void{if(!value)throw label;host.print(label+':true');}
 const foreignArray:any=host.$262.createRealm().evalScript('Array');
 Object.defineProperty(foreignArray,Symbol.species,{configurable:true,get(){throw marker;}});
 const source:any[]=[marker];Object.defineProperty(source,'constructor',{configurable:true,value:foreignArray});
 const local=source.map(value=>{collect();return value;});check(Object.getPrototypeOf(local)===Array.prototype&&local[0]===marker,'foreign-intrinsic-uses-active-realm');
 Object.defineProperty(foreignArray,Symbol.species,{configurable:true,value:foreignArray});
 const proxy:any=new Proxy(foreignArray,{});Object.defineProperty(source,'constructor',{configurable:true,value:proxy});
 const foreign=source.slice();collect();check(Object.getPrototypeOf(foreign)===foreignArray.prototype&&foreign[0]===marker,'foreign-proxy-preserves-species-constructor');
 const revoked:any=Proxy.revocable(foreignArray,{});revoked.revoke();Object.defineProperty(source,'constructor',{value:revoked.proxy});
 try{source.map(value=>value);throw 'missing';}catch(error){check(error instanceof TypeError,'revoked-constructor-abrupt');}`;
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.CommonJS}}).outputText;
 try{
  const referenceFile=path.join(temporary,'reference.cjs');await fs.writeFile(referenceFile,erase(program.replace('GC','')));
  const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");globalThis.print=value=>fs.writeSync(1,String(value)+"\\n");globalThis.$262={createRealm(){const context=vm.createContext({});return{evalScript(source){return vm.runInContext(source,context);}};}};require(process.argv[1]);',referenceFile],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  const expected=reference.stdout.toString().trimEnd().split('\n');expect(expected.at(-1)).toBe('revoked-constructor-abrupt:true');
  for(const noGc of [false,true]){
   const directory=path.join(temporary,String(noGc));await fs.mkdir(directory);const entry=path.join(directory,'main.js'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=erase(program.replace('GC',noGc?'':'host.$262.gc();'));
   await fs.writeFile(entry,source);
   const graph=finiteEvalScriptSourceGraph([{path:entry,source,goal:'script'}]);
   expect(graph.error).toBeNull();expect(graph.sources).toContain('Array');
   const evalScriptEntries=await Promise.all(graph.sources.map(async(source,index)=>{
    const script=path.join(directory,`eval-${index}.js`);await fs.writeFile(script,source);return{source,entry:script};
   }));
   const roots=evalScriptEntries.map(record=>record.entry);
   const result=await compile({entry,output,noGc,additionalRoots:roots,isolatedScriptRoots:[entry,...roots],initializationEntries:[entry],buildDir:path.join(directory,'build'),test262Observation:{kind:'test262-native-observation',scenarioId:'property/array-species-realm.js#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry,...roots],evalScriptEntries,async:false},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation).toMatchObject({kind:'normal'});expect((observation.stdout??'').trimEnd().split('\n')).toEqual(expected);
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},240_000);

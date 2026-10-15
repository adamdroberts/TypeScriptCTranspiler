import {nodeReferenceSync} from './node-reference';
import {expect,test} from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";

function subject(strict:boolean,profile:boolean,noGc:boolean):string{
 return `${strict?'export {};':''}
 let coercions=0;const marker:any={token:11};Object.defineProperty(marker,'valueOf',{value(){coercions++;return 17;}});
 const key=Symbol('key'),callable=()=>marker;
 function emit(value:any):void{${profile?'(globalThis as any).print':'console.log'}(value);}
 function check(value:boolean,label:string):void{if(!value)throw label;emit(label+':true');}
 function collect():void{${profile&&!noGc?'(globalThis as any).$262.gc();':''}}
 function throws(callback:()=>any,constructor:any,label:string):void{try{callback();throw 'missing';}catch(error){check(error instanceof constructor,label);}}
 const native:number[]=[1],alias=native;
 const actual:any[]=[undefined,null,false,0,'word',37n,key,marker,callable,[]];
 native.push(...actual);collect();for(let index=0;index<actual.length;index++)check((native as any)[index+1]===actual[index],'ordinary-write-actual-value-kind');
 check(alias===native&&coercions===0&&native.length===actual.length+1,'native-owner-transcoding-without-coercion');
 native.unshift(marker);collect();check((native as any)[0]===marker&&native.pop()===actual[actual.length-1]&&native.shift()===marker,'mutator-values-and-shared-owner');
 const empty:number[]=[];const absent:number=empty.pop()!;const shifted:number=empty.shift()!;check((absent as any)===undefined&&(shifted as any)===undefined,'empty-mutation-result');
 const missing:number=empty.find(()=>true)!;check((missing as any)===undefined,'missing-callback-result');
 const values:number[]=[1,2,3];const mapped:number[]=values.map(function(this:any,value:number,index:number,array:number[]):any{check(this===marker&&array===values&&arguments.length===3,'callback-actual-activation');if(index===0){delete values[1];(values as any)[2]=marker;values.push(marker);}collect();return index===0?key:value;},marker);
 check(mapped.length===3&&(mapped as any)[0]===key&&!(1 in mapped)&&(mapped as any)[2]===marker,'live-property-worklist-and-result-values');
 const retained:number[]=values.filter(()=>true);check(retained.length===3&&(retained as any)[1]===marker&&(retained as any)[2]===marker,'selection-preserves-actual-values');
 const reduced:number=values.reduce((acc:any,value:any,index:number,array:any[]):any=>{collect();check(array===values,'reduction-source-owner');return marker;},marker);check((reduced as any)===marker,'reduction-result-value');
 let primitiveCalls=0;const index:any={[Symbol.toPrimitive](){primitiveCalls++;collect();return -1;}};
 check(values.at(index)===marker&&primitiveCalls===1,'index-conversion-at-consumer');
 const replacement:number[]=values.with(index,marker);check((replacement as any)[replacement.length-1]===marker&&primitiveCalls===2,'copy-item-value-without-element-coercion');
 throws(()=>values.with(1n as any,marker),TypeError,'index-bigint-abrupt');throws(()=>values.with(Infinity,marker),RangeError,'relative-index-range-abrupt');
 const originalPop:any=Array.prototype.pop,originalSlice:any=Array.prototype.slice;
 let calls=0;(Array.prototype as any).pop=function(this:any,...actual:any[]):any{calls++;collect();return marker;};
 const replaced:number=empty.pop()!;check((replaced as any)===marker&&calls===1,'mutable-prototype-callee-and-result');(Array.prototype as any).pop=originalPop;
 Object.defineProperty(Array.prototype,'slice',{configurable:true,get(){calls++;collect();return function(this:any,...actual:any[]):any{calls++;return marker;};}});
 const unused:number[]=[].slice();check(calls===3,'unused-native-member-call-effect');Object.defineProperty(Array.prototype,'slice',{value:originalSlice,writable:true,enumerable:false,configurable:true});
 let trace='';Object.defineProperty(native,'splice',{configurable:true,get(){trace+='G';collect();return function(this:any,...actual:any[]):any{check(this===native&&actual[0]===marker&&actual[1]===key,'saved-callee-receiver-and-actual-list');return marker;};}});
 function operand(value:any,label:string):any{trace+=label;collect();return value;}
 const result:number[]=native.splice(operand(marker,'M'),operand(key,'K'));check((result as any)===marker&&trace==='GMK','callee-get-before-arguments');
 delete (native as any).splice;
 const method=values.slice;const copied=method.call(values,0);check(copied!==values&&copied.length===values.length&&(copied as any)[2]===marker,'saved-native-member-owner');
 const sealed:number[]=[1,2];Object.seal(sealed);check(sealed.reverse()===sealed&&sealed[0]===2,'sealed-existing-property-mutation');throws(()=>sealed.pop(),TypeError,'sealed-delete-abrupt');
 const frozen:number[]=[];Object.freeze(frozen);check(frozen.reverse()===frozen&&frozen.sort()===frozen&&frozen.fill(marker)===frozen,'empty-frozen-no-write-completions');throws(()=>frozen.push(marker),TypeError,'frozen-write-abrupt');
 const iterator=values.values();values.push(key as any);const iterated=Array.from(iterator);check(iterated.length===values.length&&(iterated as any)[iterated.length-1]===key,'ordinary-live-iterator-consumer');
 async function verify():Promise<void>{
  await Promise.resolve(marker);collect();check((native as any)[8]===marker&&(native as any)[7]===key&&alias===native,'retained-transcoded-owner');
  let nested:any=marker;for(let level=0;level<128;level++)nested=[nested];const outer:number[][]=[nested];let depthCalls=0;const depth:any={[Symbol.toPrimitive](){depthCalls++;collect();return Infinity;}};const flattened:number[][]=outer.flat(depth);collect();check((flattened as any)[0]===marker&&flattened.length===1&&depthCalls===1,'deep-member-owner-worklist');
 }
 verify().catch((error:any)=>{emit('failure:'+String(error));throw error;});`;
}

test("native Array members preserve ordinary callee, value and storage owners",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-array-member-owner-"));
    const erase=(source:string,module:ts.ModuleKind)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module}}).outputText;
    try{
        for(const strict of [false,true]){
            const referenceFile=path.join(temporary,`reference-${strict}.cjs`);await fs.writeFile(referenceFile,erase(subject(strict,false,true),ts.ModuleKind.CommonJS));
            const reference=nodeReferenceSync(["node","-e",'const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");require(process.argv[1]);',referenceFile],{stdout:"pipe",stderr:"pipe",timeout:120_000});
            expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const expected=reference.stdout.toString().trimEnd().split("\n");expect(expected.at(-1)).toBe("deep-member-owner-worklist:true");
            for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]){
                const directory=path.join(temporary,`${strict}-${typed}-${profile}-${noGc}`);await fs.mkdir(directory);
                const entry=path.join(directory,typed?"main.ts":strict?"main.mjs":"main.js"),output=path.join(directory,"program"),diagnostics:string[]=[];
                const source=subject(strict,profile,noGc);await fs.writeFile(entry,typed?source:erase(source,ts.ModuleKind.ESNext));
                const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),...(strict?{moduleRoots:[entry]}:{}),initializationEntries:[entry],
                    ...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/array-member-owner.js#"+(strict?"module":"sloppy"),setupEntries:[],testEntry:entry,async:false,scriptEntries:strict?[]:[entry]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
                expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
                const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
                expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
                const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:"normal"});
                expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split("\n")).toEqual(expected);
            }
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

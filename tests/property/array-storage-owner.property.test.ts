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
 const marker:any={token:17},maximum=4294967295;let trace='';
 function emit(value:any):void{${profile?'(globalThis as any).print':'console.log'}(value);}
 function collect():void{${profile&&!noGc?'(globalThis as any).$262.gc();':''}}
 function check(value:boolean,label:string):void{if(!value)throw label;emit(label+':true');}
 function throws(callback:()=>any,constructor:any,label:string):void{try{callback();throw 'missing';}catch(error){check(error instanceof constructor,label);}}
 const huge:any[]=new Array(maximum);check(huge.length===maximum&&Object.keys(huge).length===0&&!(0 in huge),'virtual-length-holes');
 huge[maximum-1]=marker;huge[3]=marker;huge[maximum]=marker;(huge as any)['00']=marker;const symbol=Symbol('owner');(huge as any)[symbol]=marker;collect();
 check(huge[maximum-1]===marker&&huge.length===maximum,'sparse-index-owner');
 const keys=Reflect.ownKeys(huge);check(keys[0]==='3'&&keys[1]===String(maximum-1)&&keys[2]==='length'&&keys[3]===String(maximum)&&keys[4]==='00'&&keys[5]===symbol,'ordered-own-key-worklist');
 const tail=huge.slice(maximum-2);check(tail.length===2&&!(0 in tail)&&tail[1]===marker,'sparse-slice-consumer');check(huge.pop()===marker&&huge.length===maximum-1&&!(maximum-1 in huge),'sparse-pop-consumer');
 check(Reflect.set(huge,'length',1)&&huge.length===1&&!(3 in huge)&&huge[maximum]===marker,'truncate-index-boundary');
 for(const key of ['-0','00','1.0','1e0','4294967295','4294967296']){const array:any[]=[];Reflect.set(array,key,marker);check(array.length===0&&(array as any)[key]===marker,'non-index-property-key');}
 for(const invalid of [-1,1.5,NaN,Infinity,4294967296]){const array:any[]=[marker];throws(()=>Reflect.defineProperty(array,'length',{value:invalid}),RangeError,'array-length-range-abrupt');check(array.length===1&&array[0]===marker,'invalid-length-preserves-owner');}
 for(const invalid of [1n,Symbol('length')]){throws(()=>Reflect.defineProperty([],'length',{value:invalid}),TypeError,'array-length-number-abrupt');}
 const converted:any[]=[1,2,3];let conversions=0;const different:any={valueOf(){collect();conversions++;return conversions===1?1:2;}};throws(()=>Reflect.defineProperty(converted,'length',{value:different}),RangeError,'distinct-length-conversions');check(conversions===2&&converted.length===3,'length-conversion-order');
 conversions=0;const wrapping:any={valueOf(){conversions++;return conversions===1?4294967298:2;}};check(Reflect.defineProperty(converted,'length',{value:wrapping})&&conversions===2&&converted.length===2,'uint32-and-number-comparison');
 conversions=0;const ordinary:any={valueOf(){conversions++;return 2;}};check(!Reflect.defineProperty(converted,'length',{value:ordinary,enumerable:true})&&conversions===2,'length-converts-before-descriptor-validation');
 conversions=0;const abrupt:any={valueOf(){collect();if(++conversions===2)throw marker;return 0;}};try{Reflect.defineProperty(converted,'length',{value:abrupt});throw 'missing';}catch(error){check(error===marker&&conversions===2&&converted.length===2,'second-length-conversion-abrupt');}
 Object.defineProperty(converted,'length',{writable:false});conversions=0;check(!Reflect.set(converted,'length',ordinary)&&conversions===0,'readonly-set-skips-conversion');check(Reflect.defineProperty(converted,'length',{value:ordinary})&&conversions===2,'readonly-define-converts');
 check(Reflect.set(converted,'1',marker)&&!Reflect.set(converted,'2',marker)&&Reflect.set(converted,'4294967295',marker),'readonly-length-index-boundary');
 const sealed:any[]=Object.seal([marker]);check(Reflect.set(sealed,'length',3)&&sealed.length===3&&!(2 in sealed),'sealed-hole-growth');check(Reflect.set(sealed,'length',2)&&sealed.length===2,'sealed-absent-truncation');check(!Reflect.set(sealed,'length',0)&&sealed.length===1&&sealed[0]===marker,'sealed-present-truncation-block');
 const sealedHoles:any[]=Object.seal(new Array(4));check(Reflect.deleteProperty(sealedHoles,'1')&&Reflect.set(sealedHoles,'length',0)&&sealedHoles.length===0,'sealed-absent-delete');
 const prevented:any[]=Object.preventExtensions([]);check(Reflect.set(prevented,'length',8)&&!Reflect.set(prevented,'7',marker)&&prevented.length===8,'nonextensible-length-growth');
 const blocked:any[]=[marker,marker,marker];Object.defineProperty(blocked,'1',{configurable:false});check(!Reflect.defineProperty(blocked,'length',{value:0,writable:false})&&blocked.length===2&&!(2 in blocked)&&blocked[1]===marker&&!Object.getOwnPropertyDescriptor(blocked,'length')!.writable,'failed-truncation-retains-descriptor');
 const frozen:any[]=Object.freeze(new Array(4));check(Reflect.defineProperty(frozen,'length',{value:4})&&!Reflect.set(frozen,'length',4)&&Reflect.deleteProperty(frozen,'2'),'frozen-length-and-absence');
 const accessor:any[]=new Array(10);function getter():any{collect();return marker;}Object.defineProperty(accessor,'8',{get:getter,configurable:false});check(Reflect.defineProperty(accessor,'8',{get:getter})&&accessor[8]===marker,'unchanged-nonconfigurable-accessor');
 const inherited:any[]=Object.create(Array.prototype);const child:any[]=[];Object.defineProperty(inherited,'6',{set(value:any){collect();check(this===child&&value===marker,'inherited-index-setter-owner');}});Object.setPrototypeOf(child,inherited);Object.defineProperty(child,'length',{writable:false});check(Reflect.set(child,'6',marker)&&child.length===0&&!Object.hasOwn(child,'6'),'inherited-setter-skips-length-definition');
 const shadow:any[]=[];Object.defineProperty(shadow,'__proto__',{value:1,writable:true});check(Reflect.set(shadow,'__proto__',marker)&&(shadow as any).__proto__===marker&&Object.getPrototypeOf(shadow)===Array.prototype,'own-proto-data-property');
 const target:any[]=new Array(4);Object.defineProperty(target,'1',{value:marker,writable:true});const proxy:any=new Proxy(target,{getOwnPropertyDescriptor(object:any,key:any){trace+='G'+String(key)+';';collect();return Reflect.getOwnPropertyDescriptor(object,key);},defineProperty(object:any,key:any,descriptor:any){trace+='D'+String(key)+':'+Object.keys(descriptor).join('|')+';';collect();return Reflect.defineProperty(object,key,descriptor);}});
 check(Reflect.set(proxy,'1',2)&&Reflect.set(proxy,'6',marker)&&target.length===7&&!(5 in target),'proxy-set-owner-and-holes');emit('proxy-trace:'+trace);check(Object.getOwnPropertyDescriptor(target,'1')!.enumerable===false&&Object.getOwnPropertyDescriptor(target,'1')!.configurable===false,'existing-set-retains-descriptor');
 const plainReceiver:any={};Object.defineProperty(target,'length',{writable:false});check(!Reflect.set(target,'length',1,plainReceiver)&&!Object.hasOwn(plainReceiver,'length'),'readonly-inherited-length-set');
 const typed:number[]=[1,2];Reflect.set(typed,'4000',marker);check((typed as any)[4000]===marker&&typed.length===4001,'typed-sparse-actual-storage');
 const intake:number[]=new Array(4);Reflect.set(intake,'3',marker);function consume(...actual:any[]):any[]{return actual;}const spread=consume(...intake);check(spread.length===4&&Object.hasOwn(spread,'0')&&spread[0]===undefined&&spread[3]===marker,'spread-reads-through-virtual-holes');
 async function verify():Promise<void>{
  const leaf:any[]=new Array(maximum);for(let index=0;index<2048;index++){leaf[maximum-1-index*1024]={index};}let tree:any=leaf;for(let depth=0;depth<2048;depth++){const owner:any[]=new Array(maximum);owner[0]=tree;owner[maximum-1]=marker;tree=owner;}await Promise.resolve(tree);collect();let cursor:any=tree;for(let depth=0;depth<2048;depth++){const next=cursor[0];if(cursor[maximum-1]!==marker||!Reflect.set(cursor,'length',0)||Object.keys(cursor).length!==0)throw 'deep-sparse-owner';cursor=next;}const own=Object.keys(cursor);check(cursor===leaf&&own[0]===String(maximum-1-2047*1024)&&cursor[maximum-1].index===0,'retained-sparse-own-index-stress');check(Reflect.set(cursor,'length',0)&&cursor.length===0&&Object.keys(cursor).length===0,'descending-sparse-index-deletion');
 }
 verify().catch((error:any)=>{emit('failure:'+String(error));throw error;});`;
}
test("Array logical length and own indices share one descriptor worklist",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-array-storage-owner-"));
    const erase=(source:string,module:ts.ModuleKind)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module}}).outputText;
    try{
        for(const strict of [false,true]){
            const referenceFile=path.join(temporary,`reference-${strict}.cjs`);await fs.writeFile(referenceFile,erase(subject(strict,false,true),ts.ModuleKind.CommonJS));
            const reference=nodeReferenceSync(["node","-e",'const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");require(process.argv[1]);',referenceFile],{stdout:"pipe",stderr:"pipe",timeout:120_000});
            expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const expected=reference.stdout.toString().trimEnd().split("\n");expect(expected.at(-1)).toBe("descending-sparse-index-deletion:true");
            for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]){
                const directory=path.join(temporary,`${strict}-${typed}-${profile}-${noGc}`);await fs.mkdir(directory);
                const entry=path.join(directory,typed?"main.ts":strict?"main.mjs":"main.js"),output=path.join(directory,"program"),diagnostics:string[]=[];
                const source=subject(strict,profile,noGc);await fs.writeFile(entry,typed?source:erase(source,ts.ModuleKind.ESNext));
                const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),...(strict?{moduleRoots:[entry]}:{}),initializationEntries:[entry],
                    ...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/array-storage-owner.js#"+(strict?"module":"sloppy"),setupEntries:[],testEntry:entry,async:false,scriptEntries:strict?[]:[entry]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
                expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
                const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
                expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
                const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:"normal"});
                expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split("\n")).toEqual(expected);
            }
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

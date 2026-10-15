import {nodeReferenceSync} from './node-reference';
import {expect,test} from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";

// Independent transcription of the pinned Object.fromEntries and
// AddEntriesFromIterable algorithms. Node 26.11 closes on IteratorStepValue
// failure; the pinned edition propagates that failure directly.
const pinnedEntryOracle=`Object.fromEntries=function fromEntries(iterable){
 if(iterable===null||iterable===undefined)throw new TypeError();
 const object=value=>(typeof value==='object'&&value!==null)||typeof value==='function';
 const output={},method=iterable[Symbol.iterator];if(typeof method!=='function')throw new TypeError();
 const iterator=Reflect.apply(method,iterable,[]);if(!object(iterator))throw new TypeError();
 const next=iterator.next;
 for(;;){
  const result=Reflect.apply(next,iterator,[]);if(!object(result))throw new TypeError();
  if(result.done)return output;const entry=result.value;
  try{
   if(!object(entry))throw new TypeError();const key=entry[0],value=entry[1];
   Object.defineProperty(output,key,{value,writable:true,enumerable:true,configurable:true});
  }catch(error){
   try{const close=iterator.return;if(close!==null&&close!==undefined){const closed=Reflect.apply(close,iterator,[]);if(!object(closed))throw new TypeError();}}catch(_){}
   throw error;
  }
 }
};\n`;

function subject(strict:boolean,profile:boolean,noGc:boolean):string{
 const depth=128,nestedType='readonly ['.repeat(depth)+'any'+']'.repeat(depth);
 return `${strict?'export {};':''}
 function emit(value:any):void{${profile?'(globalThis as any).print':'console.log'}(value);}
 function check(value:boolean,label:string):void{if(!value)throw label;emit(label+':true');}
 function collect():void{${profile&&!noGc?'(globalThis as any).$262.gc();':''}}
 const marker:any={token:11},key=Symbol('key'),callable=()=>marker;
 type OpenTuple=[head:any,...tail:any[]];
 type DeepTuple=${nestedType};
 class Boundary{read(pair:ObjectEntry<any,any>,key:any):any{return pair[key];}}
 async function verify():Promise<void>{
  const numbers:number[]=[1,2];delete (numbers as any)[1];
  const missing=numbers[17],hole=numbers[1];collect();check(missing===undefined&&hole===undefined,'native-array-missing-values');
  const prototype:any=Object.create(Array.prototype);let gets=0;
  Object.defineProperty(prototype,'1',{get(){gets++;collect();return marker;}});Object.setPrototypeOf(numbers,prototype);
  const inherited=numbers[1];collect();check(inherited===marker&&gets===1,'native-array-inherited-value-kind');
  const string:string='A💡Z';const absent=string[17];check(absent===undefined&&string[1].length===1&&string[2].length===1,'string-code-unit-get');
  let keys=0,effects=0;const property:any={[Symbol.toPrimitive](){keys++;collect();return '1';}};
  function keyExpression():any{effects++;collect();return property;}
  const selected=numbers[property];collect();check(selected===marker&&keys===1,'computed-key-normalized-once');
  for(const optional of [undefined,null] as any[])check(optional?.[keyExpression()]===undefined&&keys===1&&effects===0,'optional-get-skips-key');
  check(numbers?.[keyExpression()]===marker&&keys===2&&effects===1,'optional-present-evaluates-key-once');
  const removed:any=[];removed[property]=marker;check(delete removed[keyExpression()]&&removed[1]===undefined&&keys===4&&effects===2,'computed-delete-shares-key-operation');
  const symbolOwner:any=[];symbolOwner[key]=marker;check(delete symbolOwner[key]&&symbolOwner[key]===undefined,'symbol-delete-shares-property-operation');
  const tuple:OpenTuple=[undefined,null,false,0,'word',37n,key,marker,callable,[]];
  const alias:readonly unknown[]=tuple;collect();
  check(tuple[0]===undefined&&tuple[1]===null&&tuple[2]===false&&tuple[3]===0&&tuple[4]==='word'&&tuple[5]===37n&&tuple[6]===key&&tuple[7]===marker&&tuple[8]===callable&&alias===tuple,'tuple-value-list');
  tuple.push(marker,key,null);check(tuple.length===13&&tuple[10]===marker&&tuple[11]===key&&tuple[12]===null,'tuple-rest-list-growth');
  const pair:[any,any]=[key,marker];(pair as any).push(callable);check((pair as any)[2]===callable&&pair[0]===key&&pair[1]===marker,'tuple-is-an-ordinary-array');
  const entries:any=Object.entries({token:marker});const boundary=new Boundary();
  check(boundary.read(entries[0],'length')===2&&boundary.read(entries[0],0)==='token'&&boundary.read(entries[0],1)===marker,'native-entry-boundary-get');
  const direct:[any,any][]=[['token',marker],[key,callable],['__proto__',null]],fromEntries=Object.fromEntries;
  const rebuilt:any=fromEntries(direct);collect();
  check(rebuilt.token===marker&&rebuilt[key]===callable&&Object.hasOwn(rebuilt,'__proto__')&&rebuilt.__proto__===null&&Object.getPrototypeOf(rebuilt)===Object.prototype,'tuple-list-entry-consumer');
  check(Object.fromEntries(Object.entries({token:marker})).token===marker,'native-entry-codec-consumer');
  let order='';const entry:any={get 0(){order+='K';collect();return property;},get 1(){order+='V';collect();return marker;}};
  const iterable:any={[Symbol.iterator](){order+='I';let ready=true;return {get next(){order+='G';return function(){order+='N';if(ready){ready=false;return {done:false,value:entry};}return {done:true};};}};}};
  const iterated:any=Object.fromEntries(iterable);collect();check(iterated[1]===marker&&order==='IGNKVN','entry-iterator-and-get-order');
  const entryError:any={token:13};
  for(const partition of ['entry','key','value','convert','next','done','result-value']){
   let closes=0,reads='';
   const item:any=partition==='entry'?0:{get 0(){reads+='K';if(partition==='key')throw entryError;return partition==='convert'?{[Symbol.toPrimitive](){throw entryError;}}:'token';},get 1(){reads+='V';if(partition==='value')throw entryError;return marker;}};
   const failing:any={[Symbol.iterator](){return {next(){if(partition==='next')throw entryError;return {get done(){if(partition==='done')throw entryError;return false;},get value(){if(partition==='result-value')throw entryError;return item;}};},get return(){closes++;return function(){throw key;};}};}};
   try{Object.fromEntries(failing);throw 'missing-entry-error';}catch(error){check((partition==='entry'?error instanceof TypeError:error===entryError)&&closes===(partition==='next'||partition==='done'||partition==='result-value'?0:1),'entry-abrupt-close-precedence');}
  }
  const duplicate:any=Object.fromEntries([['token',1],['token',marker],[],['absent']]);
  check(duplicate.token===marker&&duplicate.undefined===undefined&&duplicate.absent===undefined&&Object.hasOwn(duplicate,'undefined')&&Object.hasOwn(duplicate,'absent'),'entry-missing-values-and-last-write');
  for(const invalid of [null,undefined,0,'entry'] as any[]){try{Object.fromEntries(invalid);throw 'missing-input-error';}catch(error){check(error instanceof TypeError,'entry-input-type-error');}}
  // @ts-ignore - ECMAScript validates an absent actual at runtime.
  try{Object.fromEntries();throw 'missing-argument-error';}catch(error){check(error instanceof TypeError,'entry-absent-actual');}
  const read=()=>numbers[1];await Promise.resolve(0);collect();check(read()===marker,'retained-and-suspended-get');
  let seed:any=marker;for(let level=0;level<${depth};level++)seed=[seed];const deep:DeepTuple=seed,retain=()=>deep;collect();let cursor:any=retain();for(let level=0;level<${depth};level++)cursor=cursor[0];check(cursor===marker,'deep-tuple-owner-tree');
 }
 verify().catch((error:any)=>{emit('failure:'+String(error));throw error;});`;
}

test("source tuples and native collection Gets preserve ordinary values",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-source-collection-get-"));
    const erase=(source:string,module:ts.ModuleKind)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module}}).outputText;
    try{
        const oracleFile=path.join(temporary,'entry-oracle.cjs');await fs.writeFile(oracleFile,pinnedEntryOracle);
        for(const strict of [false,true]){
            const referenceFile=path.join(temporary,`reference-${strict}.cjs`);await fs.writeFile(referenceFile,erase(subject(strict,false,true),ts.ModuleKind.CommonJS));
            const reference=nodeReferenceSync(["node","-e",'const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");require(process.argv[1]);require(process.argv[2]);',oracleFile,referenceFile],{stdout:"pipe",stderr:"pipe",timeout:120_000});
            expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const expected=reference.stdout.toString().trimEnd().split("\n");expect(expected.at(-1)).toBe("deep-tuple-owner-tree:true");
            for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]){
                const directory=path.join(temporary,`${strict}-${typed}-${profile}-${noGc}`);await fs.mkdir(directory);
                const entry=path.join(directory,typed?"main.ts":strict?"main.mjs":"main.js"),output=path.join(directory,"program"),diagnostics:string[]=[];
                const source=subject(strict,profile,noGc);await fs.writeFile(entry,typed?source:erase(source,ts.ModuleKind.ESNext));
                const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),...(strict?{moduleRoots:[entry]}:{}),initializationEntries:[entry],
                    ...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/source-collection-get.js#"+(strict?"module":"sloppy"),setupEntries:[],testEntry:entry,async:false,scriptEntries:strict?[]:[entry]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
                expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
                const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
                expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
                const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:"normal"});
                expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split("\n")).toEqual(expected);
            }
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

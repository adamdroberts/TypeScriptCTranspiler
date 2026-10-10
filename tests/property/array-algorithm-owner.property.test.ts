import {expect,test} from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";

function subject(strict:boolean,profile:boolean,noGc:boolean):string{
 return `${strict?'export {};':''}
 const proto:any=Array.prototype,marker:any={token:11};
 function emit(value:any):void{${profile?'(globalThis as any).print':'console.log'}(value);}
 function collect():void{${profile&&!noGc?'(globalThis as any).$262.gc();':''}}
 function check(value:boolean,label:string):void{if(!value)throw label;emit(label+':true');}
 function throws(callback:()=>any,constructor:any,label:string):void{try{callback();throw 'missing';}catch(error){check(error instanceof constructor,label);}}
 function apply(method:string,receiver:any,actual:any[]):any{return Reflect.apply(proto[method],receiver,actual);}
 for(const primitive of [7,true,'x',37n,Symbol('box')]){
  const reversed=apply('reverse',primitive,[]);check(typeof reversed==='object'&&reversed.valueOf()===primitive,'primitive-receiver-object');
 }
 // String indices are immutable; only operations that actually write must fail.
 check(apply('reverse','',[]).valueOf()===''&&apply('fill','ab',[marker,0,0]).valueOf()==='ab','string-no-write-completion');
 throws(()=>apply('fill','ab',[marker]),TypeError,'string-write-abrupt');
 throws(()=>apply('push',null,[]),TypeError,'nullish-receiver-abrupt');
 const pushed=apply('push',7,[marker,undefined]);check(pushed===2,'boxed-primitive-push');
 const boxedString=apply('map','ab',[function(this:any,value:any,index:number,owner:any):any{collect();check(typeof owner==='object'&&owner.valueOf()==='ab'&&arguments.length===3,'boxed-callback-owner');return value;}]);check(boxedString.join('|')==='a|b','boxed-source-values');
 let trace='';const lengthValue:any={[Symbol.toPrimitive](hint:any){trace+='N';collect();check(hint==='number','length-number-hint');return 2.9;}};
 const source:any={0:'a',1:'b'};Object.defineProperty(source,'length',{get(){trace+='L';return lengthValue;}});
 const index:any={[Symbol.toPrimitive](){trace+='I';collect();return -1.5;}};
 check(apply('at',source,[index])==='b'&&trace==='LNI','length-before-index-conversion');
 trace='';const separator:any={[Symbol.toPrimitive](){trace+='S';return '|';}};check(apply('join',source,[separator])==='a|b'&&trace==='LNS','length-before-separator-conversion');
 trace='';const abrupt:any={get length(){trace+='L';throw marker;}};
 try{apply('map',abrupt,[0]);throw 'missing';}catch(error){check(error===marker&&trace==='L','length-abrupt-before-callback-validation');}
 throws(()=>apply('map',{length:0},[0]),TypeError,'callback-validation-on-empty-source');
 throws(()=>apply('reduce',{length:0},[()=>marker]),TypeError,'missing-reduction-initial-value');
 const inherited:any=Object.create({0:undefined});inherited.length=2;
 check(apply('indexOf',inherited,[undefined])===0&&apply('indexOf',{length:2},[undefined])===-1&&apply('includes',{length:2},[undefined])===true,'has-property-and-get-partitions');
 check(apply('lastIndexOf',['x','x'],['x'])===1&&apply('lastIndexOf',['x','x'],['x',undefined])===0,'omitted-and-undefined-index');
 const huge:any={0:marker,9007199254740990:marker,length:Infinity};
 check(apply('at',huge,[-1])===marker&&apply('indexOf',huge,[marker,-1e300])===0,'length-clamp-and-large-relative-index');
 throws(()=>apply('push',huge,[marker]),TypeError,'argument-list-integer-limit-before-write');
 throws(()=>apply('with',{length:4294967296},[0,marker]),RangeError,'result-array-length-boundary');
 function observer(target:any):any{return new Proxy(target,{
  get(object:any,key:any,receiver:any):any{trace+='G'+String(key)+';';collect();return Reflect.get(object,key,receiver);},
  has(object:any,key:any):boolean{trace+='H'+String(key)+';';collect();return Reflect.has(object,key);},
  set(object:any,key:any,value:any,receiver:any):boolean{trace+='S'+String(key)+';';collect();return Reflect.set(object,key,value,receiver);},
  deleteProperty(object:any,key:any):boolean{trace+='D'+String(key)+';';collect();return Reflect.deleteProperty(object,key);}
 });}
 for(const operation of ['push','unshift','copyWithin','reverse','splice','slice','with','toSpliced','toReversed']){
  for(const presence of [0,1,3,5,7]){
   const target:any={length:3};for(let index=0;index<3;index++)if(presence&(1<<index))target[index]=index===1?undefined:index;
   trace='';const object=observer(target);const actual:any[]=operation==='push'||operation==='unshift'?[marker,undefined]:operation==='copyWithin'?[1,0,2]:operation==='splice'?[1,2,marker]:operation==='with'?[1,marker]:operation==='toSpliced'?[1,1,marker]:[];
   const result=apply(operation,object,actual);emit('operations:'+operation+':'+presence+':'+trace);collect();
   if(operation==='slice')check(result.length===3&&(1 in result)===!!(presence&2),'sparse-copy-preserves-presence');
  }
 }
 trace='';const live:any={0:'a',1:'b',2:'c',length:3};Object.defineProperty(live,'2',{configurable:true,get(){trace+='get2;';return 'c';}});Object.defineProperty(live,'1',{configurable:true,get(){trace+='get1;';return 'b';},set(value:any){trace+='set1;';delete live[2];}});
 apply('copyWithin',live,[0,1]);check(trace==='get1;get2;set1;','copy-within-live-forward-operations');
 trace='';const sparse:any={length:2};const sparseProxy=observer(sparse);check(apply('reverse',sparseProxy,[])===sparseProxy&&trace==='Glength;H0;H1;','reverse-both-absent-no-delete');
 const sealed:number[]=[1,2];Object.seal(sealed);const removed=sealed.splice(0,1,marker);check(removed[0]===1&&(sealed as any)[0]===marker,'sealed-existing-replacement');
 const frozen:any[]=[,];Object.freeze(frozen);check(apply('reverse',frozen,[])===frozen,'frozen-no-actual-write');
 const copiedSource:any={length:3,get 0(){throw marker;},1:'b',2:'c'};const replaced=apply('with',copiedSource,[0,marker]);check(replaced[0]===marker&&replaced[1]==='b','with-skips-replaced-property-get');
 const concatTarget:any={length:2,1:marker,[Symbol.isConcatSpreadable]:true};const concat=apply('concat',[],[concatTarget]);check(concat.length===2&&!(0 in concat)&&concat[1]===marker,'concat-live-presence');
 const savedSpread:any=(Array.prototype as any)[Symbol.isConcatSpreadable];(Array.prototype as any)[Symbol.isConcatSpreadable]=false;const self:any[]=[marker];const joined=self.concat();check(joined.length===1&&joined[0]===self,'concat-no-intermediate-owner');delete (Array.prototype as any)[Symbol.isConcatSpreadable];
 const revoked=Proxy.revocable([],{});revoked.revoke();const depthZero=apply('flat',[revoked.proxy],[0]);check(depthZero[0]===revoked.proxy,'zero-depth-skips-array-brand');throws(()=>apply('flat',[revoked.proxy],[1]),TypeError,'flatten-array-brand-abrupt');
 async function verify():Promise<void>{
  let nested:any=marker;for(let level=0;level<2048;level++)nested=[nested];await Promise.resolve(nested);collect();let depthCalls=0;const depth:any={[Symbol.toPrimitive](){depthCalls++;collect();return Infinity;}};const flat=apply('flat',[nested],[depth]);collect();check(flat.length===1&&flat[0]===marker&&depthCalls===1,'deep-array-algorithm-worklist');
 }
 verify().catch((error:any)=>{emit('failure:'+String(error));throw error;});`;
}

test("Array algorithms borrow one ordinary receiver and ordered property worklist",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-array-algorithm-owner-"));
    const erase=(source:string,module:ts.ModuleKind)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module}}).outputText;
    try{
        for(const strict of [false,true]){
            const referenceFile=path.join(temporary,`reference-${strict}.cjs`);await fs.writeFile(referenceFile,erase(subject(strict,false,true),ts.ModuleKind.CommonJS));
            const reference=Bun.spawnSync(["node","-e",'const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");require(process.argv[1]);',referenceFile],{stdout:"pipe",stderr:"pipe",timeout:120_000});
            expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const expected=reference.stdout.toString().trimEnd().split("\n");expect(expected.at(-1)).toBe("deep-array-algorithm-worklist:true");
            for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]){
                const directory=path.join(temporary,`${strict}-${typed}-${profile}-${noGc}`);await fs.mkdir(directory);
                const entry=path.join(directory,typed?"main.ts":strict?"main.mjs":"main.js"),output=path.join(directory,"program"),diagnostics:string[]=[];
                const source=subject(strict,profile,noGc);await fs.writeFile(entry,typed?source:erase(source,ts.ModuleKind.ESNext));
                const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),...(strict?{moduleRoots:[entry]}:{}),initializationEntries:[entry],
                    ...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/array-algorithm-owner.js#"+(strict?"module":"sloppy"),setupEntries:[],testEntry:entry,async:false,scriptEntries:strict?[]:[entry]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
                expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
                const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
                expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
                const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:"normal"});
                expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split("\n")).toEqual(expected);
            }
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

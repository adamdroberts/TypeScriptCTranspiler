import {nodeReferenceSync} from './node-reference';
import {expect,test} from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";

function subject(strict:boolean,profile:boolean,noGc:boolean):string{
    const depth=128,pattern="[".repeat(depth)+"leaf=fallback()"+"]".repeat(depth);
    return `${strict?'export {};':''}
        const marker={token:11},key=Symbol('key');let effects=0;
        function check(value:boolean,label:string):void{if(!value)throw label;${profile?'(globalThis as any).print':'console.log'}(label+':true');}
        function collect():void{${profile&&!noGc?'(globalThis as any).$262.gc();':''}}
        function fallback():any{effects++;collect();return marker;}
        function direct(this:any,value:number=fallback(),later:any=value,...tail:number[]):any{return [value,later,tail,this,arguments.length];}
        const expression:any=function(this:any,value:number=fallback()):any{return [value,this,arguments.length];};
        const arrow=(value:number=fallback()):any=>value;
        function factory(this:any,first:any):any{return (value:number=fallback()):any=>[value,this,arguments.length,()=>first];}
        function pattern([first=fallback(),,{value},...tail]:any,{[key]:selected=fallback(),...rest}:any={}):any{return [first,value,tail,selected,rest];}
        // ECMAScript performs a TDZ read; TypeScript rejects this source statically.
        // @ts-ignore
        function tdz(first:any=second,second:any=17):any{return first;}
        function captured(first:any=()=>second,second:any=fallback()):any{return first;}
        function mapped(value:number):any{arguments[0]=marker;const changed=value;value=19;return [changed,arguments[0]];}
        function body(value:any=marker,read:any=()=>value):any{var value:any=23;return [value,read()];}
        async function suspended(value:number=fallback(),read:any=()=>value):Promise<any>{await Promise.resolve(0);collect();return [value,read()];}
        function* generator(value:number=fallback()):Generator<any,any,any>{yield value;collect();return value;}
        async function* asyncGenerator(value:number=fallback()):AsyncGenerator<any,any,any>{yield value;collect();return value;}
        function callback(this:any,value:number):any{return [value,arguments.length,this];}
        function compare(first:number,second:number,absent:any=marker):number{if(absent!==marker||arguments.length!==2)throw 'sort-activation';return second-first;}
        function generic<T>(value:T,read:any=()=>value):T{return read();}
        function empty():void{}
        class Receiver{value=29;}
        function native(this:Receiver,value:number=fallback()):any{return [this.value,value];}
        function deep(${pattern}:any):any{return leaf;}
        async function verify():Promise<void>{
            const receiver={token:31},omitted:any=Reflect.apply(direct,receiver,[]);
            check(omitted[0]===marker&&omitted[1]===marker&&omitted[2].length===0&&omitted[3]===receiver&&omitted[4]===0,'declaration-default-actual-activation');
            for(const value of [null,false,0,'',37n,key,marker,[],()=>41] as any[]){const actual:any=Reflect.apply(direct,receiver,[value]);check(actual[0]===value&&actual[1]===value&&actual[4]===1,'actual-argument-value-kind');}
            const rest:any=Reflect.apply(direct,receiver,[undefined,undefined,marker,key,null]);check(rest[2][0]===marker&&rest[2][1]===key&&rest[2][2]===null&&rest[4]===5,'rest-actual-list');
            const result=expression.call(receiver);check(result[0]===marker&&result[1]===receiver&&result[2]===0,'expression-default-activation');
            check(arrow()===marker&&arrow(undefined)===marker,'arrow-default-value');
            const retained=factory.call(receiver,marker,43);collect();const lexical=retained.call({},undefined);check(lexical[0]===marker&&lexical[1]===receiver&&lexical[2]===2&&lexical[3]()===marker,'arrow-lexical-activation');
            const source:any={extra:47};source[key]=undefined;const tree=pattern([undefined,99,{value:53},marker,key],source);
            check(tree[0]===marker&&tree[1]===53&&tree[2][0]===marker&&tree[2][1]===key&&tree[3]===marker&&tree[4].extra===47&&!(key in tree[4]),'binding-tree-patterns');
            try{tdz();throw 'missing';}catch(error){check(error instanceof ReferenceError,'later-formal-tdz');}
            const later=captured();collect();check(later()===marker,'retained-later-formal');
            const argument=mapped(59);check(${strict?'argument[0]===59&&argument[1]===marker':'argument[0]===marker&&argument[1]===19'},'mapped-or-strict-arguments');
            const scoped=body();check(scoped[0]===23&&scoped[1]===marker,'separate-parameter-body-bindings');
            const delayed=await suspended();check(delayed[0]===marker&&delayed[1]===marker,'suspended-formal-cells');
            const iterator=generator();check(iterator.next().value===marker&&iterator.next().value===marker,'generator-formal-cells');
            const asynchronous=asyncGenerator();check((await asynchronous.next()).value===marker&&(await asynchronous.next()).value===marker,'async-generator-formal-cells');
            const mappedArray=[61,67].map(callback);check(mappedArray[0][0]===61&&mappedArray[1][0]===67&&mappedArray[0][1]===3&&mappedArray[0][2]===${strict?'undefined':'globalThis'},'native-callback-actual-list');
            const sorted=[71,73,69].sort(compare);check(sorted[0]===73&&sorted[2]===69,'native-callback-result-conversion');
            check(generic(marker)===marker&&generic(key)===key&&generic(null)===null,'erased-source-generic-abi');
            const reduction=[1,2].reduce((acc:any,value:any,index:any,array:any):any=>{if(array.length!==2)throw 'reduce-input';return value===1?marker:acc;},null);
            check(reduction===marker,'callback-accumulator-value-kind');
            const original:any={token:79},mutable:any[]=[original];
            const found=mutable.find((value:any,index:any,array:any):boolean=>{array[0]=marker;collect();return true;});check(found===original,'retained-callback-input');
            const physical:any=Reflect.apply(native,new Receiver(),[]);check(physical[0]===29&&physical[1]===marker,'explicit-native-this-adapter');
            check(empty()===undefined,'empty-function-completion');
            let nested:any=undefined;for(let index=0;index<${depth};index++)nested=[nested];collect();check(deep(nested)===marker,'deep-source-formal-tree');
        }
        verify().catch((error:any)=>{${profile?'(globalThis as any).print':'console.log'}('failure:'+String(error));throw error;});`;
}

test("source functions share canonical actual values, formals and callable activation",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-source-callable-formals-"));
    const erase=(source:string,module:ts.ModuleKind)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module}}).outputText;
    try{
        for(const strict of [false,true]){
            const referenceFile=path.join(temporary,`reference-${strict}.cjs`);await fs.writeFile(referenceFile,erase(subject(strict,false,true),ts.ModuleKind.CommonJS));
            const reference=nodeReferenceSync(["node","-e",'const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");require(process.argv[1]);',referenceFile],{stdout:"pipe",stderr:"pipe",timeout:120_000});
            expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const expected=reference.stdout.toString().trimEnd().split("\n");expect(expected.at(-1)).toBe("deep-source-formal-tree:true");
            for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]){
                const directory=path.join(temporary,`${strict}-${typed}-${profile}-${noGc}`);await fs.mkdir(directory);
                const entry=path.join(directory,typed?"main.ts":strict?"main.mjs":"main.js"),output=path.join(directory,"program"),diagnostics:string[]=[];
                const source=subject(strict,profile,noGc);await fs.writeFile(entry,typed?source:erase(source,ts.ModuleKind.ESNext));
                const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),...(strict?{moduleRoots:[entry]}:{}),initializationEntries:[entry],
                    ...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/source-callable-formals.js#"+(strict?"module":"sloppy"),setupEntries:[],testEntry:entry,async:false,scriptEntries:strict?[]:[entry]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
                expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
                const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
                expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
                const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:"normal"});
                expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split("\n")).toEqual(expected);
            }
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

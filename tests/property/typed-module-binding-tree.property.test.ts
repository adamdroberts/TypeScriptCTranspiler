import {expect,test} from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";

// Type annotations must not select a different binding algorithm. Node parses
// the erased modules independently, including their cyclic instantiation.
function modules(profile:boolean,noGc:boolean):Map<string,string>{
    const depth=256;
    const partitions=["var","let","const"].flatMap(kind=>[
        `export ${kind} [${kind}Array=71]=[];check(${kind}Array===71,"${kind}-array");`,
        `export ${kind} {value:${kind}Object=73}={} as {value?:number};check(${kind}Object===73,"${kind}-object");`,
    ]).join("\n");
    const actualValues=["({marker:true})","'actual'","Symbol('actual')","1n","undefined","NaN","-0"].map((value,index)=>`
        const expected${index}:any=${value},values${index}:number[]=[0];
        Object.defineProperty(values${index},Symbol.iterator,{value:function(){let done=false;return {next(){if(done)return {done:true};done=true;return {value:expected${index},done:false};},return(){return {};}};}});
        export const [actual${index}]:number[]=values${index};collect();
        check(Object.is(actual${index},expected${index}) && typeof actual${index}===typeof expected${index},"actual-iterator-value:${index}");
    `).join("\n");
    return new Map([
        ["target.ts",`import {probe} from "./main";
            export const cycle=probe();
            export let {left=11,nested:{value:nested},...rest}={nested:{value:17},extra:19};
            export const [first,,{value:frozen},...remaining]:[number,number,{value:number},...number[]]=[23,29,{value:31},37,41];
            export var {value:shared}={value:43};
            {var {value:blockVar}={value:47};}
            for(var [iteration,{value:iterationNested}] of [[103,{value:107}],[109,{value:113}]] as any){}
            export {blockVar,iteration,iterationNested};
            export function mutate():void{left=53;shared=59;}`],
        ["main.ts",`import {cycle,left,nested,rest,first,frozen,remaining,shared,blockVar,mutate} from "./target";
            import * as namespace from "./target";
            function check(value:boolean,label:string):void{if(!value)throw label;${profile?'(globalThis as any).print':'console.log'}(label+":true");}
            function collect():void{${profile&&!noGc?'(globalThis as any).$262.gc();':''}}
            export function probe():boolean[]{let lexical=false;try{lexicalLeaf;}catch(error){lexical=error instanceof ReferenceError;}return [varLeaf===undefined,lexical];}
            export var {value:varLeaf}={value:5};export let [lexicalLeaf]=[7];
            check(cycle.join("|")==="true|true","cyclic-instantiation:"+cycle.join("|"));
            check(left===11 && nested===17 && rest.extra===19 && first===23 && frozen===31 && remaining.join("|")==="37|41" && shared===43 && blockVar===47,"nested-typed-initializers");
            let events="";
            function observeAfter():number{let tdz=false;try{after;}catch(error){tdz=error instanceof ReferenceError;}events+=String(tdz);return 79;}
            export let [early=67,later=early+1,observed=observeAfter(),after=83]=[];
            export const {children:[fallbackFirst,,...fallbackTail]=[89,91,97]}={} as {children?:number[]};
            check(early===67 && later===68 && observed===79 && after===83 && events==="true" && fallbackFirst===89 && fallbackTail.join("|")==="97","ordered-default-and-tdz");
            const key=Symbol("selected");export let {[key]:selected,...symbolRest}={[key]:101,extra:103};
            check(selected===101 && symbolRest.extra===103 && Object.getOwnPropertySymbols(symbolRest).length===0,"symbol-key-and-rest");
            let closed=false;
            var []={ [Symbol.iterator](){return {next(){throw "empty pattern next";},return(){closed=true;return {};}};} } as any;
            let {}=(events+="empty",{});
            check(closed && events==="trueempty","empty-pattern-effects");
            let steps=0,abruptClosed=false;const failure={};
            try{var [beforeAbrupt=127,afterAbrupt=(()=>{throw failure;})()]={
                [Symbol.iterator](){return {next(){steps++;return {value:undefined,done:false};},return(){abruptClosed=true;throw "cleanup";}};}
            } as any;}catch(error){check(error===failure && beforeAbrupt===127 && afterAbrupt===undefined && steps===2 && abruptClosed,"abrupt-close-and-cells");}
            mutate();collect();check(left===53 && shared===59 && namespace.left===53 && namespace.shared===59,"live-export-cells");
            check(namespace.iteration===109 && namespace.iterationNested===113,"iteration-pattern-cells");
            ${partitions}
            ${actualValues}
            function choose():boolean{return true;}
            export let [conditional]=choose()?[137]:[139];
            export const {make}={make:():number[]=>[149,151]};
            collect();check(conditional===137 && make()[0]===149 && make().join("|")==="149|151","conditional-and-retained-callable");
            let tree:any=131;for(let index=0;index<${depth};++index)tree={child:tree};
            export let ${"{child:".repeat(depth)}deep${"}".repeat(depth)}=tree;
            collect();check(deep===131,"deep-typed-module-binding-tree");`],
    ]);
}

test("typed Module patterns consume the canonical binding-cell collection and tree",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-typed-module-binding-tree-"));
    try{
        const referenceFile=path.join(temporary,"reference.json");
        await fs.writeFile(referenceFile,JSON.stringify([...modules(false,true)].map(([name,source])=>[name,ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText])));
        const reference=Bun.spawnSync(["node","--experimental-vm-modules","--no-warnings","-e",`const vm=require("node:vm"),fs=require("node:fs");const print=line=>fs.writeSync(1,line+"\\n");const context=vm.createContext({console:{log:print}});const roots=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const modules=new Map(roots.map(([name,source])=>[name,new vm.SourceTextModule(source,{context,identifier:name})]));modules.get("main.ts").link(spec=>modules.get(spec.slice(2)+".ts")).then(()=>modules.get("main.ts").evaluate()).catch(error=>{fs.writeSync(2,String(error));process.exitCode=1;});`,referenceFile],{stdout:"pipe",stderr:"pipe",timeout:120_000});
        expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
        const expected=reference.stdout.toString().trimEnd().split("\n");expect(expected.at(-1)).toBe("deep-typed-module-binding-tree:true");
        for(const profile of [false,true])for(const noGc of [false,true]){
            const directory=path.join(temporary,`${profile}-${noGc}`);await fs.mkdir(directory);
            const roots=modules(profile,noGc);for(const [name,source] of roots)await fs.writeFile(path.join(directory,name),source);
            const entry=path.join(directory,"main.ts"),output=path.join(directory,"program"),diagnostics:string[]=[];
            const result=await compile({entry,output,noGc,moduleRoots:[...roots.keys()].map(name=>path.join(directory,name)),initializationEntries:[entry],
                ...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/typed-module-binding-tree.js#module",setupEntries:[],testEntry:entry,async:false,scriptEntries:[]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
            const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
            expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const observed=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observed)expect(observed).toMatchObject({kind:"normal"});
            expect((observed?observed.stdout??"":native.stdout.toString()).trimEnd().split("\n")).toEqual(expected);
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},300_000);

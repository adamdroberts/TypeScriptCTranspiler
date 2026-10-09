import {expect,test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {finiteEvalScriptSourceGraph} from "../test262/native-host";
import {parseHostObservation} from "../test262/protocol";

test("Module BoundNames and initialization share cells through the binding tree",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-module-binding-tree-"));
    const depth=256;
    try{
      for(const profile of [false,true]){
        const partitions=["var","let","const"].flatMap(kind=>["array","object"].map(shape=>{
            const name=kind+shape;
            return shape==="array"?`export ${kind} [${name}=71]=[];check(${name}===71,"${name}");`
                :`export ${kind} {value:${name}=73}={};check(${name}===73,"${name}");`;
        })).join("\n");
        const target=`import {probe} from "./main.mjs";
            export const cycle=probe();
            export let {left=11,nested:{value:nested},...rest}={nested:{value:17},extra:19};
            export const [first,,{value:frozen},...remaining]=[23,29,{value:31},37,41];
            export var {value:shared}={value:43};
            {var {value:blockVar}={value:47};}
            for(var [iteration,{value:iterationNested}] of [[103,{value:107}],[109,{value:113}]]){}
            for(var [character,...tail] in {abc:0}){}
            export {blockVar,iteration,iterationNested,character,tail};
            export function mutate(){left=53;shared=59;${profile?'eval("nested += 1;");':''}}
            export function immutable(){try{frozen=61;}catch(error){return error instanceof TypeError;}}`;
        const source=`import {cycle,left,nested,rest,first,frozen,remaining,shared,blockVar,mutate,immutable} from "./target.mjs";
            import * as namespace from "./target.mjs";
            export function probe(){let lexical=false;try{lexicalLeaf;}catch(error){lexical=error instanceof ReferenceError;}return [varLeaf===undefined,lexical];}
            export var {value:varLeaf}={value:5};export let [lexicalLeaf]=[7];
            function check(value,label){if(!value)throw label;${profile?'print':'console.log'}(label+":true");}
            function collect(){GC_SITE}
            check(cycle.join("|")==="true|true","cyclic-pattern-binding-instantiation");
            check(left===11 && nested===17 && rest.extra===19 && first===23 && frozen===31 && remaining.join("|")==="37|41" && shared===43 && blockVar===47,"pattern-initialization-protocols");
            let events="";
            export let [early=67,later=${profile?'eval("early + 1;")':'early+1'},observed=(()=>{let tdz=false;try{after;}catch(error){tdz=error instanceof ReferenceError;}events+=String(tdz);return 79;})(),after=83]=[];
            check(early===67 && later===68 && observed===79 && after===83 && events==="true","ordered-pattern-tdz-initialization");
            const key=Symbol("selected");export let {[key]:selected,...symbolRest}={[key]:89,extra:97};
            check(selected===89 && symbolRest.extra===97 && Object.getOwnPropertySymbols(symbolRest).length===0,"computed-symbol-and-object-rest");
            let closed=false;
            var []={ [Symbol.iterator](){return {next(){throw "empty pattern next";},return(){closed=true;return {};}};} };
            let {}=(events+="empty",{});
            check(closed && events==="trueempty","empty-pattern-protocol-effects");
            let steps=0,abruptClosed=false;const failure={};
            try{var [beforeAbrupt=127,afterAbrupt=(()=>{throw failure;})()]={
                [Symbol.iterator](){return {next(){steps++;return {value:undefined,done:false};},return(){abruptClosed=true;throw "cleanup";}};}
            };}catch(error){check(error===failure && beforeAbrupt===127 && afterAbrupt===undefined && steps===2 && abruptClosed,"abrupt-pattern-cell-and-close-precedence");}
            mutate();collect();check(left===53 && shared===59 && namespace.left===53 && namespace.shared===59 && immutable(),"live-pattern-export-cells");
            check(namespace.iteration===109 && namespace.iterationNested===113 && namespace.character==="a" && namespace.tail.join("")==="bc","iteration-pattern-module-cells");
            ${profile?'const read=eval("(() => [left, nested, shared]);");collect();check(read().join("|")==="53|18|59","eval-pattern-cell-aliases");':''}
            ${partitions}
            let tree=101;for(let index=0;index<${depth};++index)tree={child:tree};
            export let ${"{child:".repeat(depth)}deep${"}".repeat(depth)}=tree;
            collect();check(deep===101,"deep-module-binding-tree");`;
        const roots=[{path:"main.mjs",source,goal:"module" as const},{path:"target.mjs",source:target,goal:"module" as const}];
        const referenceFile=path.join(temporary,profile?"profile-reference.json":"cli-reference.json");
        await fs.writeFile(referenceFile,JSON.stringify(roots.map(root=>({...root,source:root.source.replaceAll("GC_SITE","")}))));
        const reference=Bun.spawnSync(["node","--experimental-vm-modules","--no-warnings","-e",`const vm=require("node:vm"),fs=require("node:fs");const print=line=>fs.writeSync(1,line+"\\n");const context=vm.createContext({print,console:{log:print}});const roots=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const modules=new Map(roots.map(root=>[root.path,new vm.SourceTextModule(root.source,{context,identifier:root.path})]));modules.get("main.mjs").link(spec=>modules.get(spec.slice(2))).then(()=>modules.get("main.mjs").evaluate()).catch(error=>{fs.writeSync(2,String(error));process.exitCode=1;});`,referenceFile],{stdout:"pipe",stderr:"pipe",timeout:120_000});
        expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
        const expected=reference.stdout.toString().trimEnd().split("\n");expect(expected.at(-1)).toBe("deep-module-binding-tree:true");
        const graph=finiteEvalScriptSourceGraph(roots);expect(graph.error).toBeNull();
        for(const noGc of [false,true]){
            const directory=path.join(temporary,(profile?"profile":"cli")+(noGc?"-no-gc":"-gc"));await fs.mkdir(directory);
            for(const root of roots)await fs.writeFile(path.join(directory,root.path),root.source.replaceAll("GC_SITE",profile && !noGc?"$262.gc();":""));
            const entry=path.join(directory,"main.mjs"),output=path.join(directory,"program"),additionalRoots:string[]=[],directEvalEntries=[];
            for(const [index,record] of graph.directEvalSources.entries()){
                const file=path.join(directory,"eval-"+index+".js");await fs.writeFile(file,record.source);additionalRoots.push(file);directEvalEntries.push({...record,entry:file});
            }
            const diagnostics:string[]=[];
            const result=await compile({entry,output,noGc,additionalRoots,moduleRoots:roots.map(root=>path.join(directory,root.path)),isolatedScriptRoots:additionalRoots,
                initializationEntries:[entry],...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/module-binding-tree.js#module",setupEntries:[],testEntry:entry,async:false,scriptEntries:[],directEvalEntries}}:{}),
                diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
            const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
            expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const observed=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
            if(observed)expect(observed).toMatchObject({kind:"normal"});
            expect((observed?observed.stdout??"":native.stdout.toString()).trimEnd().split("\n")).toEqual(expected);
        }
      }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},300_000);

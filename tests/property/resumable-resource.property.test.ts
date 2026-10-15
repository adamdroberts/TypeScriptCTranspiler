import {nodeReferenceSync} from './node-reference';
import {expect,test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";

test("resumable resource scopes retain acquisition and raw completion across semantic Awaits",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-resumable-resource-"));
    try{
      for(const profile of [false,true]){
        const depth=128;
        const source=`export {};
            function check(value,label){if(!value)throw label;${profile?'print':'console.log'}(label+":true");}
            function collect(){GC_SITE}
            let events=[];const bodyError={},innerError={},outerError={};
            function resource(name,asynchronous,error){return {
                name,get [Symbol.dispose](){events.push("get-sync:"+name);return function(){events.push("sync:"+this.name);collect();if(error)throw error;return {then(){throw "sync result was awaited";}};};},
                get [Symbol.asyncDispose](){events.push("get-async:"+name);return asynchronous?function(){events.push("async:"+this.name);collect();if(error)throw error;return {then(resolve){events.push("settle:"+name);resolve();}};}:undefined;}
            };}
            async function run(){
                for(const mode of ["normal","return","throw","break","continue"]){
                    events=[];
                    async function activation(){
                        for(let index=0;index<2;++index){
                            using first=resource("sync"+index,false,null);
                            await using second=resource("async"+index,true,null),fallback=resource("fallback"+index,false,null),empty=null;
                            await 0;
                            try{if(mode==="return")return bodyError;if(mode==="throw")throw bodyError;if(mode==="break")break;if(mode==="continue")continue;}
                            finally{events.push("finally");}
                        }
                        return null;
                    }
                    let value=null;try{value=await activation();}catch(error){value=error;}
                    check((mode!=="throw" && mode!=="return" || value===bodyError),"resumable-resource-control-"+mode);
                    ${profile?'print':'console.log'}("resumable-resource-order-"+mode+":"+events.join("|"));
                }
                events=[];let suppressed=null;
                try{await (async()=>{await using outside=resource("outer",true,outerError),inside=resource("inner",false,innerError);await 0;throw bodyError;})();}catch(error){suppressed=error;}
                collect();check(suppressed instanceof SuppressedError && suppressed.error===outerError && suppressed.suppressed instanceof SuppressedError && suppressed.suppressed.error===innerError && suppressed.suppressed.suppressed===bodyError,"resumable-resource-suppression");
                events=[];let acquired=null;
                async function suspendedInitializer(){await using value=await resource("initializer",true,null);acquired=value;return ()=>value;}
                const reader=await suspendedInitializer();collect();check(reader()===acquired && events.join("|")==="get-async:initializer|async:initializer|settle:initializer","resumable-resource-initializer-cell");
                events=[];
                const iterable={ [Symbol.iterator](){let index=0;return {next(){return index<2?{value:resource("head"+index++,true,null),done:false}:{done:true};},return(){events.push("iterator-close");return {};}};} };
                for(await using value of iterable){events.push("body:"+value.name);if(value.name==="head0")continue;break;}
                check(events.join("|")==="get-async:head0|body:head0|async:head0|settle:head0|get-async:head1|body:head1|async:head1|settle:head1|iterator-close","resumable-resource-head-before-iterator-close");
                events=[];
                function* generator(){using value=resource("generator",false,null);yield value;return bodyError;}
                const synchronous=generator();check(synchronous.next().value.name==="generator","generator-resource-acquired");
                const returned=synchronous.return(outerError);check(returned.done && returned.value===outerError && events.join("|")==="get-sync:generator|sync:generator","generator-resource-return-completion");
                events=[];
                async function* asyncGenerator(){await using value=resource("async-generator",true,null);yield value;return bodyError;}
                const asynchronous=asyncGenerator();check((await asynchronous.next()).value.name==="async-generator","async-generator-resource-acquired");
                const result=await asynchronous.return(outerError);check(result.done && result.value===outerError && events.join("|")==="get-async:async-generator|async:async-generator|settle:async-generator","async-generator-resource-return-completion");
                events=[];
                async function timing(){using sync=resource("timing",false,null);await using empty=undefined;events.push("body");Promise.resolve().then(()=>events.push("tick"));}
                const timingResult=timing();events.push("caller");await timingResult;
                ${profile?'print':'console.log'}("resumable-resource-nullish-timing:"+events.join("|"));
                events=[];
                async function deep(){${Array.from({length:depth},(_,index)=>`{${index%2?"await using":"using"} resource${index}=resource("deep${index}",${index%2===1},null);`).join("")}
                    await 0;collect();return bodyError;${"}".repeat(depth)}}
                check(await deep()===bodyError && events.filter(value=>value.startsWith("get-")).length===${depth} && events.at(-1)==="sync:deep0","deep-resumable-resource-scope-tree");
            }
            run().catch(error=>{throw error;});`;
        const referenceFile=path.join(temporary,profile?"profile-reference.mjs":"cli-reference.mjs");await fs.writeFile(referenceFile,source.replaceAll("GC_SITE",""));
        const reference=nodeReferenceSync(["node","--experimental-vm-modules","--no-warnings","-e",
            `const vm=require("node:vm"),fs=require("node:fs");const print=line=>fs.writeSync(1,line+"\\n");const context=vm.createContext({print,console:{log:print}});const module=new vm.SourceTextModule(fs.readFileSync(process.argv[1],"utf8"),{context});module.link(()=>{}).then(()=>module.evaluate()).catch(error=>{fs.writeSync(2,String(error));process.exitCode=1;});`,referenceFile],{stdout:"pipe",stderr:"pipe",timeout:120_000});
        expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
        const expected=reference.stdout.toString().trimEnd().split("\n");expect(expected.at(-1)).toBe("deep-resumable-resource-scope-tree:true");
        for(const noGc of [false,true]){
            const directory=path.join(temporary,(profile?"profile":"cli")+(noGc?"-no-gc":"-gc"));await fs.mkdir(directory);
            const entry=path.join(directory,"main.mjs"),output=path.join(directory,"program");await fs.writeFile(entry,source.replaceAll("GC_SITE",profile && !noGc?"$262.gc();":""));
            const diagnostics:string[]=[];
            const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],
                ...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/resumable-resource.js#module",setupEntries:[],testEntry:entry,async:false,scriptEntries:[]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
            const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
            expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const observed=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observed)expect(observed).toMatchObject({kind:"normal"});
            expect((observed?observed.stdout??"":native.stdout.toString()).trimEnd().split("\n")).toEqual(expected);
        }
      }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

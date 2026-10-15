import {nodeReferenceSync} from './node-reference';
import {expect,test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {finiteEvalScriptSourceGraph} from "../test262/native-host";
import {parseHostObservation} from "../test262/protocol";

test("acquired resource records join lexical cells and the completion worklist",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-resource-completion-"));
    try{
      for(const profile of [false,true]){
        const source=`export {};
            function check(value,label){if(!value)throw label;${profile?'print':'console.log'}(label+":true");}
            function collect(){GC_SITE}
            let events=[];const bodyError={},innerError={},outerError={};
            function resource(name,error){return {name,get [Symbol.dispose](){events.push("get:"+name);return function(){collect();this.disposed=true;events.push("dispose:"+this.name);if(error)throw error;};}};}
            using moduleResource=resource("module",null);export function readModuleResource(){return moduleResource;}
            let getterTdz=false;
            {using value={get [Symbol.dispose](){try{value;}catch(error){getterTdz=error instanceof ReferenceError;}return function(){check(this===value,"resource-dispose-receiver");};}};
                check(getterTdz,"resource-acquisition-before-binding-initialization");
                Object.defineProperty(value,Symbol.dispose,{value:()=>{throw "method reread";},configurable:true});}
            check(events.join("|")==="get:module","resource-acquisition-at-declaration");
            for(const mode of ["normal","return","throw","break","continue","labeled-break","labeled-continue"]){
                events=[];
                function run(){
                    outer: for(let turn=0;turn<2;++turn){
                        using outside=resource("outer"+turn,null);
                        for(let index=0;index<2;++index){
                            using inside=resource("inner"+index,null);
                            try{if(mode==="return")return bodyError;if(mode==="throw")throw bodyError;
                                if(mode==="break")break;if(mode==="continue")continue;
                                if(mode==="labeled-break")break outer;if(mode==="labeled-continue")continue outer;
                            }finally{events.push("finally");}
                        }
                    }
                    return null;
                }
                let result=null;try{result=run();}catch(error){result=error;}
                check((mode!=="return" && mode!=="throw" || result===bodyError) && events.filter(value=>value.startsWith("get:")).length===events.filter(value=>value.startsWith("dispose:")).length,"resource-control-"+mode);
                ${profile?'print':'console.log'}("resource-order-"+mode+":"+events.join("|"));
            }
            events=[];let rejected=false;
            try{using first=resource("first",null),second={get [Symbol.dispose](){events.push("get:second");throw bodyError;}};}catch(error){rejected=error===bodyError;}
            check(rejected && events.join("|")==="get:first|get:second|dispose:first","resource-abrupt-acquisition-closes-prefix");
            events=[];let suppressed=null;
            try{using outside=resource("outside",outerError),inside=resource("inside",innerError);throw bodyError;}catch(error){suppressed=error;}
            collect();check(suppressed instanceof SuppressedError && suppressed.error===outerError && suppressed.suppressed instanceof SuppressedError && suppressed.suppressed.error===innerError && suppressed.suppressed.suppressed===bodyError,"resource-suppressed-error-chain");
            const descriptor=Object.getOwnPropertyDescriptor(suppressed,"error");
            check(descriptor.value===outerError && descriptor.writable && descriptor.configurable && !descriptor.enumerable,"resource-suppressed-error-descriptor");
            suppressed.error=bodyError;collect();check(suppressed.error===bodyError,"resource-suppressed-error-write");
            Object.defineProperty(suppressed,"error",{get(){collect();return innerError;},configurable:true});
            check(suppressed.error===innerError,"resource-suppressed-error-accessor");
            check(delete suppressed.error && suppressed.error===undefined && Object.getOwnPropertyDescriptor(suppressed,"error")===undefined,"resource-suppressed-error-delete");
            ${["null","undefined","true","5",'"primitive"',"{}","{[Symbol.dispose]:null}","{[Symbol.dispose]:5}"].map((value,index)=>
                `{let failure=false;try{using value=${value};}catch(error){failure=error instanceof TypeError;}check(failure===${index>1},"resource-value-${index}");}`).join("\n")}
            events=[];
            const iterable={ [Symbol.iterator](){let index=0;return {next(){return index<2?{value:resource("head"+index++,null),done:false}:{done:true};},return(){events.push("iterator-close");return {};}};} };
            for(using value of iterable){events.push("body:"+value.name);if(value.name==="head0")continue;break;}
            check(events.join("|")==="get:head0|body:head0|dispose:head0|get:head1|body:head1|dispose:head1|iterator-close","resource-iteration-before-iterator-close");
            events=[];switch(1){case 1:{using selected=resource("case",null);events.push("fallthrough");break;}}
            check(events.join("|")==="get:case|fallthrough|dispose:case","resource-caseblock-owner");
            ${profile?'const reader=eval("(() => moduleResource);");let immutable=false;try{eval("moduleResource = null;");}catch(error){immutable=error instanceof TypeError;}collect();check(reader()===moduleResource && immutable,"resource-module-environment-cell");':''}
            events=[];function deep(){${Array.from({length:128},(_,index)=>`{using resource${index}=resource("deep${index}",null);`).join("")}
                collect();return bodyError;${"}".repeat(128)}}
            check(deep()===bodyError && events.length===256 && events.at(-1)==="dispose:deep0" && events[128]==="dispose:deep127","deep-resource-scope-tree");
            events=[];${profile?'print':'console.log'}("module-resource-body-finished");
            Promise.resolve().then(()=>{collect();check(events.join("|")==="dispose:module" && readModuleResource()===moduleResource,"resource-module-disposal-and-retained-cell");});`;
        const referenceFile=path.join(temporary,profile?"profile-reference.mjs":"cli-reference.mjs");await fs.writeFile(referenceFile,source.replaceAll("GC_SITE",""));
        const reference=nodeReferenceSync(["node","--experimental-vm-modules","--no-warnings","-e",
            `const vm=require("node:vm"),fs=require("node:fs");const print=line=>fs.writeSync(1,line+"\\n");const context=vm.createContext({print,console:{log:print}});const module=new vm.SourceTextModule(fs.readFileSync(process.argv[1],"utf8"),{context});module.link(()=>{}).then(()=>module.evaluate()).then(()=>print("module-disposed:"+module.namespace.readModuleResource().name)).catch(error=>{fs.writeSync(2,String(error));process.exitCode=1;});`,referenceFile],{stdout:"pipe",stderr:"pipe",timeout:120_000});
        expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
        const expected=reference.stdout.toString().trimEnd().split("\n").slice(0,-1);expect(expected).toContain("deep-resource-scope-tree:true");
        const graph=finiteEvalScriptSourceGraph([{path:"main.mjs",source,goal:"module"}]);expect(graph.error).toBeNull();
        // Node 26 skips acquisition for directly exported using names. Its
        // exported reader supplies the independent cleanup oracle; native
        // namespace reads separately assert the specified live binding cell.
        const nativeSource='import * as resourceNamespace from "./main.mjs";\n'+source
            .replace('export function readModuleResource()', 'export {moduleResource};export function readModuleResource()')
            .replace('readModuleResource()===moduleResource', 'readModuleResource()===moduleResource && resourceNamespace.moduleResource===moduleResource && moduleResource.disposed');
        for(const noGc of [false,true]){
            const directory=path.join(temporary,(profile?"profile":"cli")+(noGc?"-no-gc":"-gc"));await fs.mkdir(directory);
            const entry=path.join(directory,"main.mjs"),output=path.join(directory,"program");await fs.writeFile(entry,nativeSource.replaceAll("GC_SITE",profile && !noGc?"$262.gc();":""));
            const additionalRoots:string[]=[],directEvalEntries=[];
            for(const [index,record] of graph.directEvalSources.entries()){const file=path.join(directory,"eval-"+index+".js");await fs.writeFile(file,record.source);additionalRoots.push(file);directEvalEntries.push({...record,entry:file});}
            const diagnostics:string[]=[];
            const result=await compile({entry,output,noGc,additionalRoots,moduleRoots:[entry],isolatedScriptRoots:additionalRoots,initializationEntries:[entry],
                ...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/resource-completion.js#module",setupEntries:[],testEntry:entry,async:false,scriptEntries:[],directEvalEntries}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
            const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
            expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const observed=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observed)expect(observed).toMatchObject({kind:"normal"});
            expect((observed?observed.stdout??"":native.stdout.toString()).trimEnd().split("\n")).toEqual(expected);
        }
      }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},300_000);

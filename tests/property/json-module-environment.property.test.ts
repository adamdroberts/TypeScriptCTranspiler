import {expect,test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {pathToFileURL} from "node:url";
import {compile} from "../../src/compile";
import {finiteEvalScriptSourceGraph} from "../test262/native-host";
import {parseHostObservation} from "../test262/protocol";

test("JSON default import References share their synthetic cell through Module environments",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-json-module-environment-"));
    const values=[null,true,262,"value",[1,true,null],{answer:42}];
    const jsonFiles=[...values.map((value,index)=>({path:`value-${index}.json`,source:JSON.stringify(value)})),
        {path:"payload.json",source:'{"token":"identity","value":11}'}];
    try{
      for(const profile of [false,true]){
        const partitions=values.map((value,index)=>{
            const name="value"+index;
            return `import ${name} from "./value-${index}.json" with {type:"json"};
                check(JSON.stringify(${profile?`eval(${JSON.stringify(name+";")})`:name})===${JSON.stringify(JSON.stringify(value))},"json-root-${index}");`;
        }).join("\n");
        const bridge=`import payload from "./payload.json" with {type:"json"};
            import * as storedNamespace from "./payload.json" with {type:"json"};
            export {payload as localDefault,storedNamespace as localNamespace};
            export {default as renamed} from "./payload.json" with {type:"json"};
            export * as jsonNamespace from "./payload.json" with {type:"json"};
            export function read(){return ${profile?'eval("payload;")':'payload'};}
            export function owner(previous,value){return ${profile?'eval("(() => [previous, value, payload]);")':'() => [previous,value,payload]'};}`;
        const source=`import payload from "./payload.json" with {type:"json"};
            import {default as alias} from "./payload.json" with {type:"json"};
            import * as namespace from "./payload.json" with {type:"json"};
            import {renamed,jsonNamespace,localDefault,localNamespace,read,owner} from "./chain-0.mjs";
            import * as bridgeNamespace from "./chain-0.mjs";
            import {shared} from "./diamond.mjs";
            import {shared as cyclic} from "./cycle-b.mjs";
            import * as ambiguous from "./ambiguous.mjs";
            function check(value,label){if(!value)throw label;${profile?'print':'console.log'}(label+":true");}
            function collect(){GC_SITE}
            ${partitions}
            check(payload===alias && namespace.default===payload && renamed===payload && read()===payload,"json-import-cell-identity");
            check(jsonNamespace===namespace && localDefault===payload && localNamespace===namespace && bridgeNamespace.renamed===payload && bridgeNamespace.jsonNamespace===namespace && bridgeNamespace.localDefault===payload && bridgeNamespace.localNamespace===namespace,"json-reexport-cell-identity");
            check(shared===namespace,"json-same-namespace-star-resolution");
            check(cyclic===namespace && !("shared" in ambiguous),"json-cycle-and-ambiguous-namespace-resolution");
            check(Object.getPrototypeOf(namespace)===null && Object.getOwnPropertyNames(namespace).join("")==="default" && !Object.isExtensible(namespace),"json-namespace-shape");
            payload.value=17;collect();check(alias.value===17 && renamed.value===17 && namespace.default.value===17 && read().value===17,"json-object-mutation-through-imports");
            ${profile?'check(eval("payload === alias && renamed === payload && namespace.default === payload && jsonNamespace === namespace;") && eval("this;")===undefined,"json-eval-import-references");':''}
            ${["payload=23;","alias=23;","renamed=23;","namespace=23;","jsonNamespace=23;"].map(text=>
                `{let rejected=false;try{${profile?`eval(${JSON.stringify(text)});`:text}}catch(error){rejected=error instanceof TypeError;}check(rejected && payload.value===17,${JSON.stringify("json-immutable-import-"+text)});}`).join("\n")}
            const retained=${profile?'eval("(() => payload);")':'()=>payload'};
            async function resumed(){await 0;return ${profile?'eval(await "(() => payload);")':'()=>payload'};}
            resumed().then(reader=>{payload.value=29;collect();check(reader()===payload && retained().value===29,"json-suspended-module-owner");});
            let chain=null;for(let value=0;value<4096;++value){chain=owner(chain,value);if(value%127===0)collect();}
            collect();for(let value=4095;value>=0;--value){const result=chain();if(result[1]!==value || result[2]!==payload)throw "json owner tree";chain=result[0];if(value%127===0)collect();}
            check(chain===null,"deep-json-module-owner-tree");`;
        const depth=128;
        const chain=Array.from({length:depth},(_,index)=>({path:`chain-${index}.mjs`,
            source:`export * from "./${index+1<depth?`chain-${index+1}`:"bridge"}.mjs";`,goal:"module" as const}));
        const roots=[{path:"main.mjs",source,goal:"module" as const},{path:"bridge.mjs",source:bridge,goal:"module" as const},...chain,
            ...["left","right"].map(name=>({path:name+".mjs",source:'export * as shared from "./payload.json" with {type:"json"};',goal:"module" as const})),
            {path:"diamond.mjs",source:'export * from "./left.mjs";export * from "./right.mjs";',goal:"module" as const},
            {path:"other.mjs",source:'export * as shared from "./value-5.json" with {type:"json"};',goal:"module" as const},
            {path:"ambiguous.mjs",source:'export * from "./left.mjs";export * from "./other.mjs";',goal:"module" as const},
            {path:"cycle-a.mjs",source:'export * from "./cycle-b.mjs";export * from "./left.mjs";',goal:"module" as const},
            {path:"cycle-b.mjs",source:'export * from "./cycle-a.mjs";',goal:"module" as const}];
        const referenceDir=path.join(temporary,profile?"profile-reference":"cli-reference");await fs.mkdir(referenceDir);
        for(const record of [...roots,...jsonFiles])await fs.writeFile(path.join(referenceDir,record.path),record.source.replaceAll("GC_SITE",""));
        const reference=Bun.spawnSync(["node","--no-warnings","--input-type=module","-e",
            `import fs from "node:fs";globalThis.print=line=>fs.writeSync(1,line+"\\n");console.log=globalThis.print;await import(process.argv[1]);`,pathToFileURL(path.join(referenceDir,"main.mjs")).href],
            {stdout:"pipe",stderr:"pipe",timeout:120_000});
        expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
        const expected=reference.stdout.toString().trimEnd().split("\n");expect(expected).toContain("deep-json-module-owner-tree:true");
        const graph=finiteEvalScriptSourceGraph(roots);expect(graph.error).toBeNull();
        for(const noGc of [false,true]){
            const directory=path.join(temporary,(profile?"profile":"cli")+(noGc?"-no-gc":"-gc"));await fs.mkdir(directory);
            for(const record of [...roots,...jsonFiles])await fs.writeFile(path.join(directory,record.path),record.source.replaceAll("GC_SITE",profile && !noGc?"$262.gc();":""));
            const entry=path.join(directory,"main.mjs"),output=path.join(directory,"program"),additionalRoots:string[]=[],directEvalEntries=[];
            for(const [index,record] of graph.directEvalSources.entries()){
                const file=path.join(directory,"eval-"+index+".js");await fs.writeFile(file,record.source);additionalRoots.push(file);directEvalEntries.push({...record,entry:file});
            }
            const diagnostics:string[]=[];
            const result=await compile({entry,output,noGc,additionalRoots,moduleRoots:roots.map(root=>path.join(directory,root.path)),isolatedScriptRoots:additionalRoots,
                initializationEntries:[entry],...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/json-module-environment.js#module",setupEntries:[],testEntry:entry,async:false,scriptEntries:[],directEvalEntries}}:{}),
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

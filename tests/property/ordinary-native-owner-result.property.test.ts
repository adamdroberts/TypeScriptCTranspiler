import {nodeReferenceSync} from './node-reference';
import {expect, test} from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";

// The independent observable is identity and Type across the language value
// partition. Method declarations' numeric result types cannot replace it.
function subject(observation=false):string {
    const statements=[`import {Buffer} from 'node:buffer'; const date=new Date(0),bytes=Buffer.from([1]);
        const report=(...values:any[]):void=>{${observation ? "(globalThis as any).print(values.join(' '));" : "console.log(values.join(' '));"}};`];
    const values=["'boxed'","({marker:true})","Symbol('result')","1n","undefined","NaN","42"];
    for(const [index,value] of values.entries()){
        statements.push(`const expected${index}:any=${value};
            Object.defineProperty(Date.prototype,'getTime',{value:()=>expected${index},writable:true,configurable:true});
            Object.defineProperty(Object.getPrototypeOf(bytes),'readUInt8',{value:()=>expected${index},writable:true,configurable:true});
            const dateResult${index}=date.getTime(),byteResult${index}=bytes.readUInt8();
            const dateAlias${index}=dateResult${index},byteAlias${index}=byteResult${index};
            report('partition:${index}',Object.is(dateAlias${index},expected${index}),Object.is(byteAlias${index},expected${index}),typeof dateAlias${index}===typeof expected${index},typeof byteAlias${index}===typeof expected${index});`);
    }
    // One representative source dependency depth stresses the compiler's
    // canonical fact worklist, separately from runtime Date owner retention.
    statements.push("Object.defineProperty(Date.prototype,'getTime',{value:()=>expected0,writable:true,configurable:true});const retained0=date.getTime();");
    for(let depth=1;depth<=512;depth++)statements.push(`const retained${depth}=retained${depth-1};`);
    statements.push(`const captured=():any=>retained512;report('deep-source-result-facts',Object.is(captured(),expected0));`);
    return statements.join("\n");
}

test("inferred native ordinary-call results and their alias graph retain actual values",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-native-result-"));
    try{
        const source=subject(),referenceFile=path.join(temporary,"reference.cjs");
        await fs.writeFile(referenceFile,ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.CommonJS}}).outputText);
        const reference=nodeReferenceSync(["node","-e",'const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");require(process.argv[1]);',referenceFile],{stdout:"pipe",stderr:"pipe"});
        expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
        const expected=reference.stdout.toString().trimEnd().split("\n");expect(expected.at(-1)).toBe("deep-source-result-facts true");
        for(const profile of [false,true])for(const noGc of [false,true]){
            const directory=path.join(temporary,`${profile}-${noGc}`);await fs.mkdir(directory);
            const entry=path.join(directory,"main.ts"),output=path.join(directory,"program");await fs.writeFile(entry,subject(profile));
            const diagnostics:string[]=[];const result=await compile({entry,output,noGc,buildDir:path.join(directory,"build"),moduleRoots:[entry],initializationEntries:[entry],
                ...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/native-result.js#module",setupEntries:[],testEntry:entry,async:false,scriptEntries:[]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
            const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
            expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:"normal"});
            expect((observation?observation.stdout??"":native.stdout.toString()).trimEnd().split("\n")).toEqual(expected);
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

import {expect,test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {finiteEvalScriptSourceGraph} from "../test262/native-host";
import {parseHostObservation} from "../test262/protocol";

test("eval and constructor discovery share the source-value and actual-List graph",async()=>{
    const fixture=await fs.readFile(path.join(import.meta.dir,"fixtures/eval-source-flow.js"),"utf8");
    const partitions=[false,true].flatMap(strict=>["direct","indirect","host"].map(mode=>{
        const invocation=mode==="direct"?"eval(...actual)":mode==="indirect"?"(0,eval)(...actual)":"hostEval(...actual)";
        const text=mode==="direct"?"local += 1; local;":"89;";
        return `{function partition(text){${strict?'"use strict";':''}let local=89;const actual=listIdentity([text]);return ${invocation};}
            check(partition(identity(${JSON.stringify(text)}))===${mode==="direct"?90:89},${JSON.stringify(`source-partition-${mode}-${strict}`)});}`;
    })).join("\n");
    const depth=4096,bindings=[`var sourceCell0="97;";`];
    for(let index=1;index<depth;++index)bindings.push(`var sourceCell${index}=sourceCell${index-1};`);
    const source=fixture.replace("GENERATED_PARTITIONS",partitions).replace("DEEP_SOURCE_GRAPH",
        `{${bindings.join("\n")}check(eval(sourceCell${depth-1})===97,"deep-source-cell-chain");}`);
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-eval-source-flow-"));
    try{
        const referenceFile=path.join(temporary,"reference.js");await fs.writeFile(referenceFile,source.replaceAll("NATIVE_GC","false"));
        const reference=Bun.spawnSync(["node","-e",`const vm=require("node:vm"),fs=require("node:fs");const context=vm.createContext({print:line=>fs.writeSync(1,line+"\\n"),$262:{gc(){},evalScript(text){return new vm.Script(String(text)).runInContext(context);}}});new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInContext(context);`,referenceFile],
            {stdout:"pipe",stderr:"pipe",timeout:120_000});
        expect(reference.exitCode).toBe(0);expect(reference.stderr.toString()).toBe("");
        const expected=reference.stdout.toString().trimEnd().split("\n");expect(expected.at(-1)).toBe("deep-source-cell-chain:true");
        const graph=finiteEvalScriptSourceGraph([{path:"source-flow.js",source}]);expect(graph.error).toBeNull();
        for(const noGc of [false,true]){
            const name=noGc?"no-gc":"gc",entry=path.join(temporary,name+".js"),output=path.join(temporary,name),diagnostics:string[]=[];
            await fs.writeFile(entry,source.replaceAll("NATIVE_GC",String(!noGc)));
            const roots:string[]=[];
            const persist=async <Record extends {source:string}>(kind:string,records:readonly Record[])=>{
                const entries:Array<Record & {entry:string}>=[];
                for(const [index,record] of records.entries()){
                    const file=path.join(temporary,name+"-"+kind+"-"+index+".js");await fs.writeFile(file,record.source);roots.push(file);entries.push({...record,entry:file});
                }
                return entries;
            };
            const directEvalEntries=await persist("direct",graph.directEvalSources),indirectEvalEntries=await persist("indirect",graph.indirectEvalSources),
                evalScriptEntries=await persist("host",graph.sources.map(source=>({source})));
            const result=await compile({entry,output,noGc,additionalRoots:roots,isolatedScriptRoots:[entry,...roots],initializationEntries:[entry],
                test262Observation:{kind:"test262-native-observation",scenarioId:"property/eval-source-flow.js#sloppy",setupEntries:[],testEntry:entry,async:false,
                    scriptEntries:[entry,...roots],directEvalEntries,indirectEvalEntries,evalScriptEntries},diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
            const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
            expect({exitCode:native.exitCode,signal:native.signalCode??null,stderr:native.stderr.toString()}).toEqual({exitCode:0,signal:null,stderr:""});
            const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation).toMatchObject({kind:"normal"});
            expect((observation.stdout??"").trimEnd().split("\n")).toEqual(expected);
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},300_000);

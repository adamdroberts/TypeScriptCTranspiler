import {nodeReferenceSync} from './node-reference';
import {expect,test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {finiteEvalScriptSourceGraph} from "../test262/native-host";
import {parseHostObservation} from "../test262/protocol";

test("direct eval projects caller scope bindings through retained cell aliases",async()=>{
    const fixture=await fs.readFile(path.join(import.meta.dir,"fixtures/direct-eval-cells.js"),"utf8");
    const partitions=["let","const","var"].flatMap(kind=>[false,true].map(strict=>{
        const source=`function partition(value){${strict?'"use strict";':''}${kind} local=value;
            let rejected=false;try{eval("local={value:131};");}catch(reason){rejected=reason instanceof TypeError;}
            return [local.value,rejected,eval("(() => local);")];}
            const result=partition({value:137});collect();
            check(result[0]===${kind==="const"?137:131} && result[1]===${kind==="const"} && result[2]().value===result[0],${JSON.stringify(`partition-${kind}-${strict}`)});`;
        return `{${source}}`;
    })).join("\n");
    const source=fixture.replace("finish();",partitions+"\nfinish();");
    // Use the real Node engine rather than Bun's VM emulation. Synchronous
    // writes retain every observation when the oracle process exits.
    const reference=nodeReferenceSync(["node","-e",`const vm=require("node:vm"),fs=require("node:fs");new vm.Script(${JSON.stringify(source.replaceAll("NATIVE_GC","false"))}).runInNewContext({print:line=>fs.writeSync(1,line+"\\n"),$262:{gc(){}}});`],
        {stdout:"pipe",stderr:"pipe",timeout:120_000});
    expect(reference.exitCode).toBe(0);expect(reference.stderr.toString()).toBe("");
    const expected=reference.stdout.toString().trimEnd().split("\n");
    expect(expected.at(-1)).toBe("deep-retained-caller-environment-tree:true");
    const graph=finiteEvalScriptSourceGraph([{path:"caller.js",source}]);expect(graph.error).toBeNull();
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-direct-eval-cell-"));
    try{for(const noGc of [false,true]){
        const name=noGc?"no-gc":"gc",entry=path.join(temporary,name+".js"),output=path.join(temporary,name),diagnostics:string[]=[];
        await fs.writeFile(entry,source.replaceAll("NATIVE_GC",String(!noGc)));
        const entries=[];
        for(const [index,record] of graph.directEvalSources.entries()){
            const script=path.join(temporary,name+"-eval-"+index+".js");await fs.writeFile(script,record.source);entries.push({...record,entry:script});
        }
        const roots=entries.map(record=>record.entry);
        const result=await compile({entry,output,noGc,additionalRoots:roots,isolatedScriptRoots:[entry,...roots],initializationEntries:[entry],
            test262Observation:{kind:"test262-native-observation",scenarioId:"property/direct-eval-cell.js#sloppy",setupEntries:[],testEntry:entry,async:false,
                scriptEntries:[entry,...roots],directEvalEntries:entries},diagnosticWriter:message=>diagnostics.push(message)});
        expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
        const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
        expect(native.exitCode).toBe(0);expect(native.stderr.toString()).toBe("");
        const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation).toMatchObject({kind:"normal"});
        expect((observation.stdout??"").trimEnd().split("\n")).toEqual(expected);
    }}finally{await fs.rm(temporary,{recursive:true,force:true});}
},300_000);

import {nodeReferenceSync} from './node-reference';
import {expect,test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {finiteEvalScriptSourceGraph} from "../test262/native-host";
import {parseHostObservation} from "../test262/protocol";

test("ordinary and resumed calls retain the direct eval Reference context",async()=>{
    const fixture=await fs.readFile(path.join(import.meta.dir,"fixtures/suspended-eval-context.js"),"utf8");
    const partitions=[false,true].flatMap(strict=>["direct","indirect","optional","replacement"].map(mode=>{
        const invoke=mode==="direct"?"(eval)(await text)":mode==="indirect"?"(0,eval)(await text)":mode==="optional"?"eval?.(await text)":"eval(await text)";
        const text=mode==="direct"?"own += 1; own;":"79;";
        const actual=JSON.stringify(text);
        const setup=mode==="replacement"?"const original=host.eval;host.eval=replacement;":"";
        const restore=mode==="replacement"?"host.eval=original;":"";
        return `{async function partition(text){${strict?'"use strict";':''}let own=83;return ${invoke};}
            ${setup}const value=await partition(${actual});${restore}
            check(value===${mode==="direct"?"84":mode==="replacement"?JSON.stringify("replacement:"+text):"79"},${JSON.stringify(`suspended-reference-${mode}-${strict}`)});}`;
    })).join("\n");
    const source=fixture.replace("GENERATED_PARTITIONS",partitions);
    // Admission must not depend on an unrelated direct-eval call enabling
    // caller environments elsewhere in the same source file.
    const indirectSource=`var host=globalThis;const indirectBinding="global";
        function check(value,label){if(!value)throw label;host.print(label+":true");}
        ${[false,true].map(strict=>`{
            function ordinary(){${strict?'"use strict";':''}const indirectBinding="local";return eval?.("indirectBinding;");}
            const arrow=(indirectBinding=>eval?.("indirectBinding;"))("local");
            check(ordinary()==="global" && arrow==="global","optional-indirect-ordinary-${strict}");
            async function resumed(){${strict?'"use strict";':''}const indirectBinding="local";return eval?.(await "indirectBinding;");}
            resumed().then(value=>check(value==="global","optional-indirect-resumed-${strict}"));
        }`).join("\n")}`;
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-suspended-eval-context-"));
    try{
      for(const [program,programSource] of [["caller",source],["indirect-only",indirectSource]]){
        const referenceFile=path.join(temporary,program+"-reference.js");await fs.writeFile(referenceFile,programSource.replaceAll("NATIVE_GC","false"));
        const reference=nodeReferenceSync(["node","-e",`const vm=require("node:vm"),fs=require("node:fs");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:line=>fs.writeSync(1,line+"\\n"),$262:{gc(){}}});`,referenceFile],
            {stdout:"pipe",stderr:"pipe",timeout:120_000});
        expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
        const expected=reference.stdout.toString().trimEnd().split("\n");
        expect(expected.every(line=>line.endsWith(":true"))).toBe(true);
        if(program==="caller")expect(expected.at(-1)).toBe("deep-suspended-eval-owner-tree:true");
        const graph=finiteEvalScriptSourceGraph([{path:"suspended.js",source:programSource}]);expect(graph.error).toBeNull();
        for(const noGc of [false,true]){
            const name=program+(noGc?"-no-gc":"-gc"),entry=path.join(temporary,name+".js"),output=path.join(temporary,name),diagnostics:string[]=[];
            await fs.writeFile(entry,programSource.replaceAll("NATIVE_GC",String(!noGc)));
            const roots:string[]=[];
            const persist=async <Record extends {source:string}>(kind:string,records:readonly Record[])=>{
                const entries:Array<Record & {entry:string}>=[];
                for(const [index,record] of records.entries()){
                    const file=path.join(temporary,name+"-"+kind+"-"+index+".js");await fs.writeFile(file,record.source);roots.push(file);entries.push({...record,entry:file});
                }
                return entries;
            };
            const directEvalEntries=await persist("direct",graph.directEvalSources),indirectEvalEntries=await persist("indirect",graph.indirectEvalSources);
            const result=await compile({entry,output,noGc,additionalRoots:roots,isolatedScriptRoots:[entry,...roots],initializationEntries:[entry],
                test262Observation:{kind:"test262-native-observation",scenarioId:"property/suspended-eval-context.js#sloppy",setupEntries:[],testEntry:entry,async:false,
                    scriptEntries:[entry,...roots],directEvalEntries,indirectEvalEntries},diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
            const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
            expect({exitCode:native.exitCode,signal:native.signalCode??null,stderr:native.stderr.toString()}).toEqual({exitCode:0,signal:null,stderr:""});
            const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation).toMatchObject({kind:"normal"});
            expect((observation.stdout??"").trimEnd().split("\n")).toEqual(expected);
        }
      }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},300_000);

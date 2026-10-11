import {expect,test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import ts from "typescript";
import {compile} from "../../src/compile";
import {sourceEvaluationInvocations} from "../../src/source-value-flow";
import {finiteEvalScriptSourceGraph} from "../test262/native-host";
import {parseHostObservation} from "../test262/protocol";

test("source flow retains declarative and object-record candidates without assuming HasBinding",async()=>{
    const directory=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-with-flow-"));
    const cases=[
        {body:'eval(source);',choices:['41;','43;']},
        {body:'source="47;";eval(source);',choices:['41;','43;','47;']},
        {body:'{let source="53;";eval(source);}',choices:['53;']},
        {body:'function inner(source){eval(source);}inner("59;");',choices:['59;']},
        {body:'try{throw "61;";}catch(source){source="61;";eval(source);}',choices:['61;']},
        {body:'var code=method();eval(code);',choices:['67;','71;']},
    ];
    try{for(const entry of cases){
        const file=path.join(directory,"source.js");
        await fs.writeFile(file,`var source="41;";function method(){return "67;";}var object={source:"43;",text:"71;",method:function(){return this.text;}};with(object){${entry.body}}`);
        const program=ts.createProgram([file],{allowJs:true,noLib:true});
        const calls=sourceEvaluationInvocations(program).filter(call=>call.operation==="eval");
        expect(calls).toHaveLength(1);
        expect(calls[0]!.choices?.slice().sort()).toEqual(entry.choices.slice().sort());
    }
    // A candidate intrinsic eval with an unresolved actual source still fails
    // closed. Object-record candidates do not erase the fallback operation.
    const file=path.join(directory,"unknown.js");
    await fs.writeFile(file,'var unknown;with({eval:function(){return 1;}}){eval(unknown);}');
    expect(sourceEvaluationInvocations(ts.createProgram([file],{allowJs:true,noLib:true}))[0]!.choices).toBeNull();
    const diagnostics:string[]=[];
    const result=await compile({entry:file,output:path.join(directory,"rejected"),noGc:true,diagnosticWriter:message=>diagnostics.push(message)});
    expect(result.exitCode).toBe(3);
    expect(diagnostics.join("")).toContain("unknown eval() source requires");
    }finally{await fs.rm(directory,{recursive:true,force:true});}
});

test("finite object-environment source flow executes through the shared eval registry in both memory modes",async()=>{
    const directory=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-with-flow-native-"));
    const parts:string[]=[],expected:string[]=[];
    for(const present of [false,true])for(const blocked of [false,true])for(const write of [false,true]){
        const value=write?47:present&&!blocked?43:41;
        parts.push(`{var source="41;";var object={${present?'source:"43;",':''}[Symbol.unscopables]:{source:${blocked}}};with(object){${write?'source="47;";':''}print(eval(source));}}`);
        expected.push(String(value));
    }
    parts.push('{var source="41;";with({source:"43;"}){{let source="53;";print(eval(source));}function inner(source){return eval(source);}print(inner("59;"));try{throw "61;";}catch(source){source="61;";print(eval(source));}}}');
    expected.push("53","59","61");
    parts.push('{function method(){return "67;";}var object={text:"71;",method:function(){return this.text;}};with(object){var code=method();print(eval(code));}}');
    expected.push("71");
    parts.push('with({}){function invoke(eval){return eval({value:83});}print(invoke(function(value){return value.value;}));}');
    expected.push("83");
    parts.push('with({eval:globalThis.eval}){let eval=function(value){return value.value;};print(eval({value:89}));}');
    expected.push("89");
    // One representative deep tree goes through the same candidate-edge walk.
    const depth=256;
    parts.push('{var source="73;";'+Array.from({length:depth},(_,i)=>`with({source:"${i===depth-1?79:73};"}){`).join('')+'print(eval(source));'+'}'.repeat(depth)+'}');
    expected.push("79");
    const source=parts.join('\n');
    try{
        const entry=path.join(directory,"source.js");await fs.writeFile(entry,source);
        const reference=Bun.spawnSync(["node","-e",'const vm=require("node:vm"),fs=require("node:fs");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:x=>fs.writeSync(1,String(x)+"\\n")});',entry],{stdout:"pipe",stderr:"pipe",timeout:120_000});
        expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
        expect(reference.stdout.toString().trimEnd().split('\n')).toEqual(expected);
        const graph=finiteEvalScriptSourceGraph([{path:"source.js",source}]);expect(graph.error).toBeNull();
        const entries=await Promise.all(graph.directEvalSources.map(async(record,index)=>{
            const file=path.join(directory,`eval-${index}.js`);await fs.writeFile(file,record.source);return {...record,entry:file};
        }));
        const roots=entries.map(record=>record.entry);
        for(const noGc of [false,true]){
            const diagnostics:string[]=[],output=path.join(directory,"program-"+noGc);
            const result=await compile({entry,output,noGc,buildDir:path.join(directory,"build-"+noGc),additionalRoots:roots,isolatedScriptRoots:[entry,...roots],initializationEntries:[entry],
                test262Observation:{kind:"test262-native-observation",scenarioId:"property/with-source-flow.js#sloppy",setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry,...roots],directEvalEntries:entries},diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
            const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000});
            expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe("normal");
            expect((observation.stdout??"").trimEnd().split('\n')).toEqual(expected);
        }
    }finally{await fs.rm(directory,{recursive:true,force:true});}
},300_000);

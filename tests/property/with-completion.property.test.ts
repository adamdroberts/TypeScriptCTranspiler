import {expect,test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {finiteEvalScriptSourceGraph} from "../test262/native-host";
import {parseHostObservation} from "../test262/protocol";

const contexts=[
    {name:"normal",wrap:(body:string)=>`31;with({}){${body}}`,explicit:null},
    {name:"break",wrap:(body:string)=>`31;outer:{37;with({}){${body}break outer;}41;}`,explicit:null},
    {name:"continue",wrap:(body:string)=>`31;do{37;with({}){${body}continue;}41;}while(false);`,explicit:null},
    {name:"return",wrap:(body:string)=>`31;(function(){with({}){${body}return 47;}})();`,explicit:47},
    {name:"throw",wrap:(body:string)=>`31;try{37;with({}){${body}throw 53;}}catch(reason){reason;}`,explicit:53},
];
const bodies=[{name:"empty",source:"",value:undefined},{name:"declaration",source:"var unused=59;",value:undefined},
    {name:"value",source:"61;",value:61},{name:"empty-after-value",source:"61;{}",value:61}];
const partitions=contexts.flatMap(context=>bodies.map(body=>({label:context.name+":"+body.name,
    source:context.wrap(body.source),expected:String(context.explicit??body.value)})));
const deep="31;outer:{37;"+"with({})".repeat(256)+"{break outer;}}";
partitions.push({label:"deep-with-completion",source:deep,expected:"undefined"});
const source=partitions.map(({label,source})=>`print(${JSON.stringify(label+":")}+String(eval(${JSON.stringify(source)})));`).join("\n");

test("with completion applies UpdateEmpty independently of nesting and control transfer",async()=>{
    const expected=partitions.map(partition=>partition.label+":"+partition.expected);
    const oracle=Bun.spawnSync(["node","-e",`const vm=require("node:vm"),fs=require("node:fs");new vm.Script(${JSON.stringify(source)}).runInNewContext({print:line=>fs.writeSync(1,line+"\\n")});`],{stdout:"pipe",stderr:"pipe",timeout:120_000});
    expect({exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exitCode:0,stderr:""});
    expect(oracle.stdout.toString().trimEnd().split("\n")).toEqual(expected);
    const graph=finiteEvalScriptSourceGraph([{path:"completion.js",source}]);expect(graph.error).toBeNull();
    const directory=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-with-completion-"));
    try{const entry=path.join(directory,"source.js");await fs.writeFile(entry,source);
    const entries=[];
    for(const [index,record] of graph.directEvalSources.entries()){
        const entry=path.join(directory,"eval-"+index+".js");await fs.writeFile(entry,record.source);entries.push({...record,entry});
    }
    const roots=entries.map(record=>record.entry);
    for(const noGc of [false,true]){
        const diagnostics:string[]=[],output=path.join(directory,"program-"+noGc);
        const result=await compile({entry,output,noGc,buildDir:path.join(directory,"build-"+noGc),additionalRoots:roots,isolatedScriptRoots:[entry,...roots],initializationEntries:[entry],
            test262Observation:{kind:"test262-native-observation",scenarioId:"property/with-completion.js#sloppy",setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry,...roots],directEvalEntries:entries},diagnosticWriter:message=>diagnostics.push(message)});
        expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
        const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000});
        expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
        const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe("normal");
        expect((observation.stdout??"").trimEnd().split("\n")).toEqual(expected);
    }}finally{await fs.rm(directory,{recursive:true,force:true});}
},300_000);

import {nodeReferenceSync} from './node-reference';
import {expect,test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {finiteEvalScriptSourceGraph} from "../test262/native-host";
import {parseHostObservation} from "../test262/protocol";

const operations = [
    {name:"assignment",initial:11,expression:'target = eval("var target=13;17;")'},
    {name:"compound",initial:11,expression:'target += eval("var target=13;17;")'},
    {name:"logical-write",initial:11,expression:'target &&= eval("var target=13;17;")'},
    {name:"logical-skip",initial:11,expression:'target ||= eval("var target=13;17;")'},
    {name:"missing",initial:null,expression:'target = eval("var target=13;17;")'},
];
const declarativeOperations = [
    ["assignment",'captured=(eval("var captured=13;"),17)'],
    ["compound",'captured+=(eval("var captured=13;"),17)'],
    ["logical-write",'captured&&=(eval("var captured=13;"),17)'],
    ["logical-skip",'captured||=(eval("var captured=13;"),17)'],
    ["pattern",'[captured]=[(eval("var captured=13;"),17)]'],
] as const;
const declarativePartitions=["let","const","var"].flatMap(kind=>declarativeOperations.flatMap(([name,expression])=>[false,true].map(wrapped=>({
    kind,name,label:kind+":"+name+(wrapped?":wrapped":""),expression:wrapped?expression.replace("captured","(captured)"):expression,
}))));
const declarations=declarativePartitions.map(({kind,label,expression},index)=>`
function declarative_${index}(){
    ${kind} captured=11;let error="none",inner="none";
    try{inner=(function(){const result=(${expression});return [String(result),captured].join(":");})();}
    catch(reason){error=reason.constructor.name;}
    return [error,inner,captured].join(":");
}
print(${JSON.stringify(label+":")}+declarative_${index}());
`).join("\n");
const source=operations.map(({name,initial,expression},index)=>`
function partition${index}(){const result=(${expression});return [result,target,globalThis.target];}
${initial===null?'delete globalThis.target;':`globalThis.target=${initial};`}
print(${JSON.stringify(name+":")}+partition${index}().join(":"));
`).join("\n")+`
delete globalThis.unresolvedReference;
function strictReference(){"use strict"; unresolvedReference=(globalThis.unresolvedReference=31);}
let error="none";
try{strictReference();}catch(reason){error=reason.constructor.name;}
print("strict-unresolvable:"+error+":"+globalThis.unresolvedReference);
function declarativeReference(){
    let captured=11;
    const inner=(function(){const result=(captured=(eval("var captured=13;"),17));return [result,captured];})();
    return inner.concat(captured);
}
print("declarative-reference:"+declarativeReference().join(":"));
`+declarations+`
let updateValue=1208925819614629174706177n;
Object.defineProperty(globalThis,"updateReference",{configurable:true,
    get(){return updateValue;},set(value){updateValue=value;if(NATIVE_GC)globalThis.$262.gc();}});
const oldValue=(updateReference)++;
print("retained-update:"+oldValue+":"+updateValue);
function yieldedReference(){
    let saved=11;
    const iterator=(function*(){saved=yield eval("var saved=13;17;");return saved;})();
    const yielded=iterator.next().value,returned=iterator.next(19).value;
    return [yielded,returned,saved];
}
print("yielded-reference:"+yieldedReference().join(":"));
globalThis.yieldedGlobal=11;
const globalIterator=(function*(){yieldedGlobal=yield eval("var yieldedGlobal=13;17;");return yieldedGlobal;})();
const globalYielded=globalIterator.next().value,globalReturned=globalIterator.next(19).value;
print("yielded-global:"+[globalYielded,globalReturned,globalThis.yieldedGlobal].join(":"));
async function suspendedReference(){
    let saved=11;
    const inner=await(async function(){saved=await eval("var saved=13;17;");return saved;})();
    print("suspended-reference:"+inner+":"+saved);
    globalThis.suspendedGlobal=11;
    const record=await(async function(){suspendedGlobal=await eval("var suspendedGlobal=13;17;");return [suspendedGlobal,globalThis.suspendedGlobal];})();
    print("suspended-global:"+record.join(":"));
    globalThis.asyncGeneratorGlobal=11;
    const iterator=(async function*(){asyncGeneratorGlobal=await(yield eval("var asyncGeneratorGlobal=13;17;"));return asyncGeneratorGlobal;})();
    const yielded=(await iterator.next()).value,returned=(await iterator.next(19)).value;
    print("async-generator-reference:"+[yielded,returned,globalThis.asyncGeneratorGlobal].join(":"));
}
suspendedReference();
`;

test("source References retain their binding before RHS evaluation inserts another binding",async()=>{
    const oracle=nodeReferenceSync(["node","-e",`const vm=require("node:vm"),fs=require("node:fs");new vm.Script(${JSON.stringify(source.replaceAll("NATIVE_GC","false"))}).runInNewContext({print:line=>fs.writeSync(1,line+"\\n")});`],{stdout:"pipe",stderr:"pipe",timeout:120_000});
    expect({exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exitCode:0,stderr:""});
    const node=oracle.stdout.toString().trimEnd().split("\n");
    // The pinned PutValue algorithm and S11.13.1_A6_T2 require the original
    // base. Node 26 re-resolves these dynamic eval writes; keep that observed
    // engine difference separate from the normative Reference model.
    type Environment={parent:Environment|null,bindings:Map<string,{value:number,immutable:boolean}>};
    function model(kind:string,operation:string,initial:number|null){
        const outer:Environment={parent:null,bindings:new Map(initial===null?[]:[["value",{value:initial,immutable:kind==="const"}]])};
        const inner:Environment={parent:outer,bindings:new Map()};
        const resolve=()=>{for(let base:Environment|null=inner;base;base=base.parent)if(base.bindings.has("value"))return base;return null;};
        let base=resolve(),result=initial,error="none";
        if(operation!=="logical-skip"){
            inner.bindings.set("value",{value:13,immutable:false});
            if(operation==="pattern")base=resolve();
            result=operation==="compound"?initial!+17:17;
            if(base?.bindings.get("value")?.immutable)error="TypeError";
            else (base??outer).bindings.set("value",{value:result,immutable:false});
        }
        const local=resolve()!.bindings.get("value")!.value,retained=outer.bindings.get("value")!.value;
        return {result,local,retained,error};
    }
    const expected=operations.map(({name,initial})=>{
        const m=model("var",name,initial);return `${name}:${m.result}:${m.local}:${m.retained}`;
    });
    expected.push("strict-unresolvable:ReferenceError:31","declarative-reference:17:13:17");
    for(const {kind,name,label} of declarativePartitions){
        const m=model(kind,name,11),inner=m.error==="none"?`${m.result}:${m.local}`:"none";
        expected.push(`${label}:${m.error}:${inner}:${m.retained}`);
    }
    expected.push("retained-update:1208925819614629174706177:1208925819614629174706178");
    expected.push("yielded-reference:17:13:19","yielded-global:17:13:19","suspended-reference:13:17","suspended-global:13:17");
    expected.push("async-generator-reference:17:13:19");
    expect(node.filter(line=>line.includes("logical-skip")||line.includes(":pattern:"))).toEqual(expected.filter(line=>line.includes("logical-skip")||line.includes(":pattern:")));
    const graph=finiteEvalScriptSourceGraph([{path:"reference.js",source}]);expect(graph.error).toBeNull();
    const directory=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-reference-resolution-"));
    try{for(const noGc of [true,false]){
        const entry=path.join(directory,String(noGc)+".js"),output=path.join(directory,"program-"+noGc),diagnostics:string[]=[];
        await fs.writeFile(entry,source.replaceAll("NATIVE_GC",String(!noGc)));
        const entries=[];
        for(const [index,record] of graph.directEvalSources.entries()){
            const entry=path.join(directory,String(noGc)+"-eval-"+index+".js");await fs.writeFile(entry,record.source);entries.push({...record,entry});
        }
        const roots=entries.map(record=>record.entry);
        const result=await compile({entry,output,noGc,buildDir:path.join(directory,"build-"+noGc),additionalRoots:roots,isolatedScriptRoots:[entry,...roots],initializationEntries:[entry],
            test262Observation:{kind:"test262-native-observation",scenarioId:"property/reference-resolution.js#sloppy",setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry,...roots],directEvalEntries:entries},diagnosticWriter:message=>diagnostics.push(message)});
        expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
        const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000});
        expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
        const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe("normal");
        expect((observation.stdout??"").trimEnd().split("\n")).toEqual(expected);
    }}finally{await fs.rm(directory,{recursive:true,force:true});}
},300_000);

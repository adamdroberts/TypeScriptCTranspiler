import {nodeReferenceSync} from './node-reference';
import {expect,test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {finiteEvalScriptSourceGraph} from "../test262/native-host";
import {evalSourceIsValid,evalSourceRequest} from "../../src/eval-source";
import {parseHostObservation} from "../test262/protocol";

const statements=["{}","var value=1;",";","if(true){}","label:{function f(){}}"];
const declarations=["function f(){}","async function f(){}","function* f(){}","async function* f(){}","class C{}","let value=1;","const value=1;","label:function f(){}"];
const programs=[...statements,...declarations].map(body=>`with({}) ${body}`).concat([
    '"use strict";with({}){}',String.raw`"use\u0020strict";with({}){}`,
    'function f() {"use strict";with({}){}}','class C{method(){with({}){}}}',
    'function f(value,value){}','var eval=1;',
    'with({}) '+Array.from({length:256},(_,index)=>`label${index}:`).join("")+'function f(){}',
]);

test("eval request admission shares strict context and Statement grammar with independent Node parsing",()=>{
    const cases=programs.flatMap(source=>[false,true].map(strictCaller=>({source,strictCaller})));
    const oracle=nodeReferenceSync(["node","-e",`const cases=${JSON.stringify(cases)};const fs=require("node:fs");for(const item of cases){try{Function((item.strictCaller?'"use strict";':'')+'return eval('+JSON.stringify(item.source)+');')();fs.writeSync(1,"true\\n");}catch(error){if(!(error instanceof SyntaxError))throw error;fs.writeSync(1,"false\\n");}}`],{stdout:"pipe",stderr:"pipe"});
    expect({exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exitCode:0,stderr:""});
    expect(cases.map(({source,strictCaller})=>evalSourceIsValid(evalSourceRequest("direct",source,strictCaller))))
        .toEqual(oracle.stdout.toString().trimEnd().split("\n").map(value=>value==="true"));
});

test("provided eval entries undergo the same admission before native binding instantiation",async()=>{
    const directory=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-eval-admission-"));
    const source=`
    function inherited(){"use strict";try{eval("var unpublished=17;with({}){}");return "accepted";}catch(error){return error.constructor.name+":"+typeof unpublished;}}
    print(inherited());
    function parameterGrammar(){"use strict";try{eval("var unpublished=23;function f(value,value){}");return "accepted";}catch(error){return error.constructor.name+":"+typeof unpublished;}}
    print(parameterGrammar());
    function sloppy(){eval("var published=29;with({}){}");return published;}
    print(sloppy());
    `;
    const requests=[evalSourceRequest("direct","var unpublished=17;with({}){}",true),
        evalSourceRequest("direct","var unpublished=23;function f(value,value){}",true),
        evalSourceRequest("direct","var published=29;with({}){}",false)];
    try{const entry=path.join(directory,"source.js");await fs.writeFile(entry,source);
    const entries=[];
    for(const [index,request] of requests.entries()){
        const file=path.join(directory,"provided-"+index+".js");await fs.writeFile(file,request.source);entries.push({...request,entry:file});
    }
    const roots=entries.map(record=>record.entry);
    for(const noGc of [false,true]){
        const diagnostics:string[]=[],output=path.join(directory,"program-"+noGc);
        const result=await compile({entry,output,noGc,buildDir:path.join(directory,"build-"+noGc),additionalRoots:roots,isolatedScriptRoots:[entry,...roots],initializationEntries:[entry],
            test262Observation:{kind:"test262-native-observation",scenarioId:"property/eval-source-admission.js#sloppy",setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry,...roots],directEvalEntries:entries},diagnosticWriter:message=>diagnostics.push(message)});
        expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
        const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000});
        expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
        const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe("normal");
        expect((observation.stdout??"").trimEnd().split("\n")).toEqual(["SyntaxError:undefined","SyntaxError:undefined","29"]);
    }}finally{await fs.rm(directory,{recursive:true,force:true});}
},300_000);

test("inactive eval calls retain an empty source result while live unknown guards fail closed",()=>{
    const inactive=[
        'if(false)eval(opaque());',
        'const indirect=eval;if(false)indirect(opaque());',
        'true?17:eval(opaque());',
        'try{17/2;}catch(error){eval(opaque());}',
        'const owner={read(){return 17}};try{owner.read();}catch(error){eval(opaque());}',
    ];
    const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");for(const source of JSON.parse(process.argv[1]))new vm.Script(source).runInNewContext({opaque(){throw "unexpected"}});fs.writeSync(1,"complete\\n");',JSON.stringify(inactive)],{stdout:'pipe',stderr:'pipe',timeout:30_000});
    expect({code:reference.exitCode,stderr:reference.stderr.toString(),stdout:reference.stdout.toString()}).toEqual({code:0,stderr:'',stdout:'complete\n'});
    for(const source of inactive){const graph=finiteEvalScriptSourceGraph([{path:'subject.js',source}]);expect({source,error:graph.error,sources:graph.directEvalSources}).toEqual({source,error:null,sources:[]});}
    for(const source of ['if(flag)eval(opaque());','try{throw 17;}catch(error){eval(opaque());}','try{external();}catch(error){eval(opaque());}'])
        expect(finiteEvalScriptSourceGraph([{path:'subject.js',source}]).error).toContain('direct eval source is not a finite static string expression');
});

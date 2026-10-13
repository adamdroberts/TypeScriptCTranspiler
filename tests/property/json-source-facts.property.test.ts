import {expect,test} from "bun:test";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {compile} from "../../src/compile";
import {finiteEvalScriptSourceGraph as graph} from "../test262/native-host";
import {parseHostObservation} from "../test262/protocol";

const values=['undefined','null','false','true','-0','NaN','Infinity','17.5','"17;"','"\\ud800"','Symbol.iterator','function(){}'];
const calls=['JSON.stringify(value)','JSON.stringify.call(null,value)','JSON.stringify.bind(null)(value)','Reflect.apply(JSON.stringify,null,[value])'];
test("JSON root source facts retain scalar results, callbacks and opaque boundaries",()=>{
    for(const value of values)for(const call of calls){
        const source=`const value=${value};eval(${call});`,result=graph([{path:"main.js",source}]);
        expect({source,error:result.error}).toEqual({source,error:null});
        const oracle=Bun.spawnSync(['node','-e','const value=eval("("+process.argv[1]+")");process.stdout.write(JSON.stringify({serialized:JSON.stringify(value)}));',"--",value],{stdout:"pipe",stderr:"pipe"});
        expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:""});
        const serialized=JSON.parse(oracle.stdout.toString()).serialized;
        expect(result.directEvalSources.map(entry=>entry.source)).toEqual(serialized===undefined?[]:[serialized]);
    }
    for(const source of [
        'eval(JSON.stringify(opaque()));',
        'eval(JSON.stringify({get value(){return opaque();}}));',
        'let body="17;";JSON.stringify({toJSON(){body=opaque();return 1;}});eval(body);',
        'const value={body:"17;"};JSON.stringify(value,opaque());eval(value.body);',
        'eval(JSON.stringify(1,undefined,opaque()));',
        'const owner={body:"17;"};JSON.stringify(owner,function(key,value){opaque(owner);return value;});eval(owner.body);',
    ])expect({source,error:graph([{path:"main.js",source}]).error}).toMatchObject({error:expect.stringContaining("direct eval source is not a finite static string expression")});
    for(const [source,expected] of [
        ['eval(JSON.stringify({toJSON(){return 19;}}));','19'],
        ['eval(JSON.stringify(0,function(key,value){return 23;}));','23'],
        ['try{JSON.stringify({toJSON(){throw "29;";}});}catch(source){eval(source);}','29;'],
        ['try{JSON.stringify(0,function(){throw "31;";});}catch(source){eval(source);}','31;'],
        ['JSON.stringify=function(){return "37;";};eval(JSON.stringify(0));','37;'],
    ] as const){const result=graph([{path:"main.js",source}]);expect({source,error:result.error}).toEqual({source,error:null});expect(result.directEvalSources.some(entry=>entry.source===expected)).toBe(true);}
});
test("JSON source closure and callback completions match Node in both memory modes",async()=>{
    const directory=await mkdtemp(join(tmpdir(),"tsc2c-json-source-"));
    try{
        const source=values.map((value,index)=>`{const value=${value};print("value${index}:"+String(JSON.stringify(eval(JSON.stringify(value)))));}`).join('\n')+
            '\n{let effects=0;const object={toJSON(key){effects++;return 19;}};print("hook:"+eval(JSON.stringify(object))+":"+effects);}'+
            '\nprint("replacer:"+eval(JSON.stringify(0,function(key,value){return 23;})));'+
            '\ntry{JSON.stringify({toJSON(){throw "29;";}});}catch(source){print("throw:"+eval(source));}'+
            '\ntry{JSON.stringify(0,function(){throw "31;";});}catch(source){print("throw:"+eval(source));}';
        expect(graph([{path:"main.js",source}]).error).toBeNull();
        const node=Bun.spawnSync(['node','-e','const vm=require("node:vm"),fs=require("node:fs");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});'],{stdin:Buffer.from(source),stdout:"pipe",stderr:"pipe",timeout:120000});
        expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:""});
        for(const typed of [false,true])for(const noGc of [false,true]){
            const entry=join(directory,"main-"+typed+"-"+noGc+(typed?".ts":".js")),output=join(directory,"program-"+typed+"-"+noGc),diagnostics:string[]=[];
            await writeFile(entry,(typed?'// @ts-nocheck\n':'')+source);
            const built=await compile({entry,output,noGc,buildDir:output+"-build",isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:"test262-native-observation",scenarioId:"property/json-source#script",setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
            expect({code:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({code:0,diagnostics:""});
            const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:""});
            const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe("normal");expect(observation.stdout).toBe(node.stdout.toString());
        }
    }finally{await rm(directory,{recursive:true,force:true});}
},600000);

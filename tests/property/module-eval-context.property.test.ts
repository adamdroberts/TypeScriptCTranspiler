import {nodeReferenceSync} from './node-reference';
import {expect,test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {finiteEvalScriptSourceGraph} from "../test262/native-host";
import {parseHostObservation} from "../test262/protocol";

test("source discovery distinguishes evaluation roots from the attested module source table",()=>{
    const graph=finiteEvalScriptSourceGraph([{path:"virtual-module/root.js",goal:"module",source:'import "./static.js";import("./dynamic.js");eval("5;");'}],[
        {path:"virtual-module/static.js",source:'export function read(){return eval("7;");}'},
        {path:"virtual-module/dynamic.js",source:'eval("11;");export {};'},
        {path:"virtual-module/unreachable.js",source:'eval(unknownSource);'},
    ]);
    expect(graph.error).toBeNull();
    expect(new Set(graph.directEvalSources.map(record=>record.source))).toEqual(new Set(["5;","7;","11;"]));
    expect(graph.directEvalSources.every(record=>record.strictCaller && record.strict)).toBe(true);
});

test("Module evaluation and eval share retained binding cells and the Module context boundary",async()=>{
    const target=`import {probe} from "./main.mjs";
        export let counter=11;export const fixed=17;export var flag=23;
        export function reader(){return eval("counter;");}
        export function update(value){counter=value;}
        export function replace(){eval("reader = () => counter + 1;");}
        export function owner(previous,value){return eval("(() => [value, previous, this]);");}
        export default function(){return eval("[this, counter];");}
        if(probe()!=="ReferenceError")throw "cyclic module eval TDZ";`;
    const source=`import defaultReader,{counter as localCounter,fixed,flag,reader,update,replace,owner} from "./target.mjs";
        import * as namespace from "./target.mjs";
        var host=globalThis;
        function check(value,label){if(!value)throw label;host.print(label+":true");}
        function collect(){if(NATIVE_GC)host.$262.gc();}
        export function probe(){try{return eval("later;");}catch(error){return error.name;}}
        let later=29;
        check(eval("this;")===undefined,"module-eval-this-boundary");
        check((()=>eval("this;"))()===undefined && (0,eval)("this;")===host,"module-arrow-and-indirect-context");
        function functionContext(value){return eval("[this, arguments[0], new.target];");}
        const receiver={},called=functionContext.call(receiver,53),constructed=new functionContext(59);
        check(called[0]===receiver && called[1]===53 && called[2]===undefined && constructed[1]===59 && constructed[2]===functionContext,"module-function-context-owner");
        let contextRejected=false;try{eval("var mustNotPublish=67; new.target;");}catch(error){contextRejected=error instanceof SyntaxError;}
        check(contextRejected && typeof mustNotPublish==="undefined","module-eval-context-preflight");
        check(eval("[localCounter, fixed, flag, namespace.counter];").join("|")==="11|17|23|11","module-eval-local-import-bindings");
        const read=eval("(() => [localCounter, namespace.counter]);");update(37);collect();
        check(read().join("|")==="37|37" && reader()===37,"retained-module-live-import");
        ${["localCounter=41;","fixed=41;"].map(text=>`{let rejected=false;try{eval(${JSON.stringify(text)});}catch(error){rejected=error instanceof TypeError;}
            check(rejected && localCounter===37 && fixed===17,${JSON.stringify("module-eval-import-immutable-"+text)});}`).join("\n")}
        eval("var temporary=43;");check(typeof temporary==="undefined","module-strict-eval-variable-record");
        const context=defaultReader();check(context[0]===undefined && context[1]===37,"anonymous-default-module-owner");
        const earlier=reader;replace();check(reader()===38 && namespace.reader()===38 && earlier()===37,"module-mutable-function-binding");
        async function resumed(){await 0;return eval(await "(() => localCounter);");}
        resumed().then(read=>{update(47);collect();check(read()===47,"suspended-module-eval-owner");});
        let chain=null;for(let value=0;value<4096;++value){chain=owner(chain,value);if(value%127===0)collect();}
        collect();for(let value=4095;value>=0;--value){const result=chain();if(result[0]!==value || result[2]!==undefined)throw "module owner tree";chain=result[1];if(value%127===0)collect();}
        check(chain===null,"deep-module-eval-owner-tree");`;
    const roots=[{path:"main.mjs",source,goal:"module" as const},{path:"target.mjs",source:target,goal:"module" as const}];
    const bareSource=`var host=globalThis;function read(){eval("var temporary=61;");return typeof temporary;}
        host.print(read());host.print(typeof eval("this;"));`;
    const programs=[{name:"graph",roots},...(["script","module"] as const).map(goal=>({name:goal,roots:[{path:"bare.js",source:bareSource,goal}]}))];
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-module-eval-context-"));
    try{
      for(const {name,roots} of programs){
        const graph=finiteEvalScriptSourceGraph(roots);expect(graph.error).toBeNull();
        const module=roots[0].goal==="module";
        expect(graph.directEvalSources.length>0).toBe(true);
        expect(graph.directEvalSources.every(record=>record.strictCaller===module && record.strict===module)).toBe(true);
        const referenceFile=path.join(temporary,name+"-reference.json");
        await fs.writeFile(referenceFile,JSON.stringify(roots.map(root=>({...root,source:root.source.replaceAll("NATIVE_GC","false")}))));
        const reference=nodeReferenceSync(["node","--experimental-vm-modules","--no-warnings","-e",
            `const vm=require("node:vm"),fs=require("node:fs");const context=vm.createContext({print:line=>fs.writeSync(1,line+"\\n"),$262:{gc(){}}});const roots=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(roots[0].goal==="script"){new vm.Script(roots[0].source).runInContext(context);}else{const records=new Map(roots.map(root=>[root.path,new vm.SourceTextModule(root.source,{context,identifier:root.path})]));const entry=records.get(roots[0].path);entry.link(spec=>records.get(spec.slice(2))).then(()=>entry.evaluate()).catch(error=>{fs.writeSync(2,String(error));process.exitCode=1;});}`,referenceFile],
            {stdout:"pipe",stderr:"pipe",timeout:120_000});
        expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
        const expected=reference.stdout.toString().trimEnd().split("\n");
        if(name==="graph")expect(expected).toContain("deep-module-eval-owner-tree:true");
        else expect(expected).toEqual(module?["undefined","undefined"]:["number","object"]);
        for(const noGc of [false,true]){
            const directory=path.join(temporary,name+(noGc?"-no-gc":"-gc"));await fs.mkdir(directory);
            for(const root of roots)await fs.writeFile(path.join(directory,root.path),root.source.replaceAll("NATIVE_GC",String(!noGc)));
            const entry=path.join(directory,roots[0].path),output=path.join(directory,"program"),additionalRoots:string[]=[];
            const persist=async <Record extends {source:string}>(kind:string,records:readonly Record[])=>{
                const entries:Array<Record & {entry:string}>=[];
                for(const [index,record] of records.entries()){
                    const file=path.join(directory,kind+"-"+index+".js");await fs.writeFile(file,record.source);additionalRoots.push(file);entries.push({...record,entry:file});
                }
                return entries;
            };
            const directEvalEntries=await persist("direct",graph.directEvalSources),indirectEvalEntries=await persist("indirect",graph.indirectEvalSources);
            const diagnostics:string[]=[];
            const scriptEntries=roots.filter(root=>root.goal==="script").map(root=>path.join(directory,root.path));
            const result=await compile({entry,output,noGc,additionalRoots,moduleRoots:roots.filter(root=>root.goal==="module").map(root=>path.join(directory,root.path)),
                isolatedScriptRoots:[...scriptEntries,...additionalRoots],initializationEntries:[entry],test262Observation:{kind:"test262-native-observation",
                    scenarioId:"property/module-eval-context.js#"+name,setupEntries:[],testEntry:entry,async:false,scriptEntries,directEvalEntries,indirectEvalEntries},
                diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
            const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
            expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation).toMatchObject({kind:"normal"});
            expect((observation.stdout??"").trimEnd().split("\n")).toEqual(expected);
        }
      }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},300_000);

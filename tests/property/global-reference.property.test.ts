import {nodeReferenceSync} from './node-reference';
import {expect, test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";

test("source References observe mutable Realm cells, descriptors, shadows and retained reads", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-global-reference-"));
    try {
        // Generate by Reference/descriptor semantics, not by builtin names or
        // fixture counts. Every key is resolved through the same global record.
        const operations = {read: "KEY", assign: "(KEY=7)", compound: "(KEY+=3)", postfix: "KEY++", logical: "(KEY&&=7)"} as const;
        const partitions: string[] = [];
        for (const descriptor of ["data", "accessor"])
            for (const operation of Object.keys(operations) as Array<keyof typeof operations>)
                partitions.push(`{
                    let stored=4,events=[];
                    Object.defineProperty(root,"generated_${descriptor}_${operation}",${descriptor === "data"
                        ? "{value:4,writable:true,configurable:true}"
                        : "{get(){events.push('get');return stored;},set(value){events.push('set:'+value);stored=value;},configurable:true}"});
                    const result=${operations[operation].replaceAll("KEY", `generated_${descriptor}_${operation}`)};
                    check(result===${operation === "read" || operation === "postfix" ? 4 : 7},"${descriptor}:${operation}:result");
                    check(root.generated_${descriptor}_${operation}===${operation === "read" ? 4 : operation === "postfix" ? 5 : 7},"${descriptor}:${operation}:cell");
                    check(events.join('|')===${JSON.stringify(descriptor === "data" ? "" : operation === "read" ? "get|get" : operation === "assign" ? "set:7|get" : `get|set:${operation === "postfix" ? 5 : 7}|get`)},"${descriptor}:${operation}:effects");
                    check(delete generated_${descriptor}_${operation} && typeof generated_${descriptor}_${operation}==='undefined',"${descriptor}:${operation}:delete");
                }`);
        const common = `
            const root=globalThis;
            function check(value,label){if(!value)throw new Error(label);PRINT(label+':'+value);}
            function retained(){return globalThis;}
            const originalDescriptor=Object.getOwnPropertyDescriptor(root,'globalThis');
            check(originalDescriptor.writable && !originalDescriptor.enumerable && originalDescriptor.configurable,'globalThis:descriptor');
            globalThis=17;
            check(globalThis===17 && retained()===17 && root.globalThis===17,'globalThis:mutable');
            globalThis=null;
            check(globalThis?.absent===undefined && globalThis?.absent()===undefined,'globalThis:optional-nullish');
            root.globalThis=root;
            ${partitions.join("\n")}
            let getterReads=0;
            Object.defineProperty(root,'globalThis',{get(){getterReads++;return 23;},configurable:true});
            check(globalThis===23 && retained()===23 && getterReads===2,'globalThis:accessor');
            Object.defineProperty(root,'globalThis',originalDescriptor);
            check(delete root.globalThis && typeof globalThis==='undefined','globalThis:absent-typeof');
            let missing=false;try{retained();}catch(error){missing=error instanceof ReferenceError;}
            check(missing,'globalThis:absent-read');
            Object.defineProperty(root,'globalThis',originalDescriptor);
            function shadows(globalThis,undefined,NaN,Infinity){return [globalThis,undefined,NaN,Infinity].join('|');}
            check(shadows(1,2,3,4)==='1|2|3|4','globalThis:shadows');
            function sloppy(){return this;}
            check(sloppy.call(null)===root && sloppy.call(undefined)===root,'globalThis:receiver-identity');
            const savedNumber=root.Number,savedMath=root.Math,savedParse=root.parseInt;
            root.Number=function(value){return value+40;};root.Math={floor(value){return value+30;}};root.parseInt=function(value){return value+20;};
            check(Number(2)===42 && Math.floor(2)===32 && parseInt(2)===22,'intrinsic:mutable-call');
            const savedMap=root.Map;
            root.Map=function(value){this.value=value;};
            check(new Map(8).value===8,'intrinsic:mutable-construct');
            root.Map=savedMap;root.Number=savedNumber;root.Math=savedMath;root.parseInt=savedParse;
            check(Object.is(NaN,NaN) && !Object.is(-0,0) && Object.getPrototypeOf({})===Object.prototype,'intrinsic:ordinary-static');
            const assigned=Object.assign({},null,{first:1},{second:2});
            check(assigned.first===1 && assigned.second===2 && Object.fromEntries([['key',3]]).key===3,'intrinsic:static-list');
            for(const operation of ['preventExtensions','seal','freeze']){
                const target={value:1};
                check(Object[operation](target)===target && !Object.isExtensible(target),'intrinsic:integrity:'+operation);
                check(Object.isSealed(target)===(operation!=='preventExtensions') && Object.isFrozen(target)===(operation==='freeze'),'intrinsic:integrity-state:'+operation);
            }
            check(Object.freeze(2)===2 && Object.seal(null)===null && Object.isFrozen(undefined),'intrinsic:integrity-primitives');
            root.freeCallable=function(value){'use strict';return this===undefined && value===9;};
            check(freeCallable(9),'free:call-receiver');delete root.freeCallable;
            Object.defineProperty(root,'immutableGlobal',{value:4,writable:false,configurable:true});
            let immutable=false;try{(function(){'use strict';immutableGlobal=8;})();}catch(error){immutable=error instanceof TypeError;}
            check(immutable && immutableGlobal===4,'free:immutable');delete root.immutableGlobal;
            let strictMissing=false;try{(function(){'use strict';absentGlobal=8;})();}catch(error){strictMissing=error instanceof ReferenceError;}
            check(strictMissing && typeof absentGlobal==='undefined','free:strict-missing');
            const create=Function('createdGlobal=6;return createdGlobal;');
            check(create()===6 && createdGlobal===6 && delete createdGlobal,'free:sloppy-create');
            function deep(){${"{".repeat(256)}return ()=>globalThis;${"}".repeat(256)}}
            const readDeep=deep();globalThis=31;check(readDeep()===31,'globalThis:deep-retained');root.globalThis=root;
            function* generator(){yield globalThis;return globalThis;}
            const suspended=generator();check(suspended.next().value===root,'globalThis:yield-before');
            globalThis=29;check(suspended.next().value===29,'globalThis:yield-after');root.globalThis=root;
            root.suspendedGlobal=5;
            function* writeGenerator(){suspendedGlobal+=yield 2;return suspendedGlobal;}
            const writer=writeGenerator();writer.next();root.suspendedGlobal=100;
            check(writer.next(3).value===8 && root.suspendedGlobal===8,'free:yield-write');
            async function run(){const before=globalThis;await 0;return [before,globalThis];}
            const pending=run();globalThis=37;
            pending.then(values=>{check(values[0]===root && values[1]===37,'globalThis:await');root.globalThis=root;});
            root.suspendedGlobal=5;
            async function writeAsync(){suspendedGlobal+=await 2;return suspendedGlobal;}
            const asyncWriter=writeAsync();root.suspendedGlobal=100;
            asyncWriter.then(value=>check(value===7 && root.suspendedGlobal===7,'free:await-write'));`;
        for (const goal of ["script","module"] as const) for (const profile of [false, true]) {
            // Sloppy receiver identity comes from a Function parse, independent
            // of the caller's Module strictness.
            const source=common.replace("function sloppy(){return this;}","const sloppy=Function('return this;');")
                .replaceAll("PRINT",profile ? "print" : "console.log")
                .replace(/delete (generated_\w+|createdGlobal)/g, (_,name:string)=>`Function(${JSON.stringify(`return delete ${name};`)})()`);
            const referenceFile=path.join(temporary,`reference-${goal}-${profile}.js`);await fs.writeFile(referenceFile,source);
            const reference=nodeReferenceSync(["node","--experimental-vm-modules","--no-warnings","-e",
                'const vm=require("node:vm"),fs=require("node:fs");const print=line=>fs.writeSync(1,line+"\\n"),source=fs.readFileSync(process.argv[1],"utf8"),context=vm.createContext({print,console:{log:print}});if(process.argv[2]==="script")new vm.Script(source).runInContext(context);else{const module=new vm.SourceTextModule(source,{context});module.link(()=>{}).then(()=>module.evaluate()).catch(error=>{fs.writeSync(2,String(error));process.exitCode=1;});}',referenceFile,goal],
                {stdout:"pipe",stderr:"pipe"});
            expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const expected=reference.stdout.toString().trimEnd().split("\n");
            expect(expected.at(-1)).toBe("free:await-write:true");
            for (const noGc of [false,true]) {
                const directory=path.join(temporary,`${goal}-${profile}-${noGc}`);await fs.mkdir(directory);
                const entry=path.join(directory,goal === "module" ? "main.mjs" : "main.js"),output=path.join(directory,"program");await fs.writeFile(entry,source);
                const diagnostics:string[]=[];
                const result=await compile({entry,output,noGc,...(goal === "module" ? {moduleRoots:[entry]} : {isolatedScriptRoots:[entry]}),initializationEntries:[entry],
                    ...(profile ? {test262Observation:{kind:"test262-native-observation" as const,scenarioId:`property/global-reference.js#${goal}`,setupEntries:[],testEntry:entry,async:false,scriptEntries:goal === "script" ? [entry] : []}} : {}),
                    diagnosticWriter:message=>diagnostics.push(message)});
                expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
                const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
                expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
                const observation=profile ? parseHostObservation(JSON.parse(native.stdout.toString())) : null;
                if(observation)expect(observation.kind).toBe("normal");
                expect((observation ? observation.stdout ?? "" : native.stdout.toString()).trimEnd().split("\n")).toEqual(expected);
            }
        }
    } finally {await fs.rm(temporary,{recursive:true,force:true});}
},600_000);

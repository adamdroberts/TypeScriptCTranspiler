import { expect, test } from "bun:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compile } from "../../src/compile";
import { finiteEvalScriptSourceGraph } from "../test262/native-host";
import { parseHostObservation } from "../test262/protocol";

const operations = ["value / 2", "value * 3", "value - 1", "value ** 2", "value << 1", "+value", "value + 'x'"];
test("primitive kinds keep throw-free numeric catches out of finite source choices", () => {
    for (const operation of operations) {
        const source = `let count=0;function body(value){try{${operation};return "17;";}catch(error){return String(Math.random())+";";}}eval(body(count++));`;
        const graph = finiteEvalScriptSourceGraph([{ path: "main.js", source }]);
        expect({ operation, error: graph.error }).toEqual({ operation, error: null });
        expect(graph.directEvalSources.map(entry => entry.source)).toEqual(["17;"]);
    }
    for (const source of [
        'try{throw 0;}catch(error){eval(opaque());}',
        'try{1n/0n;}catch(error){eval(opaque());}',
        'try{+Symbol.iterator;}catch(error){eval(opaque());}',
        'const value=0;try{value++;}catch(error){eval(opaque());}',
        'try{({valueOf(){throw 0;}})/2;}catch(error){eval(opaque());}',
    ]) expect(finiteEvalScriptSourceGraph([{ path: "main.js", source }]).error)
        .toContain("direct eval source is not a finite static string expression");
    const numeric = finiteEvalScriptSourceGraph([{ path: "main.js", source: 'let value=0;value++;if(typeof value==="object")eval(opaque());else eval("19;");' }]);
    expect(numeric.error).toBeNull(); expect(numeric.directEvalSources.map(entry => entry.source)).toEqual(["19;"]);
    const getter=finiteEvalScriptSourceGraph([
        {path:"setup.js",goal:"script",source:'Object.defineProperty(globalThis,"globalValue",{configurable:true,get(){throw "43;";}});'},
        {path:"main.js",goal:"script",source:'var globalValue;try{globalValue/2;}catch(error){eval(error);}'},
    ]);
    expect(getter.error).toBeNull();expect(getter.directEvalSources.map(entry=>entry.source)).toContain("43;");
});

test("primitive kind and actual exception partitions match Node through native source closure", async () => {
    const root = await mkdtemp(join(tmpdir(), "tsc2c-primitive-kind-source-"));
    try {
        for (const typed of [false, true]) for (const noGc of [false, true]) {
            const depth = typed && !noGc ? 256 : 1;
            const source = 'function opaque(){return String(Math.random());}\n' + operations.map((operation, index) => `{
                let count=0;
                function body(value){try{${operation};return "${23 + index};";}catch(error){return String(Math.random())+";";}}
                for(let index=0;index<3;index++)print("number${index}:"+eval(body(count++)));
            }`).join("\n") + `
                {let value=0;value++;print("number-kind:"+typeof value);if(typeof value==="object")eval(opaque());}
                {let value=0n;value++;print("bigint-kind:"+typeof value);}
                try{throw 0;}catch(error){print("zero:"+error);}
                try{1n/0n;}catch(error){print("range:"+(error instanceof RangeError));}
                try{+Symbol.iterator;}catch(error){print("symbol:"+(error instanceof TypeError));}
                {const value=0;try{value++;}catch(error){print("immutable:"+(error instanceof TypeError));}}
                try{({valueOf(){throw "31;";}})/2;}catch(error){print("user:"+eval(error));}
                {let value=0;function deep(input){try{${'+('.repeat(depth)}input${')'.repeat(depth)};return "37;";}catch(error){return String(Math.random())+";";}}print("deep:"+eval(deep(value++)));}
            `;
            const graph = finiteEvalScriptSourceGraph([{ path: "main.js", source }]); expect(graph.error).toBeNull();
            const setup='Object.defineProperty(globalThis,"globalValue",{configurable:true,get(){throw "43;";}});';
            const program=source+'\nvar globalValue;try{globalValue/2;}catch(error){print("global:"+eval(error));}';
            const node = Bun.spawnSync(["node", "-e", 'const fs=require("node:fs"),vm=require("node:vm"),context=vm.createContext({print:value=>fs.writeSync(1,String(value)+"\\n")});for(const source of JSON.parse(fs.readFileSync(0,"utf8")))new vm.Script(source).runInContext(context);'],
                { stdin: Buffer.from(JSON.stringify([setup,program])), stdout: "pipe", stderr: "pipe", timeout: 120_000 });
            expect({ code: node.exitCode, stderr: node.stderr.toString() }).toEqual({ code: 0, stderr: "" });
            const entry = join(root, "main-" + typed + "-" + noGc + (typed ? ".ts" : ".js")), output = entry + "-program", diagnostics: string[] = [];
            const setupEntry=entry+'.setup.js';await writeFile(setupEntry,setup);
            await writeFile(entry, (typed ? "// @ts-nocheck\n" : "") + program);
            const built = await compile({ entry, additionalRoots:[setupEntry], output, noGc, buildDir: output + "-build", isolatedScriptRoots: [setupEntry,entry], initializationEntries: [setupEntry,entry],
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/primitive-kind-source#script", setupEntries: [setupEntry], testEntry: entry, scriptEntries: [setupEntry,entry], async: false },
                diagnosticWriter: message => diagnostics.push(message) });
            expect({ code: built.exitCode, diagnostics: diagnostics.join("") }).toEqual({ code: 0, diagnostics: "" });
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000 });
            expect({ code: native.exitCode, stderr: native.stderr.toString() }).toEqual({ code: 0, stderr: "" });
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            expect(observation.kind).toBe("normal"); expect(observation.stdout).toBe(node.stdout.toString());
        }
    } finally { await rm(root, { recursive: true, force: true }); }
}, 600_000);

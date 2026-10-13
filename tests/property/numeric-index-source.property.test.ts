import { expect, test } from "bun:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compile } from "../../src/compile";
import { finiteEvalScriptSourceGraph } from "../test262/native-host";
import { parseHostObservation } from "../test262/protocol";

const partitions = [
    { initial: "0", key: "index++", fields: '0:"17;",1:"19;"', values: ["17;", "19;"] },
    { initial: "0", key: "++index", fields: '1:"23;",2:"29;"', values: ["23;", "29;"] },
    { initial: "0", key: "-index++", fields: '0:"31;",[-1]:"37;"', values: ["31;", "37;"] },
    { initial: "0n", key: "index++", fields: '0:"41;",1:"43;"', values: ["41;", "43;"] },
    { initial: "0.5", key: "index++", fields: '"0.5":"47;","1.5":"53;"', values: ["47;", "53;"] },
    { initial: "NaN", key: "index++", fields: 'NaN:"59;"', values: ["59;"] },
    { initial: "Infinity", key: "index++", fields: 'Infinity:"61;"', values: ["61;"] },
    { initial: "9007199254740993n", key: "index++", fields: '"9007199254740993":"67;"', values: ["67;"] },
];
function subject(depth: number): string {
    return partitions.map((partition, number) => `{
        const prototype = { ${partition.fields} };
        const owner = { __proto__: prototype, get ignored() { throw "unexpected non-numeric getter"; } };
        let index = ${partition.initial};
        for (let step = 0; step < 3; step++) {
            const key = ${partition.key};
            print("direct${number}:" + String(eval(owner[key])));
            print("indirect${number}:" + String((0, eval)(owner[key])));
            print("host${number}:" + String($262.evalScript(owner[key])));
        }
    }`).join("\n") + `
        { const bodies = ["71;", "73;"]; let index = 0;
          while (index < 3) print("array:" + String(eval(bodies[index++]))); }
        { let reads = 0; const owner = { get 0() { reads++; return "83;"; } }; let index = 0;
          print("getter:" + String(eval(owner[index++])) + ":" + reads); }
        { const p0 = { 0: "79;" };
          ${Array.from({ length: depth }, (_, index) => `const p${index + 1} = { __proto__: p${index} };`).join("\n")}
          const owner = { __proto__: p${depth} }; let index = 0;
          print("deep:" + String(eval(owner[index++]))); }
    `;
}
test("numeric key domains project represented locations and preserve unknown effects", () => {
    for (const partition of partitions) {
        const source = `const owner={${partition.fields}};let index=${partition.initial};for(let step=0;step<3;step++)eval(owner[${partition.key}]);`;
        const graph = finiteEvalScriptSourceGraph([{ path: "main.js", source }]);
        expect({ source, error: graph.error }).toEqual({ source, error: null });
        expect(graph.directEvalSources.map(entry => entry.source).sort()).toEqual([...partition.values].sort());
    }
    const saved = finiteEvalScriptSourceGraph([{ path: "main.js", source:
        'const owner={0:"17;",1:"19;",undefined:"23;",label:"29;"};let index=0;for(let step=0;step<3;step++){var key=index++;if(step===2)key="label";eval(owner[key]);}' }]);
    expect(saved.error).toBeNull();
    expect(new Set(saved.directEvalSources.map(entry => entry.source))).toEqual(new Set(["17;","19;","23;","29;"]));
    for (const source of [
        'const a=["17;"];let i=0;opaque(a);eval(a[i++]);',
        'const a={get 0(){return opaque();}};let i=0;eval(a[i++]);',
        'const a={__proto__:opaque()};let i=0;eval(a[i++]);',
        'const a=["17;"];const key={valueOf(){a[0]=opaque();return 0;}};eval(a[+key]);',
        'const a=["17;"];eval(a[opaque()]);',
        'const a={0:"17;"};let i=0;i=opaque();eval(a[i]);',
    ]) expect({ source, error: finiteEvalScriptSourceGraph([{ path: "main.js", source }]).error })
        .toMatchObject({ error: expect.stringContaining("direct eval source is not a finite static string expression") });
});

test("unbounded numeric domains and a deep owner graph match independent Node", async () => {
    const directory = await mkdtemp(join(tmpdir(), "tsc2c-numeric-index-source-"));
    try {
        for (const typed of [false, true]) for (const noGc of [false, true]) {
            const source = subject(typed && !noGc ? 256 : 1);
            const graph = finiteEvalScriptSourceGraph([{ path: "main.js", source }]);
            expect(graph.error).toBeNull();
            const node = Bun.spawnSync(["node", "-e", 'const fs=require("node:fs"),vm=require("node:vm");const context=vm.createContext({print:value=>fs.writeSync(1,String(value)+"\\n")});context.$262={evalScript:source=>new vm.Script(String(source)).runInContext(context)};new vm.Script(fs.readFileSync(0,"utf8")).runInContext(context);'],
                { stdin: Buffer.from(source), stdout: "pipe", stderr: "pipe", timeout: 120_000 });
            expect({ code: node.exitCode, stderr: node.stderr.toString() }).toEqual({ code: 0, stderr: "" });
            const entry = join(directory, "main-" + typed + "-" + noGc + (typed ? ".ts" : ".js"));
            await writeFile(entry, (typed ? "// @ts-nocheck\n" : "") + source);
            const output = join(directory, "program-" + typed + "-" + noGc), diagnostics: string[] = [];
            const built = await compile({ entry, output, noGc, buildDir: output + "-build", isolatedScriptRoots: [entry], initializationEntries: [entry],
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/numeric-index-source#script", setupEntries: [], testEntry: entry, scriptEntries: [entry], async: false },
                diagnosticWriter: message => diagnostics.push(message) });
            expect({ code: built.exitCode, diagnostics: diagnostics.join("") }).toEqual({ code: 0, diagnostics: "" });
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000 });
            expect({ code: native.exitCode, stderr: native.stderr.toString() }).toEqual({ code: 0, stderr: "" });
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            expect(observation.kind).toBe("normal");
            expect(observation.stdout).toBe(node.stdout.toString());
        }
    } finally { await rm(directory, { recursive: true, force: true }); }
}, 600_000);

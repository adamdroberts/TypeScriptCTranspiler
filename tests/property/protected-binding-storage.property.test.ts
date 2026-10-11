import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

test("one retained binding plan preserves mutations across protected completion regions", async () => {
    const values = [
        { initial: "0", replacement: "31", project: "value" },
        { initial: '"before"', replacement: '"after"', project: "value" },
        { initial: "{tag:0}", replacement: "{tag:37}", project: "value.tag" },
    ];
    const owners = ["var value=initial;", "let value=initial;", ""];
    const regions = [
        'try{value=REPLACEMENT;throw 1;}catch(error){}',
        'once:{try{value=REPLACEMENT;throw 1;}finally{break once;}}',
        'try{value=REPLACEMENT;throw 1;}finally{return PROJECT;}',
        'try{try{value=REPLACEMENT;throw 1;}finally{}}catch(error){}',
        'for(var index=0;index<1;index++){try{value=REPLACEMENT;throw 1;}finally{continue;}}',
        'for(var item of [0]){try{value=REPLACEMENT;throw 1;}finally{continue;}}',
    ];
    const pieces: string[] = [];
    let index = 0;
    for (const value of values) for (const owner of owners) for (const region of regions) {
        const name = "probe" + index++;
        pieces.push(`function ${name}(${owner ? "initial" : "value"}){${owner.replace("initial", value.initial)}${region.replaceAll("REPLACEMENT", value.replacement).replaceAll("PROJECT", value.project)}return ${value.project};}print(${name}(${value.initial}));`);
    }
    let deep = 'value={tag:41};throw 1;';
    for (let depth = 0; depth < 256; depth++) deep = `try{${deep}}finally{}`;
    pieces.push(`function deep(){var value={tag:0};try{${deep}}catch(error){}return value.tag;}print(deep());`);
    const source = pieces.join("\n");
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-protected-binding-"));
    try {
        const entry = path.join(directory, "source.js");
        await fs.writeFile(entry, source);
        const oracle = Bun.spawnSync(["node", "-e", 'const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});', entry], { stdout: "pipe", stderr: "pipe" });
        expect({ exitCode: oracle.exitCode, stderr: oracle.stderr.toString() }).toEqual({ exitCode: 0, stderr: "" });
        const expected = oracle.stdout.toString().trimEnd().split("\n");
        for (const noGc of [false, true]) {
            const output = path.join(directory, "program-" + noGc), diagnostics: string[] = [];
            const result = await compile({ entry, output, noGc, buildDir: path.join(directory, "build-" + noGc),
                isolatedScriptRoots: [entry], initializationEntries: [entry],
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/protected-binding-storage.js#sloppy", setupEntries: [], testEntry: entry, async: false, scriptEntries: [entry] },
                diagnosticWriter: message => diagnostics.push(message) });
            expect({ exitCode: result.exitCode, diagnostics: diagnostics.join("") }).toEqual({ exitCode: 0, diagnostics: "" });
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000 });
            expect({ exitCode: native.exitCode, stderr: native.stderr.toString() }).toEqual({ exitCode: 0, stderr: "" });
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            expect(observation.kind).toBe("normal");
            expect(observation.stdout?.trimEnd().split("\n")).toEqual(expected);
        }
    } finally { await fs.rm(directory, { recursive: true, force: true }); }
}, 300_000);

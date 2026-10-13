import { expect, test } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compile } from "../../src/compile";
import { finiteEvalScriptSourceGraph } from "../test262/native-host";
import { parseHostObservation } from "../test262/protocol";

const declarations = [
    { source: 'var body="17;";', read: "body", value: "17;" },
    { source: 'let body="19;";', read: "body", value: "19;" },
    { source: 'const body="23;";', read: "body", value: "23;" },
    { source: 'function body(){return "29;";}', read: "body()", value: "29;" },
    { source: 'class Carrier{static body="31;";}', read: "Carrier.body", value: "31;" },
    { source: 'var {body}={body:"37;"};', read: "body", value: "37;" },
    { source: 'let [body]=["41;"];', read: "body", value: "41;" },
];
test("Script declarations share source locations across separately parsed source records", () => {
    for (const declaration of declarations) {
        const graph = finiteEvalScriptSourceGraph([
            { path: "setup.js", source: declaration.source, goal: "script" },
            { path: "main.js", source: `eval(${declaration.read});`, goal: "script" },
        ]);
        expect({ declaration, error: graph.error }).toEqual({ declaration, error: null });
        expect(graph.directEvalSources.map(entry => entry.source)).toContain(declaration.value);
    }
    const mixed = finiteEvalScriptSourceGraph([
        { path: "setup.js", source: 'const body="43;";', goal: "script" },
        { path: "private.mjs", source: 'const body="47;";eval(body);export {};', goal: "module" },
        { path: "main.js", source: "eval(body);", goal: "script" },
    ]);
    expect(mixed.error).toBeNull();
    expect(mixed.directEvalSources.map(entry => entry.source).sort()).toEqual(["43;", "47;"]);
    const erased = finiteEvalScriptSourceGraph([
        { path: "setup.js", source: 'const body="89;";', goal: "script" },
        { path: "types.ts", source: 'declare const body:string;declare namespace Types{const body:string;}', goal: "script" },
        { path: "main.js", source: "eval(body);", goal: "script" },
    ]);
    expect(erased.error).toBeNull(); expect(erased.directEvalSources.map(entry => entry.source)).toEqual(["89;"]);
    const agent = finiteEvalScriptSourceGraph([{ path: "main.js", source: 'var body="17;";$262.agent.start("eval(body);");', goal: "script" }]);
    expect(agent.error).toContain("direct eval source is not a finite static string expression");
    for (const source of ['body=opaque();eval(body);', 'globalThis.body=opaque();eval(body);']) {
        const graph = finiteEvalScriptSourceGraph([
            { path: "setup.js", source: 'var body="17;";', goal: "script" },
            { path: "main.js", source, goal: "script" },
        ]);
        expect(graph.error).toContain("direct eval source is not a finite static string expression");
    }
});

test("shared Script bindings retain global-object separation and deep source forwarding with Node", async () => {
    const root = await mkdtemp(join(tmpdir(), "tsc2c-script-binding-source-"));
    try {
        for (const typed of [false, true]) for (const noGc of [false, true]) {
            const depth = typed && !noGc ? 128 : 2;
            const sources = [
                'var objectBody="53;";let lexicalBody="59;";const constantBody="61;";function declaredBody(){return objectBody;}class Carrier{static body="67;";}',
                'globalThis.objectBody="71;";globalThis.lexicalBody="73;";var {destructuredBody}={destructuredBody:"79;"};',
                ...Array.from({ length: depth }, (_, index) => `function forward${index}(){return ${index ? `forward${index - 1}()` : '"83;"'};}`),
                `print(eval(objectBody));print(eval(globalThis.objectBody));print(eval(lexicalBody));print(eval(globalThis.lexicalBody));print(eval(constantBody));print(eval(declaredBody()));print(eval(Carrier.body));print(eval(destructuredBody));print(eval(forward${depth - 1}()));`,
            ];
            const node = Bun.spawnSync(["node", "-e", 'const fs=require("node:fs"),vm=require("node:vm"),context=vm.createContext({print:value=>fs.writeSync(1,String(value)+"\\n")});for(const source of JSON.parse(fs.readFileSync(0,"utf8")))new vm.Script(source).runInContext(context);'],
                { stdin: Buffer.from(JSON.stringify(sources)), stdout: "pipe", stderr: "pipe", timeout: 120_000 });
            expect({ code: node.exitCode, stderr: node.stderr.toString() }).toEqual({ code: 0, stderr: "" });
            expect(node.stdout.toString()).toBe("71\n71\n59\n73\n61\n71\n67\n79\n83\n");
            const directory = join(root, `${typed}-${noGc}`), entries: string[] = [];
            await mkdir(directory);
            for (const [index, source] of sources.entries()) {
                const entry = join(directory, `source-${index}` + (typed ? ".ts" : ".js")); entries.push(entry);
                await writeFile(entry, (typed ? "// @ts-nocheck\n" : "") + source);
            }
            const output = join(directory, "program"), diagnostics: string[] = [], testEntry = entries.at(-1)!;
            const result = await compile({ entry: testEntry, additionalRoots: entries.slice(0, -1), output, noGc, buildDir: join(directory, "build"), isolatedScriptRoots: entries, initializationEntries: entries,
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/script-binding-source#script", setupEntries: entries.slice(0, -1), testEntry, scriptEntries: entries, async: false },
                diagnosticWriter: message => diagnostics.push(message) });
            expect({ code: result.exitCode, diagnostics: diagnostics.join("") }).toEqual({ code: 0, diagnostics: "" });
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000 });
            expect({ code: native.exitCode, stderr: native.stderr.toString() }).toEqual({ code: 0, stderr: "" });
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            expect(observation.kind).toBe("normal"); expect(observation.stdout).toBe(node.stdout.toString());
        }
    } finally { await rm(root, { recursive: true, force: true }); }
}, 600_000);

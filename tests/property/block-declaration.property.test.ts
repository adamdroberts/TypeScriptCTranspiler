import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const source = String.raw`
function collect() { if (NATIVE_GC) $262.gc(); }
var functions = [], readers = [], metadata = [];
for (const iteration of [3, 5, 7]) {
    {
        var original = declared;
        try { declared(); } catch (error) { print("early:" + (error instanceof ReferenceError)); }
        function declared() { return value; }
        let value = iteration;
        Object.defineProperty(declared, "tag", { value: iteration });
        functions.push(declared);
        readers.push(function() { return declared; });
        print("same-entry:" + (original === declared) + ":" + declared() + ":" + declared.tag);
        collect();
    }
}
for (var index = 0; index < functions.length; index++) {
    print("escaped:" + functions[index]() + ":" + (readers[index]() === functions[index]) +
        ":" + (index === 0 || functions[index] !== functions[index - 1]) +
        ":" + functions[index].name + ":" + functions[index].length);
}
var captured;
{
    function recursive(depth) { return depth ? recursive(depth - 1) : "original"; }
    captured = recursive;
    recursive = function() { return "replacement"; };
    print("rebound:" + captured(1));
}
{
    function first() { return second; }
    function second() { return first; }
    print("cross-reference:" + (first() === second) + ":" + (second() === first));
}
print("annex:" + typeof declared);
function beforeDeclaration() {
    { return later(); function later() { return "hoisted"; } }
}
print("after-return:" + beforeDeclaration());
var previous;
for (const iteration of [11, 13]) {
    {
        function Constructor(value = iteration) { this.value = value; }
        var object = new Constructor();
        print("construct:" + object.value + ":" + (object instanceof Constructor) +
            ":" + (previous === undefined || previous !== Constructor.prototype));
        previous = Constructor.prototype;
    }
}
var retained = [], depth = 4096;
for (var step = 0; step < depth; step++) {
    {
        let value = step;
        function entry() { return value; }
        retained.push(entry);
    }
    if (step % 257 === 0) collect();
}
var valid = retained.length === depth;
for (var index = 0; index < retained.length; index++) valid = valid && retained[index]() === index;
collect();
print("stress:" + valid);
`;

test("block declaration lists create fresh function identities over shared lexical cells", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-block-declaration-"));
    try {
        for (const strict of [false, true]) {
            const program = (strict ? '"use strict";\n' : "") + source;
            const expected: string[] = [];
            new Function("print", program.replaceAll("NATIVE_GC", "false"))((value: unknown) => expected.push(String(value)));
            for (const noGc of [false, true]) {
                const name = `${strict ? "strict" : "sloppy"}-${noGc ? "no-gc" : "gc"}`;
                const entry = path.join(temporary, name + ".js"), output = path.join(temporary, name);
                await fs.writeFile(entry, program.replaceAll("NATIVE_GC", String(!noGc)));
                const diagnostics: string[] = [];
                const result = await compile({ entry, output, initializationEntries: [entry], noGc,
                    buildDir: path.join(temporary, name + "-build"),
                    test262Observation: { kind: "test262-native-observation", scenarioId: `property/block-declaration.js#${strict ? "strict" : "sloppy"}`,
                        setupEntries: [], testEntry: entry, async: false }, diagnosticWriter: message => diagnostics.push(message) });
                expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
                const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000,
                    env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
                expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
                const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
                expect(observation.kind).toBe("normal");
                expect((observation.stdout ?? "").trimEnd().split("\n")).toEqual(expected);
            }
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 240_000);

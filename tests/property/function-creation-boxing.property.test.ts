import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const factories = ["function(value) { calls += value; collect(); return calls; }", "(value) => { calls += value; collect(); return calls; }"];
const keys = ['"field"', 'Symbol("field")', "Symbol.iterator"];
const plans = factories.flatMap((factory, kind) => keys.map((key, storage) => `(function() {
    var owner = {}, key = ${key}, calls = 0;
    var assigned = owner[key] = (${factory});
    print("creation:${kind}:${storage}:" + typeof assigned + ":" + (assigned === owner[key]) + ":" +
        (assigned !== null && assigned !== undefined) + ":" + owner[key](3) + ":" + assigned(4));
})();`)).join("\n");
const source = `function collect() { if (NATIVE_GC) $262.gc(); }
${plans}
var head = null;
for (var index = 0; index < 2048; index++) {
    const previous = head, position = index;
    var owner = {};
    owner[Symbol.iterator] = function() { return { previous: previous, position: position }; };
    head = owner;
}
collect();
var cursor = head, expected = 2047, valid = true;
while (cursor !== null) {
    var entry = cursor[Symbol.iterator]();
    valid = valid && entry.position === expected;
    expected--; cursor = entry.previous;
}
print("retained-environments:" + valid + ":" + expected);
`;

test("fresh functions box without contextual property resolution and retain their captured values", async () => {
    const expected: string[] = [];
    new Function("print", source.replaceAll("NATIVE_GC", "false"))((value: unknown) => expected.push(String(value)));
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-function-creation-"));
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", entry = path.join(temporary, name + ".js"), output = path.join(temporary, name);
            await fs.writeFile(entry, source.replaceAll("NATIVE_GC", String(!noGc)));
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, noGc, initializationEntries: [entry], buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/function-creation.js#sloppy", setupEntries: [], testEntry: entry, async: false },
                diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000, env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString())); expect(observation.kind).toBe("normal");
            expect((observation.stdout ?? "").trimEnd().split("\n")).toEqual(expected);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 240_000);

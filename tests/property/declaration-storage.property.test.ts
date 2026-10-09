import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

// The source declaration, its captured reader, and every subsequent write
// observe the same binding. The host supplies an independent semantic oracle;
// checker inference is deliberately narrower than the runtime write domain.
const initializers = {
    concatenate: '"prefix:" + input.label',
    arithmetic: "input.number * 3",
    boolean: "input.number > 0",
    object: "{ label: input.label }",
    array: "[input.label]",
    bigint: "3n",
    symbol: 'Symbol("initial")',
    callable: "function(...args) { return args.length; }",
    empty: "undefined",
};
const plans = Object.entries(initializers).flatMap(([label, initializer]) =>
    ["var", "let", "const"].map(kind => `(function(input) {
        ${kind} binding = ${initializer};
        var initial = binding;
        var read = function() { return function() { return binding; }; };
        var reader = read();
        collect();
        print("${label}:${kind}:initial:" + Object.is(reader(), initial) + ":" + typeof reader());
        ${kind === "const" ? "" : `for (const value of writes) {
            binding = value;
            collect();
            print("${label}:${kind}:write:" + Object.is(reader(), value) + ":" + typeof reader());
        }`}
    })({ label: "label", number: 7 });`),
).join("\n");

const source = String.raw`
function collect() { if (NATIVE_GC) $262.gc(); }
var writes = [undefined, null, NaN, false, "changed", 11n, Symbol("write"), {}, [], function() {}];
PLANS
function shadow(input) {
    var binding = "outer:" + input.label;
    var outer = function() { return binding; };
    {
        let binding = input.number * 3;
        var inner = function() { return binding; };
        collect();
        print("shadow:" + outer() + ":" + inner());
    }
}
shadow({ label: "label", number: 7 });
function retain(previous, input) {
    var binding = "captured:" + input.label;
    const original = binding;
    var read = function() { return binding; };
    var write = function(value) { binding = value; };
    return { previous: previous, read: read, write: write, original: original };
}
var head = null, depth = 8192;
for (var index = 0; index < depth; index++) {
    head = retain(head, { label: String(index) });
    head.write(writes[index % writes.length]);
}
collect();
var current = head, valid = true, visited = 0;
while (current !== null) {
    var expected = writes[(depth - visited - 1) % writes.length];
    valid = valid && Object.is(current.read(), expected);
    current = current.previous;
    visited++;
}
print("stress:" + visited + ":" + valid);
`.replace("PLANS", plans);

test("JavaScript declarations and escaped captures share one physical value storage contract", async () => {
    const expected: string[] = [];
    new Function("print", source.replaceAll("NATIVE_GC", "false"))(
        (value: unknown) => expected.push(String(value)),
    );
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-declaration-storage-"));
    try {
        for (const noGc of [false, true]) {
            const entry = path.join(temporary, noGc ? "subject-no-gc.js" : "subject.js");
            await fs.writeFile(entry, source.replaceAll("NATIVE_GC", String(!noGc)));
            const output = path.join(temporary, noGc ? "no-gc" : "gc");
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, initializationEntries: [entry], noGc,
                buildDir: path.join(temporary, noGc ? "build-no-gc" : "build-gc"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/declaration-storage.js#sloppy",
                    setupEntries: [], testEntry: entry, async: false }, diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe",
                env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            expect(observation.kind).toBe("normal");
            expect((observation.stdout ?? "").trimEnd().split("\n")).toEqual(expected);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 120_000);

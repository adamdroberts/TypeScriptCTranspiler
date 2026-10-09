import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { functionConstructorSourceIsValid } from "../../src/function-constructor-source";
import { parseHostObservation } from "../test262/protocol";

const syntaxPartitions = [
    { parameters: "", body: "return this;", valid: true },
    { parameters: "a,a", body: "return a;", valid: true },
    { parameters: "a,a", body: '"use strict"; return a;', valid: false },
    { parameters: "a=1,a", body: "return a;", valid: false },
    { parameters: "a=1,...rest", body: "return rest.length + a;", valid: true },
    { parameters: "{x}, [y]", body: "return x + y;", valid: true },
    { parameters: "a=1", body: '"use strict"; return a;', valid: false },
    { parameters: "a", body: "let a;", valid: false },
    { parameters: "/*", body: "*/ ) {", valid: false },
    { parameters: "a) { return 1; } //", body: "return 2;", valid: false },
    { parameters: "a", body: "return )", valid: false },
    { parameters: "a: number", body: "return a;", valid: false },
    { parameters: "a", body: "return super.field;", valid: false },
    { parameters: "", body: "yield 1;", valid: false },
    { parameters: "", body: "return function* (a,a) {};", valid: true },
    { parameters: "", body: "return async function(a,a) {};", valid: true },
    { parameters: "", body: "return function* (a=1,a) {};", valid: false },
    { parameters: "", body: "return async function(a=1,a) {};", valid: false },
    { parameters: "await", body: "return await;", valid: true },
];

test("Function source intake independently parses formal/body grammar and shared early errors", () => {
    for (const partition of syntaxPartitions) {
        expect(functionConstructorSourceIsValid(partition)).toBe(partition.valid);
        let valid = true;
        try { new Function(partition.parameters, partition.body); } catch { valid = false; }
        expect(valid).toBe(partition.valid);
    }
});

const generatedPartitions = [0x13579bdf, 0x2468ace0, 0x98765432].map((seed) => {
    const base = seed % 97, scale = 1 + (seed % 13);
    const parameters = `left, {right = ${base}} = {}, ...tail`;
    const body = `let value = left * ${scale} + right; for (const item of tail) value += item; return function(extra) { return value + extra; };`;
    const expected = 7 * scale + base + 11 + 17 + 19;
    return `check(Function(${JSON.stringify(parameters)}, ${JSON.stringify(body)})(7, {}, 11, 17)(19) === ${expected}, "generated-${seed}");`;
}).join("\n");

const source = String.raw`
function collect() { if (NATIVE_GC) $262.gc(); }
function check(value, label) { if (!value) throw label; print(label + ":true"); }
const builtin = Function;
const ordinary = Function("return this;"), strict = Function('"use strict"; return this;');
const receiver = { marker: 23 };
check(ordinary() === globalThis && ordinary.call(receiver) === receiver && strict.call(null) === null,
    "actual-this-binding");
check(ordinary.call(29).valueOf() === 29, "sloppy-primitive-boxing");
check(Function('return "\ud800";')() === "\ud800" &&
    Function('return "\ud83d\ude00";')() === "\ud83d\ude00", "source-code-unit-fidelity");
check((function() { const secret = 31; return Function("return typeof secret;")(); })() === "undefined",
    "global-environment");
globalThis.generatedGlobal = 37;
const globalReader = Function("return generatedGlobal;");
globalThis.generatedGlobal = 41; collect();
check(globalReader() === 41, "live-global-binding");
const foreignGlobal = $262.createRealm().global, foreign = foreignGlobal.Function;
foreignGlobal.generatedGlobal = 113;
const foreignReader = foreign("return generatedGlobal;");
check(foreign("return this;")() === foreignGlobal && foreignReader() === 113 &&
    Object.getPrototypeOf(foreignReader) === foreign.prototype, "constructor-realm");
const simple = Function("left", "right", "return [arguments.length, left + right, arguments[2]];");
check(simple(43, 47, 53).join(",") === "3,90,53", "actual-arguments");
const retained = Function("left = 59", "...tail", "let total = left; for (const value of tail) total += value; return function(extra) { return total + extra; };");
check(retained(undefined, 61, 67)(71) === 258 && retained.length === 0, "defaults-rest-retention");
const hoisted = Function("value", "return read(); function read() { return value; }");
check(hoisted(73) === 73, "body-instantiation");
const nested = Function('return Function("value", "return value * 2;");');
check(nested()(79) === 158, "transitive-source-closure");
const first = Function("value", "return value;"), second = Function("value", "return value;");
first.marker = 83; collect();
check(first !== second && first.prototype !== second.prototype && second.marker === undefined &&
    first.name === "anonymous" && first.length === 1, "fresh-function-identity");
let trace = "";
function parameter() { trace += "A"; return { toString() { trace += "P"; collect(); return "value"; } }; }
function body() { trace += "B"; return { toString() { trace += "Q"; collect(); return "return value + 89;"; } }; }
const converted = builtin(parameter(), body());
check(trace === "ABPQ" && converted(97) === 186, "evaluation-before-conversion");
trace = ""; const marker = {};
try { builtin({ toString() { trace += "P"; throw marker; } }, { toString() { trace += "Q"; return ""; } }); }
catch (error) { check(error === marker && trace === "P", "abrupt-conversion"); }
try { builtin(Symbol("source")); } catch (error) { check(error instanceof TypeError, "symbol-source"); }
Function = function(text) { return [this === globalThis, text]; };
const replaced = Function("return 101;");
check(replaced[0] && replaced[1] === "return 101;", "mutable-constructor-binding"); Function = builtin;
trace = "";
function replaceDuringArguments() { trace += "A"; Function = function() { throw "wrong callee"; }; return "return 103;"; }
const selected = Function(replaceDuringArguments()); Function = builtin;
check(trace === "A" && selected() === 103, "callee-before-arguments");
function Other() {}
const customPrototype = {}, newTarget = new Proxy(Other, { get(target, key) {
    if (key === "prototype") { trace += "R"; collect(); return customPrototype; }
    return Reflect.get(target, key);
} });
trace = "";
const constructor = Reflect.construct(builtin, [parameter(), body()], newTarget);
check(trace === "ABPQR" && Object.getPrototypeOf(constructor) === customPrototype && constructor(107) === 196,
    "new-target-prototype-order");
const initialize = new Function("value", "this.value = value;");
const instance = new initialize(109);
check(instance.value === 109 && Object.getPrototypeOf(instance) === initialize.prototype,
    "ordinary-construction");
for (const invalid of [
    ["a,a", '"use strict"; return a;'], ["a=1", '"use strict"; return a;'],
    ["a", "let a;"], ["/*", "*/ ) {"], ["a", "return )"]
]) {
    try { builtin(...invalid); throw "accepted invalid source"; }
    catch (error) { check(error instanceof SyntaxError, "invalid-source"); }
}
const make = Function("value", "previous", "return { previous: previous, read: function() { return value; } };");
let graph = null;
for (let index = 0; index < 4096; index++) { graph = make(index, graph); if (index % 37 === 0) collect(); }
let expectedIndex = 4095, sum = 0;
while (graph !== null) { if (graph.read() !== expectedIndex) throw "retained source cell"; sum += graph.read(); expectedIndex--; graph = graph.previous; if (expectedIndex % 41 === 0) collect(); }
check(expectedIndex === -1 && sum === 4095 * 4096 / 2, "deep-fresh-function-graph");
` + generatedPartitions;

const manifest = { functions: [
    { parameters: ["value"], body: "return value + 89;" },
    "return 103;", ...syntaxPartitions.filter(partition => !partition.valid),
] };

test("finite Function sources share ordinary formal, closure, activation and Realm lowering", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-function-source-"));
    const expected: string[] = [];
    // Use a standalone Script scope: replacing Function mutates that Realm's
    // global binding, exactly as the native Script does.
    const vm = await import("node:vm");
    const context = vm.createContext({ print: (value: unknown) => expected.push(String(value)), $262: {
        gc() {}, createRealm() { return { global: new vm.Script("this").runInContext(vm.createContext({})) }; },
    } });
    new vm.Script(source.replaceAll("NATIVE_GC", "false")).runInContext(context);
    try {
        const manifestPath = path.join(temporary, "manifest.json");
        await fs.writeFile(manifestPath, JSON.stringify(manifest));
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", entry = path.join(temporary, name + ".js"), output = path.join(temporary, name);
            await fs.writeFile(entry, source.replaceAll("NATIVE_GC", String(!noGc)));
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, noGc, runtimeCodeManifest: manifestPath,
                initializationEntries: [entry], buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/function-source.js#sloppy", setupEntries: [], testEntry: entry, async: false },
                diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000,
                env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            expect(observation).toMatchObject({ kind: "normal" });
            expect((observation.stdout ?? "").trimEnd().split("\n")).toEqual(expected);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 240_000);

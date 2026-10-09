import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

// The semantic plan varies state, positions, representation, captures and call
// modes independently. The reference is the host engine's ordinary API.
function plans() {
    return ["", "g", "y", "gy", "d", "dgu", "dyu", "dgv"].flatMap(flags =>
        ["", ".", "(a)?(b)", "(?<left>a)?(?<right>b)", "^a"].flatMap(pattern =>
            ["", "aba", "A😀B", "A\\ud83d\\ude00B".replace(/\\u([0-9a-f]{4})/g, (_, digits) => String.fromCharCode(parseInt(digits, 16)))].flatMap(source =>
                ["zero", "middle", "fraction", "negative", "nan", "infinity", "string", "object"].flatMap(initial =>
                    ["exec", "test"].map(method => ({ flags, pattern, source, initial, method }))))));
}
const script = String.raw`
function encode(value) {
    if (value === undefined) return "U";
    if (value === null) return "N";
    if (typeof value === "number") return Object.is(value, -0) ? "-0" : String(value);
    if (typeof value === "string") {
        var units = [];
        for (var index = 0; index < value.length; index++) units.push(value.charCodeAt(index));
        return units.join(",");
    }
    if (Array.isArray(value)) return "[" + value.map(encode).join("|") + "]";
    return Object.keys(value).map(function(key) { return key + ":" + encode(value[key]); }).join(";");
}
function initial(kind, log) {
    switch (kind) {
        case "zero": return -0;
        case "middle": return 1;
        case "fraction": return 1.9;
        case "negative": return -1;
        case "nan": return NaN;
        case "infinity": return Infinity;
        case "string": return "2";
        case "object": return { valueOf: function() { log.push("index"); return 1; } };
    }
}
function describe(hit) {
    if (hit === null || typeof hit === "boolean") return encode(hit);
    var groups = hit.groups;
    var indices = hit.indices;
    return encode(hit) + ":" + hit.index + ":" + encode(hit.input) + ":" + encode(groups) + ":" + encode(indices) +
        ":" + encode(indices === undefined ? undefined : indices.groups) +
        ":" + (groups === undefined || Object.getPrototypeOf(groups) === null) +
        ":" + (indices === undefined || indices.groups === undefined || Object.getPrototypeOf(indices.groups) === null) +
        ":" + (indices === undefined || indices.groups === undefined || indices.groups.left === indices[1]);
}
var plans = JSON.parse(PLAN_JSON);
for (var plan of plans) {
    var log = [];
    var re = Reflect.get({ re: new RegExp(plan.pattern, plan.flags) }, "re");
    re.lastIndex = initial(plan.initial, log);
    var hits = [];
    for (var step = 0; step < 3; step++) hits.push(describe(re[plan.method](plan.source)) + "/" + encode(re.lastIndex));
    print(hits.join(";") + ":" + log.join(","));
}
var base = Object.getPrototypeOf(/a/);
for (var method of ["exec", "test"]) {
    var descriptor = Object.getOwnPropertyDescriptor(base, method);
    print(method + ":" + base[method].name + ":" + base[method].length + ":" + descriptor.writable + ":" + descriptor.enumerable + ":" + descriptor.configurable);
}
var re = /(?<part>a)(b)?/dg;
var own = Object.getOwnPropertyDescriptor(re, "lastIndex");
print("own:" + own.value + ":" + own.writable + ":" + own.enumerable + ":" + own.configurable + ":" + Object.getOwnPropertyNames(re).join(","));
var hit = re.exec("a");
print("keys:" + Object.keys(hit).join(",") + ":" + Object.keys(hit.indices).join(",") + ":" + (hit.indices.groups.part === hit.indices[1]));
for (var key of ["index", "input", "groups", "indices"]) {
    var descriptor = Object.getOwnPropertyDescriptor(hit, key);
    print(key + ":" + descriptor.writable + ":" + descriptor.enumerable + ":" + descriptor.configurable);
}
var order = [];
var generic = { get exec() { order.push("get"); return function(text) { order.push("call:" + text + ":" + (this === generic)); return {}; }; } };
var text = { toString: function() { order.push("string"); return "ab"; } };
print("generic:" + base.test.call(generic, text) + ":" + order.join(","));
for (var returned of [null, {}, [], undefined, 0, "match"]) {
    var receiver = { exec: function() { return returned; } };
    try { print("custom:" + base.test.call(receiver, "a")); } catch (error) { print("custom:" + error.name); }
}
for (var receiver of [null, undefined, 1, "a", {}, base]) {
    var conversions = [];
    var input = { toString: function() { conversions.push("string"); return "a"; } };
    try { base.exec.call(receiver, input); print("brand:normal"); } catch (error) { print("brand:" + error.name + ":" + conversions.join(",")); }
}
for (var flags of ["", "g", "y"]) {
    for (var source of ["a", "b"]) {
        var frozen = new RegExp("a", flags);
        Object.defineProperty(frozen, "lastIndex", { writable: false });
        try { print("fixed:" + flags + ":" + describe(frozen.exec(source))); } catch (error) { print("fixed:" + flags + ":" + error.name); }
    }
}
var fallback = /a/;
fallback.exec = 0;
print("fallback:" + base.test.call(fallback, "a"));
var original = base.test;
Object.defineProperty(base, "test", { get: function() { order.push("method"); return original; }, configurable: true });
order = [];
function argument() { order.push("argument"); return "a"; }
print("lookup:" + /a/.test(argument()) + ":" + order.join(","));
Object.defineProperty(base, "test", { value: original, writable: true, enumerable: false, configurable: true });
`;

test("RegExp ordinary methods preserve state, metadata, mutable lookup and abrupt order", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-regexp-object-"));
    const source = script.replace("PLAN_JSON", JSON.stringify(JSON.stringify(plans())));
    const expected: string[] = [];
    new Function("print", source)((value: unknown) => expected.push(String(value)));
    try {
        const entry = path.join(temporary, "subject.js"); await fs.writeFile(entry, source);
        for (const noGc of [false, true]) {
            const executable = path.join(temporary, noGc ? "no-gc" : "gc");
            const diagnostics: string[] = [];
            const result = await compile({ entry, output: executable, initializationEntries: [entry], noGc,
                buildDir: path.join(temporary, noGc ? "build-no-gc" : "build-gc"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/regexp-object-model.js#sloppy",
                    setupEntries: [], testEntry: entry, async: false },
                diagnosticWriter: message => diagnostics.push(message),
            });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([executable], { stdout: "pipe", stderr: "pipe" });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            expect(observation.kind).toBe("normal");
            const actual = (observation.stdout ?? "").trimEnd().split("\n");
            expect(actual.length).toBe(expected.length);
            expect(expected.flatMap((value, index) => actual[index] === value ? [] : [{ index, expected: value, actual: actual[index] }]).slice(0, 12)).toEqual([]);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 180_000);

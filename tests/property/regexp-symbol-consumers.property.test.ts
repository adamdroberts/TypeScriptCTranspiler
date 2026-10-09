import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

function plans() {
    return ["", "g", "gy", "gu", "gv", "y", "d"].flatMap(flags =>
        ["", ".", "(?<part>a)|(?<part>b)", "(a)?b"].flatMap(pattern =>
            ["", "aba", "A😀B"].flatMap(source =>
                ["zero", "negativeZero", "middle", "nan", "object"].flatMap(initial =>
                    ["match", "search"].map(method => ({ flags, pattern, source, initial, method }))))));
}
const script = String.raw`
function encode(value) {
    if (value === undefined) return "U";
    if (value === null) return "N";
    if (typeof value === "number") return Object.is(value, -0) ? "-0" : String(value);
    if (typeof value === "function") return "F";
    if (typeof value === "string") {
        var units = [];
        for (var index = 0; index < value.length; index++) units.push(value.charCodeAt(index));
        return units.join(",");
    }
    if (Array.isArray(value)) return "[" + value.map(encode).join("|") + "]";
    if (typeof value === "object") return Object.keys(value).map(function(key) { return key + ":" + encode(value[key]); }).join(";");
    return String(value);
}
function describe(hit) {
    return encode(hit) + (Array.isArray(hit) ? "/" + encode(hit.index) + "/" + encode(hit.groups) + "/" + encode(hit.indices) : "");
}
var base = Object.getPrototypeOf(/a/);
var stringBase = Object.getPrototypeOf("");
var plans = JSON.parse(PLAN_JSON);
for (var plan of plans) {
    var re = new RegExp(plan.pattern, plan.flags);
    var log = [];
    var initial = plan.initial === "zero" ? 0 : plan.initial === "negativeZero" ? -0 :
        plan.initial === "middle" ? 1 : plan.initial === "nan" ? NaN : { valueOf: function() { log.push("number"); return 1; } };
    re.lastIndex = initial;
    var text = Reflect.get({ text: plan.source }, "text");
    var result = text[plan.method](re);
    print(describe(result) + ":" + encode(re.lastIndex) + ":" + Object.is(re.lastIndex, initial) + ":" + log.join(","));
}
for (var method of ["match", "search"]) {
    var key = method === "match" ? Symbol.match : Symbol.search;
    var descriptor = Object.getOwnPropertyDescriptor(base, key);
    var stringDescriptor = Object.getOwnPropertyDescriptor(stringBase, method);
    print("descriptor:" + base[key].name + ":" + base[key].length + ":" + descriptor.writable + ":" + descriptor.enumerable + ":" + descriptor.configurable +
        ":" + stringBase[method].length + ":" + stringDescriptor.writable + ":" + stringDescriptor.enumerable + ":" + stringDescriptor.configurable);
    var log = [];
    var receiver = { toString: function() { log.push("string"); return "a"; } };
    var marker = {};
    var carrier = {};
    Object.defineProperty(carrier, key, { get: function() { log.push("get"); return function(value) {
        log.push("call:" + (this === carrier) + ":" + (value === receiver)); return marker;
    }; } });
    print("protocol:" + (stringBase[method].call(receiver, carrier) === marker) + ":" + log.join(","));
    for (var methodValue of [undefined, null, 0]) {
        var log = [];
        var carrier = { toString: function() { log.push("pattern"); return "a"; } };
        carrier[key] = methodValue;
        var receiver = { toString: function() { log.push("string"); return "a"; } };
        try { print("fallback:" + describe(stringBase[method].call(receiver, carrier)) + ":" + log.join(",")); }
        catch (error) { print("fallback:" + error.name + ":" + log.join(",")); }
    }
    for (var receiver of [null, undefined]) {
        var log = [];
        var carrier = {};
        Object.defineProperty(carrier, key, { get: function() { log.push("get"); return function() {}; } });
        try { stringBase[method].call(receiver, carrier); } catch (error) { print("nullish:" + error.name + ":" + log.join(",")); }
    }
    for (var receiver of [null, undefined, 1, "a"]) {
        var log = [];
        try { base[key].call(receiver, { toString: function() { log.push("string"); return "a"; } }); }
        catch (error) { print("brand:" + error.name + ":" + log.join(",")); }
    }
    print("missing:" + describe(stringBase[method].call("a")));
}
for (var flags of ["g", "gu", "gv"]) {
    var log = [];
    var current = 7;
    var generic = {
        get flags() { log.push("flags"); return flags; },
        get global() { log.push("global"); throw {}; },
        get lastIndex() { log.push("get:" + current); return current; },
        set lastIndex(value) { current = value; log.push("set:" + value); },
        exec: function(text) {
            log.push("exec:" + current + ":" + text);
            return current > text.length ? null : { get 0() { log.push("capture"); return ""; } };
        }
    };
    print("empty:" + encode(base[Symbol.match].call(generic, "😀")) + ":" + log.join(","));
}
for (var initial of [0, -0, NaN, "old", {}]) {
    var log = [];
    var current = initial;
    var marker = {};
    var generic = {
        get lastIndex() { log.push("get"); return current; },
        set lastIndex(value) { current = value; log.push("set:" + encode(value)); },
        get exec() { log.push("exec-get"); return function() { log.push("exec"); current = 4;
            return { get index() { log.push("index:" + Object.is(current, initial)); return marker; } };
        }; }
    };
    print("restore:" + (base[Symbol.search].call(generic, "a") === marker) + ":" + Object.is(current, initial) + ":" + log.join(","));
}
for (var flags of ["", "g"]) {
    for (var returned of [null, {}, undefined, 1]) {
        var calls = 0;
        var generic = { flags: flags, lastIndex: 2, exec: function() { return calls++ ? null : returned; } };
        try { print("custom:" + describe(base[Symbol.match].call(generic, "a"))); } catch (error) { print("custom:" + error.name); }
    }
}
for (var method of ["match", "search"]) {
    var key = method === "match" ? Symbol.match : Symbol.search;
    var frozen = /a/g;
    Object.defineProperty(frozen, "lastIndex", { writable: false });
    try { print("frozen:" + describe(base[key].call(frozen, "a"))); } catch (error) { print("frozen:" + error.name); }
    var original = stringBase[method];
    function argument() { stringBase[method] = function() { return "changed"; }; return /a/; }
    print("lookup:" + describe("a"[method](argument())));
    stringBase[method] = original;
}
`;

test("RegExp match/search protocols share mutable lookup, RegExpExec and ordered state", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-regexp-symbols-"));
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
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/regexp-symbol-consumers.js#sloppy",
                    setupEntries: [], testEntry: entry, async: false }, diagnosticWriter: message => diagnostics.push(message) });
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

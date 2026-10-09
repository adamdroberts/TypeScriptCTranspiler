import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const plans = ["native", "custom", "plain"].flatMap(kind =>
    ["absent", "true", "false"].flatMap(match =>
        ["intrinsic", "other"].flatMap(constructor =>
            ["absent", "override"].flatMap(flags =>
                ["call", "construct"].map(operation => ({ kind, match, constructor, flags, operation }))))));
const script = String.raw`
var plans = JSON.parse(PLAN_JSON);
for (var plan of plans) {
    var log = [];
    var source = { toString: function() { log.push("source-string"); return "a"; } };
    var flags = { toString: function() { log.push("flags-string"); return "gy"; } };
    var pattern = plan.kind === "native" ? /a/gi : {};
    Object.defineProperty(pattern, "source", { get: function() { log.push("source"); return source; } });
    Object.defineProperty(pattern, "flags", { get: function() { log.push("flags"); return flags; } });
    Object.defineProperty(pattern, "constructor", { get: function() { log.push("constructor"); return plan.constructor === "intrinsic" ? RegExp : {}; } });
    Object.defineProperty(pattern, "toString", { value: function() { log.push("pattern-string"); return "b"; } });
    if (plan.match !== "absent" || plan.kind !== "native") {
        Object.defineProperty(pattern, Symbol.match, { get: function() { log.push("match"); return plan.match === "absent" ? undefined : plan.match === "true"; } });
    }
    var suppliedFlags = plan.flags === "absent" ? undefined : { toString: function() { log.push("override-string"); return "m"; } };
    var result = plan.operation === "call" ? RegExp(pattern, suppliedFlags) : new RegExp(pattern, suppliedFlags);
    print("plan:" + (result === pattern) + ":" + (Object.getPrototypeOf(result) === RegExp.prototype) + ":" +
        (result === pattern ? "same" : result.flags + ":" + result.test("ab")) + ":" + log.join(","));
}
var globalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "RegExp");
print("global:" + (RegExp === globalThis.RegExp) + ":" + globalDescriptor.writable + ":" + globalDescriptor.enumerable + ":" + globalDescriptor.configurable);
for (var key of ["name", "length", "prototype", "escape"]) {
    var descriptor = Object.getOwnPropertyDescriptor(RegExp, key);
    print("descriptor:" + key + ":" + descriptor.writable + ":" + descriptor.enumerable + ":" + descriptor.configurable);
}
print("metadata:" + RegExp.name + ":" + RegExp.length + ":" + (RegExp.prototype.constructor === RegExp) + ":" + (Object.getPrototypeOf(RegExp) === Function.prototype));
var species = Object.getOwnPropertyDescriptor(RegExp, Symbol.species);
var marker = {};
print("species:" + species.get.name + ":" + species.get.length + ":" + species.enumerable + ":" + species.configurable + ":" + (species.get.call(marker) === marker));
for (var prototype of [{ marker: "object" }, [], function() {}, null, undefined, 0]) {
    var log = [];
    var target = new Proxy(function() {}, { get: function(object, key) {
        if (key === "prototype") { log.push("prototype"); return prototype; }
        return Reflect.get(object, key);
    } });
    var pattern = {};
    Object.defineProperty(pattern, Symbol.match, { get: function() { log.push("match"); return true; } });
    Object.defineProperty(pattern, "source", { get: function() { log.push("source"); return { toString: function() { log.push("source-string"); return "a"; } }; } });
    Object.defineProperty(pattern, "flags", { get: function() { log.push("flags"); return { toString: function() { log.push("flags-string"); return "g"; } }; } });
    var result = Reflect.construct(RegExp, [pattern], target);
    var expected = prototype !== null && (typeof prototype === "object" || typeof prototype === "function") ? prototype : RegExp.prototype;
    var last = Object.getOwnPropertyDescriptor(result, "lastIndex");
    print("allocate:" + (Object.getPrototypeOf(result) === expected) + ":" + RegExp.prototype.test.call(result, "a") + ":" +
        last.value + ":" + last.writable + ":" + last.enumerable + ":" + last.configurable + ":" + log.join(","));
}
for (var stage of ["match", "constructor", "source", "flags", "prototype", "source-string", "flags-string"]) {
    var marker = {};
    var log = [];
    function visit(name) { log.push(name); if (stage === name) throw marker; }
    var pattern = {};
    Object.defineProperty(pattern, Symbol.match, { get: function() { visit("match"); return true; } });
    Object.defineProperty(pattern, "constructor", { get: function() { visit("constructor"); return {}; } });
    Object.defineProperty(pattern, "source", { get: function() { visit("source"); return { toString: function() { visit("source-string"); return "a"; } }; } });
    Object.defineProperty(pattern, "flags", { get: function() { visit("flags"); return { toString: function() { visit("flags-string"); return "g"; } }; } });
    var target = new Proxy(function() {}, { get: function(object, key) { if (key === "prototype") visit("prototype"); return Reflect.get(object, key); } });
    try { if (stage === "prototype") Reflect.construct(RegExp, [pattern], target); else RegExp(pattern); }
    catch (error) { print("abrupt:" + (error === marker) + ":" + log.join(",")); }
}
var native = /a/g;
native.lastIndex = 5;
var clone = new RegExp(native);
print("clone:" + (clone !== native) + ":" + clone.lastIndex + ":" + native.lastIndex + ":" + clone.flags);
print("empty:" + RegExp().test("x") + ":" + RegExp(undefined, "g").flags);
var alias = RegExp;
print("alias:" + (alias(native) === native) + ":" + new alias("a").test("a"));
print("spread:" + new RegExp(...["a", "g", "ignored"]).flags);
var escaped = RegExp.escape;
function argument() { RegExp.escape = function() { return "changed"; }; return "abc"; }
print("lookup:" + RegExp.escape(argument()));
RegExp.escape = escaped;
for (var value of [undefined, null, 1, {}, new String("a")]) {
    try { RegExp.escape(value); } catch (error) { print("escape-brand:" + error.name); }
}
for (var flags of ["gg", "uv", "z"]) {
    try { new RegExp("a", flags); } catch (error) { print("syntax:" + error.name); }
}
`;

const realmScript = String.raw`
var remote = $262.createRealm().global;
var foreign = new remote.RegExp("a", "g");
print("realm-intrinsic:" + (remote.RegExp !== RegExp) + ":" + (remote.RegExp.prototype !== RegExp.prototype) + ":" +
    (Object.getPrototypeOf(remote.RegExp) === remote.Function.prototype) + ":" + (remote.RegExp.prototype.constructor === remote.RegExp));
print("realm-call:" + (remote.RegExp(foreign) === foreign) + ":" + (RegExp(foreign) !== foreign) + ":" +
    (Object.getPrototypeOf(RegExp(foreign)) === RegExp.prototype) + ":" + (Object.getPrototypeOf(remote.RegExp(/a/)) === remote.RegExp.prototype));
var bound = remote.RegExp.bind(undefined);
var target = new Proxy(bound, { get: function(object, key) { return key === "prototype" ? 0 : Reflect.get(object, key); } });
var allocated = Reflect.construct(RegExp, ["a"], target);
print("realm-fallback:" + (Object.getPrototypeOf(allocated) === remote.RegExp.prototype) + ":" + RegExp.prototype.test.call(allocated, "a"));
try { remote.RegExp("a", "gg"); } catch (error) { print("realm-error:" + (error.constructor === remote.SyntaxError)); }
`;

test("RegExp uses ordinary constructor identity, argument Lists and ordered allocation", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-regexp-constructor-"));
    const oracleSource = script.replace("PLAN_JSON", JSON.stringify(JSON.stringify(plans)));
    const source = oracleSource + realmScript;
    const expected: string[] = [];
    new Function("print", oracleSource)((value: unknown) => expected.push(String(value)));
    // JSC converts P/F before RegExpAlloc, unlike the pinned algorithm and V8.
    // Derive these observable traces directly from RegExpAlloc preceding
    // RegExpInitialize; retain the independent engine oracle for other values.
    for (let index = 0; index < expected.length; index++) {
        if (expected[index]!.startsWith("allocate:")) {
            expected[index] = expected[index]!.replace("match,source,flags,source-string,flags-string,prototype",
                "match,source,flags,prototype,source-string,flags-string");
        }
        if (expected[index] === "abrupt:true:match,source,flags,source-string,flags-string,prototype") {
            expected[index] = "abrupt:true:match,source,flags,prototype";
        }
    }
    expected.push("realm-intrinsic:true:true:true:true", "realm-call:true:true:true:true", "realm-fallback:true:true", "realm-error:true");
    try {
        const entry = path.join(temporary, "subject.js"); await fs.writeFile(entry, source);
        for (const noGc of [false, true]) {
            const executable = path.join(temporary, noGc ? "no-gc" : "gc");
            const diagnostics: string[] = [];
            const result = await compile({ entry, output: executable, initializationEntries: [entry], noGc,
                buildDir: path.join(temporary, noGc ? "build-no-gc" : "build-gc"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/regexp-constructor.js#sloppy",
                    setupEntries: [], testEntry: entry, async: false }, diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([executable], { stdout: "pipe", stderr: "pipe" });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            if (observation.kind !== "normal") throw new Error(JSON.stringify({ ...observation, stdout: observation.stdout?.slice(-500) }));
            expect(observation.kind).toBe("normal");
            const actual = (observation.stdout ?? "").trimEnd().split("\n");
            expect(actual.length).toBe(expected.length);
            expect(expected.flatMap((value, index) => actual[index] === value ? [] : [{ index, expected: value, actual: actual[index] }]).slice(0, 12)).toEqual([]);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 180_000);

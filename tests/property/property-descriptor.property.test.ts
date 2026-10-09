import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const source = String.raw`
// Collection during a computed key must retain the unfinished literal and
// all accessor values; the reference engine observes identical semantics.
function constructionKey(key) { if (NATIVE_GC) $262.gc(); return key; }
var constructionMarker = { token: "kept" };
var constructionSymbol = Symbol("construction");
var constructed = {
    first: constructionMarker,
    get [constructionKey("read")]() { return constructionMarker; },
    set [constructionKey("write")](value) { this.assigned = value; },
    [constructionKey(constructionSymbol)]() { return this.first; },
    ...{ spread: constructionMarker },
    [constructionKey("last")]: constructionMarker
};
constructed.write = constructionMarker;
print("construction:" + (constructed.first === constructed.read) + ":" + (constructed[constructionSymbol]() === constructionMarker) + ":" + (constructed.assigned === constructed.spread) + ":" + (constructed.last === constructionMarker));
function snapshot(target, key) {
    var d = Object.getOwnPropertyDescriptor(target, key);
    return d === undefined ? "missing" : ["value" in d ? String(d.value) : "accessor", d.writable, d.enumerable, d.configurable].join(":");
}
var define = Object.defineProperty;
var defineMany = Object.defineProperties;
var create = Object.create;
var reflected = Reflect.defineProperty;
var fields = ["enumerable", "configurable", "value", "writable", "get", "set"];
var state = 0x2d712e83;
for (var sample = 0; sample < 48; sample++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    var mask = state & 63;
    var log = [];
    var proto = {};
    for (var field of fields) {
        if (!(mask & (1 << fields.indexOf(field)))) continue;
        define(proto, field, { configurable: true, get: function() {
            log.push(field);
            if (field === "get" || field === "set") return undefined;
            if (field === "value") return sample;
            return [0, "", "false", {}, null, 1][sample % 6];
        } });
    }
    var descriptor = create(proto);
    var target = {};
    try {
        var result = sample % 2 ? define(target, "x", descriptor) : Object.defineProperty(target, "x", descriptor);
        print("generated:" + (result === target) + ":" + snapshot(target, "x") + ":" + log.join(","));
    } catch (error) { print("generated:" + error.name + ":" + log.join(",") + ":" + snapshot(target, "x")); }
}
var log = [];
var target = {};
var sym = Symbol("descriptor");
var value = 3;
Object.defineProperty(target, sym, {
    ["get"]() { log.push("get:" + (this === target) + ":" + arguments.length); return value; },
    set(next) { log.push("set:" + (this === target) + ":" + arguments.length); value = next; },
    configurable: true,
    ignored: log.push("ignored"),
    ...{ enumerable: "truthy" }
});
print("methods:" + target[sym]);
target[sym] = 8;
print("methods:" + target[sym] + ":" + log.join(","));
var d = Object.getOwnPropertyDescriptor(target, sym);
print("identity:" + (d.get === Object.getOwnPropertyDescriptor(target, sym).get) + ":" + d.enumerable + ":" + d.configurable);

for (var invalid of [null, 1, "getter", {}]) {
    var log = [];
    var descriptor = {
        get enumerable() { log.push("enumerable"); return true; },
        get configurable() { log.push("configurable"); return true; },
        get value() { log.push("value"); return 1; },
        get writable() { log.push("writable"); return true; },
        get get() { log.push("get"); return invalid; },
        get set() { log.push("set"); throw "too late"; }
    };
    try { reflected({}, "x", descriptor); }
    catch (error) { print("invalid-get:" + error.name + ":" + log.join(",")); }
}
for (var invalid of [null, undefined, 1, "descriptor"]) {
    try { define({}, "x", invalid); } catch (error) { print("descriptor-object:" + error.name); }
}
for (var target of [null, undefined, 1, "target"]) {
    var log = [];
    var key = { [Symbol.toPrimitive]() { log.push("key"); return "x"; } };
    var descriptor = { get value() { log.push("value"); return 1; } };
    try { Object.defineProperty(target, key, descriptor); }
    catch (error) { print("target-object:" + error.name + ":" + log.join(",")); }
}
var log = [];
var key = { [Symbol.toPrimitive](hint) { log.push("key:" + hint); return sym; } };
var descriptor = { get value() { log.push("value"); return 9; } };
var target = {};
Object.defineProperty(target, key, descriptor, log.push("extra"));
print("key-order:" + target[sym] + ":" + log.join(","));

for (var method of [Object.defineProperties, defineMany]) {
    var log = [];
    var target = {};
    var map = {
        get 2() { log.push("map:2"); return { get value() { log.push("value:2"); return 2; }, enumerable: true }; },
        get a() { log.push("map:a"); return { get value() { log.push("value:a"); return target["2"] === undefined; }, enumerable: true }; },
        [sym]: { get() { return "symbol"; }, enumerable: true }
    };
    define(map, "hidden", { get() { throw "hidden"; } });
    print("map:" + (method(target, map) === target) + ":" + target["2"] + ":" + target.a + ":" + target[sym] + ":" + log.join(","));
}
var target = {};
try { Object.defineProperties(target, { first: { value: 1 }, second: { get: 1 } }); }
catch (error) { print("prepare:" + error.name + ":" + snapshot(target, "first")); }
var target = {};
define(target, "blocked", { value: 1 });
try { defineMany(target, { first: { value: 2 }, blocked: { value: 3 }, last: { value: 4 } }); }
catch (error) { print("apply:" + error.name + ":" + target.first + ":" + target.blocked + ":" + snapshot(target, "last")); }
for (var map of [undefined, null, 3, false, "", "x"]) {
    try { print("map-object:" + Object.keys(defineMany({}, map)).length); }
    catch (error) { print("map-object:" + error.name); }
}
for (var map of [undefined, null, 3, false, "", "x"]) {
    try { print("create-map:" + Object.keys(create(null, map)).length); }
    catch (error) { print("create-map:" + error.name); }
}
var prototype = { inherited: 7 };
var created = Object.create(prototype, { x: { value: 2 }, [sym]: { get() { return this.x; } } });
print("create:" + (Object.getPrototypeOf(created) === prototype) + ":" + created.inherited + ":" + created[sym]);
var closed = Object.preventExtensions({});
print("reflect-false:" + Reflect.defineProperty(closed, "x", { value: 1 }));
try { Object.defineProperty(closed, "x", { value: 1 }); }
catch (error) { print("object-throw:" + error.name); }

// One independently chosen deep inherited descriptor; lookup uses the same
// descriptor conversion as ordinary inputs, without shape or depth branches.
var descriptor = { value: "deep", enumerable: true };
for (var depth = 0; depth < 12000; depth++) descriptor = create(descriptor);
var target = {};
define(target, "deep", descriptor);
print("depth:" + snapshot(target, "deep"));
`;

test("property descriptors use ordinary objects and one ordered runtime conversion", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-property-descriptor-"));
    const expected: string[] = [];
    new Function("print", source.replaceAll("NATIVE_GC", "false"))((value: unknown) => expected.push(String(value)));
    try {
        const entry = path.join(temporary, "subject.js");
        for (const noGc of [false, true]) {
            await fs.writeFile(entry, source.replaceAll("NATIVE_GC", String(!noGc)));
            const output = path.join(temporary, noGc ? "no-gc" : "gc");
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, initializationEntries: [entry], noGc,
                buildDir: path.join(temporary, noGc ? "build-no-gc" : "build-gc"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/property-descriptor.js#sloppy",
                    setupEntries: [], testEntry: entry, async: false }, diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe("");
            expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe",
                env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0);
            expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            expect(observation.kind).toBe("normal");
            const actual = (observation.stdout ?? "").trimEnd().split("\n");
            expect(actual.length).toBe(expected.length);
            expect(expected.flatMap((value, index) => actual[index] === value ? [] : [{ index, expected: value, actual: actual[index] }]).slice(0, 12)).toEqual([]);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 180_000);

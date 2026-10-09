import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const payloads = { primitive: "NaN", object: "{}", symbol: 'Symbol("payload")', callable: "function() {}" };
const completions = {
    normal: "return payload;",
    abrupt: "throw payload;",
    thenable: "return { then: function(resolve) { resolve(payload); } };",
    getter: "return { get then() { throw payload; } };",
};
const plans = Object.entries(payloads).flatMap(([kind, value]) =>
    Object.entries(completions).map(([route, body]) => `(function() {
        var payload = ${value}; watch("${kind}:${route}", Promise.try(function() { ${body} }), payload);
    })();`),
).join("\n");
const source = String.raw`
var pending = 0, sealed = false, results = [], log = [];
function watch(label, promise, expected) {
    var index = results.length; results.push(""); pending++;
    promise.then(function(value) { report(index, label + ":normal:" + Object.is(value, expected)); },
        function(error) { report(index, label + ":abrupt:" + Object.is(error, expected)); });
}
function report(index, value) {
    results[index] = value; pending--;
    if (sealed && pending === 0) { print(results.join("|")); finish(); }
}
PLANS
function argument(label, value) { log.push(label); return value; }
watch("arguments", Promise.try(function(a, b, ...tail) {
    log.push("callback"); return [a, b, tail.length, tail[0], tail[1], arguments.length, this === undefined].join(":");
}, argument("first", 3), argument("second", 5), argument("third", 7), argument("fourth", 11)), "3:5:2:7:11:4:false");
print("order:" + log.join(","));
watch("defaults", Promise.try(function(a = 13, { value: b } = { value: 17 }, ...tail) {
    return a + b + tail.length;
}, undefined, undefined, 1, 2), 32);
var proxy = new Proxy(function() {}, { apply: function(target, receiver, args) {
    return (receiver === undefined) + ":" + args.join(",");
} });
watch("proxy", Promise.try(proxy, "a", "b"), "true:a,b");
for (const invalid of [undefined, null, {}, 1]) {
    watch("invalid", Promise.try(invalid).catch(function(error) { return error instanceof TypeError; }), true);
}
var customLog = [], output = {};
function Capability(executor) {
    customLog.push("construct");
    if (NATIVE_GC) $262.gc();
    executor(function(value) { "use strict"; customLog.push("resolve:" + (this === undefined) + ":" + value); },
        function(error) { "use strict"; customLog.push("reject:" + (this === undefined) + ":" + error); });
    return output;
}
print("custom-normal:" + (Promise.try.call(Capability, function(a, b) { customLog.push("callback"); return a + b; }, 19, 23) === output));
print("custom-abrupt:" + (Promise.try.call(Capability, function() { throw "marker"; }) === output));
print("custom-log:" + customLog.join(","));
var marker = {}, called = false;
function Throws() { throw marker; }
try { Promise.try.call(Throws, function() { called = true; }); }
catch (error) { print("constructor-abrupt:" + (error === marker) + ":" + called); }
for (const receiver of [null, 1, {}, function() {}]) {
    try { Promise.try.call(receiver, function() { called = true; }); }
    catch (error) { print("receiver-invalid:" + (error instanceof TypeError) + ":" + called); }
}
var resolvingError = {}, rejectingError = {}, rejectCalls = 0;
function CallbackThrows(executor) {
    executor(function() { throw resolvingError; }, function() { rejectCalls++; throw rejectingError; });
}
try { Promise.try.call(CallbackThrows, function() { return 29; }); }
catch (error) { print("resolve-abrupt:" + (error === resolvingError) + ":" + rejectCalls); }
try { Promise.try.call(CallbackThrows, function() { throw marker; }); }
catch (error) { print("reject-abrupt:" + (error === rejectingError) + ":" + rejectCalls); }
var descriptor = Object.getOwnPropertyDescriptor(Promise.try, "length");
print("metadata:" + Promise.try.name + ":" + descriptor.value + ":" + descriptor.writable + ":" + descriptor.enumerable + ":" + descriptor.configurable);
var argumentsList = [], width = 20000;
for (var index = 0; index < width; index++) argumentsList.push(index);
watch("stress", Promise.try(function(...actual) {
    var sum = 0;
    for (const value of actual) sum += value;
    if (NATIVE_GC) $262.gc();
    return sum;
}, ...argumentsList), width * (width - 1) / 2);
sealed = true;
`.replace("PLANS", plans);

// Independent specification oracle over the host's construct/call/Promise
// primitives. Bun's Promise.try evaluates the callback before constructing C,
// contrary to the pinned specification; Node separately verifies this model.
const referenceTry = {
    try(this: unknown, callback: unknown, ...args: unknown[]): unknown {
        if (this === null || (typeof this !== "object" && typeof this !== "function")) throw new TypeError();
        let resolve: unknown, reject: unknown;
        const promise = Reflect.construct(this as Function, [function(r: unknown, j: unknown) {
            if (resolve !== undefined || reject !== undefined) throw new TypeError();
            resolve = r; reject = j;
        }]);
        if (typeof resolve !== "function" || typeof reject !== "function") throw new TypeError();
        let value: unknown, abrupt = false;
        try { value = Reflect.apply(callback as Function, undefined, args); }
        catch (error) { value = error; abrupt = true; }
        Reflect.apply(abrupt ? reject : resolve, undefined, [value]);
        return promise;
    },
}.try;
const referencePromise = new Proxy(Promise, {
    get(target, key, receiver) { return key === "try" ? referenceTry : Reflect.get(target, key, receiver); },
});

test("Promise.try preserves actual arguments and rooted call completions through generic capabilities", async () => {
    const expected: string[] = [];
    await new Promise<void>((finish, reject) => {
        try { new Function("Promise", "print", "finish", source.replaceAll("NATIVE_GC", "false"))(
            referencePromise, (value: unknown) => expected.push(String(value)), finish); }
        catch (error) { reject(error); }
    });
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-promise-try-"));
    try {
        for (const noGc of [false, true]) {
            const entry = path.join(temporary, noGc ? "subject-no-gc.js" : "subject.js");
            await fs.writeFile(entry, "function finish() {}\n" + source.replaceAll("NATIVE_GC", String(!noGc)));
            const output = path.join(temporary, noGc ? "no-gc" : "gc");
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, initializationEntries: [entry], noGc,
                buildDir: path.join(temporary, noGc ? "build-no-gc" : "build-gc"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/promise-try.js#sloppy",
                    setupEntries: [], testEntry: entry, async: false }, diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            expect(observation.kind).toBe("normal");
            expect((observation.stdout ?? "").trimEnd().split("\n")).toEqual(expected);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 240_000);

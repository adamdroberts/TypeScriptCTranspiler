import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const methods = ["all", "race", "any", "allSettled"];
const payloads = ["undefined", "null", "NaN", "-0", "13n", 'Symbol("payload")', "{}", "[]", "function() {}"];
const plans = payloads.map(value => `(function() {
    var payload = ${value};
    for (const method of METHODS) {
        watch(method + ":payload", Promise[method]([payload]), function(result) {
            return method === "all" ? Object.is(result[0], payload) :
                method === "allSettled" ? result[0].status === "fulfilled" && Object.is(result[0].value, payload) :
                Object.is(result, payload);
        });
    }
})();`).join("\n");
const source = String.raw`
var pending = 0, sealed = false, observations = [];
function collect() { if (NATIVE_GC) $262.gc(); }
function watch(label, promise, check) {
    var index = observations.length; observations.push(""); pending++;
    promise.then(function(value) { report(index, label + ":" + check(value)); },
        function(error) { report(index, label + ":unexpected:" + String(error)); });
}
function report(index, value) {
    observations[index] = value; pending--;
    if (sealed && pending === 0) { print(observations.join("|")); finish(); }
}
PLANS
function describe(value) {
    if (value instanceof AggregateError) {
        var descriptor = Object.getOwnPropertyDescriptor(value, "errors");
        return "errors:" + value.errors.join(",") + ":" + descriptor.writable + ":" + descriptor.enumerable + ":" + descriptor.configurable;
    }
    if (Array.isArray(value)) return JSON.stringify(value);
    return String(value);
}
for (const method of METHODS) {
    for (const route of ["fulfill", "reject", "both", "deferred"]) {
        var log = [], callbacks = [], output = {}, resolveFunction, rejectFunction;
        function Capability(executor) {
            log.push("construct"); collect();
            resolveFunction = function(value) { "use strict"; log.push("resolve:" + (this === undefined) + ":" + arguments.length + ":" + describe(value)); };
            rejectFunction = function(error) { "use strict"; log.push("reject:" + (this === undefined) + ":" + arguments.length + ":" + describe(error)); };
            executor(resolveFunction, rejectFunction); return output;
        }
        Object.defineProperty(Capability, "resolve", { configurable: true, get: function() {
            log.push("get-resolve"); return function(value) {
                "use strict";
                log.push("resolve-item:" + (this === Capability) + ":" + arguments.length + ":" + value);
                return { get then() { log.push("get-then"); return function(fulfill, reject) {
                    "use strict";
                    log.push("then:" + arguments.length + ":" + (this !== undefined));
                    if (method === "race") log.push("actual:" + (fulfill === resolveFunction) + ":" + (reject === rejectFunction));
                    else {
                        var callback = method === "any" ? reject : fulfill;
                        var metadata = Object.getOwnPropertyDescriptor(callback, "length");
                        log.push("callback:" + callback.name + ":" + callback.length + ":" + metadata.writable + ":" + metadata.enumerable + ":" + metadata.configurable);
                        try { new callback(); } catch (error) { log.push("nonconstruct:" + (error instanceof TypeError)); }
                    }
                    collect();
                    if (route === "deferred") callbacks.push([fulfill, reject, value]);
                    else if (route === "reject") { reject(value); reject("ignored"); }
                    else { fulfill(value); fulfill("ignored"); if (route === "both") reject("late"); }
                }; } };
            };
        } });
        var index = 0;
        var input = { get [Symbol.iterator]() { log.push("get-iterator"); return function() {
            log.push("iterator"); return { get next() { log.push("get-next"); return function() {
                log.push("step:" + index); return index < 2 ? { value: ++index, done: false } : { done: true };
            }; }, return: function() { log.push("close"); return {}; } };
        }; } };
        print("custom-result:" + method + ":" + route + ":" + (Promise[method].call(Capability, input) === output));
        for (var at = callbacks.length - 1; at >= 0; at--) {
            var callback = callbacks[at]; callback[0](callback[2]); callback[1]("late"); callback[0]("ignored");
        }
        print("custom-log:" + method + ":" + route + ":" + log.join("|"));
    }
    for (const failure of ["resolve-get", "resolve-invalid", "iterator-get", "next-get", "next", "done", "value", "resolve-call", "then-get", "then-call"]) {
        var log = [], marker = {}, closeError = {}, output = {};
        function FailureCapability(executor) {
            log.push("construct");
            executor(function() { log.push("resolve"); }, function(error) { log.push("reject:" + (error === marker) + ":" + (error instanceof TypeError)); collect(); });
            return output;
        }
        Object.defineProperty(FailureCapability, "resolve", { configurable: true, get: function() {
            log.push("get-resolve");
            if (failure === "resolve-get") throw marker;
            if (failure === "resolve-invalid") return null;
            return function(value) {
                log.push("resolve-call"); if (failure === "resolve-call") throw marker;
                return { get then() { log.push("get-then"); if (failure === "then-get") throw marker;
                    return function() { log.push("then-call"); throw marker; }; } };
            };
        } });
        var input = { get [Symbol.iterator]() { log.push("get-iterator"); if (failure === "iterator-get") throw marker;
            return function() { return { get next() { log.push("get-next"); if (failure === "next-get") throw marker;
                return function() { log.push("next"); if (failure === "next") throw marker;
                    return { get done() { log.push("done"); if (failure === "done") throw marker; return false; },
                        get value() { log.push("value"); if (failure === "value") throw marker; return {}; } };
                }; }, return: function() { log.push("close"); throw closeError; } };
            };
        } };
        print("failure-result:" + method + ":" + failure + ":" + (Promise[method].call(FailureCapability, input) === output));
        print("failure-log:" + method + ":" + failure + ":" + log.join("|"));
    }
    var marker = {}, touched = false;
    function Throws() { throw marker; }
    var untouched = { get [Symbol.iterator]() { touched = true; throw marker; } };
    try { Promise[method].call(Throws, untouched); } catch (error) { print("capability-first:" + method + ":" + (error === marker) + ":" + touched); }
    var rejectCalls = 0;
    function RejectThrows(executor) { executor(function() {}, function(error) { rejectCalls++; throw marker; }); }
    RejectThrows.resolve = function() { return {}; };
    try { Promise[method].call(RejectThrows, [1]); } catch (error) { print("reject-throws:" + method + ":" + (error === marker) + ":" + rejectCalls); }
    var descriptor = Object.getOwnPropertyDescriptor(Promise, method);
    print("method:" + method + ":" + Promise[method].name + ":" + Promise[method].length + ":" + descriptor.writable + ":" + descriptor.enumerable + ":" + descriptor.configurable);
    for (const invalid of [null, undefined, 1, {}, Symbol("invalid")]) {
        watch("invalid:" + method, Promise[method](invalid).catch(function(error) { return error instanceof TypeError; }), function(value) { return value; });
    }
}
watch("empty-all", Promise.all([]), function(value) { return Array.isArray(value) && value.length === 0; });
watch("empty-settled", Promise.allSettled([]), function(value) { return Array.isArray(value) && value.length === 0; });
watch("empty-any", Promise.any([]).catch(function(error) { return error; }), function(value) { return value instanceof AggregateError && value.errors.length === 0; });
var raceRan = false;
Promise.race([]).then(function() { raceRan = true; }, function() { raceRan = true; });
watch("race-pending", Promise.resolve(0), function() { return !raceRan; });
var map = new Map([["a", 1], ["b", 2]]), set = new Set([3, 5]), originalResolve = Promise.resolve;
Promise.resolve = function(value) {
    collect(); if (value === 3) { set.delete(5); set.add(7); }
    return originalResolve.call(Promise, value);
};
var live = Promise.all(set);
Promise.resolve = originalResolve;
watch("live-set", live, function(value) { return value.join(",") === "3,7"; });
watch("map", Promise.all(map), function(value) { return JSON.stringify(value) === '[["a",1],["b",2]]'; });
watch("string", Promise.all("\ud83d\ude00x"), function(value) { return value.length === 2 && value[0].length === 2; });
var depth = 8192, steps = 0;
var stress = { [Symbol.iterator]: function() { return { next: function() {
    if (steps === depth) return { done: true };
    var index = steps++; return { done: false, value: { then: function(resolve) {
        if (index % 257 === 0) collect(); resolve({ index: index });
    } } };
} }; } };
watch("stress", Promise.all(stress), function(value) {
    var valid = value.length === depth;
    for (var index = 0; index < value.length; index++) valid = valid && value[index].index === index;
    collect(); return valid;
});
sealed = true;
`.replaceAll("METHODS", JSON.stringify(methods)).replace("PLANS", plans.replaceAll("METHODS", JSON.stringify(methods)));

test("Promise combinators consume live iterator records with actual capabilities and shared element gates", async () => {
    const expected: string[] = [];
    await new Promise<void>((finish, reject) => {
        try { new Function("print", "finish", source.replaceAll("NATIVE_GC", "false"))(
            (value: unknown) => expected.push(String(value)), finish); }
        catch (error) { reject(error); }
    });
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-promise-combinator-"));
    try {
        for (const noGc of [false, true]) {
            const entry = path.join(temporary, noGc ? "subject-no-gc.js" : "subject.js");
            await fs.writeFile(entry, "function finish() {}\n" + source.replaceAll("NATIVE_GC", String(!noGc)));
            const output = path.join(temporary, noGc ? "no-gc" : "gc");
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, initializationEntries: [entry], noGc,
                buildDir: path.join(temporary, noGc ? "build-no-gc" : "build-gc"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/promise-combinator.js#sloppy",
                    setupEntries: [], testEntry: entry, async: false }, diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000,
                env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            expect(observation.kind).toBe("normal");
            expect((observation.stdout ?? "").trimEnd().split("\n")).toEqual(expected);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 240_000);

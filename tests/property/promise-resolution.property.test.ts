import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const payloads = { primitive: "NaN", object: "{}", symbol: 'Symbol("payload")', callable: "function() {}" };
const resolutions = {
    resolve: "resolve(payload); reject(other); throw other;",
    reject: "reject(payload); resolve(other); throw other;",
    abrupt: "throw payload;",
    thenable: "resolve({ then: function(done, fail) { done(payload); fail(other); throw other; } }); reject(other); throw other;",
    getter: "resolve({ get then() { throw payload; } }); reject(other); throw other;",
};
const plans = Object.entries(payloads).flatMap(([kind, payload]) =>
    Object.entries(resolutions).map(([route, body]) => `(function() {
        var payload = ${payload}, other = {}, result = new Promise(function(resolve, reject) { ${body} });
        watch("${kind}:${route}", result, payload);
    })();`),
).join("\n");
const partitions = String.raw`
var log = [];
var executor = function(...callbacks) {
    log.push("executor");
    print("callbacks:" + callbacks.length + ":" + (this === undefined) + ":" +
        callbacks[0].name + ":" + callbacks[0].length + ":" + callbacks[1].name + ":" + callbacks[1].length + ":" +
        Object.prototype.hasOwnProperty.call(callbacks[0], "prototype"));
    try { new callbacks[0](); } catch (error) { print("callback-new:" + (error instanceof TypeError)); }
    callbacks[0](23);
};
function extra() { log.push("extra"); return 0; }
watch("executor", new Promise(executor, extra()), 23);
print("timing:" + log.join(","));
var proxyExecutor = new Proxy(function() {}, {
    apply: function(target, receiver, args) {
        print("proxy-executor:" + (receiver === undefined) + ":" + args.length);
        args[0](29); return 91;
    }
});
watch("proxy", new Promise(proxyExecutor), 29);
watch("strict", new Promise(function(resolve) { "use strict"; resolve(this === undefined); }), true);
var revokedThen = Proxy.revocable(function() {}, {}); revokedThen.revoke();
watch("revoked-then", Promise.resolve({ then: revokedThen.proxy }).catch(function(error) { return error instanceof TypeError; }), true);
var spreadArguments = [0];
spreadArguments[Symbol.iterator] = function() {
    var done = false;
    return { next: function() {
        if (done) return { done: true };
        done = true; return { done: false, value: executor };
    } };
};
watch("spread", new Promise(...spreadArguments), 23);
for (const invalid of [undefined, null, {}, 1]) {
    try { new Promise(invalid); } catch (error) { print("invalid:" + (error instanceof TypeError)); }
}
try { Promise(executor); } catch (error) { print("call:" + (error instanceof TypeError)); }
var constructorLog = [], alternatePrototype = {};
function Alternative() {}
var newTarget = new Proxy(Alternative, { get: function(target, key) {
    constructorLog.push(key); return key === "prototype" ? alternatePrototype : target[key];
} });
try { Reflect.construct(Promise, [null], newTarget); }
catch (error) { print("validate-order:" + (error instanceof TypeError) + ":" + constructorLog.join(",")); }
var reflected = Reflect.construct(Promise, [function(resolve) { resolve(31); }], newTarget);
print("new-target:" + (Object.getPrototypeOf(reflected) === alternatePrototype) + ":" + constructorLog.join(","));
watch("reflected", Promise.prototype.then.call(reflected, function(value) { return value; }), 31);
var saved = Promise.withResolvers(), marker = {};
saved.resolve.call({}, { then: function(resolve) { resolve(marker); } }); saved.reject("late");
watch("saved", saved.promise, marker);
var self = Promise.withResolvers(); self.resolve(self.promise);
watch("self", self.promise.then(undefined, function(error) { return error instanceof TypeError; }), true);
var native = Promise.resolve(41), nativeCalls = 0;
native.then = function(resolve) { nativeCalls++; resolve(43); };
print("resolve-identity:" + (Promise.resolve(native) === native));
watch("native-override", new Promise(function(resolve) { resolve(native); }), 43);
var reentrant = Promise.withResolvers();
reentrant.resolve({ get then() { reentrant.reject("late"); return null; } });
watch("getter-reentrant", reentrant.promise.then(function(value) { return value.then === null; }), true);
var q; q = Promise.resolve(1).then(function() { return q; });
watch("reaction-self", q.then(undefined, function(error) { return error instanceof TypeError; }), true);
var thrown = {};
watch("finally-keep", Promise.resolve(thrown).finally(function() { return 7; }), thrown);
watch("finally-throw", Promise.resolve(1).finally(function() { throw thrown; }), thrown);
watch("finally-reject", Promise.reject(thrown).finally(function() { return Promise.resolve(0); }), thrown);
var thenReceiver = { then: function(a, b) { return (this === thenReceiver) && a === undefined && b === marker; } };
print("catch-generic:" + Promise.prototype.catch.call(thenReceiver, marker));
var finalReceiver = { then: function(a, b) { return (this === finalReceiver) && a === marker && b === marker; } };
print("finally-generic:" + Promise.prototype.finally.call(finalReceiver, marker));
var fake = new Proxy(Promise.resolve(0), {});
try { Promise.prototype.then.call(fake); } catch (error) { print("then-brand:" + (error instanceof TypeError)); }
var capabilityLog = [], capabilityOutput = {};
function Capability(executor) {
    executor(function(value) { "use strict"; capabilityLog.push("resolve:" + (this === undefined) + ":" + value); },
        function(reason) { "use strict"; capabilityLog.push("reject:" + (this === undefined) + ":" + reason); });
    return capabilityOutput;
}
print("generic-resolve:" + (Promise.resolve.call(Capability, 47) === capabilityOutput));
print("generic-reject:" + (Promise.reject.call(Capability, 49) === capabilityOutput));
var genericRecord = Promise.withResolvers.call(Capability);
print("generic-resolvers:" + (genericRecord.promise === capabilityOutput) + ":" + typeof genericRecord.resolve + ":" + typeof genericRecord.reject);
print("capability-log:" + capabilityLog.join(","));
var speciesLog = [], speciesOutput = {};
function Species(executor) {
    speciesLog.push("construct");
    executor(function(value) { speciesLog.push("resolve:" + value); }, function(error) { speciesLog.push("reject:" + error); });
    return speciesOutput;
}
var speciesSource = Promise.resolve(53);
speciesSource.constructor = { get [Symbol.species]() { speciesLog.push("species"); return Species; } };
print("species-output:" + (speciesSource.then(function(value) { return value + 1; }) === speciesOutput));
watch("species-order", Promise.resolve(0).then(function() { return speciesLog.join(","); }), "species,construct,resolve:54");
function InvalidCapability(executor) { executor(1, function() {}); }
try { Promise.withResolvers.call(InvalidCapability); } catch (error) { print("capability-invalid:" + (error instanceof TypeError)); }
function DuplicateCapability(executor) { executor(function() {}, function() {}); executor(function() {}, function() {}); }
try { Promise.withResolvers.call(DuplicateCapability); } catch (error) { print("capability-duplicate:" + (error instanceof TypeError)); }
var singleton = Promise.resolve(59);
print("identity:" + (singleton.then === singleton.then) + ":" + (singleton.then === Promise.prototype.then) + ":" +
    (Object.getPrototypeOf(singleton) === Promise.prototype) + ":" + (singleton.constructor === Promise) + ":" +
    Object.prototype.toString.call(singleton));
var count = 0, repeating = { then: function(resolve, reject) {
    count++;
    if (NATIVE_GC && count === 10000) $262.gc();
    resolve(count === 20000 ? count : repeating); reject("late");
} };
watch("stress", Promise.resolve(repeating), 20000);
`;
// Watchers compare identity at the settlement boundary, then serialize one
// ordered result collection after all jobs. The host Promise implementation is
// the independent oracle; neither plan width nor job depth proves coverage.
const source = `
var pending = 0, sealed = false, results = [];
function watch(label, promise, expected) {
    var index = results.length; results.push(""); pending++;
    promise.then(function(value) { report(index, label + ":fulfilled:" + Object.is(value, expected)); },
        function(reason) { report(index, label + ":rejected:" + Object.is(reason, expected)); });
}
function report(index, value) {
    results[index] = value; pending--;
    if (sealed && pending === 0) { print(results.join("|")); finish(); }
}
${plans}
${partitions}
sealed = true;
`;

test("ordinary Promise capabilities share rooted first-call cells and queued resolution jobs", async () => {
    const expected: string[] = [];
    await new Promise<void>((finish, reject) => {
        try { new Function("print", "finish", source.replaceAll("NATIVE_GC", "false"))(
            (value: unknown) => expected.push(String(value)), finish); }
        catch (error) { reject(error); }
    });
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-promise-resolution-"));
    try {
        for (const noGc of [false, true]) {
            const entry = path.join(temporary, noGc ? "subject-no-gc.js" : "subject.js");
            await fs.writeFile(entry, "function finish() {}\n" + source.replaceAll("NATIVE_GC", String(!noGc)));
            const output = path.join(temporary, noGc ? "no-gc" : "gc");
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, initializationEntries: [entry], noGc,
                buildDir: path.join(temporary, noGc ? "build-no-gc" : "build-gc"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/promise-resolution.js#sloppy",
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

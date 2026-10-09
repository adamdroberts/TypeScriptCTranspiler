import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const payloads = {
    undefined: "undefined", null: "null", boolean: "true", number: "NaN", bigint: "13n",
    string: '"payload"', symbol: 'Symbol("payload")',
    object: `{
        get [Symbol.toPrimitive]() { log.push("get-primitive"); throw conversionError; },
        get toString() { log.push("get-string"); throw conversionError; },
        get valueOf() { log.push("get-value"); throw conversionError; }
    }`,
    array: `Object.defineProperty([1], Symbol.toPrimitive, {
        get: function() { log.push("array-primitive"); throw conversionError; }
    })`,
    function: `Object.defineProperty(function() {}, "toString", {
        get: function() { log.push("function-string"); throw conversionError; }
    })`,
    error: `Object.defineProperties(new Error("payload"), {
        name: { get: function() { log.push("error-name"); throw conversionError; } },
        message: { get: function() { log.push("error-message"); throw conversionError; } },
        toString: { get: function() { log.push("error-string"); throw conversionError; } }
    })`,
    proxy: `new Proxy({}, { get: function() { log.push("proxy-get"); throw conversionError; } })`,
    revoked: `(function() { var record = Proxy.revocable({}, {}); record.revoke(); return record.proxy; })()`,
};
const paths = {
    direct: `throw payload;`,
    rethrow: `try { throw payload; } catch (error) { log.push("inner:" + Object.is(error, payload)); throw error; }
        finally { log.push("inner-finally"); }`,
    iterator: `for (const item of {
        [Symbol.iterator]: function() { return {
            next: function() { return { done: false, value: 1 }; },
            return: function() { log.push("close"); throw conversionError; }
        }; }
    }) { try { throw payload; } finally { log.push("body-finally"); } }`,
};
const plans = Object.entries(payloads).flatMap(([kind, value]) =>
    Object.entries(paths).map(([route, body]) => `{
        var log = [], conversionError = {}, payload = ${value};
        try { try { ${body} } finally { log.push("outer-finally"); } }
        catch (error) { print("${kind}:${route}:" + Object.is(error, payload) + ":" + log.join(",")); }
    }`),
).join("\n");
const partitions = String.raw`
var log = [], payload = {
    [Symbol.toPrimitive]: function(hint) { log.push("convert:" + hint); return "converted"; }
};
try { throw payload; } catch (error) { log.push("caught"); print("explicit:" + String(error) + ":" + log.join(",")); }
function fresh() {
    try { throw { answer: 31, toString: function() { throw "coercion must not run"; } }; }
    finally { if (NATIVE_GC) $262.gc(); }
}
try { fresh(); } catch (error) { print("fresh:" + error.answer); }
var hooks = 0, finalized = 0, marker = {
    get [Symbol.toPrimitive]() { hooks++; throw "coercion must not run"; }
}, depth = 1200;
function descend(level) {
    try { if (level === 0) throw marker; descend(level - 1); }
    catch (error) { if (NATIVE_GC && level === depth - 1) $262.gc(); throw error; }
    finally { finalized++; }
}
try { descend(depth - 1); } catch (error) { print("stress:" + (error === marker) + ":" + hooks + ":" + finalized); }
`;

test("uncaught diagnostics inspect intrinsic storage without coercing the thrown value", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-throw-diagnostic-"));
    try {
        const entry = path.join(temporary, "subject.js");
        await fs.writeFile(entry, `throw {
            get [Symbol.toPrimitive]() { console.log("coercion must not run"); throw "replacement"; }
        };`);
        for (const noGc of [false, true]) {
            const output = path.join(temporary, noGc ? "no-gc" : "gc");
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, noGc,
                buildDir: path.join(temporary, noGc ? "build-no-gc" : "build-gc"),
                diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe" });
            expect(native.exitCode).toBe(1); expect(native.stdout.toString()).toBe("");
            expect(native.stderr.toString()).toBe("Uncaught: [object Object]\n");
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 120_000);

test("throw transports one rooted value without user coercion across handlers and iterator finalizers", async () => {
    const source = plans + partitions;
    const expected: string[] = [];
    new Function("print", source.replaceAll("NATIVE_GC", "false"))((value: unknown) => expected.push(String(value)));
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-throw-payload-"));
    try {
        for (const noGc of [false, true]) {
            const entry = path.join(temporary, noGc ? "subject-no-gc.js" : "subject.js");
            await fs.writeFile(entry, source.replaceAll("NATIVE_GC", String(!noGc)));
            const output = path.join(temporary, noGc ? "no-gc" : "gc");
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, initializationEntries: [entry], noGc,
                buildDir: path.join(temporary, noGc ? "build-no-gc" : "build-gc"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/throw-payload.js#sloppy",
                    setupEntries: [], testEntry: entry, async: false }, diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            expect(observation.kind).toBe("normal");
            expect((observation.stdout ?? "").trimEnd().split("\n")).toEqual(expected);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 180_000);

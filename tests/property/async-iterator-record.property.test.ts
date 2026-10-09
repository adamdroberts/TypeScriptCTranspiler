import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const source = `
var host = globalThis;
function check(value, label) { if (!value) throw label; host.print(label + ":true"); }
function collect() { if (NATIVE_GC) host.$262.gc(); }
const original = { marker: "original", [Symbol.toPrimitive]() { throw "conversion"; } };
const closeError = { marker: "close" };
async function consume(iterable, action) {
    let values = [];
    for await (const value of iterable) {
        values.push(value);
        if (action === "throw") throw original;
        if (action === "return") return values;
        if (action === "break") break;
    }
    return values;
}
async function main() {
    for (const asynchronous of [false, true]) {
        let reads = 0, calls = 0;
        const iterator = { get next() {
            reads++;
            return function () { collect(); Object.defineProperty(this, "next", { value() { throw "reread next"; }, configurable: true });
                return { value: calls++, done: calls > 2 }; };
        } };
        const iterable = { [asynchronous ? Symbol.asyncIterator : Symbol.iterator]() { return iterator; } };
        const values = await consume(iterable, "normal");
        check(reads === 1 && values.join(",") === "0,1", asynchronous ? "async-captured-next" : "sync-captured-next");
    }
    for (const candidate of [{ next() { return {}; } }, { [Symbol.asyncIterator]: 17 },
        { [Symbol.asyncIterator]() { return 17; } }, { [Symbol.iterator]: 17 }]) {
        let valid = false;
        try { await consume(candidate, "normal"); } catch (reason) { valid = reason instanceof TypeError; }
        if (!valid) throw "GetIterator TypeError";
    }
    check(true, "async-getiterator-protocol");
    let transcript = [];
    const modes = ["absent", "null", "noncallable", "getter", "call", "primitive", "reject", "valid"];
    for (const asynchronous of [false, true]) for (const action of ["break", "return", "throw"]) for (const mode of modes) {
        let effects = [];
        const iterator = { next() { effects.push("next"); return { value: 7, done: false }; } };
        if (mode !== "absent") Object.defineProperty(iterator, "return", { get() {
            effects.push("get-return");
            if (mode === "getter") throw closeError;
            if (mode === "null") return null;
            if (mode === "noncallable") return 17;
            return function () {
                effects.push("call-return:" + arguments.length); collect();
                if (mode === "call") throw closeError;
                if (mode === "primitive") return 17;
                if (mode === "reject") return asynchronous ? Promise.reject(closeError) : { value: Promise.reject(closeError), done: true };
                return { value: 9, done: true };
            };
        } });
        const iterable = { [asynchronous ? Symbol.asyncIterator : Symbol.iterator]() { return iterator; } };
        let outcome;
        try { await consume(iterable, action); outcome = "normal"; }
        catch (reason) { outcome = reason === original ? "original" : reason === closeError ? "close" : reason instanceof TypeError ? "TypeError" : "unexpected"; }
        transcript.push([asynchronous, action, mode, outcome, effects]);
    }
    host.print("close-partitions:" + JSON.stringify(transcript));
    // The pinned ForIn/OfBodyEvaluation and AsyncFromSyncIteratorContinuation
    // put these failures before binding/body cleanup. Node 26.11.0 also closes
    // a sync iterator on next-call failure, so it is not the oracle here.
    for (const asynchronous of [false, true]) for (const phase of ["call", "result", "done", "value"]) {
        let closed = false;
        const iterator = { next() {
            if (phase === "call") throw original;
            if (phase === "result") return 17;
            return { get done() { if (phase === "done") throw original; return false; },
                get value() { throw original; } };
        }, return() { closed = true; return {}; } };
        let valid = false;
        try { await consume({ [asynchronous ? Symbol.asyncIterator : Symbol.iterator]() { return iterator; } }, "normal"); }
        catch (reason) { valid = phase === "result" ? reason instanceof TypeError : reason === original; }
        if (!valid || closed) throw "step failure closing";
    }
    check(true, "async-step-abrupt-boundary");
    let closed = false;
    const rejectedValue = { [Symbol.iterator]() { return { next() { return { done: false, value: Promise.reject(original) }; },
        return() { closed = true; collect(); throw closeError; } }; } };
    let valid = false;
    try { await consume(rejectedValue, "normal"); } catch (reason) { valid = reason === original; }
    check(valid && closed, "sync-value-rejection-closes");
    for (const done of [false, true]) {
        closed = false; valid = false;
        const value = Promise.resolve(7);
        Object.defineProperty(value, "constructor", { get() { throw original; } });
        try { await consume({ [Symbol.iterator]() { return { next() { return { done, value }; }, return() { closed = true; return {}; } }; } }, "normal"); }
        catch (reason) { valid = reason === original; }
        if (!valid || closed !== !done) throw "PromiseResolve abrupt close";
    }
    check(true, "sync-value-resolution-abrupt-close");
    closed = false; valid = false;
    try { for await (const { value } of { [Symbol.asyncIterator]() { return { next() { return { value: { get value() { throw original; } }, done: false }; },
        return() { closed = true; return {}; } }; } }) {} }
    catch (reason) { valid = reason === original; }
    check(valid && closed, "async-binding-abrupt-closes");
    let events = [];
    async function absentReturn() {
        for await (const value of { [Symbol.asyncIterator]() { return { next() { return { value: 1, done: false }; } }; } }) {
            events.push("body"); Promise.resolve().then(() => events.push("queued")); break;
        }
        events.push("after");
    }
    await absentReturn();
    check(events.join(",") === "body,after,queued", "absent-return-skips-await");
    let closeOrder = [];
    function layer(index) { return { [Symbol.asyncIterator]() { return { next() { collect(); return { value: index, done: false }; },
        return() { closeOrder.push(index); collect(); return Promise.resolve({ done: true }); } }; } }; }
    async function deep() { DEEP_TREE }
    const result = await deep(); collect();
    check(result.marker === "retained" && result.child.value === 23 && closeOrder.length === DEPTH &&
        closeOrder.every((value, index) => value === DEPTH - index - 1), "deep-async-iterator-unwind");
}
main().catch(reason => host.print("failure:" + (typeof reason === "string" ? reason : reason.marker)));
`;

const depth = 256;
function closeOracle(): string {
    const result: unknown[] = [];
    for (const asynchronous of [false, true]) for (const action of ["break", "return", "throw"])
        for (const mode of ["absent", "null", "noncallable", "getter", "call", "primitive", "reject", "valid"]) {
            const effects = ["next"];
            if (mode !== "absent") effects.push("get-return");
            if (["call", "primitive", "reject", "valid"].includes(mode)) effects.push("call-return:0");
            const closeOutcome = ["noncallable", "primitive"].includes(mode) ? "TypeError"
                : ["getter", "call", "reject"].includes(mode) ? "close" : "normal";
            result.push([asynchronous, action, mode, action === "throw" ? "original" : closeOutcome, effects]);
        }
    return JSON.stringify(result);
}
function program(noGc: boolean): string {
    let tree = 'return { marker: "retained", child: { value: 23 } };';
    for (let index = depth - 1; index >= 0; --index) tree = `for await (const item${index} of layer(${index})) { ${tree} }`;
    return source.replace("DEEP_TREE", tree).replaceAll("DEPTH", String(depth)).replaceAll("NATIVE_GC", String(!noGc));
}

test("async iteration retains one captured record and actual close completions", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-async-iterator-record-"));
    const expected = ["async-captured-next", "sync-captured-next", "async-getiterator-protocol", "close-partitions",
        "async-step-abrupt-boundary", "sync-value-rejection-closes", "sync-value-resolution-abrupt-close",
        "async-binding-abrupt-closes", "absent-return-skips-await", "deep-async-iterator-unwind"].map(label =>
            label === "close-partitions" ? label + ":" + closeOracle() : label + ":true");
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", subject = path.join(temporary, name + ".js"), driver = path.join(temporary, name + "-driver.js"), output = path.join(temporary, name);
            await fs.writeFile(subject, program(noGc)); await fs.writeFile(driver, "");
            const diagnostics: string[] = [];
            const result = await compile({ entry: driver, output, noGc, additionalRoots: [subject], initializationEntries: [subject, driver], buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/async-iterator-record.js#sloppy", setupEntries: [], testEntry: driver, async: false },
                diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000, env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString())); expect(observation).toMatchObject({ kind: "normal" });
            expect((observation.stdout ?? "").trimEnd().split("\n").sort()).toEqual(expected.sort());
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 240_000);

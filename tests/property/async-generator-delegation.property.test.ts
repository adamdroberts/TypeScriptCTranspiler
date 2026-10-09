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
const abrupt = { marker: "abrupt", [Symbol.toPrimitive]() { throw "conversion"; } };
const cleanupError = { marker: "cleanup" };
async function* delegate(iterable) { return yield* iterable; }
async function main() {
    for (const asynchronous of [false, true]) {
        let reads = 0, calls = 0, effects = [];
        const iterator = { get next() {
            reads++;
            return function(value) {
                if (this !== iterator || arguments.length !== 1 || (calls === 0 && value !== undefined)) throw "next invocation";
                effects.push("call:" + value); collect();
                Object.defineProperty(iterator, "next", { value() { throw "next reread"; }, configurable: true });
                calls++;
                return { get done() { effects.push("done"); return calls > 1; },
                    get value() { effects.push("value"); return calls === 1 ? 7 : value; } };
            };
        } };
        const subject = delegate({ [asynchronous ? Symbol.asyncIterator : Symbol.iterator]() { return iterator; } });
        const first = await subject.next(99), last = await subject.next(13);
        check(reads === 1 && first.value === 7 && !first.done && last.value === 13 && last.done &&
            effects.join(",") === "call:undefined,done,value,call:13,done,value", asynchronous ? "async-delegate-captured-next" : "sync-delegate-captured-next");
    }
    let thenReads = 0;
    const raw = { get then() { thenReads++; throw abrupt; } };
    const rawResult = { value: raw, done: false };
    const rawIterator = { [Symbol.asyncIterator]() { return this; }, next() { return rawResult; },
        return() { return { value: raw, done: true }; } };
    const rawSubject = delegate(rawIterator);
    const rawYield = await rawSubject.next();
    check(rawYield.value === raw && rawYield !== rawResult && !rawYield.done && thenReads === 0, "async-delegate-raw-yield-value");
    const rawReturn = await rawSubject.return(17);
    check(rawReturn.done && rawReturn.value === raw && thenReads === 0, "async-delegate-raw-return-value");
    let adopted = 0;
    const fallback = delegate({ [Symbol.iterator]() { return { next() {
        return { value: { then(resolve) { adopted++; resolve(19); } }, done: false };
    } }; } });
    check((await fallback.next()).value === 19 && adopted === 1, "sync-delegate-value-adoption");
    const completedValue = Promise.resolve(abrupt);
    const terminalIterator = { [Symbol.asyncIterator]() { return this; }, next() { return { value: completedValue, done: true }; } };
    async function* assignment() { const value = yield* terminalIterator; yield value === completedValue; }
    check((await assignment().next()).value === true, "async-delegate-terminal-expression-identity");
    let events = [];
    async function* finalization() {
        try { return yield* { [Symbol.asyncIterator]() { return this; }, next() {
            return { done: true, value: { then(resolve) { events.push("adopt"); resolve(abrupt); } } };
        } }; } finally { events.push("finally"); collect(); yield "cleanup"; }
    }
    const finalized = finalization();
    check((await finalized.next()).value === "cleanup" && events.join(",") === "adopt,finally" &&
        (await finalized.next()).value === abrupt, "delegated-source-return-before-finally");
    let returnCalls = 0, throwCalls = 0;
    const live = { [Symbol.asyncIterator]() { return this; }, next(value) { return { value, done: false }; } };
    const liveSubject = delegate(live); await liveSubject.next();
    live.return = function(value) { returnCalls++; if (this !== live || arguments.length !== 1 || value !== 23) throw "return invocation";
        return { value: "return-yield", done: false }; };
    check((await liveSubject.return(Promise.resolve(23))).value === "return-yield" && returnCalls === 1, "delegated-live-return-incomplete");
    live.throw = function(reason) { throwCalls++; if (this !== live || arguments.length !== 1 || reason !== abrupt) throw "throw invocation";
        return { value: 29, done: true }; };
    // AsyncGeneratorUnwrapYieldResumption returns the rejected Await as a
    // ThrowCompletion. Node 26.11.0 instead resumes next(undefined) here;
    // the pinned algorithm is authoritative for this partition.
    const recovered = await liveSubject.return(Promise.reject(abrupt));
    check(recovered.done && recovered.value === 29 && throwCalls === 1 && returnCalls === 1, "delegated-return-rejection-enters-throw");
    events = [];
    const ticks = Promise.resolve().then(() => events.push("tick1")).then(() => events.push("tick2")).then(() => events.push("tick3"));
    async function* missingReturn() {
        events.push("start");
        yield* { [Symbol.asyncIterator]() { return this; }, next() { return { done: false }; },
            get return() { events.push("get-return"); } };
        throw "missing return reached body";
    }
    const missing = missingReturn(), initial = missing.next();
    const terminated = missing.return({ get then() { events.push("then"); } });
    await Promise.all([initial, terminated, ticks]);
    check(events.join(",") === "start,tick1,then,tick2,get-return,then,tick3", "missing-return-additional-await-order");
    const modes = ["absent", "null", "noncallable", "getter", "call", "primitive", "reject", "valid"];
    const closeTranscript = [];
    for (const mode of modes) {
        let effects = [];
        const iterator = { [Symbol.asyncIterator]() { return this; }, next() { return { value: 1, done: false }; } };
        if (mode !== "absent") Object.defineProperty(iterator, "return", { get() {
            effects.push("get-return");
            if (mode === "getter") throw cleanupError;
            if (mode === "null") return null;
            if (mode === "noncallable") return 17;
            return function() {
                if (this !== iterator || arguments.length !== 0) throw "close invocation";
                effects.push("call-return"); collect();
                if (mode === "call") throw cleanupError;
                if (mode === "primitive") return 17;
                if (mode === "reject") return Promise.reject(cleanupError);
                return { get done() { throw "close done read"; }, get value() { throw "close value read"; } };
            };
        } });
        const subject = delegate(iterator); await subject.next();
        let outcome;
        try { await subject.throw(abrupt); outcome = "fulfilled"; }
        catch (reason) { outcome = reason === cleanupError ? "cleanup" : reason instanceof TypeError ? "TypeError" : "unexpected"; }
        closeTranscript.push([mode, outcome, effects]);
    }
    host.print("missing-throw-close:" + JSON.stringify(closeTranscript));
    for (const method of ["next", "return", "throw"]) for (const failure of ["getter", "noncallable", "call", "reject", "result", "done", "value", "terminal-value"]) {
        let closed = false;
        const iterator = { [Symbol.asyncIterator]() { return this; }, next() { return { value: 1, done: false }; },
            return() { closed = true; return {}; } };
        Object.defineProperty(iterator, method, { get() {
            if (failure === "getter") throw abrupt;
            if (failure === "noncallable") return 17;
            return function() {
                if (failure === "call") throw abrupt;
                if (failure === "reject") return Promise.reject(abrupt);
                if (failure === "result") return 17;
                return { get done() { if (failure === "done") throw abrupt; return failure === "terminal-value"; },
                    get value() { throw abrupt; } };
            };
        }, configurable: true });
        const subject = delegate(iterator); if (method !== "next") await subject.next();
        let valid = false;
        try { await subject[method](abrupt); }
        catch (reason) { valid = failure === "result" || failure === "noncallable" ? reason instanceof TypeError : reason === abrupt; }
        if (!valid || closed || !(await subject.next()).done) throw "delegate operation abrupt boundary";
    }
    check(true, "delegated-operation-errors-abandon-without-close");
    let attempt = 0;
    async function* restart() {
        while (attempt < 2) {
            const current = ++attempt;
            try { yield* { [Symbol.asyncIterator]() { return this; }, next() { if (current === 1) throw abrupt; return { value: 37, done: true }; } }; }
            catch (reason) { if (reason !== abrupt) throw "restart identity"; }
        }
        yield "restarted";
    }
    check((await restart().next()).value === "restarted" && attempt === 2, "delegation-record-reuse-after-catch");
    async function* cleanupDelegate() { try { yield* rawIterator; } finally { yield* [41, 43]; } }
    const cleanupSubject = cleanupDelegate(); await cleanupSubject.next();
    let clean = await cleanupSubject.return(47);
    check(clean.value === 41 && !clean.done && (await cleanupSubject.next()).value === 43 &&
        (await cleanupSubject.next()).value === raw, "delegation-record-reuse-in-finally");
    function makeProtocol(returnMode, throwMode, effects) {
        let nextCount = 0;
        const iterator = { [Symbol.asyncIterator]() { return this; }, next(value) {
            effects.push(["next", value]); return { value: "next:" + nextCount++, done: false };
        } };
        for (const [method, mode] of [["return", returnMode], ["throw", throwMode]]) if (mode !== "absent") {
            iterator[method] = function(value) {
                effects.push([method, value]);
                if (mode === "abrupt") throw method + "-error";
                return { value: method + ":" + value, done: mode === "done" };
            };
        }
        return iterator;
    }
    const transcript = [], actions = ["absent", "yield", "done", "abrupt"], requests = ["next", "return", "throw"];
    for (const returnMode of actions) for (const throwMode of actions) for (const first of requests) for (const second of requests) {
        const effects = [], subject = delegate(makeProtocol(returnMode, throwMode, effects));
        const outcomes = [subject.next(), subject[first](11), subject[second](13)].map(promise =>
            promise.then(result => ["result", result.done, result.value], reason => ["throw", reason instanceof TypeError ? "TypeError" : reason]));
        transcript.push([await Promise.all(outcomes), effects]);
    }
    host.print("generated-delegation-protocol:" + JSON.stringify(transcript));
    function deepIterable(value) {
        let emitted = false;
        const iterator = { next() { collect(); if (emitted) return { done: true }; emitted = true; return { value, done: false }; } };
        return { [value % 2 ? Symbol.asyncIterator : Symbol.iterator]() { return iterator; } };
    }
    async function* deep() { DEEP_TREE }
    const deepSubject = deep(), queued = [];
    for (let index = 0; index <= DEPTH; index++) queued.push(deepSubject.next());
    const deepResults = await Promise.all(queued);
    for (let index = 0; index < DEPTH; index++) if (deepResults[index].done || deepResults[index].value !== index) throw "deep delegated yield";
    check(deepResults[DEPTH].done && deepResults[DEPTH].value.marker === "retained" &&
        deepResults[DEPTH].value.child.value === 53, "deep-delegation-unwind");
}
main().catch(reason => { throw reason; });
`;

// Independent protocol state model: complete owners consume requests directly;
// active owners call the captured next or live abrupt method. Missing throw
// performs normal close before producing its protocol error.
function protocolOracle(): unknown[] {
    const transcript: unknown[] = [];
    const actions = ["absent", "yield", "done", "abrupt"], requests = ["next", "return", "throw"];
    for (const returnMode of actions) for (const throwMode of actions) for (const first of requests) for (const second of requests) {
        let complete = false, nextCount = 0;
        const effects: unknown[] = [], outcomes: unknown[] = [];
        for (const [method, value] of [["next", undefined], [first, 11], [second, 13]] as const) {
            if (complete) outcomes.push(method === "throw" ? ["throw", value] : ["result", true, method === "return" ? value : undefined]);
            else if (method === "next") { effects.push([method, value]); outcomes.push(["result", false, "next:" + nextCount++]); }
            else {
                const mode = method === "return" ? returnMode : throwMode;
                if (mode === "absent") {
                    complete = true;
                    if (method === "return") outcomes.push(["result", true, value]);
                    else {
                        if (returnMode !== "absent") effects.push(["return", undefined]);
                        outcomes.push(["throw", returnMode === "abrupt" ? "return-error" : "TypeError"]);
                    }
                } else {
                    effects.push([method, value]); complete = mode !== "yield";
                    outcomes.push(mode === "abrupt" ? ["throw", method + "-error"] : ["result", complete, method + ":" + value]);
                }
            }
        }
        transcript.push([outcomes, effects]);
    }
    return JSON.parse(JSON.stringify(transcript));
}
const depth = 256;
function program(noGc: boolean): string {
    let tree = 'return { marker: "retained", child: { value: 53 } };';
    for (let index = 0; index < depth; ++index) tree = `try { ${tree} } finally { yield* deepIterable(${index}); }`;
    return source.replace("DEEP_TREE", tree).replaceAll("DEPTH", String(depth)).replaceAll("NATIVE_GC", String(!noGc));
}

test("async yield delegation projects one rooted protocol record through Await, close and request phases", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-async-delegation-"));
    const labels = ["sync-delegate-captured-next", "async-delegate-captured-next", "async-delegate-raw-yield-value", "async-delegate-raw-return-value",
        "sync-delegate-value-adoption", "async-delegate-terminal-expression-identity", "delegated-source-return-before-finally",
        "delegated-live-return-incomplete", "delegated-return-rejection-enters-throw", "missing-return-additional-await-order", "delegated-operation-errors-abandon-without-close",
        "delegation-record-reuse-after-catch", "delegation-record-reuse-in-finally", "deep-delegation-unwind"];
    const closeExpected = ["absent", "null", "noncallable", "getter", "call", "primitive", "reject", "valid"].map(mode => [mode,
        ["getter", "call", "reject"].includes(mode) ? "cleanup" : "TypeError",
        mode === "absent" ? [] : ["get-return", ...(["call", "primitive", "reject", "valid"].includes(mode) ? ["call-return"] : [])]]);
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", subject = path.join(temporary, name + ".js"), driver = path.join(temporary, name + "-driver.js"), output = path.join(temporary, name);
            await fs.writeFile(subject, program(noGc)); await fs.writeFile(driver, "");
            const diagnostics: string[] = [];
            const result = await compile({ entry: driver, output, noGc, additionalRoots: [subject], initializationEntries: [subject, driver], buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/async-generator-delegation.js#sloppy", setupEntries: [], testEntry: driver, async: false },
                diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000, env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString())); expect(observation).toMatchObject({ kind: "normal" });
            const lines = (observation.stdout ?? "").trimEnd().split("\n");
            expect(lines.filter(line => line.endsWith(":true"))).toEqual(labels.map(label => label + ":true"));
            for (const [label, expected] of [["missing-throw-close", closeExpected], ["generated-delegation-protocol", protocolOracle()]] as const) {
                const line = lines.find(value => value.startsWith(label + ":")); expect(line).toBeDefined();
                const actual = JSON.parse(line!.slice(label.length + 1)); expect(actual.length).toBe(expected.length);
                for (let index = 0; index < expected.length; ++index) expect(actual[index]).toEqual(expected[index]);
            }
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 240_000);

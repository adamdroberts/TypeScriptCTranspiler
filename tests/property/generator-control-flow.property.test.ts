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
function step(iterator, input, value, done) {
    const result = iterator.next(input);
    if (result.value !== value || result.done !== done) throw "unexpected iterator result";
}
let events = [];
function* flow(first = (events.push("parameter"), 3), ...rest) {
    function read() { return first + rest.length + arguments.length; }
    events.push("body");
    let captured = [];
    outer: for (let i = 0; i < 3; i++) {
        captured.push(() => i);
        switch (yield read(i)) { case "skip": continue outer; case "stop": break outer; }
    }
    yield captured.map(fn => fn()).join(",");
    return arguments.length;
}
const flowIterator = flow(undefined, 5, 7);
check(events.join(",") === "parameter", "creation-retains-activation");
step(flowIterator, "ignored", 6, false);
step(flowIterator, "skip", 6, false);
step(flowIterator, "stop", "0,1", false);
step(flowIterator, undefined, 3, true);
step(flowIterator, undefined, undefined, true);
check(events.join(",") === "parameter,body", "control-and-fresh-bindings");
const methodOwner = { marker: 31, *generate(value, ...tail) {
    yield [this.marker, arguments.length, value.marker, tail[0].marker];
    return new.target;
} };
const method = methodOwner.generate({ marker: 7 }, { marker: 9 }); collect();
check(method.next().value.join(",") === "31,2,7,9" && method.next().value === undefined,
    "retained-method-activation");
const abrupt = { marker: "abrupt", [Symbol.toPrimitive]() { throw "unwanted conversion"; } };
function* finalization() {
    try {
        try { yield "body"; }
        catch (reason) { check(reason === abrupt, "injected-throw-identity"); yield "caught"; }
        return "original";
    } finally { collect(); yield "cleanup"; collect(); }
}
const returned = finalization();
step(returned, undefined, "body", false);
let result = returned.return(abrupt);
check(result.value === "cleanup" && !result.done, "return-yields-through-finally");
step(returned, undefined, abrupt, true);
const thrown = finalization();
step(thrown, undefined, "body", false);
result = thrown.throw(abrupt);
check(result.value === "caught" && !result.done, "throw-routes-through-catch");
step(thrown, undefined, "cleanup", false);
step(thrown, undefined, "original", true);
let started = false;
function* untouched() { started = true; yield 1; }
const beforeReturn = untouched();
result = beforeReturn.return(abrupt);
check(!started && result.done && result.value === abrupt, "return-before-start");
const beforeThrow = untouched();
let preserved = false;
try { beforeThrow.throw(abrupt); } catch (reason) { preserved = reason === abrupt; }
check(!started && preserved && beforeThrow.next().done, "throw-before-start");
let running;
function* reentrant() {
    let rejected = false;
    try { running.next(); } catch (reason) { rejected = reason instanceof TypeError; }
    yield rejected;
}
running = reentrant(); step(running, undefined, true, false);
check(running.next().done, "executing-generator-brand");
let argsSeen = [], nextReads = 0;
const liveResult = { done: false, get value() { throw "yield delegation must preserve result object"; } };
const delegated = {
    [Symbol.iterator]() { return this; },
    get next() { nextReads++; return function (value) {
        argsSeen.push(["next", arguments.length, value]);
        return argsSeen.length === 1 ? liveResult : { done: true, value: "delegate-end" };
    }; },
    return(value) { argsSeen.push(["return", arguments.length, value]); return { done: false, value: "delegate-cleanup" }; },
    throw(value) { argsSeen.push(["throw", arguments.length, value]); return { done: true, value: "delegate-caught" }; }
};
function* delegation() { return "outer:" + (yield* delegated); }
const delegate = delegation();
check(delegate.next("ignored") === liveResult && argsSeen[0][1] === 1 && argsSeen[0][2] === undefined,
    "delegation-result-identity");
result = delegate.return(abrupt);
check(result.value === "delegate-cleanup" && !result.done && argsSeen[1][2] === abrupt, "delegation-return-resume");
result = delegate.throw(abrupt);
check(result.done && result.value === "outer:delegate-caught" && nextReads === 1 && argsSeen[2][2] === abrupt,
    "delegation-actual-methods");
let closeEvents = [];
const iterable = {
    [Symbol.iterator]() {
        let cursor = 0;
        return { next() { closeEvents.push("step"); return { value: cursor++, done: false }; },
            return() { closeEvents.push("close"); collect(); return {}; } };
    }
};
function* liveLoop() { try { for (const value of iterable) { yield value; } } finally { closeEvents.push("finally"); yield "closed"; } }
const loop = liveLoop(); step(loop, undefined, 0, false);
check(closeEvents.join(",") === "step", "live-iterator-step");
result = loop.return(abrupt);
check(result.value === "closed" && !result.done && closeEvents.join(",") === "step,close,finally", "iterator-close-before-finally");
step(loop, undefined, abrupt, true);
let lookup = untouched(); lookup.next = function (value) { return { value, done: true }; };
check(lookup.next(17).value === 17 && !Array.isArray(lookup), "ordinary-generator-owner");
const owned = untouched();
check(Object.getPrototypeOf(owned) === untouched.prototype && Object.prototype.toString.call(owned) === "[object Generator]",
    "generator-function-prototype-owner");
let nonConstructable = false;
try { Reflect.construct(untouched, []); } catch (reason) { nonConstructable = reason instanceof TypeError; }
check(nonConstructable, "generator-function-non-constructable");
const replacement = { custom: 17 };
const factory = function* () { yield 1; };
factory.prototype = replacement;
check(Object.getPrototypeOf(factory()) === replacement, "generator-prototype-actual-lookup");
let expressionEvents = [];
const receiver = { get method() { expressionEvents.push("get"); return function (...args) {
    if (this !== receiver) throw "lost receiver";
    expressionEvents.push("call"); collect(); return args.reduce((sum, item) => sum + item, 0);
}; } };
function* expressions() {
    const value = receiver.method((expressionEvents.push("argument"), yield "argument"), ...(yield "spread"));
    check(value === 12 && expressionEvents.join(",") === "get,argument,call", "expression-callee-and-arguments");
    const array = [, yield "element", ...(yield "array")];
    const object = { [yield "key"]: yield "value", ...(yield "object") };
    check(!(0 in array) && array.join(",") === ",3,5,8" && object.answer === 17 && object.extra === 23,
        "expression-partial-literals");
    return String(yield "conversion");
}
const expression = expressions(); step(expression, undefined, "argument", false); collect();
step(expression, 5, "spread", false); collect(); step(expression, [7], "element", false);
step(expression, 3, "array", false); step(expression, [5, 8], "key", false);
step(expression, "answer", "value", false); step(expression, 17, "object", false);
step(expression, { extra: 23 }, "conversion", false); step(expression, 29, "29", true);
function* optional() { return null?.method(yield "must skip"); }
check(optional().next().done, "optional-chain-skips-suspension");
const promise = Promise.resolve(17);
Object.defineProperty(promise, "then", { get() { throw "generator must not resolve returned values"; } });
function* rawReturn() { return promise; }
check(rawReturn().next().value === promise, "generator-return-remains-raw");
let closeCount = 0;
const brokenClose = { [Symbol.iterator]() { return { next() { return { value: 1, done: false }; },
    return() { closeCount++; throw "close-error"; } }; } };
function* closePrecedence() { for (const item of brokenClose) yield item; }
const throwClose = closePrecedence(); throwClose.next(); preserved = false;
try { throwClose.throw(abrupt); } catch (reason) { preserved = reason === abrupt; }
check(preserved && closeCount === 1, "iterator-close-original-throw");
const returnClose = closePrecedence(); returnClose.next(); preserved = false;
try { returnClose.return(abrupt); } catch (reason) { preserved = reason === "close-error"; }
check(preserved && closeCount === 2, "iterator-close-overrides-return");
const stepFailure = { [Symbol.iterator]() { return { next() { throw abrupt; }, return() { closeCount++; return {}; } }; } };
function* failingStep() { for (const item of stepFailure) yield item; }
preserved = false; try { failingStep().next(); } catch (reason) { preserved = reason === abrupt; }
check(preserved && closeCount === 2, "iterator-step-failure-skips-close");
let delegationClosed = false;
const missingThrow = { [Symbol.iterator]() { return { next() { return { done: false, value: 1 }; },
    return() { delegationClosed = true; return {}; } }; } };
function* unhandledDelegate() { yield* missingThrow; }
const unhandled = unhandledDelegate(); unhandled.next(); let typeError = false;
try { unhandled.throw(abrupt); } catch (reason) { typeError = reason instanceof TypeError; }
check(typeError && delegationClosed, "delegation-missing-throw-closes");
function* protocolProbe() { try { return yield "body"; } catch (reason) { return { caught: reason }; } finally { yield "cleanup"; } }
const choices = ["next", "return", "throw"];
let transcript = [];
for (const first of choices) for (const second of choices) for (const third of choices) {
    const iterator = protocolProbe(), trace = [];
    for (const [index, method] of [first, second, third].entries()) {
        try { const result = iterator[method](index + 10); trace.push(["result", result.done, result.value]); }
        catch (reason) { trace.push(["throw", reason]); }
    }
    transcript.push(trace);
}
host.print("generated-generator-protocol:" + JSON.stringify(transcript));
let deepEvents = [];
function* deepSubject() { DEEP_TREE }
const deep = deepSubject();
let position = 0;
result = deep.next();
while (!result.done) { if (result.value !== position++) throw "deep yield order"; collect(); result = deep.next(); }
check(position === FINALIZATION_DEPTH && result.value.marker === "retained" && result.value.child.value === 23 &&
    deepEvents.every((value, index) => value === index), "deep-generator-finalizations");
`;

const finalizationDepth = 256;
function protocolOracle(): string {
    const choices = ["next", "return", "throw"], transcript: unknown[] = [];
    for (const first of choices) for (const second of choices) for (const third of choices) {
        let state: "start" | "body" | "cleanup" | "complete" = "start", pending: unknown;
        const trace: unknown[] = [];
        for (const [index, method] of [first, second, third].entries()) {
            const value = index + 10;
            if (state === "start" && method === "next") { state = "body"; trace.push(["result", false, "body"]); }
            else if (state === "body") { pending = method === "throw" ? { caught: value } : value; state = "cleanup"; trace.push(["result", false, "cleanup"]); }
            else {
                const completed = state === "cleanup" && method === "next" ? pending : method === "return" ? value : undefined;
                state = "complete";
                trace.push(method === "throw" ? ["throw", value] : ["result", true, completed]);
            }
        }
        transcript.push(trace);
    }
    return JSON.stringify(transcript);
}
function program(noGc: boolean): string {
    let tree = 'return { marker: "retained", child: { value: 23 } };';
    for (let index = 0; index < finalizationDepth; index++)
        tree = `try { ${tree} } finally { collect(); deepEvents.push(${index}); yield ${index}; }`;
    return source.replace("DEEP_TREE", tree).replaceAll("FINALIZATION_DEPTH", String(finalizationDepth))
        .replaceAll("NATIVE_GC", String(!noGc));
}

test("one generator graph retains activation, protocol and completion semantics", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-generator-graph-"));
    const expected = ["creation-retains-activation", "control-and-fresh-bindings", "retained-method-activation", "return-yields-through-finally",
        "injected-throw-identity", "throw-routes-through-catch", "return-before-start", "throw-before-start",
        "executing-generator-brand", "delegation-result-identity", "delegation-return-resume", "delegation-actual-methods",
        "live-iterator-step", "iterator-close-before-finally", "ordinary-generator-owner", "generator-function-prototype-owner",
        "generator-function-non-constructable", "generator-prototype-actual-lookup", "expression-callee-and-arguments",
        "expression-partial-literals", "optional-chain-skips-suspension", "generator-return-remains-raw",
        "iterator-close-original-throw", "iterator-close-overrides-return", "iterator-step-failure-skips-close",
        "delegation-missing-throw-closes", "generated-generator-protocol", "deep-generator-finalizations"].map(label =>
            label === "generated-generator-protocol" ? label + ":" + protocolOracle() : label + ":true");
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", subject = path.join(temporary, name + ".js"), driver = path.join(temporary, name + "-driver.js"), output = path.join(temporary, name);
            await fs.writeFile(subject, program(noGc)); await fs.writeFile(driver, "");
            const diagnostics: string[] = [];
            const result = await compile({ entry: driver, output, noGc, additionalRoots: [subject], initializationEntries: [subject, driver], buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/generator-control-flow.js#sloppy", setupEntries: [], testEntry: driver, async: false },
                diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000, env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString())); expect(observation).toMatchObject({ kind: "normal" });
            expect((observation.stdout ?? "").trimEnd().split("\n")).toEqual(expected);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 300_000);

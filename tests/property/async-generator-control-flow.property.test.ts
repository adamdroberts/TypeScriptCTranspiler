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
async function main() {
    let events = [], release;
    const gate = new Promise(resolve => { release = resolve; });
    const owner = { marker: 31, async *values(value = (events.push("parameter"), 7), ...tail) {
        events.push("body"); await gate; collect();
        yield [this.marker, value, tail[0].marker, arguments.length];
        return arguments[0];
    } };
    const iterator = owner.values(undefined, { marker: 9 }); collect();
    check(events.join(",") === "parameter", "async-generator-creation");
    const first = iterator.next("ignored"), second = iterator.next(17);
    check(events.join(",") === "parameter,body", "async-generator-deferred-queue");
    release();
    const received = await Promise.all([first, second]);
    check(received[0].value.join(",") === "31,7,9,2" && !received[0].done && received[1].done &&
        received[1].value === undefined, "async-generator-retained-activation");
    async function* recovery() {
        try { yield "body"; } catch (reason) { if (reason !== abrupt) throw "identity"; yield "caught"; }
        finally { yield "cleanup"; }
    }
    const returned = recovery(); await returned.next();
    let result = await returned.return(Promise.reject(abrupt));
    check(result.value === "caught" && !result.done, "return-rejection-enters-catch");
    result = await returned.next();
    check(result.value === "cleanup" && !result.done && (await returned.next()).done, "async-generator-yielding-finally");
    events = [];
    async function* ordering() {
        try { return { then(resolve) { events.push("resolve"); resolve(abrupt); } }; }
        finally { events.push("finally"); collect(); yield "cleanup"; }
    }
    const ordered = ordering(); result = await ordered.next();
    check(result.value === "cleanup" && events.join(",") === "resolve,finally", "return-await-precedes-finally");
    result = await ordered.next(); check(result.done && result.value === abrupt, "async-generator-return-identity");
    async function* yielding() { try { yield { then(resolve) { resolve(23); } }; yield Promise.reject(abrupt); }
        catch (reason) { return reason; } }
    const adopted = yielding();
    check((await adopted.next()).value === 23 && (await adopted.next()).value === abrupt, "yield-await-and-rejection");
    async function* dormant() { throw "body executed"; }
    const completed = dormant();
    let finish;
    const pending = new Promise(resolve => { finish = resolve; });
    let completedEvents = [];
    const a = completed.return(pending).then(value => { completedEvents.push("return"); return value; });
    const b = completed.next().then(value => { completedEvents.push("next"); return value; });
    const c = completed.throw(abrupt).catch(reason => { completedEvents.push("throw"); return reason; });
    await 0; check(completedEvents.length === 0, "completed-return-blocks-queue"); finish(29);
    const drained = await Promise.all([a, b, c]);
    check(drained[0].done && drained[0].value === 29 && drained[1].done && drained[1].value === undefined &&
        drained[2] === abrupt && completedEvents.join(",") === "return,next,throw", "completed-queue-order");
    let running, reentered;
    async function* reentrant() { reentered = running.next(12); return yield 1; }
    running = reentrant(); const initial = await running.next(); result = await reentered;
    check(initial.value === 1 && !initial.done && result.done && result.value === 12, "executing-request-enqueues");
    let synchronousThrow = false, rejected;
    try { rejected = running.next.call({}); } catch (reason) { synchronousThrow = true; }
    let branded = false;
    try { await rejected; } catch (reason) { branded = reason instanceof TypeError; }
    check(!synchronousThrow && branded && !Array.isArray(running) &&
        Object.prototype.toString.call(running) === "[object AsyncGenerator]", "async-generator-owner-brand");
    async function* protocolProbe() { try { return yield "body"; } catch (reason) { return { caught: reason }; } finally { yield "cleanup"; } }
    const choices = ["next", "return", "throw"], transcript = [];
    for (const first of choices) for (const second of choices) for (const third of choices) {
        const subject = protocolProbe(), requests = [];
        for (const [index, method] of [first, second, third].entries())
            requests.push(subject[method](index + 10).then(result => ["result", result.done, result.value], reason => ["throw", reason]));
        transcript.push(await Promise.all(requests));
    }
    host.print("generated-async-generator-protocol:" + JSON.stringify(transcript));
    let deepEvents = [];
    async function* deepSubject() { DEEP_TREE }
    const deep = deepSubject(), requests = [];
    for (let index = 0; index <= DEPTH; ++index) requests.push(deep.next());
    collect(); const results = await Promise.all(requests); collect();
    check(results.slice(0, DEPTH).every((result, index) => !result.done && result.value === index) &&
        results[DEPTH].done && results[DEPTH].value.marker === "retained" && results[DEPTH].value.child.value === 23 &&
        deepEvents.every((value, index) => value === index), "deep-async-generator-unwind");
}
main().catch(reason => host.print("failure:" + (typeof reason === "string" ? reason : reason.marker)));
`;

const depth = 256;
function protocolOracle(): string {
    const transcript: unknown[] = [], choices = ["next", "return", "throw"];
    for (const first of choices) for (const second of choices) for (const third of choices) {
        let state = "start", pending: unknown;
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
    for (let index = 0; index < depth; ++index) tree = `try { ${tree} } finally { collect(); deepEvents.push(${index}); yield ${index}; }`;
    return source.replace("DEEP_TREE", tree).replaceAll("DEPTH", String(depth)).replaceAll("NATIVE_GC", String(!noGc));
}

test("async generator requests use one retained graph and FIFO completion worklist", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-async-generator-"));
    const expected = ["async-generator-creation", "async-generator-deferred-queue", "async-generator-retained-activation",
        "return-rejection-enters-catch", "async-generator-yielding-finally", "return-await-precedes-finally", "async-generator-return-identity",
        "yield-await-and-rejection", "completed-return-blocks-queue", "completed-queue-order", "executing-request-enqueues",
        "async-generator-owner-brand", "generated-async-generator-protocol", "deep-async-generator-unwind"].map(label =>
            label === "generated-async-generator-protocol" ? label + ":" + protocolOracle() : label + ":true");
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", subject = path.join(temporary, name + ".js"), driver = path.join(temporary, name + "-driver.js"), output = path.join(temporary, name);
            await fs.writeFile(subject, program(noGc)); await fs.writeFile(driver, "");
            const diagnostics: string[] = [];
            const result = await compile({ entry: driver, output, noGc, additionalRoots: [subject], initializationEntries: [subject, driver], buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/async-generator-control-flow.js#sloppy", setupEntries: [], testEntry: driver, async: false },
                diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000, env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString())); expect(observation).toMatchObject({ kind: "normal" });
            expect((observation.stdout ?? "").trimEnd().split("\n")).toEqual(expected);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 240_000);

test("unrepresented async delegation fails closed at the shared graph boundary", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-async-generator-missing-"));
    try {
        const entry = path.join(temporary, "subject.js"), output = path.join(temporary, "subject");
        await fs.writeFile(entry, "async function* subject() { yield* [1]; } subject().next();");
        const diagnostics: string[] = [];
        const result = await compile({ entry, output, emitCOnly: true, buildDir: path.join(temporary, "build"),
            diagnosticWriter: message => diagnostics.push(message) });
        expect(result.exitCode).toBe(3);
        expect(diagnostics.join("")).toContain("generator suspension graph requires a canonical operation");
        expect(result.mainC).toBe("");
        expect(await fs.stat(output).then(() => true, () => false)).toBeFalse();
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
});

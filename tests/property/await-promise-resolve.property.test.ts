import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

type InputKind = "primitive" | "identity" | "thenable" | "different-constructor" | "constructor-throw" | "then-throw";
const kinds: InputKind[] = ["primitive", "identity", "thenable", "different-constructor", "constructor-throw", "then-throw"];
const plans = Array.from({ length: 19 }, (_, task) => Array.from({ length: 1 + task % 7 }, (_, step) => kinds[(task * 5 + step * 3 + Math.floor(task / 3)) % kinds.length]!));

// Independent execution-context model: input evaluation is synchronous;
// PromiseResolve identity schedules one reaction; assimilation schedules a
// resolving job followed by that reaction. Constructor abrupt completion
// resumes the local catch synchronously. No native fixture output defines it.
function expectedTrace(): string[] {
    const log: string[] = [], jobs: (() => void)[] = [];
    const start = (task: number, step: number): void => {
        if (step === plans[task]!.length) { jobs.push(() => log.push(`done:${task}`)); return; }
        const id = `${task}.${step}`, kind = plans[task]![step]!;
        log.push(`enter:${id}`);
        if (kind === "identity" || kind === "different-constructor" || kind === "constructor-throw") log.push(`constructor:${id}`);
        if (kind === "constructor-throw") {
            log.push(`catch:${id}:true`); start(task, step + 1); return;
        }
        if (kind === "thenable" || kind === "different-constructor" || kind === "then-throw") log.push(`get-then:${id}`);
        const resume = (): void => {
            log.push(kind === "then-throw" ? `catch:${id}:true` : `resume:${id}:true`);
            start(task, step + 1);
        };
        if (kind === "thenable" || kind === "different-constructor") jobs.push(() => {
            log.push(`call-then:${id}:true`); jobs.push(resume);
        });
        else jobs.push(resume);
    };
    for (let task = 0; task < plans.length; ++task) start(task, 0);
    for (let cursor = 0; cursor < jobs.length; ++cursor) jobs[cursor]!();
    return log;
}

const realmSource = 'async function retainedRealm() { await 1; const source = Promise.resolve("foreign"); source.then = function () { throw "foreign then must remain unread"; }; const value = await source; return [Promise, function () {}, new TypeError(), value]; }';
const source = String.raw`
const plans = PLAN_JSON, trace = [];
function materialize(kind, id, marker) {
    if (kind === "primitive") return marker;
    const input = kind === "identity" || kind === "different-constructor" || kind === "constructor-throw" ? Promise.resolve(marker) : {};
    if (kind === "identity" || kind === "different-constructor" || kind === "constructor-throw") Object.defineProperty(input, "constructor", {
        get() { trace.push("constructor:" + id); if (kind === "constructor-throw") throw marker; return kind === "identity" ? Promise : {}; }, configurable: true
    });
    Object.defineProperty(input, "then", { get() {
        trace.push("get-then:" + id);
        if (kind === "identity" || kind === "then-throw") throw marker;
        return function (resolve, reject) {
            trace.push("call-then:" + id + ":" + (this === input));
            resolve(marker); reject("late"); throw "late";
        };
    }, configurable: true });
    return input;
}
async function execute(task) {
    const plan = plans[task];
    for (let step = 0; step < plan.length; ++step) {
        const id = task + "." + step, marker = { id: id };
        trace.push("enter:" + id);
        try { const value = await materialize(plan[step], id, marker); trace.push("resume:" + id + ":" + (value === marker)); }
        catch (error) { trace.push("catch:" + id + ":" + (error === marker)); }
    }
}
for (let task = 0; task < plans.length; ++task) execute(task).then(() => { trace.push("done:" + task); });
const realm = $262.createRealm();
realm.evalScript(REALM_SOURCE);
realm.global.retainedRealm().then(result => print("realm:" + (result[0] === realm.global.Promise &&
    Object.getPrototypeOf(result[1]) === realm.global.Function.prototype && result[2].constructor === realm.global.TypeError && result[3] === "foreign")));
// One deep thenable graph verifies iterative assimilation and roots. Its
// terminal marker and monotone visited index provide independent invariants.
let chain = { terminal: true }, terminal = chain, visited = 0, valid = true;
const depth = 4096;
for (let index = depth - 1; index >= 0; --index) {
    const next = chain, expected = index;
    chain = { then(resolve) { valid = valid && visited === expected; ++visited; if (NATIVE_GC && visited % 257 === 0) $262.gc(); resolve(next); } };
}
(async function () {
    const received = await chain;
    print("fifo:" + (trace.join("|") === EXPECTED_TRACE));
    print("deep-resolution:" + (valid && visited === depth && received === terminal));
})();
`;

test("Await projects PromiseResolve identity and abrupt completion through one FIFO worklist", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-await-resolve-"));
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", entry = path.join(temporary, name + ".js"), output = path.join(temporary, name);
            const realmEntry = path.join(temporary, name + "-realm.js");
            await fs.writeFile(realmEntry, realmSource);
            await fs.writeFile(entry, source.replace("PLAN_JSON", JSON.stringify(plans))
                .replace("EXPECTED_TRACE", JSON.stringify(expectedTrace().join("|"))).replace("REALM_SOURCE", JSON.stringify(realmSource)).replaceAll("NATIVE_GC", String(!noGc)));
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, initializationEntries: [entry], additionalRoots: [realmEntry],
                isolatedScriptRoots: [entry, realmEntry], noGc, buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/await-promise-resolve.js#default", setupEntries: [], testEntry: entry, async: false,
                    scriptEntries: [entry, realmEntry], evalScriptEntries: [{ source: realmSource, entry: realmEntry }] },
                diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000,
                env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            if (observation.kind !== "normal") throw new Error(JSON.stringify(observation));
            expect((observation.stdout ?? "").trimEnd().split("\n").sort()).toEqual(["deep-resolution:true", "fifo:true", "realm:true"]);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 180_000);

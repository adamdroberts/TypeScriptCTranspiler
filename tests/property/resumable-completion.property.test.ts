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
let deepEvents = [];
function fresh() { return { marker: "retained", child: { value: 23 } }; }
async function deepSubject() { DEEP_TREE }
async function subject() {
    const events = [];
    const returned = { get then() { events.push("old-get"); return function (resolve) { resolve(-1); }; } };
    async function delayedReturn() {
        try { return returned; }
        finally {
            events.push("finally-start"); await 1;
            Object.defineProperty(returned, "then", { get() {
                events.push("new-get"); collect();
                return function (resolve) { events.push("then-call"); resolve(17); };
            }, configurable: true });
            events.push("finally-end"); collect();
        }
    }
    const value = await delayedReturn();
    check(value === 17 && events.join(",") === "finally-start,finally-end,new-get,then-call", "resolution-after-finalization");
    let observed = 0;
    const ignored = { get then() { observed++; throw "must remain unread"; } };
    async function override() { try { return ignored; } finally { await 1; return "override"; } }
    check(await override() === "override" && observed === 0, "overridden-return-skips-resolution");
    const promise = Promise.resolve(19);
    promise.then = function (resolve) { resolve(29); };
    Object.defineProperty(promise, "constructor", { get() { throw "return must not read constructor"; } });
    async function promiseReturn() { try { return promise; } finally { await 1; collect(); } }
    check(await promiseReturn() === 29, "return-uses-actual-then");
    const outer = { marker: "outer" }, inner = { marker: "inner" };
    async function nested() {
        try { return outer; }
        finally {
            skip: try { return inner; } finally { await 1; break skip; }
            await 1; collect();
        }
    }
    check(await nested() === outer, "region-local-pending-return");
    let conversions = 0;
    const abrupt = { [Symbol.toPrimitive]() { conversions++; throw "must remain unread"; } };
    async function rawThrow() { await 1; throw abrupt; }
    let preserved = false;
    try { await rawThrow(); } catch (reason) { preserved = reason === abrupt; }
    check(preserved && conversions === 0, "throw-completion-identity");
    async function finalThrow() { try { throw abrupt; } finally { await 1; collect(); } }
    preserved = false;
    try { await finalThrow(); } catch (reason) { preserved = reason === abrupt; }
    check(preserved && conversions === 0, "finalized-throw-identity");
    let self;
    async function cycle() { await 1; return self; }
    self = cycle();
    let selfRejected = false;
    try { await self; } catch (reason) { selfRejected = reason instanceof TypeError; }
    check(selfRejected, "async-self-resolution");
    const deep = await deepSubject();
    check(deep.marker === "retained" && deep.child.value === 23 && deepEvents.length === FINALIZATION_DEPTH &&
        deepEvents.every((value, index) => value === index), "deep-finalization-records");
}
subject().catch(reason => host.print("failure:" + String(reason)));
`;

const finalizationDepth = 256;
function program(noGc: boolean): string {
    let tree = "return fresh();";
    for (let index = 0; index < finalizationDepth; index++) {
        tree = `try { ${tree} } finally { await 1; collect(); deepEvents.push(${index}); }`;
    }
    return source.replace("DEEP_TREE", tree).replaceAll("FINALIZATION_DEPTH", String(finalizationDepth))
        .replaceAll("NATIVE_GC", String(!noGc));
}

test("resumable completions retain actual values until finalization finishes", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-resumable-completion-"));
    const expected = ["resolution-after-finalization", "overridden-return-skips-resolution", "return-uses-actual-then",
        "region-local-pending-return", "throw-completion-identity", "finalized-throw-identity", "async-self-resolution",
        "deep-finalization-records"].map(label => label + ":true");
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", subject = path.join(temporary, name + ".js"), driver = path.join(temporary, name + "-driver.js"), output = path.join(temporary, name);
            await fs.writeFile(subject, program(noGc)); await fs.writeFile(driver, "");
            const diagnostics: string[] = [];
            const result = await compile({ entry: driver, output, noGc, additionalRoots: [subject], initializationEntries: [subject, driver], buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/resumable-completion.js#sloppy", setupEntries: [], testEntry: driver, async: false },
                diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000, env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString())); expect(observation).toMatchObject({ kind: "normal" });
            expect((observation.stdout ?? "").trimEnd().split("\n")).toEqual(expected);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 300_000);

test("unrepresented ambient host values fail closed before native emission", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-resumable-host-owner-"));
    try {
        const entry = path.join(temporary, "subject.ts");
        await fs.writeFile(entry, "async function subject() { console.log(await 1); } subject();");
        const diagnostics: string[] = [];
        const result = await compile({ entry, output: path.join(temporary, "subject"), noGc: true,
            buildDir: path.join(temporary, "build"), diagnosticWriter: message => diagnostics.push(message) });
        expect(result.exitCode).toBe(3);
        expect(diagnostics.join("")).toContain("ambient host value requires an ordinary runtime owner");
        expect(await Bun.file(path.join(temporary, "subject")).exists()).toBe(false);
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
});

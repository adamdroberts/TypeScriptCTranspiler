import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const completions = {
    normal: `log.push("body");`, continue: `continue;`, break: `break;`,
    return: `return { answer: "body" };`, throw: `throw marker;`,
};
const finalizers = {
    normal: `log.push("finally");`, return: `return { answer: "finally" };`,
    throw: `throw finalError;`, break: `break;`, continue: `continue;`,
    outerBreak: `break exit;`, outerContinue: `continue exit;`,
};
const preamble = String.raw`
function tracked(log, name, count, closeError) {
    var index = 0;
    return { [Symbol.iterator]: function() { return {
        next: function() { log.push(name + "-next:" + index); return { done: index >= count, value: index++ }; },
        return: function() { log.push(name + "-return"); if (closeError) throw closeError; return {}; }
    }; } };
}
`;
const plans = Object.entries(completions).flatMap(([completion, body]) =>
    Object.entries(finalizers).map(([finalizer, finish]) => `{
        var log = [], marker = {}, finalError = {};
        function run() {
            exit: for (const outer of tracked(log, "outer", 2, null)) {
                try {
                    for (const inner of tracked(log, "inner", 2, null)) {
                        try { ${body} } finally { log.push("enter-finally"); ${finish} }
                    }
                } finally { log.push("outer-finally"); }
            }
            return { answer: "finished" };
        }
        try { print("plan:${completion}:${finalizer}:" + run().answer + ":" + log.join(",")); }
        catch (error) { print("plan:${completion}:${finalizer}:" + (error === marker ? "marker" : error === finalError ? "finally" : error.name) + ":" + log.join(",")); }
    }`),
).join("\n");

const partitions = String.raw`
for (var closeThrows of [false, true]) {
    for (var completion of ["return", "break", "throw"]) {
        var log = [], marker = {}, closeError = {};
        function closeRun() {
            try {
                for (const outer of tracked(log, "outer", 1, null)) {
                    for (const inner of tracked(log, "inner", 1, closeThrows ? closeError : null)) {
                        try {
                            if (completion === "return") return "returned";
                            if (completion === "break") break;
                            throw marker;
                        } catch (error) { log.push("body-catch"); throw error; }
                        finally { log.push("body-finally"); }
                    }
                    log.push("after-inner");
                }
            } catch (error) { log.push(error === closeError ? "close-catch" : "outer-catch"); throw error; }
            finally { log.push("exit-finally"); }
            return "finished";
        }
        try { print("close:" + closeThrows + ":" + completion + ":" + closeRun() + ":" + log.join(",")); }
        catch (error) { print("close:" + closeThrows + ":" + completion + ":" + (error === marker ? "marker" : error === closeError ? "close" : error.name) + ":" + log.join(",")); }
    }
}
function shadow() {
    let value = "outer", seen = [];
    try { let value = "inner"; return value; }
    finally { seen.push(value); value = "changed"; print("shadow:" + seen.join(",") + ":" + value); }
}
print("shadow-return:" + shadow());
function capturedFinally() {
    let value = "outer";
    try { let value = "inner"; return function() { return value; }; }
    finally { var callback = function() { value += "!"; return value; }; print("capture-finally:" + callback()); }
}
print("capture-return:" + capturedFinally()());
function constFinally() {
    const value = "outer";
    try { let value = "inner"; return value; }
    finally { try { value = "write"; } catch (error) { print("const-finally:" + error.name); } }
}
print("const-return:" + constFinally());
var log = [];
outer: while (log.length < 4) {
    try { for (const inner of tracked(log, "inner", 1, null)) { returnNotAllowed: { break returnNotAllowed; } break outer; } }
    finally { log.push("while-finally"); continue outer; }
}
print("while-override:" + log.join(","));
var log = [];
for (var index = 0; index < 2; index++) {
    try { for (const value of tracked(log, "inner", 1, null)) { break; } }
    finally { log.push("for-finally:" + index); continue; }
}
print("for-override:" + log.join(","));
var log = [], marker = {};
function closeThenFinally() {
    try { for (const value of tracked(log, "inner", 1, null)) return { answer: 9 }; }
    finally { log.push("after-close"); if (NATIVE_GC) $262.gc(); }
}
print("root-return:" + closeThenFinally().answer + ":" + log.join(","));
function overrideReturn() {
    try { return { answer: "old" }; }
    finally { if (NATIVE_GC) $262.gc(); return { answer: "new" }; }
}
print("override-return:" + overrideReturn().answer);
var phase = 0, valid = true, marker = {}, depth = 1200;
function descend(level) {
    var iterable = { [Symbol.iterator]: function() { return {
        next: function() { return { done: false, value: level }; },
        return: function() { if (phase !== level * 3 + 1) valid = false; phase++; return {}; }
    }; } };
    try {
        for (const value of iterable) {
            try { if (level === 0) throw marker; return descend(level - 1); }
            finally { if (phase !== level * 3) valid = false; phase++; }
        }
    } finally { if (phase !== level * 3 + 2) valid = false; phase++; }
}
try { descend(depth - 1); } catch (error) { print("stress:" + (error === marker) + ":" + valid + ":" + phase); }
`;

const scriptPlans = [false, true].flatMap(catchBody =>
    ["", "91;"].flatMap(finalValue => ["", "break;", "continue;"].map(transfer => ({
        source: `for (var index = 0; index < 2; index++) {
            if (index) { try { ${catchBody ? "throw 0;" : "50;"} }
                ${catchBody ? "catch (error) { 70; }" : ""}
                finally { ${finalValue} ${transfer} } }
            else { 4; }
        }`,
    }))),
);

test("try and finalizer completion values follow UpdateEmpty through the Script tree", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-finally-script-"));
    const expected = scriptPlans.map(plan => String(new Function(`return eval(${JSON.stringify(plan.source)});`)()));
    try {
        const entries = scriptPlans.map((plan, index) => ({ ...plan, entry: path.join(temporary, `eval-${index}.js`) }));
        for (const entry of entries) await fs.writeFile(entry.entry, entry.source);
        const main = path.join(temporary, "main.js");
        await fs.writeFile(main, entries.map(entry => `print(String($262.evalScript(${JSON.stringify(entry.source)})));`).join("\n"));
        const roots = [main, ...entries.map(entry => entry.entry)];
        for (const noGc of [false, true]) {
            const output = path.join(temporary, noGc ? "no-gc" : "gc");
            const diagnostics: string[] = [];
            const result = await compile({ entry: main, output, noGc, additionalRoots: roots,
                initializationEntries: [main], isolatedScriptRoots: roots, ignoreCheckJsDirectiveRoots: roots,
                buildDir: path.join(temporary, noGc ? "build-no-gc" : "build-gc"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/finally-script.js#sloppy",
                    setupEntries: [], testEntry: main, async: false, scriptEntries: roots, evalScriptEntries: entries },
                diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe" });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            expect(observation.kind).toBe("normal");
            expect((observation.stdout ?? "").trimEnd().split("\n")).toEqual(expected);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 180_000);

test("synchronous completions leave one lexical scope worklist and preserve finalizer overrides", async () => {
    const source = preamble + plans + partitions;
    const expected: string[] = [];
    new Function("print", source.replaceAll("NATIVE_GC", "false"))((value: unknown) => expected.push(String(value)));
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-sync-completion-"));
    try {
        for (const noGc of [false, true]) {
            const entry = path.join(temporary, noGc ? "subject-no-gc.js" : "subject.js");
            await fs.writeFile(entry, source.replaceAll("NATIVE_GC", String(!noGc)));
            const output = path.join(temporary, noGc ? "no-gc" : "gc");
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, initializationEntries: [entry], noGc,
                buildDir: path.join(temporary, noGc ? "build-no-gc" : "build-gc"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/sync-completion.js#sloppy",
                    setupEntries: [], testEntry: entry, async: false }, diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            expect(observation.kind).toBe("normal");
            const actual = (observation.stdout ?? "").trimEnd().split("\n");
            expect(actual.length).toBe(expected.length);
            expect(expected.flatMap((value, index) => actual[index] === value ? [] : [{ index, expected: value, actual: actual[index] }]).slice(0, 12)).toEqual([]);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 240_000);

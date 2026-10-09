import { expect, test } from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

// The host evaluates the same generated programs, independently of physical
// storage, capture planning, and native loop lowering.
const values = ["17", '"text"', "true", "null", "undefined", "19n", '{ tag: "owner" }'];
const generated = values.flatMap((value, index) => ["var", "let", "const"].map(kind => `
    (function() {
        var readers = [], steps = 0;
        for (${kind} value = ${value}; steps < 3; steps++) {
            readers.push(function() { return value; });
            print("binding:${kind}:${index}:" + typeof value + ":" + String(value));
            ${kind === "const"
                ? 'try { value = "changed"; } catch (error) { print("immutable:" + (error instanceof TypeError)); }'
                : 'value = { tag: steps };'}
            collect();
        }
        print("retained:${kind}:${index}:" + readers.map(function(f) {
            var value = f(); return value && value.tag !== undefined ? value.tag : String(value);
        }).join(","));
    })();
`)).join("\n");

const partitions = String.raw`
function collect() { if (NATIVE_GC) $262.gc(); }
var initial, bodies = [], conditions = [], updates = [];
for (let index = 0, reader = function() { return index; };
    (conditions.push(function() { return index; }), index < 3);
    (updates.push(function() { return index; }), index++)) {
    initial = reader; bodies.push(function() { return index; }); collect();
}
function observe(readers) { return readers.map(function(f) { return f(); }).join(","); }
print("edges:" + initial() + ":" + observe(bodies) + ":" + observe(conditions) + ":" + observe(updates));
var retained = [];
for (let step = 0; step < 3;) { retained.push(function() { return step; }); step++; continue; }
print("no-update:" + observe(retained));
var retained = [], trace = [];
outer: for (let index = 0; index < 3; (trace.push("update:" + index), index++)) {
    for (let inner = 0; inner < 2; inner++) {
        try { retained.push(function() { return index; }); continue outer; }
        finally { trace.push("finally:" + index); }
    }
}
print("continue:" + observe(retained) + ":" + trace.join(","));
var stopped, updateRan = false;
for (let index = 5; true; (updateRan = true, index++)) { stopped = function() { return index; }; break; }
print("break:" + stopped() + ":" + updateRan);
var same = [], control = 0;
for (const owner = { tag: 0 }; control < 3; control++) {
    same.push(function() { return owner; }); owner.tag++; collect();
}
print("const-environment:" + (same[0]() === same[2]()) + ":" + same[0]().tag);
for (let [first, { value = first + 1, ...rest } = { extra: "kept" }] = [0]; first < 2; first++) {
    print("pattern:" + first + ":" + value + ":" + rest.extra);
}
try { for (let self = self; false;) {} } catch (error) { print("self-tdz:" + (error instanceof ReferenceError)); }
try { for (let first = later, later = 1; false;) {} } catch (error) { print("later-tdz:" + (error instanceof ReferenceError)); }
try { for (let [first = later, later] = []; false;) {} } catch (error) { print("pattern-tdz:" + (error instanceof ReferenceError)); }
var escaped;
try { for (let first = (escaped = function() { return later; }), later = escaped(); false;) {} }
catch (error) { print("captured-tdz:" + (error instanceof ReferenceError)); }
try { escaped(); } catch (error) { print("escaped-tdz:" + (error instanceof ReferenceError)); }
(function() {
    for (var radix = 11; radix <= 36; radix++) {
        for (let digit = 10; digit < radix; digit++) {
            if (digit.toString(radix) !== String.fromCharCode(digit + 87)) throw "radix mismatch";
        }
    }
    print("var-after:" + radix);
})();
// One retained-environment stress verifies that neither declaration width nor
// the number of runtime iterations selects a different storage algorithm.
var depth = 4096, owners = [], valid = true;
for (let index = 0, owner = { tag: 0 }; index < depth; (index++, owner = { tag: index })) {
    owners.push(function() { return owner; });
    if (index % 257 === 0) collect();
}
collect();
for (var index = 0; index < depth; index++) valid = valid && owners[index]().tag === index;
print("stress:" + valid);
`;

test("for declaration lists retain storage, TDZ and source-ordered iteration environments", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-for-declaration-"));
    try {
        for (const strict of [false, true]) {
            const program = (strict ? '"use strict";\n' : "") + partitions + generated;
            const expected: string[] = [];
            new Function("print", program.replaceAll("NATIVE_GC", "false"))((value: unknown) => expected.push(String(value)));
            for (const noGc of [false, true]) {
                const name = `${strict ? "strict" : "sloppy"}-${noGc ? "no-gc" : "gc"}`;
                const entry = path.join(temporary, name + ".js"), output = path.join(temporary, name);
                await fs.writeFile(entry, program.replaceAll("NATIVE_GC", String(!noGc)));
                const diagnostics: string[] = [];
                const result = await compile({ entry, output, initializationEntries: [entry], noGc,
                    buildDir: path.join(temporary, name + "-build"),
                    test262Observation: { kind: "test262-native-observation", scenarioId: `property/for-declaration.js#${strict ? "strict" : "sloppy"}`,
                        setupEntries: [], testEntry: entry, async: false }, diagnosticWriter: message => diagnostics.push(message) });
                expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
                const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000,
                    env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
                expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
                const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
                expect(observation.kind).toBe("normal");
                const actual = (observation.stdout ?? "").trimEnd().split("\n");
                expect(actual.length).toBe(expected.length);
                expect(expected.flatMap((value, index) => actual[index] === value ? [] : [{ index, expected: value, actual: actual[index] }]).slice(0, 12)).toEqual([]);
            }
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 240_000);

const suspendedSource = String.raw`
const host: any = globalThis;
function collect(): void { if (NATIVE_GC) host.$262.gc(); }
async function run(): Promise<void> {
    const bodies: Array<() => any> = [], updates: Array<() => any> = [];
    let original: () => any = () => null;
    for (let index = 0, owner: any = { tag: 0 }, reader = () => index;
        await Promise.resolve(index < 3);
        (updates.push(() => owner), index = await Promise.resolve(index + 1), owner = { tag: index })) {
        original = reader; bodies.push(() => owner);
        collect(); await Promise.resolve();
        if (index === 1) continue;
    }
    collect();
    host.print("suspended:" + original() + ":" + bodies.map(f => f().tag).join(",") +
        ":" + updates.map(f => f().tag).join(","));
    let steps = 0;
    const shared: Array<() => any> = [];
    for (const owner: any = { tag: 0 }; steps < 3; steps++) {
        shared.push(() => owner); owner.tag++; await Promise.resolve(); collect();
    }
    host.print("const:" + (shared[0]() === shared[2]()) + ":" + shared[0]().tag);
    const variable: Array<() => number> = [];
    for (var value = 0; value < 3; value++) { variable.push(() => value); await Promise.resolve(); }
    host.print("var:" + variable.map(f => f()).join(","));
    try {
        for (let read: () => number = () => later, first: number = read(), later: number = 1; false;) {
            await Promise.resolve();
        }
    } catch (error) { host.print("tdz:" + (error instanceof ReferenceError)); }
    const source: any = [0];
    const patterns: Array<() => number> = [];
    for (let [index, next = index + 1] = await Promise.resolve(source); index < 3; index++) {
        patterns.push(() => index + next); await Promise.resolve(); collect();
    }
    host.print("pattern:" + patterns.map(f => f()).join(","));
}
const completion = run();
`;

test("suspended for heads project the same declaration cells onto CFG entry and copy edges", async () => {
    const expected: string[] = [];
    const javascript = ts.transpileModule(suspendedSource.replaceAll("NATIVE_GC", "false"),
        { compilerOptions: { target: ts.ScriptTarget.ESNext } }).outputText;
    await new Function("globalThis", javascript + "\nreturn completion;")({ print: (value: unknown) => expected.push(String(value)) });
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-for-suspended-"));
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc";
            const entry = path.join(temporary, "driver-" + name + ".js"), subject = path.join(temporary, "subject-" + name + ".ts");
            const output = path.join(temporary, name);
            await fs.writeFile(entry, "");
            await fs.writeFile(subject, suspendedSource.replaceAll("NATIVE_GC", String(!noGc)));
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, additionalRoots: [subject], initializationEntries: [subject, entry], noGc,
                buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/for-suspended.js#sloppy",
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
}, 180_000);

test("unrepresented for-head disposal records fail through the shared completion diagnostic", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-for-disposal-"));
    try {
        const entry = path.join(temporary, "subject.ts"), diagnostics: string[] = [];
        await fs.writeFile(entry, "for (using resource: any = null; false;) {}");
        const result = await compile({ entry, output: path.join(temporary, "output"),
            buildDir: path.join(temporary, "build"), diagnosticWriter: message => diagnostics.push(message) });
        expect(result.exitCode).not.toBe(0);
        expect(diagnostics.join("")).toContain("synchronous completion cannot represent disposal scopes");
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
});

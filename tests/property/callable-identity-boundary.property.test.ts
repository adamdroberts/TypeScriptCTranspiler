import { expect, test } from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const source = `const host: any = globalThis;
function collect(): void { if (NATIVE_GC) host.$262.gc(); }
function borrow(fn: (...values: any[]) => any): any { collect(); return fn; }
function invoke(fn: (...values: any[]) => any, values: any[]): any { return fn(...values); }
const original: any = (...values: any[]): any => { collect(); return values; };
original.tag = "retained";
const borrowed = borrow(original);
host.print("identity:" + Object.is(borrowed, original) + ":" + borrowed.tag);
function fixed(fn: (value: any) => any): (value: any) => any { collect(); return fn; }
host.print("native-equality:" + (fixed(original) === fixed(original)) + ":" + (fixed(original) == fixed(original)));
function inspect(fn: () => any): string { return typeof fn + ":" + (typeof fn === "function") + ":" + Boolean(fn) + ":" + Object.is(fn ?? original, original); }
const absent: any = null, empty: any = undefined, zero: any = 0;
host.print("noncallable-null:" + inspect(absent));
host.print("noncallable-undefined:" + inspect(empty));
host.print("noncallable-zero:" + inspect(zero));
let uninitialized!: () => any;
host.print("uninitialized:" + inspect(uninitialized));
let missing!: (value: any) => any;
const callTrace: string[] = [];
function argument(): any { callTrace.push("argument"); return 1; }
try { missing(argument()); } catch (error) { host.print("noncallable-call:" + (error instanceof TypeError) + ":" + callTrace.join(",")); }
const marker: any = {}, symbol = Symbol("payload"), array: any[] = [3], callable: any = () => 7;
const values: any[] = [undefined, null, -0, NaN, 11n, symbol, marker, array, callable];
const actual: any = invoke(original, values);
let valid = actual.length === values.length;
for (let index = 0; index < values.length; index++) valid = valid && Object.is(actual[index], values[index]);
host.print("actual-list:" + valid);
function factory(): (this: any, first: any, ...values: any[]) => any {
    return function(this: any, first: any, ...values: any[]): any { collect(); return [this, first, values]; };
}
const returned: any = factory(), receiver: any = {};
const called: any = returned.call(receiver, marker, ...values);
valid = Object.is(called[0], receiver) && Object.is(called[1], marker) && called[2].length === values.length;
for (let index = 0; index < values.length; index++) valid = valid && Object.is(called[2][index], values[index]);
host.print("returned:" + valid + ":" + returned.name + ":" + returned.length + ":" + Object.prototype.hasOwnProperty.call(returned, "prototype"));
const owner: any = {};
Object.defineProperty(owner, "run", { get() {
    return function(first: any, ...rest: any[]): string { return first + ":" + rest.join(","); };
} });
const fromGetter: any = owner.run;
host.print("getter:" + fromGetter("head", 1, 2) + ":" + fromGetter.length);
function count(...values: any[]): number { return values.length; }
const arrayParameter: (values: any[]) => number = count;
host.print("packing-view:" + arrayParameter([1, 2, 3]) + ":" + Object.is(arrayParameter as any, count as any));
function borrowArray(values: ((value: any) => any)[]): any { collect(); return values; }
const functionArray: any[] = [callable], arrayAlias: any = functionArray;
const nativeArray = borrowArray(functionArray);
host.print("array:" + Object.is(nativeArray, arrayAlias) + ":" + Object.is(nativeArray[0], callable) + ":" + nativeArray[0]());
const reason: any = {};
const thrower: any = (...values: any[]): any => { collect(); throw values[0]; };
try { invoke(thrower, [reason]); } catch (error) { host.print("abrupt:" + Object.is(error, reason)); }
function borrowZero(fn: () => any): any { collect(); return fn; }
let head: any = null;
for (let index = 0; index < 2048; index++) {
    const previous = head, position = index;
    head = (): any => ({ previous: previous, position: position });
}
collect();
let cursor: any = head, expected = 2047;
valid = Object.is(borrowZero(head), head);
while (cursor !== null) {
    const borrowedCursor = borrowZero(cursor), entry: any = borrowedCursor();
    valid = valid && Object.is(borrowedCursor, cursor) && entry.position === expected;
    expected--; cursor = entry.previous;
}
host.print("owner-graph:" + valid + ":" + expected);
`;

test("native callable owners preserve identity, parameter plans and rooted argument values", async () => {
    const expected: string[] = [];
    new Function("globalThis", ts.transpileModule(source.replaceAll("NATIVE_GC", "false"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText)({ print: (value: unknown) => expected.push(String(value)) });
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-callable-identity-"));
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", entry = path.join(temporary, name + ".ts"), driver = path.join(temporary, name + "-driver.js"), output = path.join(temporary, name);
            await fs.writeFile(entry, source.replaceAll("NATIVE_GC", String(!noGc))); await fs.writeFile(driver, "");
            const diagnostics: string[] = [];
            const result = await compile({ entry: driver, output, noGc, additionalRoots: [entry], initializationEntries: [entry, driver], buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/callable-identity.ts#strict", setupEntries: [], testEntry: driver, async: false },
                diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000, env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString())); expect(observation.kind).toBe("normal");
            const actual = (observation.stdout ?? "").trimEnd().split("\n"); expect(actual.length).toBe(expected.length);
            expect(expected.flatMap((line, index) => line === actual[index] ? [] : [{ index, expected: line, actual: actual[index] }])).toEqual([]);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 240_000);

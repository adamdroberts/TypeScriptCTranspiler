import { expect, test } from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const source = String.raw`
"use strict";
const host: any = globalThis;
function collect(): void { if (NATIVE_GC) host.$262.gc(); }
const prototype: any = Number.prototype;
const original: any = Object.getOwnPropertyDescriptor(prototype, "toString");
const method: any = (1).toString;
const computed: any = (1)["toString"];
host.print("method-value:" + (method === computed));
const marker: any = { tag: "payload" };
let trace = "";
function mark(label: string): number { trace += label; collect(); return 16; }
function describe(error: any): string {
    return error === marker ? "payload" : error instanceof RangeError ? "RangeError" : error instanceof TypeError ? "TypeError" : "other";
}
const values: number[] = [0, -0, NaN, Infinity, -Infinity, 255, 10.5];
const radices: any[] = [undefined, null, NaN, Infinity, 1, 37, 2.9, "16", true, 16n, Symbol("radix"),
    { valueOf: function(): number { trace += "V"; collect(); return 16; } },
    { [Symbol.toPrimitive]: function(hint: string): number { trace += hint; collect(); return 16; } },
    { valueOf: function(): any { throw marker; } }];
for (let index = 0; index < values.length; index++) {
    const value: number = values[index], boxed: any = value, wrapper: Number = new Number(value);
    for (let position = 0; position < radices.length; position++) {
        const radix: any = radices[position];
        trace = "";
        try { host.print("typed:" + index + ":" + position + ":" + value.toString(radix, mark("A")) + ":" + trace); }
        catch (error) { host.print("typed-error:" + index + ":" + position + ":" + describe(error) + ":" + trace); }
        trace = "";
        try { host.print("boxed:" + index + ":" + position + ":" + boxed.toString(radix, mark("A")) + ":" + trace); }
        catch (error) { host.print("boxed-error:" + index + ":" + position + ":" + describe(error) + ":" + trace); }
        trace = "";
        try { host.print("wrapper:" + index + ":" + position + ":" + wrapper.toString(radix) + ":" + trace); }
        catch (error) { host.print("wrapper-error:" + index + ":" + position + ":" + describe(error) + ":" + trace); }
    }
}
trace = "";
try { Reflect.apply(method, {}, [radices[13]]); } catch (error) { host.print("receiver-first:" + describe(error) + ":" + trace); }
const bigint: any = 255n;
host.print("bigint-radix:" + bigint.toString(radices[11]));
trace = "";
const key: any = { [Symbol.toPrimitive]: function(hint: string): string { trace += hint; collect(); return "toString"; } };
const lookup: any = (1 as any)[key];
host.print("computed-key:" + (lookup === method) + ":" + trace);
trace = "";
host.print("computed-call:" + (255 as any)[key](radices[11]) + ":" + trace);
try {
    let getterReceiver: any;
    Object.defineProperty(prototype, "toString", { configurable: true, get: function(this: any): any {
        trace += "G"; getterReceiver = this; collect();
        return function(this: any, ...args: any[]): any { trace += "C"; collect(); return { receiver: this, args }; };
    } });
    trace = "";
    const value: number = 255;
    const result: any = value.toString(mark("A"), mark("B"));
    host.print("lookup:" + trace + ":" + (getterReceiver === value) + ":" + (result.receiver === value) + ":" + result.args.length);
    const captured: any = value.toString;
    Object.defineProperty(prototype, "toString", { configurable: true, value: null });
    trace = "";
    const missing: any = value.toString?.(mark("never"));
    const absent: any = null;
    const skipped: any = absent?.(mark("never"));
    const missingReceiver: any = undefined;
    const receiverSkipped: any = missingReceiver?.toString(mark("never"));
    host.print("optional:" + trace + ":" + (missing === undefined) + ":" + (skipped === undefined) + ":" + (receiverSkipped === undefined));
    try { value.toString(mark("A")); } catch (error) { host.print("non-callable:" + describe(error) + ":" + trace); }
    const payload: any = { tag: "retained" };
    trace = "";
    const capturedResult: any = Reflect.apply(captured, value, [payload]);
    host.print("captured:" + trace + ":" + (capturedResult.args[0] === payload));
    Object.defineProperty(prototype, "toString", { configurable: true, get: function(this: any): any {
        trace += "G";
        return function(this: any, ...args: any[]): any { trace += "C"; return args; };
    } });
    trace = "";
    const iterable: any = { [Symbol.iterator]: function(): any {
        trace += "I"; let index = 0;
        return { next: function(): any { trace += "N"; return index++ === 0 ? { value: payload, done: false } : { done: true }; } };
    } };
    const list: any = value.toString(mark("A"), ...iterable, mark("B"));
    host.print("spread:" + trace + ":" + list.length + ":" + (list[1] === payload));
    Object.defineProperty(prototype, "toString", { configurable: true, get: function(): any { throw marker; } });
    trace = "";
    try { value.toString(mark("never")); } catch (error) { host.print("getter-throw:" + describe(error) + ":" + trace); }
} finally { Object.defineProperty(prototype, "toString", original); }
function deepRadix(depth: number): any {
    return { [Symbol.toPrimitive]: function(hint: string): number {
        if (hint !== "number") throw marker;
        if (depth > 0 && (255).toString(deepRadix(depth - 1)) !== "ff") throw marker;
        if (depth % 127 === 0) collect();
        return 16;
    } };
}
host.print("stress:" + ((255).toString(deepRadix(1200)) === "ff"));
`;

test("Number text calls preserve actual lookup, ToNumber, argument Lists and optional boundaries", async () => {
    const expected: string[] = [];
    new Function("globalThis", ts.transpileModule(source.replaceAll("NATIVE_GC", "false"),
        { compilerOptions: { target: ts.ScriptTarget.ESNext } }).outputText)({ print: (value: unknown) => expected.push(String(value)) });
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-number-call-"));
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", entry = path.join(temporary, name + "-driver.js");
            const subject = path.join(temporary, name + "-subject.ts"), output = path.join(temporary, name);
            await fs.writeFile(entry, ""); await fs.writeFile(subject, source.replaceAll("NATIVE_GC", String(!noGc)));
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, additionalRoots: [subject], initializationEntries: [subject, entry], noGc,
                buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/number-call.js#strict",
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
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 180_000);

test("ordinary Number method lookup retains strict and sloppy callback receiver semantics", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-number-receiver-"));
    const program = String.raw`
        var original = Object.getOwnPropertyDescriptor(Number.prototype, "toString"), getterReceiver;
        Object.defineProperty(Number.prototype, "toString", { configurable: true, get: function() {
            getterReceiver = this;
            return function() { return { receiver: this, count: arguments.length }; };
        } });
        try {
            var result = (7).toString("first", "ignored");
            print(typeof getterReceiver + ":" + typeof result.receiver + ":" +
                (getterReceiver === 7) + ":" + (result.receiver === 7) + ":" + result.count);
        } finally { Object.defineProperty(Number.prototype, "toString", original); }
    `;
    try {
        for (const strict of [false, true]) {
            const source = (strict ? '"use strict";\n' : "") + program, expected: string[] = [];
            new Function("print", source)((value: unknown) => expected.push(String(value)));
            const name = strict ? "strict" : "sloppy", entry = path.join(temporary, name + ".js"), output = path.join(temporary, name);
            await fs.writeFile(entry, source);
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, initializationEntries: [entry],
                buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: `property/number-receiver.js#${name}`,
                    setupEntries: [], testEntry: entry, async: false }, diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000 });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            expect(observation.kind).toBe("normal");
            expect((observation.stdout ?? "").trimEnd().split("\n")).toEqual(expected);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 180_000);

import { expect, test } from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

// The oracle uses the host's Object/Array algorithms with empty reserved
// arguments. Its ECMA-402 Array invokes elements with two undefined options;
// the pinned ECMA-262 fallback invokes them with an empty List. Callback
// assertions account for that explicit difference. Numeric text comes from
// String, the selected fallback, rather than the host's Intl implementation.
const source = String.raw`
"use strict";
const host: any = globalThis;
function collect(): void { if (NATIVE_GC) host.$262.gc(); }
const freshSymbol: symbol = Symbol("before-prototype"), symbolWrapper: Symbol = Object(freshSymbol);
collect();
host.print("symbol-first:" + freshSymbol.description + ":" + symbolWrapper.description);
const objectMethod: any = Object.prototype.toLocaleString;
const arrayMethod: any = Array.prototype.toLocaleString;
const numberMethod: any = Number.prototype.toLocaleString;
const bigintPrototype: any = BigInt.prototype;
const bigintMethod: any = bigintPrototype.toLocaleString;
const marker: any = { tag: "payload" };
const poison: any = { [Symbol.toPrimitive]: function(): any { throw marker; } };
const reserved: any[] = ORACLE_MODE ? [] : [poison, poison, poison];
let trace = "";
function describe(error: any): string {
    return error === marker ? "payload" : error instanceof TypeError ? "TypeError" : "other";
}
const numbers: number[] = [0, -0, NaN, Infinity, -Infinity, Number.MIN_VALUE, Number.MAX_VALUE, 1e21, 1e-7, 1.125, -1234.5];
for (let index = 0; index < numbers.length; index++) {
    const value: number = numbers[index], boxed: any = value;
    collect();
    host.print("number:" + index + ":" + (ORACLE_MODE ? String(value) : value.toLocaleString(...reserved)) + ":" +
        (ORACLE_MODE ? String(value) : boxed.toLocaleString(...reserved)) + ":" +
        (ORACLE_MODE ? String(value) : new Number(value).toLocaleString(...reserved)));
}
const bigints: bigint[] = [0n, -1n, 255n, (1n << 1024n) + 127n, -((1n << 1024n) + 127n)];
for (let index = 0; index < bigints.length; index++) {
    const value: bigint = bigints[index], boxed: any = value, wrapper: any = Object(value);
    collect();
    host.print("bigint:" + index + ":" + (ORACLE_MODE ? String(value) : value.toLocaleString(...reserved)) + ":" +
        (ORACLE_MODE ? String(value) : boxed.toLocaleString(...reserved)) + ":" +
        (ORACLE_MODE ? String(value) : wrapper.toLocaleString(...reserved)));
}
for (const prototype of [Number.prototype, bigintPrototype]) {
    const descriptor: any = Object.getOwnPropertyDescriptor(prototype, "toLocaleString"), method: any = descriptor.value;
    host.print("metadata:" + method.name + ":" + method.length + ":" + descriptor.writable + ":" +
        descriptor.enumerable + ":" + descriptor.configurable + ":" + ("prototype" in method));
    for (const receiver of [{}, true, "value", null, undefined, Symbol("receiver")]) {
        try { Reflect.apply(method, receiver, reserved); }
        catch (error) { host.print("brand:" + describe(error)); }
    }
}
for (const prototype of [bigintPrototype, Symbol.prototype]) {
    try { Reflect.apply(prototype.valueOf, prototype, []); }
    catch (error) { host.print("prototype-brand:" + describe(error)); }
}
const description: any = Object.getOwnPropertyDescriptor(Symbol.prototype, "description");
for (const receiver of [Symbol.prototype, {}, 1, null]) {
    try { Reflect.apply(description.get, receiver, []); }
    catch (error) { host.print("description-brand:" + describe(error)); }
}
const bigintValue: bigint = 1n, symbolValue: symbol = Symbol("identity"), booleanValue: boolean = true;
host.print("primitive-method-values:" + (bigintValue.toLocaleString === bigintMethod) + ":" +
    (symbolValue.toLocaleString === objectMethod) + ":" + (booleanValue.toLocaleString === objectMethod));
const returned: any[] = [0, -0, NaN, 1n, Symbol("result"), undefined, null, marker, "text"];
for (let index = 0; index < returned.length; index++) {
    trace = "";
    const result: any = returned[index], receiver: any = {};
    Object.defineProperty(receiver, "toString", { get: function(this: any): any {
        trace += this === receiver ? "G" : "wrong"; collect();
        return function(this: any, ...args: any[]): any {
            trace += this === receiver ? "C" : "wrong"; collect();
            if (args.length !== 0) throw marker;
            return result;
        };
    } });
    const observed: any = Reflect.apply(objectMethod, receiver, reserved);
    host.print("object:" + index + ":" + Object.is(observed, result) + ":" + trace);
    trace = "";
    const direct: any = Object.prototype.toLocaleString.call(receiver, poison);
    host.print("object-call:" + index + ":" + Object.is(direct, result) + ":" + trace);
}
for (const candidate of [undefined, null, 7, marker]) {
    const receiver: any = { toString: candidate, valueOf: function(): string { throw marker; } };
    try { Reflect.apply(objectMethod, receiver, reserved); }
    catch (error) { host.print("object-noncallable:" + describe(error)); }
}
for (const receiver of [null, undefined]) {
    try { Reflect.apply(objectMethod, receiver, reserved); } catch (error) { host.print("object-nullish:" + describe(error)); }
    try { Reflect.apply(arrayMethod, receiver, reserved); } catch (error) { host.print("array-nullish:" + describe(error)); }
}
const throwing: any = {};
Object.defineProperty(throwing, "toString", { get: function(): any { throw marker; } });
try { Reflect.apply(objectMethod, throwing, reserved); } catch (error) { host.print("object-getter:" + describe(error)); }
const kinds: string[] = ["value", "null", "undefined", "missing", "number", "symbol", "throw", "coerce"];
for (const kind of kinds) {
    trace = "";
    const entry: any = {};
    if (kind === "null") entry.toLocaleString = null;
    else if (kind === "undefined") entry.toLocaleString = undefined;
    else if (kind !== "missing") entry.toLocaleString = function(this: any, ...args: any[]): any {
        trace += "C"; collect();
        if (this !== entry || args.length !== (ORACLE_MODE ? 2 : 0)) throw marker;
        if (kind === "throw") throw marker;
        if (kind === "symbol") return Symbol("result");
        if (kind === "number") return 1234.5;
        if (kind === "coerce") return { [Symbol.toPrimitive]: function(hint: string): string { trace += hint; collect(); return "converted"; } };
        return "text";
    };
    if (kind === "missing") Object.setPrototypeOf(entry, null);
    const array: any[] = [null, entry, undefined];
    try { host.print("array-entry:" + kind + ":" + Reflect.apply(arrayMethod, array, reserved) + ":" + trace); }
    catch (error) { host.print("array-error:" + kind + ":" + describe(error) + ":" + trace); }
}
for (const rawLength of [-2, 0, 2.9, "2", { valueOf: function(): number { trace += "V"; collect(); return 2; } },
    { [Symbol.toPrimitive]: function(hint: string): number { trace += hint; collect(); return 2; } },
    { valueOf: function(): any { throw marker; } }, Symbol("length"), 1n]) {
    trace = "";
    const receiver: any = { length: rawLength, 0: null, 1: { toLocaleString: function(): string { trace += "C"; collect(); return "last"; } } };
    try { host.print("length:" + Reflect.apply(arrayMethod, receiver, reserved) + ":" + trace); }
    catch (error) { host.print("length-error:" + describe(error) + ":" + trace); }
}
trace = "";
const inherited: any = { 0: { toLocaleString: function(): string { trace += "I"; collect(); return "inherited"; } } };
const arrayLike: any = Object.create(inherited);
Object.defineProperty(arrayLike, "length", { get: function(): any {
    trace += "L"; collect(); return { valueOf: function(): number { trace += "V"; collect(); return 3; } };
} });
Object.defineProperty(arrayLike, "1", { get: function(): any {
    trace += "G"; collect(); delete arrayLike[2];
    return { toLocaleString: function(): string { trace += "C"; collect(); return "middle"; } };
} });
arrayLike[2] = { toLocaleString: function(): string { throw marker; } };
host.print("inherited:" + Reflect.apply(arrayMethod, arrayLike, reserved) + ":" + trace);
host.print("primitive-array:" + Reflect.apply(arrayMethod, "ab", reserved));
const native: number[] = [1, 2];
const nativeMethod: any = native.toLocaleString;
host.print("array-method-value:" + (nativeMethod === arrayMethod));
try {
    const prototype: any = Number.prototype;
    const original: any = Object.getOwnPropertyDescriptor(prototype, "toLocaleString");
    try {
        Object.defineProperty(prototype, "toLocaleString", { configurable: true, get: function(this: any): any {
            trace += "G"; collect();
            return function(this: any, ...args: any[]): any { trace += "C"; collect(); return { receiver: this, args }; };
        } });
        function mark(label: string): number { trace += label; collect(); return 2; }
        trace = "";
        const value: number = 7;
        const result: any = value.toLocaleString(mark("A"), mark("B"), mark("D"));
        host.print("lookup:" + trace + ":" + (result.receiver === value) + ":" + result.args.length);
        trace = "";
        value.toLocaleString();
        host.print("unused-call:" + trace);
        Object.defineProperty(prototype, "toLocaleString", { configurable: true, value: null });
        trace = "";
        const skipped: any = value.toLocaleString?.(mark("never"));
        host.print("optional:" + (trace === "") + ":" + (skipped === undefined));
    } finally { Object.defineProperty(prototype, "toLocaleString", original); }
} catch (error) { host.print("unexpected:" + describe(error)); }
const stress: any[] = [];
let expected = "";
for (let index = 0; index < 4096; index++) {
    const label = "x" + String(index % 7);
    stress.push({ toLocaleString: function(): string { if (index % 127 === 0) collect(); return label; } });
    expected += (index === 0 ? "" : ",") + label;
}
host.print("stress:" + (Reflect.apply(arrayMethod, stress, reserved) === expected));
`;

test("locale invocation preserves generic results, live indexed access and the ECMA-262 fallback", async () => {
    const expected: string[] = [];
    new Function("globalThis", ts.transpileModule(source.replaceAll("NATIVE_GC", "false").replaceAll("ORACLE_MODE", "true"),
        { compilerOptions: { target: ts.ScriptTarget.ESNext } }).outputText)({ print: (value: unknown) => expected.push(String(value)) });
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-locale-invoke-"));
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", entry = path.join(temporary, name + "-driver.js");
            const subject = path.join(temporary, name + "-subject.ts"), output = path.join(temporary, name);
            await fs.writeFile(entry, ""); await fs.writeFile(subject, source.replaceAll("NATIVE_GC", String(!noGc)).replaceAll("ORACLE_MODE", "false"));
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, additionalRoots: [subject], initializationEntries: [subject, entry], noGc,
                buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/locale-invoke.js#strict",
                    setupEntries: [], testEntry: entry, async: false }, diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000,
                env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString())); expect(observation.kind).toBe("normal");
            const actual = (observation.stdout ?? "").trimEnd().split("\n"); expect(actual.length).toBe(expected.length);
            expect(expected.flatMap((line, index) => line === actual[index] ? [] : [{ index, expected: line, actual: actual[index] }]).slice(0, 12)).toEqual([]);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 240_000);

test("Object locale Invoke preserves strict and sloppy primitive receivers", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-locale-receiver-"));
    const program = String.raw`
        var original = Object.getOwnPropertyDescriptor(Boolean.prototype, "toString"), getterReceiver;
        Object.defineProperty(Boolean.prototype, "toString", { configurable: true, get: function() {
            getterReceiver = this;
            return function() { return { receiver: this, count: arguments.length }; };
        } });
        try {
            var result = Object.prototype.toLocaleString.call(true, "ignored", "ignored");
            print(typeof getterReceiver + ":" + typeof result.receiver + ":" +
                (getterReceiver === true) + ":" + (result.receiver === true) + ":" + result.count);
        } finally { Object.defineProperty(Boolean.prototype, "toString", original); }
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
                test262Observation: { kind: "test262-native-observation", scenarioId: `property/locale-receiver.js#${name}`,
                    setupEntries: [], testEntry: entry, async: false }, diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000 });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString())); expect(observation.kind).toBe("normal");
            expect((observation.stdout ?? "").trimEnd().split("\n")).toEqual(expected);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 180_000);

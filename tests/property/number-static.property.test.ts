import { expect, test } from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

function decoded(bits: bigint): number {
    const bytes = new ArrayBuffer(8), view = new DataView(bytes);
    view.setBigUint64(0, bits); return view.getFloat64(0);
}

// Derive the predicate truth table from the binary64 encoding rather than
// repeating the runtime's floating comparisons or calling host predicates.
function predicatePlan(value: number): boolean[] {
    const view = new DataView(new ArrayBuffer(8)); view.setFloat64(0, value);
    const bits = view.getBigUint64(0), exponent = (bits >> 52n) & 2047n;
    const fraction = bits & ((1n << 52n) - 1n);
    const finite = exponent !== 2047n, nan = !finite && fraction !== 0n;
    const coefficient = exponent === 0n ? fraction : fraction | (1n << 52n);
    const shift = exponent === 0n ? -1074 : Number(exponent) - 1075;
    const integral = finite && (shift >= 0 || (coefficient & ((1n << BigInt(-shift)) - 1n)) === 0n);
    const magnitude = !integral ? 0n : shift >= 0 ? coefficient << BigInt(shift) : coefficient >> BigInt(-shift);
    return [finite, integral, nan, integral && magnitude <= (1n << 53n) - 1n];
}

const values = [0, -0, NaN, Infinity, -Infinity, Number.MIN_VALUE, -Number.MIN_VALUE,
    1, -1, 1.5, -1.5, Number.MAX_VALUE, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1,
    -Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER - 1,
    decoded(0x3fefffffffffffffn), decoded(0x3ff0000000000001n), 2 ** -1022];
let seed = 0x8424df52b2c176fn;
for (let index = 0; index < 40; ++index) {
    seed = BigInt.asUintN(64, seed * 6364136223846793005n + 1442695040888963407n);
    values.push(decoded(seed));
}
function expression(value: number): string { return Object.is(value, -0) ? "-0" : String(value); }
const rows = values.map(value => `{ value: ${expression(value)}, flags: [${predicatePlan(value).join(",")}] }`).join(",\n");
const payloads = [0x7ff0000000000001n, 0x7ff8000000000000n, 0x7fffffffffffffffn,
    0xfff0000000000001n, 0xfff8000000000000n, 0xffffffffffffffffn];
for (let tag = 0n; tag < 16n; ++tag) {
    payloads.push(0x7ffc000012340000n | tag, 0xfffc000012340000n | tag);
}
const payloadHex = payloads.map(bits => JSON.stringify(bits.toString(16).padStart(16, "0"))).join(",");
const source = String.raw`
"use strict";
const host: any = globalThis;
function collect(): void { if (NATIVE_GC) host.$262.gc(); }
function check(value: boolean, label: string): void { host.print(label + ":" + value); }
const encodedPayloads: string[] = [PAYLOAD_BYTES];
let payloadBuffer: Buffer = Buffer.alloc(0);
for (let index = 0; index < encodedPayloads.length; ++index) {
    payloadBuffer = Buffer.from(encodedPayloads[index]!, "hex");
    const boxed: any = payloadBuffer.readDoubleBE(0);
    const retained: any[] = [boxed];
    collect();
    check(typeof boxed === "number" && Number.isNaN(boxed) && !Number.isFinite(boxed) &&
        !Number.isInteger(boxed) && !Number.isSafeInteger(boxed), "nan-payload-kind");
    check(Object.is(boxed, NaN) && Object.is(retained[0], NaN) &&
        Object.is(Reflect.apply(Number.prototype.valueOf, boxed, []), NaN) && String(boxed) === "NaN", "nan-payload-consumers");
}
const constructor: any = Number;
const names: string[] = ["isFinite", "isInteger", "isNaN", "isSafeInteger"];
const rows: any[] = [ROWS];
for (const row of rows) {
    const value: number = row.value;
    const typed: boolean[] = [Number.isFinite(value), Number.isInteger(value), Number.isNaN(value), Number.isSafeInteger(value)];
    for (let index = 0; index < names.length; ++index) {
        collect();
        check(typed[index] === row.flags[index], "bits-typed");
        check(Reflect.apply(constructor[names[index]], { ignoredReceiver: true }, [value]) === row.flags[index], "bits-reflect");
    }
}
const marker: any = { tag: "payload" };
const poison: any = { valueOf: function(): any { throw marker; },
    toString: function(): any { throw marker; }, [Symbol.toPrimitive]: function(): any { throw marker; } };
const nonNumbers: any[] = [undefined, null, true, false, "1", "NaN", 1n, Symbol("input"), poison,
    [], new Number(1), new Number(NaN), function(): number { return 1; },
    new Proxy({}, { get: function(): any { throw marker; } })];
for (const input of nonNumbers) {
    check(!Number.isFinite(input) && !Number.isInteger(input) && !Number.isNaN(input) && !Number.isSafeInteger(input), "type-without-coercion");
}
check(!Number.isFinite() && !Number.isInteger() && !Number.isNaN() && !Number.isSafeInteger(), "missing");
for (const name of names) {
    const descriptor: any = Object.getOwnPropertyDescriptor(constructor, name), method: any = descriptor.value;
    check(descriptor.writable && !descriptor.enumerable && descriptor.configurable, "method-descriptor");
    check(method === constructor[name] && method.name === name && method.length === 1 && !("prototype" in method), "method-metadata");
    check(Object.getPrototypeOf(method) === Function.prototype, "method-prototype");
    try { Reflect.construct(method, []); check(false, "method-not-constructor"); }
    catch (error) { check(error instanceof TypeError, "method-not-constructor"); }
}
const constants: any[] = [
    { name: "EPSILON", value: 2 ** -52 }, { name: "MAX_SAFE_INTEGER", value: 2 ** 53 - 1 },
    { name: "MIN_SAFE_INTEGER", value: -(2 ** 53 - 1) }, { name: "MAX_VALUE", value: (2 - 2 ** -52) * 2 ** 1023 },
    { name: "MIN_VALUE", value: 2 ** -1074 }, { name: "NaN", value: NaN },
    { name: "POSITIVE_INFINITY", value: Infinity }, { name: "NEGATIVE_INFINITY", value: -Infinity }];
for (const item of constants) {
    const descriptor: any = Object.getOwnPropertyDescriptor(constructor, item.name);
    check(!descriptor.writable && !descriptor.enumerable && !descriptor.configurable && Object.is(descriptor.value, item.value), "constant-descriptor");
    check(Object.is(constructor[item.name], item.value), "constant-value");
    check(!Reflect.set(constructor, item.name, 99), "constant-set");
    check(!Reflect.defineProperty(constructor, item.name, { value: 99 }), "constant-define");
    check(!Reflect.deleteProperty(constructor, item.name), "constant-delete");
}
for (const intrinsic of [Number, String, Boolean]) {
    const descriptor: any = Object.getOwnPropertyDescriptor(intrinsic, "prototype");
    check(!descriptor.writable && !descriptor.enumerable && !descriptor.configurable, "constructor-prototype");
}
check(Number.parseInt === parseInt && Number.parseFloat === parseFloat, "parser-identity");
for (const name of ["parseInt", "parseFloat"]) {
    const descriptor: any = Object.getOwnPropertyDescriptor(constructor, name), method: any = descriptor.value;
    check(descriptor.writable && !descriptor.enumerable && descriptor.configurable && method.name === name &&
        method.length === (name === "parseInt" ? 2 : 1) && !("prototype" in method), "parser-metadata");
}
check(Number.isNaN(Number.parseFloat()) && Number.isNaN(Number.parseInt()), "parser-missing");
let trace = "";
function mark(label: string): number { trace += label; collect(); return 16; }
const string: any = { toString: function(): string { trace += "S"; collect(); return "ff"; } };
const radix: any = { [Symbol.toPrimitive]: function(hint: string): number { trace += hint; collect(); return 16; } };
const ignored: any = { [Symbol.toPrimitive]: function(): any { throw marker; } };
const parsed: number = Number.parseInt(string, radix, mark("A"), mark("B"), ignored);
check(parsed === 255 && trace === "ABSnumber", "parser-conversion-order");
const globalParser: any = parseInt;
const parserDescriptor: any = Object.getOwnPropertyDescriptor(constructor, "parseInt");
Object.defineProperty(constructor, "parseInt", { configurable: true, value: function(): any { return marker; } });
check(Number.parseInt("1") === marker && Reflect.apply(globalParser, null, ["1"]) === 1, "parser-mutation-isolated");
Object.defineProperty(constructor, "parseInt", parserDescriptor);
for (const name of names) {
    const descriptor: any = Object.getOwnPropertyDescriptor(constructor, name);
    let getterReceiver: any;
    try {
        Object.defineProperty(constructor, name, { configurable: true, get: function(this: any): any {
            trace += "G"; getterReceiver = this; collect();
            return function(this: any, ...args: any[]): any { trace += "C"; collect(); return { receiver: this, args }; };
        } });
        trace = "";
        const result: any = name === "isFinite" ? Number.isFinite(mark("A"), mark("B"))
            : name === "isInteger" ? Number.isInteger(mark("A"), mark("B"))
            : name === "isNaN" ? Number.isNaN(mark("A"), mark("B")) : Number.isSafeInteger(mark("A"), mark("B"));
        check(trace === "GABC" && getterReceiver === constructor && result.receiver === constructor && result.args.length === 2, "lookup-order-result");
        Object.defineProperty(constructor, name, { configurable: true, value: null });
        trace = "";
        const skipped: any = constructor[name]?.(mark("never"));
        check(skipped === undefined && trace === "", "optional");
        try { constructor[name](mark("A")); check(false, "non-callable"); }
        catch (error) { check(error instanceof TypeError && trace === "A", "non-callable"); }
        Object.defineProperty(constructor, name, { configurable: true, get: function(): any { throw marker; } });
        trace = "";
        try { constructor[name](mark("never")); check(false, "abrupt-getter"); }
        catch (error) { check(error === marker && trace === "", "abrupt-getter"); }
    } finally { Object.defineProperty(constructor, name, descriptor); }
}
const finiteDescriptor: any = Object.getOwnPropertyDescriptor(constructor, "isFinite");
try {
    Object.defineProperty(constructor, "isFinite", { configurable: true, get: function(): any {
        trace += "G"; return function(): boolean { trace += "C"; return false; };
    } });
    trace = "";
    Number.isFinite(1);
    const unused: boolean = Number.isFinite(1);
    if (Number.isFinite(1)) trace += "never";
    check(trace === "GCGCGC", "retained-unused-lookup");
} finally { Object.defineProperty(constructor, "isFinite", finiteDescriptor); }
function shadow(Number: any): any { return { constant: Number.MAX_VALUE, result: Number.isFinite(1) }; }
const shadowResult: any = shadow({ MAX_VALUE: marker, isFinite: function(): any { return marker; } });
check(shadowResult.constant === marker && shadowResult.result === marker, "shadow-binding");
`.replace("ROWS", rows).replace("PAYLOAD_BYTES", payloadHex);

test("Number statics share ordinary descriptors, binary64 predicate partitions and parser identities", async () => {
    const expected: string[] = [];
    new Function("globalThis", ts.transpileModule(source.replaceAll("NATIVE_GC", "false"),
        { compilerOptions: { target: ts.ScriptTarget.ESNext } }).outputText)({ print: (value: unknown) => expected.push(String(value)) });
    expect(expected.filter(line => !line.endsWith(":true"))).toEqual([]);
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-number-static-"));
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", entry = path.join(temporary, name + "-driver.js");
            const subject = path.join(temporary, name + "-subject.ts"), output = path.join(temporary, name);
            await fs.writeFile(entry, ""); await fs.writeFile(subject, source.replaceAll("NATIVE_GC", String(!noGc)));
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, additionalRoots: [subject], initializationEntries: [subject, entry], noGc,
                buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/number-static.js#strict",
                    setupEntries: [], testEntry: entry, async: false }, diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000,
                env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            if (observation.kind !== "normal") throw new Error(JSON.stringify({ ...observation,
                stdout: (observation.stdout ?? "").slice(-1500) }));
            expect(observation.kind).toBe("normal");
            const actual = (observation.stdout ?? "").trimEnd().split("\n");
            expect(actual.length).toBe(expected.length);
            expect(expected.flatMap((value, index) => actual[index] === value ? [] : [{ index, expected: value, actual: actual[index] }]).slice(0, 12)).toEqual([]);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 180_000);

test("Number static descriptors retain their creation Realm and canonical parser aliases", async () => {
    const source = String.raw`
        var other = $262.createRealm().global;
        print(Number.isFinite !== other.Number.isFinite && Number.parseInt !== other.Number.parseInt);
        print(other.Number.parseInt === other.parseInt && other.Number.parseFloat === other.parseFloat);
        print(Object.getPrototypeOf(other.Number.isFinite) === other.Function.prototype);
        print(Object.getPrototypeOf(other.Number.parseInt) === other.Function.prototype);
        print(Object.getOwnPropertyDescriptor(other.Number, "prototype").writable === false);
        print(other.Number.isFinite(1) && !other.Number.isNaN("NaN") && other.Number.isInteger(-0));
        try { other.Number.parseInt(Symbol("input")); print(false); }
        catch (error) { print(error instanceof other.TypeError && !(error instanceof TypeError)); }
        other.Number.isFinite = function() { return "changed"; };
        print(other.Number.isFinite(1) === "changed" && Number.isFinite(1) === true);
    `;
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-number-static-realm-"));
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", entry = path.join(temporary, name + ".js"), output = path.join(temporary, name);
            await fs.writeFile(entry, source);
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, initializationEntries: [entry], noGc,
                buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/number-static-realm.js#sloppy",
                    setupEntries: [], testEntry: entry, async: false }, diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000 });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            expect(observation.kind).toBe("normal");
            expect((observation.stdout ?? "").trimEnd().split("\n")).toEqual(Array.from({ length: 8 }, () => "true"));
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 180_000);

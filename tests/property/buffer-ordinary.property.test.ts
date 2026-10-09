import { expect, test } from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

// The integer oracle is a positional polynomial over bytes, evaluated with
// unbounded integers. It does not call Buffer's read/write methods.
const plans: string[] = [];
let seed = 0x763adb1;
for (let width = 1; width <= 6; ++width) {
    const bytes = Array.from({ length: width }, () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed >>> 24;
    });
    for (const little of [false, true]) for (const signed of [false, true]) {
        const ordered = little ? [...bytes].reverse() : bytes;
        const unsigned = ordered.reduce((value, byte) => value * 256n + BigInt(byte), 0n);
        const modulus = 1n << BigInt(width * 8);
        const expected = signed && unsigned >= modulus / 2n ? unsigned - modulus : unsigned;
        const endian = little ? "LE" : "BE", stem = signed ? "Int" : "UInt";
        const names = [`${stem}${endian}`];
        if ([1, 2, 4].includes(width)) names.push(stem + width * 8 + (width === 1 ? "" : endian));
        for (const name of names) {
            const variable = name === `${stem}${endian}`;
            for (const value of [0n, 1n, signed ? -1n : modulus - 1n, signed ? -modulus / 2n : 0n,
                signed ? modulus / 2n - 1n : modulus - 1n]) {
                const residue = BigInt.asUintN(width * 8, value);
                const encoded = Array.from({ length: width }, (_, index) => Number(residue >> BigInt(8 * index) & 255n));
                if (!little) encoded.reverse();
                const hex = (values: number[]) => values.map(byte => byte.toString(16).padStart(2, "0")).join("");
                plans.push(`{ read: "read${name}", write: "write${name}", variable: ${variable}, width: ${width}, input: "aa${hex(bytes)}bb", expected: ${expected}, value: ${value}, output: "aa${hex(encoded)}bb" }`);
            }
        }
    }
}
// Float byte plans come from the host's DataView, an independent API and
// storage representation. Include subnormals, signed zero and infinities.
for (const width of [4, 8]) for (const little of [false, true]) {
    for (const input of [0, -0, 1.5, -2.75, 2 ** -149, 2 ** -1074, Infinity, -Infinity, NaN]) {
        const view = new DataView(new ArrayBuffer(width));
        if (width === 4) view.setFloat32(0, input, little); else view.setFloat64(0, input, little);
        const value = width === 4 ? view.getFloat32(0, little) : view.getFloat64(0, little);
        const literal = (number: number) => Object.is(number, -0) ? "-0" : String(number);
        const bytes = Array.from(new Uint8Array(view.buffer), byte => byte.toString(16).padStart(2, "0")).join("");
        const stem = (width === 4 ? "Float" : "Double") + (little ? "LE" : "BE");
        plans.push(`{ read: "read${stem}", write: "write${stem}", variable: false, width: ${width}, input: "aa${bytes}bb", expected: ${literal(value)}, value: ${literal(input)}, output: "aa${bytes}bb" }`);
    }
}
const source = String.raw`
"use strict";
const host: any = globalThis;
function collect(): void { if (NATIVE_GC) host.$262.gc(); }
function check(value: boolean, label: string): void { host.print(label + ":" + value); }
const plans: any[] = [PLANS];
for (const plan of plans) {
    const buffer: Buffer = Buffer.from(plan.input, "hex");
    const owner: any = buffer;
    const repeated: any = buffer;
    collect();
    check(owner === repeated && buffer.valueOf() === owner && owner.valueOf() === owner, "owner-identity");
    check(owner.length === plan.width + 2 && buffer.length === owner.length, "length");
    const read: any = owner[plan.read], write: any = owner[plan.write];
    const args: any[] = plan.variable ? [1, plan.width] : [1];
    check(Object.is(Reflect.apply(read, owner, args), plan.expected), "read-plan");
    const writeArgs: any[] = plan.variable ? [plan.value, 1, plan.width] : [plan.value, 1];
    check(Reflect.apply(write, owner, writeArgs) === plan.width + 1, "write-offset");
    collect();
    if (Number.isNaN(plan.value)) check(Number.isNaN(Reflect.apply(read, owner, args)), "write-nan");
    else check(owner.toString("hex") === plan.output, "write-byte-plan");
    check(read === owner[plan.read] && write === owner[plan.write] && !Reflect.has(read, "prototype"), "method-identity");
}
const buffer: any = Buffer.from("41424344", "hex");
const prototype: any = Object.getPrototypeOf(buffer);
check(buffer.toLocaleString === buffer.toString && buffer.toLocaleString("hex", 1, 3) === "4243", "locale-alias");
check(buffer.valueOf === Object.prototype.valueOf, "inherited-valueof");
check(buffer.readUint16LE === buffer.readUInt16LE && buffer.writeUint8 === buffer.writeUInt8, "uint-aliases");
for (const name of ["toString", "toJSON", "slice", "subarray", "fill", "write", "copy", "equals", "compare", "readUInt8", "writeDoubleBE"]) {
    const descriptor: any = Object.getOwnPropertyDescriptor(prototype, name);
    check(descriptor.writable && descriptor.enumerable && descriptor.configurable && descriptor.value === buffer[name], "method-descriptor");
    check(Object.getPrototypeOf(descriptor.value) === Function.prototype, "function-prototype");
}
for (const offset of [NaN, Infinity, -Infinity, -.5, .5, -1, 4]) {
    try { buffer.readUInt8(offset); check(false, "offset-range"); } catch (error) { check(error instanceof RangeError, "offset-range"); }
}
const marker: any = { tag: "abrupt" };
const poison: any = { [Symbol.toPrimitive]: function(): any { throw marker; } };
for (const offset of ["0", null, true, 0n, poison]) {
    try { buffer.readUInt8(offset); check(false, "offset-type"); } catch (error) { check(error instanceof TypeError, "offset-type"); }
}
for (const width of [0, 7, .5, NaN, Infinity]) {
    try { buffer.writeUIntLE(poison, 0, width); check(false, "width-before-value"); } catch (error) { check(error instanceof RangeError, "width-before-value"); }
}
for (const value of [-1, 256, Infinity, -Infinity]) {
    try { buffer.writeUInt8(value); check(false, "value-range"); } catch (error) { check(error instanceof RangeError, "value-range"); }
}
check(buffer.writeUInt8(NaN) === 1 && buffer.readUInt8() === 0 && buffer.writeInt8(-1.5) === 1 && buffer.readInt8() === -1, "nan-fractional-value");
for (const receiver of [null, undefined, {}, Object.create(buffer), new Proxy(buffer, {})]) {
    try { Reflect.apply(buffer.readUInt8, receiver, []); check(false, "receiver-brand"); }
    catch (error) { check(error instanceof TypeError, "receiver-brand"); }
}
let trace = "";
function mark(label: string): number { trace += label; collect(); return 0; }
const value: any = { [Symbol.toPrimitive]: function(hint: string): number { trace += hint; collect(); return 65; } };
buffer.writeUInt8(value, mark("A"), mark("B"));
check(trace === "ABnumber" && buffer.readUInt8() === 65, "actual-list-before-conversion");
const descriptor: any = Object.getOwnPropertyDescriptor(prototype, "readUInt8");
try {
    let getterReceiver: any;
    Object.defineProperty(prototype, "readUInt8", { configurable: true, get: function(this: any): any {
        trace += "G"; getterReceiver = this; collect();
        return function(this: any, ...args: any[]): any { collect(); trace += "C"; return { receiver: this, args }; };
    } });
    trace = "";
    const typedBuffer: Buffer = buffer;
    const result: any = typedBuffer.readUInt8(mark("A"), mark("B"));
    check(trace === "GABC" && getterReceiver === buffer && result.receiver === buffer && result.args.length === 2, "native-lookup");
    Object.defineProperty(prototype, "readUInt8", { configurable: true, value: undefined });
    trace = "";
    check(typedBuffer.readUInt8?.(mark("never")) === undefined && trace === "", "optional-method");
    try { typedBuffer.readUInt8(mark("A")); check(false, "non-callable"); }
    catch (error) { check(error instanceof TypeError && trace === "A", "non-callable"); }
} finally { Object.defineProperty(prototype, "readUInt8", descriptor); }
const textDescriptor: any = Object.getOwnPropertyDescriptor(prototype, "toString");
try {
    Object.defineProperty(prototype, "toString", { configurable: true, get: function(): any {
        trace += "G"; collect(); return function(): any { trace += "C"; collect(); return marker; };
    } });
    trace = "";
    Buffer.from("A").toString();
    Buffer.from("B").toString();
    check(trace === "GCGC", "retained-unused-text");
} finally { Object.defineProperty(prototype, "toString", textDescriptor); }
const symbol: any = Symbol("own");
check(Reflect.set(buffer, "01", marker) && Reflect.set(buffer, symbol, marker), "ordinary-extra-properties");
check(buffer["01"] === marker && buffer[symbol] === marker, "ordinary-extra-values");
const keys: any[] = Reflect.ownKeys(buffer);
check(keys.length === 6 && keys[0] === "0" && keys[3] === "3" && keys[4] === "01" && keys[5] === symbol, "own-key-order");
for (const key of ["0", "1", "2", "3"]) {
    const descriptor: any = Object.getOwnPropertyDescriptor(buffer, key);
    check(descriptor.value === buffer[key] && descriptor.writable && descriptor.enumerable && descriptor.configurable, "index-descriptor");
    check(!Reflect.deleteProperty(buffer, key) && buffer.hasOwnProperty(key) && buffer.propertyIsEnumerable(key), "index-presence");
    check(!Reflect.defineProperty(buffer, key, { configurable: false }) && !Reflect.defineProperty(buffer, key, { get: function(): number { return 1; } }), "index-define-reject");
}
for (const key of ["-0", "-1", "1.5", "NaN", "Infinity", "99"]) {
    trace = "";
    const value: any = { valueOf: function(): number { trace += "V"; collect(); return 257; } };
    check(Reflect.set(buffer, key, value) && trace === "V" && buffer[key] === undefined && !Reflect.has(buffer, key) && !Reflect.defineProperty(buffer, key, { value: 1 }), "invalid-index-conversion");
}
check(Reflect.defineProperty(buffer, "0", { value: 258 }) && buffer.readUInt8() === 2, "live-index-write");
const view: any = buffer.subarray(1, 3);
check(view !== buffer && view.length === 2, "view-owner");
view.writeUInt8(90);
check(buffer.readUInt8(1) === 90 && buffer.slice(1, 2).readUInt8() === 90, "shared-view-bytes");
const subarray: any = Object.getOwnPropertyDescriptor(prototype, "subarray");
try {
    let forwarded: any;
    Object.defineProperty(prototype, "subarray", { configurable: true, value: function(...args: any[]): any { forwarded = args; return marker; } });
    // Node lib/buffer.js delegates through this.subarray; Bun bypasses that lookup.
    check(ORACLE_MODE || buffer.slice(0, 1, poison) === marker && forwarded.length === 2 && forwarded[0] === 0 && forwarded[1] === 1, "slice-ordinary-subarray");
} finally { Object.defineProperty(prototype, "subarray", subarray); }
// A single deep chain proves that view ownership and method lookup do not
// depend on source nesting or a fixture-family bound.
let retained: any = Buffer.from("4243", "hex");
for (let depth = 0; depth < 8192; ++depth) retained = retained.subarray(0);
collect();
check(retained.toString() === "BC" && retained.readUInt16BE() === 0x4243, "deep-view-owner");
// This iterator builds the actual argument List before the value is converted.
trace = "";
let visited = 0;
const argumentsSource: any = { [Symbol.iterator]: function(): any {
    let index = 0;
    return { next: function(): any { if (index === 4096) return { done: true }; ++visited; return { done: false, value: index++ === 0 ? value : undefined }; } };
} };
check(buffer.writeUInt8(...argumentsSource) === 1 && visited === 4096 && trace === "number", "argument-worklist");
check(Array.from(buffer).length === buffer.length && Reflect.apply(buffer[Symbol.iterator], buffer, []).next().value === 65, "ordinary-iterator");
const shadowed: any = Buffer.from("4142", "hex");
Object.defineProperty(shadowed, "length", { value: 1 });
check(shadowed.length === 1 && Array.from(shadowed).length === 2, "iterator-private-length");
try { Reflect.get(shadowed, "byteLength", {}); check(false, "getter-receiver"); }
catch (error) { check(error instanceof TypeError, "getter-receiver"); }
const integrity: any = Buffer.from("01", "hex");
try { Object.freeze(integrity); check(false, "freeze-indexed"); }
catch (error) { check(error instanceof TypeError && !Object.isExtensible(integrity) && !Object.isFrozen(integrity), "freeze-indexed"); }
`.replace("PLANS", plans.join(",\n"));

test("Buffer owners share live byte plans, ordinary descriptors and unbounded view/argument worklists", async () => {
    const expected: string[] = [];
    new Function("globalThis", ts.transpileModule(source.replaceAll("NATIVE_GC", "false").replaceAll("ORACLE_MODE", "true"),
        { compilerOptions: { target: ts.ScriptTarget.ESNext } }).outputText)({ print: (value: unknown) => expected.push(String(value)) });
    expect(expected.filter(line => !line.endsWith(":true"))).toEqual([]);
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-buffer-ordinary-"));
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", entry = path.join(temporary, name + "-driver.js");
            const subject = path.join(temporary, name + "-subject.ts"), output = path.join(temporary, name);
            await fs.writeFile(entry, ""); await fs.writeFile(subject, source.replaceAll("NATIVE_GC", String(!noGc)).replaceAll("ORACLE_MODE", "false"));
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, additionalRoots: [subject], initializationEntries: [subject, entry], noGc,
                buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/buffer-ordinary.js#strict",
                    setupEntries: [], testEntry: entry, async: false }, diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000,
                env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            if (observation.kind !== "normal") throw new Error(JSON.stringify({ ...observation,
                stdout: (observation.stdout ?? "").slice(-1500) }));
            const actual = (observation.stdout ?? "").trimEnd().split("\n");
            expect(actual.length).toBe(expected.length);
            expect(expected.flatMap((value, index) => actual[index] === value ? [] : [{ index, expected: value, actual: actual[index] }]).slice(0, 12)).toEqual([]);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 180_000);

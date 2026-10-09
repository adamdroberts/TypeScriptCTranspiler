import { expect, test } from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

type Rational = { numerator: bigint; denominator: bigint };
const view = new DataView(new ArrayBuffer(8));
function encoded(value: number): bigint { view.setFloat64(0, Math.abs(value)); return view.getBigUint64(0); }
function decoded(bits: bigint): number { view.setBigUint64(0, bits); return view.getFloat64(0); }
function exact(value: number): Rational {
    const bits = encoded(value), exponent = Number((bits >> 52n) & 2047n);
    const coefficient = (bits & ((1n << 52n) - 1n)) + (exponent ? 1n << 52n : 0n);
    const power = exponent ? exponent - 1075 : -1074;
    return power >= 0 ? { numerator: coefficient << BigInt(power), denominator: 1n }
        : { numerator: coefficient, denominator: 1n << BigInt(-power) };
}
function decimal(coefficient: bigint, exponent: number): Rational {
    const power = 10n ** BigInt(Math.abs(exponent));
    return exponent >= 0 ? { numerator: coefficient * power, denominator: 1n }
        : { numerator: coefficient, denominator: power };
}
function compare(left: Rational, right: Rational): bigint {
    return left.numerator * right.denominator - right.numerator * left.denominator;
}
function midpoint(left: Rational, right: Rational): Rational {
    return { numerator: left.numerator * right.denominator + right.numerator * left.denominator,
        denominator: 2n * left.denominator * right.denominator };
}

// Validate the Voronoi cell of the emitted decimal, rather than reproducing
// normalization, digit search, or the runtime's quotient/remainder algorithm.
function roundingFailure(value: number, method: string, width: number, text: string): string | null {
    if (!Number.isFinite(value) || method === "fixed" && Math.abs(value) >= 1e21)
        return text === String(value) ? null : "special";
    const match = /^(-?)([0-9]+)(?:\.([0-9]+))?(?:e([+-][0-9]+))?$/.exec(text);
    if (!match || (match[1] === "-") !== (value < 0)) return "layout-or-sign";
    const fraction = match[3] ?? "", scientific = match[4] !== undefined;
    const coefficient = BigInt(match[2]! + fraction), exponent = Number(match[4] ?? 0) - fraction.length;
    if (method === "fixed") {
        if (scientific || fraction.length !== width || exponent !== -width) return "fixed-width";
    } else {
        if (method === "exponential" && (!scientific || fraction.length !== width - 1 || match[2]!.length !== 1))
            return "exponential-width";
        if (coefficient === 0n) {
            const expected = method === "exponential" ? "0" + (width > 1 ? "." + "0".repeat(width - 1) : "") + "e+0"
                : "0" + (width > 1 ? "." + "0".repeat(width - 1) : "");
            return text === expected ? null : "zero-width";
        }
        if (coefficient.toString().length !== width) return "significant-width";
        const normalizedExponent = exponent + width - 1;
        if (method === "precision" && scientific !== (normalizedExponent < -6 || normalizedExponent >= width))
            return "precision-layout";
    }
    const candidate = decimal(coefficient, exponent);
    let previous = decimal(coefficient - 1n, exponent), next = decimal(coefficient + 1n, exponent);
    if (method !== "fixed") {
        if (coefficient === 10n ** BigInt(width - 1)) previous = decimal(10n ** BigInt(width) - 1n, exponent - 1);
        if (coefficient === 10n ** BigInt(width) - 1n) next = decimal(10n ** BigInt(width - 1), exponent + 1);
    }
    const source = exact(value);
    // Specified precision chooses the larger positive decimal at a tie.
    return compare(source, midpoint(previous, candidate)) < 0n || compare(source, midpoint(candidate, next)) >= 0n
        ? "nearest-or-larger-tie" : null;
}

const values = [0, -0, NaN, Infinity, -Infinity, Number.MIN_VALUE, -Number.MIN_VALUE, Number.MAX_VALUE,
    2 ** -1022, 2 ** -1022 - Number.MIN_VALUE, 1000000000000000128, 1e21, 1e-6, 1e-7,
    1.125, -1.125, 1.005, -0.0001, 9.5, 99.5, 0.95, 0.1, 1 / 3];
for (const value of [1, 10, 1e-6, 1e21]) values.push(decoded(encoded(value) - 1n), decoded(encoded(value) + 1n));
let seed = 0x92f78916acdb3n;
for (let index = 0; index < 32; index++) {
    seed = BigInt.asUintN(64, seed * 6364136223846793005n + 1442695040888963407n);
    const value = decoded(seed); if (Number.isFinite(value)) values.push(value);
}
const source = String.raw`
"use strict";
const host: any = globalThis;
function collect(): void { if (NATIVE_GC) host.$262.gc(); }
const values: number[] = [VALUES];
const widths: number[] = [0, 1, 2, 17, 100];
for (let index = 0; index < values.length; index++) {
    const value: number = values[index], boxed: any = value;
    collect();
    for (const width of widths) {
        host.print("fixed:" + index + ":" + width + ":" + value.toFixed(width) + ":" + boxed.toFixed(width));
        host.print("exponential:" + index + ":" + (width + 1) + ":" + value.toExponential(width) + ":" + boxed.toExponential(width));
        if (width > 0) host.print("precision:" + index + ":" + width + ":" + value.toPrecision(width) + ":" + boxed.toPrecision(width));
    }
    host.print("omitted:" + index + ":" + value.toExponential() + ":" + value.toPrecision());
}
const prototype: any = Number.prototype;
for (const value of values) {
    const wrapper: Number = new Number(value);
    collect();
    host.print("value-identity:" + Object.is(Reflect.apply(prototype.valueOf, value, []), value) + ":" +
        Object.is(wrapper.valueOf(), value));
}
host.print("prototype-value:" + Object.is(prototype.valueOf(), 0));
const names: string[] = ["toFixed", "toExponential", "toPrecision", "valueOf"];
const marker: any = { tag: "payload" };
let trace = "";
function describe(error: any): string {
    return error === marker ? "payload" : error instanceof RangeError ? "RangeError" : error instanceof TypeError ? "TypeError" : "other";
}
const options: any[] = [undefined, null, NaN, Infinity, -Infinity, -1, 101, 2.9, "2", true, 2n, Symbol("digits"),
    { valueOf: function(): number { trace += "V"; collect(); return 2; } },
    { [Symbol.toPrimitive]: function(hint: string): number { trace += hint; collect(); return 2; } },
    { valueOf: function(): any { trace += "T"; throw marker; } }];
const receivers: any[] = [1.125, NaN, Infinity, new Number(-1.125), {}, "1.125", 1n, null, undefined,
    Object.create(prototype), Object.create(new Number(1)), new Proxy(new Number(1), {})];
for (const name of names) {
    const method: any = prototype[name], descriptor: any = Object.getOwnPropertyDescriptor(prototype, name);
    const primitive: number = 1.125;
    const captured: any = (primitive as any)[name];
    host.print("metadata:" + name + ":" + method.name + ":" + method.length + ":" + descriptor.writable + ":" +
        descriptor.enumerable + ":" + descriptor.configurable + ":" + (method === captured) + ":" + ("prototype" in method));
    for (let index = 0; index < receivers.length; index++) {
        for (let position = 0; position < options.length; position++) {
            trace = "";
            try { host.print("call:" + name + ":" + index + ":" + position + ":" + Reflect.apply(method, receivers[index], [options[position]]) + ":" + trace); }
            catch (error) { host.print("error:" + name + ":" + index + ":" + position + ":" + describe(error) + ":" + trace); }
        }
    }
    try {
        Object.defineProperty(prototype, name, { configurable: true, get: function(this: any): any {
            trace += "G"; collect();
            return function(this: any, ...args: any[]): any { trace += "C"; collect(); return { receiver: this, args }; };
        } });
        trace = "";
        function mark(label: string): number { trace += label; collect(); return 2; }
        const result: any = name === "toFixed" ? primitive.toFixed(mark("A"), mark("B"))
            : name === "toExponential" ? primitive.toExponential(mark("A"), mark("B"))
            : name === "toPrecision" ? primitive.toPrecision(mark("A"), mark("B")) : primitive.valueOf(mark("A"), mark("B"));
        host.print("lookup:" + name + ":" + trace + ":" + (result.receiver === primitive) + ":" + result.args.length);
        Object.defineProperty(prototype, name, { configurable: true, value: null });
        trace = "";
        const skipped: any = (primitive as any)[name]?.(mark("never"));
        host.print("optional:" + name + ":" + (trace === "") + ":" + (skipped === undefined));
    } finally { Object.defineProperty(prototype, name, descriptor); }
}
function deepOption(depth: number): any {
    return { [Symbol.toPrimitive]: function(hint: string): number {
        if (hint !== "number") throw marker;
        if (depth > 0 && (1.125).toFixed(deepOption(depth - 1)) !== "1.13") throw marker;
        if (depth % 127 === 0) collect();
        return 2;
    } };
}
host.print("stress:" + ((1.125).toFixed(deepOption(1200)) === "1.13"));
`.replace("VALUES", values.map(value => Object.is(value, -0) ? "-0" : String(value)).join(","));

test("Number decimal methods preserve exact rounding cells, option order and ordinary method boundaries", async () => {
    const expected: string[] = [];
    new Function("globalThis", ts.transpileModule(source.replaceAll("NATIVE_GC", "false"),
        { compilerOptions: { target: ts.ScriptTarget.ESNext } }).outputText)({ print: (value: unknown) => expected.push(String(value)) });
    function failures(lines: string[]): unknown[] {
        return lines.flatMap((line, index) => {
            const parts = line.split(":"), method = parts[0]!;
            const failures: unknown[] = line === expected[index] ? [] : [{ index, expected: expected[index], actual: line }];
            if (["fixed", "exponential", "precision"].includes(method)) {
                for (const text of parts.slice(3)) {
                    const reason = roundingFailure(values[Number(parts[1])]!, method, Number(parts[2]), text);
                    if (reason) failures.push({ index, value: values[Number(parts[1])], method, width: parts[2], text, reason });
                }
            }
            return failures;
        }).slice(0, 12);
    }
    expect(failures(expected)).toEqual([]);
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-number-decimal-"));
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", entry = path.join(temporary, name + "-driver.js");
            const subject = path.join(temporary, name + "-subject.ts"), output = path.join(temporary, name);
            await fs.writeFile(entry, ""); await fs.writeFile(subject, source.replaceAll("NATIVE_GC", String(!noGc)));
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, additionalRoots: [subject], initializationEntries: [subject, entry], noGc,
                buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/number-decimal.js#strict",
                    setupEntries: [], testEntry: entry, async: false }, diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000,
                env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString())); expect(observation.kind).toBe("normal");
            const actual = (observation.stdout ?? "").trimEnd().split("\n");
            expect(actual.length).toBe(expected.length); expect(failures(actual)).toEqual([]);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 240_000);

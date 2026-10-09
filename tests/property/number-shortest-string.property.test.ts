import { expect, test } from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

type Rational = { numerator: bigint; denominator: bigint };
const bitsView = new DataView(new ArrayBuffer(8));
function bits(value: number): bigint { bitsView.setFloat64(0, value); return bitsView.getBigUint64(0); }
function fromBits(value: bigint): number { bitsView.setBigUint64(0, value); return bitsView.getFloat64(0); }
function exact(value: bigint): Rational {
    const exponent = Number((value >> 52n) & 2047n), fraction = value & ((1n << 52n) - 1n);
    const coefficient = exponent ? (1n << 52n) + fraction : fraction;
    const power = exponent ? exponent - 1075 : -1074;
    return power >= 0 ? { numerator: coefficient << BigInt(power), denominator: 1n }
        : { numerator: coefficient, denominator: 1n << BigInt(-power) };
}
function compare(left: Rational, right: Rational): bigint { return left.numerator * right.denominator - right.numerator * left.denominator; }
function midpoint(left: Rational, right: Rational): Rational {
    return { numerator: left.numerator * right.denominator + right.numerator * left.denominator, denominator: 2n * left.denominator * right.denominator };
}
function positional(coefficient: bigint, exponent: number, base: number): Rational {
    const power = BigInt(base) ** BigInt(Math.abs(exponent));
    return exponent >= 0 ? { numerator: coefficient * power, denominator: 1n } : { numerator: coefficient, denominator: power };
}
function intervalContains(value: number, candidate: Rational): boolean {
    const encoded = bits(Math.abs(value)), current = exact(encoded), lower = midpoint(exact(encoded - 1n), current), upper = midpoint(current, exact(encoded + 1n));
    const closed = (encoded & 1n) === 0n, left = compare(candidate, lower), right = compare(candidate, upper);
    return (left > 0n || closed && left === 0n) && (right < 0n || closed && right === 0n);
}
function shortestFailure(value: number, base: number, text: string): string | null {
    if (!Number.isFinite(value) || value === 0) return text === String(value) ? null : "special";
    if (text.startsWith("-") !== (value < 0)) return "sign";
    let unsigned = text.replace(/^-/, ""), exponent = 0;
    if (base === 10 && unsigned.includes("e")) {
        const parts = unsigned.split("e"); unsigned = parts[0]!; exponent = Number(parts[1]);
        if (!/^[+-][1-9][0-9]*$/.test(parts[1]!)) return "scientific-exponent";
    }
    const parts = unsigned.split(".");
    if (parts.length > 2 || parts[0] === "" || (parts[0]!.length > 1 && parts[0]!.startsWith("0"))) return "layout";
    exponent -= parts[1]?.length ?? 0;
    let coefficient = 0n;
    for (const digit of parts.join("")) {
        const code = "0123456789abcdefghijklmnopqrstuvwxyz".indexOf(digit);
        if (code < 0 || code >= base) return "digit";
        coefficient = coefficient * BigInt(base) + BigInt(code);
    }
    if (coefficient === 0n) return "zero";
    while (coefficient % BigInt(base) === 0n) { coefficient /= BigInt(base); exponent++; }
    const candidate = positional(coefficient, exponent, base);
    if (!intervalContains(value, candidate)) return "round-trip";
    const source = exact(bits(Math.abs(value)));
    const distance = (entry: Rational): bigint => {
        const difference = entry.numerator * source.denominator - source.numerator * entry.denominator;
        return difference < 0n ? -difference : difference;
    };
    for (const adjacent of [coefficient - 1n, coefficient + 1n]) {
        const neighbor = positional(adjacent, exponent, base);
        if (!intervalContains(value, neighbor)) continue;
        const difference = distance(neighbor) - distance(candidate);
        if (difference < 0n || difference === 0n && coefficient % 2n !== 0n) return "nearest-or-even";
    }
    if (coefficient < BigInt(base)) return null;
    // A shorter significand would lie on the next coarser positional grid.
    // Its neighboring grid points bracket this coefficient, independently of
    // any precision-search or nearest-candidate implementation.
    const quotient = coefficient / BigInt(base);
    if (intervalContains(value, positional(quotient, exponent + 1, base)) ||
        intervalContains(value, positional(quotient + 1n, exponent + 1, base))) return "nonminimal";
    return null;
}

const values = [0, -0, NaN, Infinity, -Infinity, Number.MIN_VALUE, -Number.MIN_VALUE, Number.MAX_VALUE,
    2 ** -1022, 2 ** -1022 - Number.MIN_VALUE, 2 ** 63, 1000000000000000128,
    1e-7, 1e-6, 1e-5, 1e20, 1e21, 1e22, 0.1, 0.10000000000000002, 1 / 3];
for (const value of [1e-6, 1e21, 1, 2, 10]) {
    const encoded = bits(value); values.push(fromBits(encoded - 1n), fromBits(encoded + 1n));
}
let seed = 0x123456789abcdefn;
for (let index = 0; index < 64; index++) {
    seed = BigInt.asUintN(64, seed * 6364136223846793005n + 1442695040888963407n);
    const value = fromBits(seed); if (Number.isFinite(value)) values.push(value);
}
const literals = values.map(value => Object.is(value, -0) ? "-0" : String(value));
const source = `const host: any = globalThis;
const values: number[] = [${literals.join(",")}];
for (let index = 0; index < values.length; index++) {
    const value = values[index], dynamic: any = value;
    if (NATIVE_GC) host.$262.gc();
    host.print("decimal:" + index + ":" + String(value) + ":" + String(dynamic));
    host.print("json:" + index + ":" + JSON.stringify(value) + ":" + JSON.stringify([value]));
    for (let base = 2; base <= 36; base++) host.print("radix:" + index + ":" + base + ":" + value.toString(base));
}
const invalid: any[] = [1, 37, NaN, Infinity, -Infinity, null];
const method: any = Number.prototype.toString;
for (const radix of invalid) {
    try { host.print(Reflect.apply(method, 1, [radix])); }
    catch (error) { host.print("range:" + (error instanceof RangeError)); }
}
try { Reflect.apply(method, {}, []); } catch (error) { host.print("receiver:" + (error instanceof TypeError)); }
const wrapper: Number = new Number(2 ** 63);
host.print("wrapper:" + Reflect.apply(method, wrapper, []));
const stringWrapper: String = new String("text"), booleanWrapper: Boolean = new Boolean(true);
host.print("wrapper-storage:" + typeof wrapper + ":" + typeof stringWrapper + ":" + typeof booleanWrapper + ":" + stringWrapper.toString() + ":" + booleanWrapper.toString());
`;

test("Number strings round-trip with minimal positional digits over exact binary64 intervals", async () => {
    const expected: string[] = [];
    new Function("globalThis", ts.transpileModule(source.replaceAll("NATIVE_GC", "false"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText)({ print: (value: unknown) => expected.push(String(value)) });
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-number-shortest-"));
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", entry = path.join(temporary, name + ".ts"), driver = path.join(temporary, name + "-driver.js"), output = path.join(temporary, name);
            await fs.writeFile(entry, source.replaceAll("NATIVE_GC", String(!noGc))); await fs.writeFile(driver, "");
            const diagnostics: string[] = [];
            const result = await compile({ entry: driver, output, noGc, additionalRoots: [entry], initializationEntries: [entry, driver], buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/number-shortest.ts#strict", setupEntries: [], testEntry: driver, async: false },
                diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000, env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString())); expect(observation.kind).toBe("normal");
            const actual = (observation.stdout ?? "").trimEnd().split("\n"); expect(actual.length).toBe(expected.length);
            const failures: unknown[] = [];
            for (let index = 0; index < actual.length; index++) {
                const line = actual[index]!;
                if (line.startsWith("radix:")) {
                    const [_, valueIndex, base, text] = line.split(":");
                    const reason = shortestFailure(values[Number(valueIndex)]!, Number(base), text!);
                    if (reason) failures.push({ valueIndex, base, text, reason });
                } else if (line !== expected[index]) failures.push({ index, expected: expected[index], actual: line });
                if (failures.length >= 12) break;
            }
            expect(failures).toEqual([]);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 240_000);

import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { hostProtocolVersion, parseHostObservation } from "../test262/protocol";

interface DateProbe {
    readonly label: string;
    readonly expression: string;
    readonly expected: string;
}

const dateProbes: readonly DateProbe[] = [
    { label: "zero", expression: "0", expected: "0" },
    { label: "fraction", expression: "1.9", expected: "1" },
    { label: "negative-zero", expression: "-0", expected: "0" },
    { label: "null", expression: "null", expected: "0" },
    { label: "boolean", expression: "true", expected: "1" },
    { label: "iso-string", expression: '"1970-01-01T00:00:01.000Z"', expected: "1000" },
    { label: "invalid-string", expression: '"not-a-date"', expected: "NaN" },
    { label: "undefined", expression: "undefined", expected: "NaN" },
    { label: "infinity", expression: "Infinity", expected: "NaN" },
    { label: "clip-boundary", expression: "8640000000000000", expected: "8640000000000000" },
    { label: "outside-clip", expression: "8640000000000001", expected: "NaN" },
    { label: "date-clone", expression: "existingDate", expected: "1438560000000" },
    { label: "default-number", expression: "dateDefaultNumber", expected: "33" },
    { label: "default-string", expression: "dateDefaultString", expected: "1000" },
    { label: "ordinary", expression: "dateOrdinary", expected: "44" },
] as const;

interface StressValue {
    readonly expression: string;
    readonly time: number;
}

interface BigIntRoundingProbe {
    readonly value: bigint;
    readonly expected: number;
}

function bigintToBinary64Oracle(value: bigint): number {
    if (value === 0n) return 0;
    const negative = value < 0n;
    const magnitude = negative ? -value : value;
    const bitLength = magnitude.toString(2).length;
    if (bitLength <= 53) {
        const exact = Number(magnitude);
        return negative ? -exact : exact;
    }
    if (bitLength > 1024) return negative ? -Infinity : Infinity;

    let shift = BigInt(bitLength - 53);
    let significand = magnitude >> shift;
    const remainder = magnitude - (significand << shift);
    const halfway = 1n << (shift - 1n);
    if (remainder > halfway || (remainder === halfway && (significand & 1n) !== 0n)) {
        significand += 1n;
    }
    if (significand === 1n << 53n) {
        significand >>= 1n;
        shift += 1n;
    }
    const rounded = Number(significand) * (2 ** Number(shift));
    return negative ? -rounded : rounded;
}

function bigintRoundingPlan(seed: number): BigIntRoundingProbe[] {
    const values = new Set<bigint>([
        0n,
        1n,
        -1n,
        (1n << 53n) - 1n,
        -((1n << 53n) - 1n),
    ]);
    let state = seed >>> 0;
    for (const bitLength of [54, 64, 100, 512, 1024]) {
        const shift = BigInt(bitLength - 53);
        const halfway = 1n << (shift - 1n);
        state = (Math.imul(state, 22695477) + 1) >>> 0;
        const trailing = BigInt(state & 0xfffff);
        const significand = (1n << 52n) + (trailing << 1n) + BigInt(state & 1);
        for (const remainder of [halfway - 1n, halfway, halfway + 1n]) {
            const positive = (significand << shift) + remainder;
            values.add(positive);
            values.add(-positive);
        }
    }
    const maximumSignificand = (1n << 53n) - 1n;
    values.add((maximumSignificand << 971n) + ((1n << 970n) - 1n));
    values.add((maximumSignificand << 971n) + (1n << 970n));
    values.add(1n << 1024n);
    values.add(-(1n << 1024n));
    return [...values].map((value) => ({
        value,
        expected: bigintToBinary64Oracle(value),
    }));
}

function numberSource(value: number): string {
    if (value === Infinity) return "Infinity";
    if (value === -Infinity) return "-Infinity";
    if (Object.is(value, -0)) return "-0";
    return String(value);
}

function stressPlan(seed: number, length: number): StressValue[] {
    const partitions: readonly StressValue[] = [
        { expression: "null", time: 0 },
        { expression: "true", time: 1 },
        { expression: "2.9", time: 2 },
        { expression: '"1970-01-01T00:00:01.000Z"', time: 1000 },
    ];
    const worklist: StressValue[] = [];
    let state = seed >>> 0;
    while (worklist.length < length) {
        state = (Math.imul(state, 1103515245) + 12345) >>> 0;
        worklist.push(partitions[state % partitions.length]!);
    }
    return worklist;
}

function subjectSource(
    stress: readonly StressValue[],
    rounding: readonly BigIntRoundingProbe[],
): string {
    const dateLines = dateProbes.map((probe) =>
        `print("date:${probe.label}:" + formatNumber(new Date(${probe.expression}).getTime()));`
    ).join("\n");
    return `
        function formatNumber(value) {
            return Number.isNaN(value) ? "NaN" :
                (Object.is(value, -0) ? "-0" : String(value));
        }
        function errorResult(callback, sentinel) {
            try { callback(); return "missing"; }
            catch (error) {
                if (error === sentinel) return "identity";
                return error.constructor === TypeError ? "TypeError" : error.constructor.name;
            }
        }

        var existingDate = new Date(1438560000000);
        existingDate.toString = function () { throw { marker: "date-toString-called" }; };
        existingDate.valueOf = function () { throw { marker: "date-valueOf-called" }; };
        var dateDefaultHint = "";
        var dateDefaultNumber = {
            [Symbol.toPrimitive]: function (hint) {
                dateDefaultHint += hint;
                return 33.9;
            }
        };
        var dateDefaultString = {
            [Symbol.toPrimitive]: function (hint) {
                dateDefaultHint += "," + hint;
                return "1970-01-01T00:00:01.000Z";
            }
        };
        var dateOrdinary = {
            valueOf: function () { return 44.9; },
            toString: function () { return "not-selected"; }
        };
        ${dateLines}
        print("date-hints:" + dateDefaultHint);

        var sentinel = { marker: "sentinel" };
        var abrupt = { [Symbol.toPrimitive]: function () { throw sentinel; } };
        print("date-bigint:" + errorResult(function () { new Date(1n); }, sentinel));
        print("date-symbol:" + errorResult(function () { new Date(Symbol()); }, sentinel));
        print("date-abrupt:" + errorResult(function () { new Date(abrupt); }, sentinel));

        var numberHint = "";
        var numberExotic = {
            [Symbol.toPrimitive]: function (hint) { numberHint = hint; return "12.5"; }
        };
        var numberOrdinary = {
            valueOf: function () { return "14.5"; },
            toString: function () { return "wrong"; }
        };
        print("number-exotic:" + formatNumber(Number(numberExotic)) + ":" + numberHint);
        print("number-ordinary:" + formatNumber(Number(numberOrdinary)));
        print("number-bigint:" + formatNumber(Number(9007199254740993n)));
        print("number-bigint-sequence:" + [
            Number(0n), +(new Number(0n)),
            Number(2n**53n), Number(2n**53n + 1n), Number(2n**53n + 2n),
            Number(2n**53n + 3n), Number(2n**53n + 4n),
            Number(-(2n**53n)), Number(-(2n**53n + 1n)), Number(-(2n**53n + 2n)),
            Number(-(2n**53n + 3n)), Number(-(2n**53n + 4n))
        ].join(","));
        var bigintRoundingOk = true;
        ${rounding.map(({ value, expected }) =>
            `bigintRoundingOk = bigintRoundingOk && Object.is(Number(${value}n), ${numberSource(expected)});`
        ).join("\n")}
        print("number-bigint-rounding:" + String(bigintRoundingOk));
        print("number-symbol:" + errorResult(function () { Number(Symbol()); }, sentinel));
        print("number-abrupt:" + errorResult(function () { Number(abrupt); }, sentinel));
        print("global-isnan:" + String(isNaN({ valueOf: function () { return "nan"; } })));
        print("global-isfinite:" + String(isFinite({ valueOf: function () { return "8"; } })));

        var stressValues = [${stress.map((value) => value.expression).join(",")}];
        var stressTotal = 0;
        for (var index = 0; index < stressValues.length; index++) {
            stressTotal += new Date(stressValues[index]).getTime();
        }
        print("date-stress:" + formatNumber(stressTotal));
    `;
}

function expectedOutput(stress: readonly StressValue[]): string {
    return [
        ...dateProbes.map((probe) => `date:${probe.label}:${probe.expected}`),
        "date-hints:default,default",
        "date-bigint:TypeError",
        "date-symbol:TypeError",
        "date-abrupt:identity",
        "number-exotic:12.5:number",
        "number-ordinary:14.5",
        "number-bigint:9007199254740992",
        "number-bigint-sequence:0,0,9007199254740992,9007199254740992,9007199254740994,9007199254740996,9007199254740996,-9007199254740992,-9007199254740992,-9007199254740994,-9007199254740996,-9007199254740996",
        "number-bigint-rounding:true",
        "number-symbol:TypeError",
        "number-abrupt:identity",
        "global-isnan:true",
        "global-isfinite:true",
        `date-stress:${stress.reduce((sum, value) => sum + value.time, 0)}`,
        "",
    ].join("\n");
}

test("Date and Number consume the shared ToPrimitive conversion model", async () => {
    const stress = stressPlan(0xc0e2ce26, 43);
    const rounding = bigintRoundingPlan(0xb16b00b5);
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-conversion-consumers-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/conversion-consumers.js#sloppy";
    try {
        await fs.writeFile(entry, subjectSource(stress, rounding), "utf8");
        for (const noGc of [false, true]) {
            const mode = noGc ? "no-gc" : "gc";
            const executable = path.join(temporary, `subject-${mode}`);
            const diagnostics: string[] = [];
            const result = await compile({
                entry,
                output: executable,
                buildDir: path.join(temporary, `build-${mode}`),
                initializationEntries: [entry],
                noGc,
                test262Observation: {
                    kind: "test262-native-observation",
                    scenarioId,
                    setupEntries: [],
                    testEntry: entry,
                    async: false,
                },
                diagnosticWriter: (message) => diagnostics.push(message),
            });
            expect(diagnostics.join("")).toBe("");
            expect(result.exitCode).toBe(0);

            const process = Bun.spawnSync([executable], { stdout: "pipe", stderr: "pipe" });
            expect(process.exitCode).toBe(0);
            expect(process.stderr.toString()).toBe("");
            expect(parseHostObservation(JSON.parse(process.stdout.toString()))).toEqual({
                protocolVersion: hostProtocolVersion,
                scenarioId,
                kind: "normal",
                asyncCompletion: undefined,
                stdout: expectedOutput(stress),
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

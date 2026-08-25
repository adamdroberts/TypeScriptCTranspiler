import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { hostProtocolVersion, parseHostObservation } from "../test262/protocol";

interface NumericProbe {
    readonly label: string;
    readonly input: string;
    readonly expected: number;
    readonly radixExpression?: string;
}

const ecmascriptWhitespace = [
    0x0009, 0x000a, 0x000b, 0x000c, 0x000d, 0x0020, 0x00a0, 0x1680,
    0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007,
    0x2008, 0x2009, 0x200a, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000,
    0xfeff,
].map((codePoint) => String.fromCodePoint(codePoint)).join("");

function bigintToBinary64Oracle(value: bigint): number {
    if (value === 0n) return 0;
    const negative = value < 0n;
    const magnitude = negative ? -value : value;
    const bitLength = magnitude.toString(2).length;
    if (bitLength <= 53) return Number(value);
    if (bitLength > 1024) return negative ? -Infinity : Infinity;

    let shift = BigInt(bitLength - 53);
    let significand = magnitude >> shift;
    const remainder = magnitude - (significand << shift);
    const halfway = 1n << (shift - 1n);
    if (remainder > halfway ||
        (remainder === halfway && (significand & 1n) !== 0n)) {
        significand += 1n;
    }
    if (significand === 1n << 53n) {
        significand >>= 1n;
        shift += 1n;
    }
    const rounded = Number(significand) * (2 ** Number(shift));
    return negative ? -rounded : rounded;
}

function generatedIntegerProbes(seed: number): NumericProbe[] {
    const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
    const probes: NumericProbe[] = [];
    let state = seed >>> 0;
    for (const radix of [2, 3, 8, 10, 16, 36]) {
        let digits = "";
        let exact = 0n;
        for (let index = 0; index < 97; index++) {
            state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
            const digit = index === 0 ? 1 + (state % (radix - 1)) : state % radix;
            digits += alphabet[digit];
            exact = exact * BigInt(radix) + BigInt(digit);
        }
        const negative = (state & 1) !== 0;
        probes.push({
            label: `generated-radix-${radix}`,
            input: `${negative ? "-" : ""}${digits}!ignored`,
            radixExpression: String(radix),
            expected: bigintToBinary64Oracle(negative ? -exact : exact),
        });
    }
    return probes;
}

const parseIntProbes: readonly NumericProbe[] = [
    { label: "empty", input: "", expected: Number.NaN },
    { label: "whitespace", input: `${ecmascriptWhitespace}+42tail`, expected: 42 },
    { label: "negative-zero", input: "-0", expected: -0 },
    { label: "default-hex", input: "0x10", expected: 16 },
    { label: "explicit-hex", input: "-0Xf", radixExpression: "16", expected: -15 },
    { label: "decimal-prefix", input: "0x10", radixExpression: "10", expected: 0 },
    { label: "binary", input: "101tail", radixExpression: "2", expected: 5 },
    { label: "base36", input: "z", radixExpression: "36", expected: 35 },
    { label: "partial-exponent", input: "1e2", radixExpression: "10", expected: 1 },
    { label: "invalid-digits", input: "xyz", radixExpression: "10", expected: Number.NaN },
    { label: "radix-low", input: "10", radixExpression: "1", expected: Number.NaN },
    { label: "radix-high", input: "10", radixExpression: "37", expected: Number.NaN },
    { label: "radix-to-int32", input: "10", radixExpression: "4294967298", expected: 2 },
    { label: "infinite-radix", input: "17", radixExpression: "Infinity", expected: 17 },
    { label: "round-down-tie", input: "9007199254740993", expected: 9007199254740992 },
    { label: "round-up-tie", input: "9007199254740995", expected: 9007199254740996 },
    { label: "overflow", input: `1${"0".repeat(400)}`, expected: Infinity },
    { label: "representative-wide-prefix", input: `${"0".repeat(4096)}42`, expected: 42 },
    ...generatedIntegerProbes(0xec2026),
] as const;

const generatedDecimal = `1.${"314159265358979323846264338327950288419716939937510".repeat(3)}e+17`;
const parseFloatProbes: readonly NumericProbe[] = [
    { label: "empty", input: "", expected: Number.NaN },
    { label: "whitespace-partial", input: `${ecmascriptWhitespace}-1.25tail`, expected: -1.25 },
    { label: "leading-dot", input: ".5", expected: 0.5 },
    { label: "trailing-dot", input: "1.", expected: 1 },
    { label: "exponent", input: "1e2tail", expected: 100 },
    { label: "incomplete-exponent", input: "1e+", expected: 1 },
    { label: "positive-infinity", input: "Infinity!", expected: Infinity },
    { label: "negative-infinity", input: "-Infinity", expected: -Infinity },
    { label: "hex-prefix", input: "0x10", expected: 0 },
    { label: "invalid", input: "nan", expected: Number.NaN },
    { label: "negative-zero", input: "-0", expected: -0 },
    { label: "finite-boundary", input: "1.7976931348623157e308", expected: Number.MAX_VALUE },
    { label: "overflow", input: "1e309", expected: Infinity },
    { label: "minimum-subnormal", input: "5e-324", expected: Number.MIN_VALUE },
    { label: "generated-decimal", input: generatedDecimal, expected: Number(generatedDecimal) },
    { label: "representative-wide-prefix", input: `${"0".repeat(4096)}1.25`, expected: 1.25 },
] as const;

function numberExpression(value: number): string {
    if (Number.isNaN(value)) return "NaN";
    if (value === Infinity) return "Infinity";
    if (value === -Infinity) return "-Infinity";
    if (Object.is(value, -0)) return "-0";
    return String(value);
}

function checkExpression(label: string, actual: string, expected: number): string {
    return `checkNumber(${JSON.stringify(label)}, ${actual}, ${numberExpression(expected)});`;
}

function subjectSource(): string {
    const lines = [
        "var failures = [];",
        "function check(condition, label) { if (!condition) failures.push(label); }",
        "function checkNumber(label, actual, expected) {",
        "  check(Number.isNaN(expected) ? Number.isNaN(actual) : Object.is(actual, expected), label);",
        "}",
    ];
    for (const probe of parseIntProbes) {
        const input = JSON.stringify(probe.input);
        const argumentsList = probe.radixExpression === undefined
            ? input
            : `${input}, ${probe.radixExpression}`;
        const reflectedArguments = probe.radixExpression === undefined
            ? `[${input}]`
            : `[${input}, ${probe.radixExpression}]`;
        lines.push(
            checkExpression(`parseInt-direct:${probe.label}`, `parseInt(${argumentsList})`, probe.expected),
            checkExpression(
                `parseInt-reflect:${probe.label}`,
                `Reflect.apply(globalThis.parseInt, null, ${reflectedArguments})`,
                probe.expected,
            ),
        );
    }
    for (const probe of parseFloatProbes) {
        const input = JSON.stringify(probe.input);
        lines.push(
            checkExpression(`parseFloat-direct:${probe.label}`, `parseFloat(${input})`, probe.expected),
            checkExpression(
                `parseFloat-reflect:${probe.label}`,
                `Reflect.apply(globalThis.parseFloat, null, [${input}])`,
                probe.expected,
            ),
        );
    }
    lines.push(`
        var globalFunctionPlan = [
            ["parseFloat", 1], ["parseInt", 2], ["isFinite", 1], ["isNaN", 1],
            ["encodeURI", 1], ["encodeURIComponent", 1],
            ["decodeURI", 1], ["decodeURIComponent", 1]
        ];
        for (var functionIndex = 0; functionIndex < globalFunctionPlan.length; functionIndex += 1) {
            var functionName = globalFunctionPlan[functionIndex][0];
            var functionLength = globalFunctionPlan[functionIndex][1];
            var globalFunction = globalThis[functionName];
            var descriptor = Object.getOwnPropertyDescriptor(globalThis, functionName);
            check(typeof globalFunction === "function", "callable:" + functionName);
            check(globalFunction === globalThis[functionName], "stable:" + functionName);
            check(globalFunction.name === functionName && globalFunction.length === functionLength,
                "metadata:" + functionName);
            check(Object.getPrototypeOf(globalFunction) === Function.prototype,
                "prototype:" + functionName);
            check(descriptor && descriptor.value === globalFunction && descriptor.writable &&
                !descriptor.enumerable && descriptor.configurable, "descriptor:" + functionName);
        }

        checkNumber("parseInt-omitted-direct", parseInt(), NaN);
        checkNumber("parseFloat-omitted-direct", parseFloat(), NaN);
        checkNumber("parseInt-omitted-reflect", Reflect.apply(globalThis.parseInt, null, []), NaN);
        checkNumber("parseFloat-omitted-reflect", Reflect.apply(globalThis.parseFloat, null, []), NaN);
        check(isNaN() === true && isFinite() === false, "predicate-omitted-direct");
        check(Reflect.apply(globalThis.isNaN, null, []) === true &&
            Reflect.apply(globalThis.isFinite, null, []) === false, "predicate-omitted-reflect");
        check(encodeURI() === "undefined" && encodeURIComponent() === "undefined" &&
            decodeURI() === "undefined" && decodeURIComponent() === "undefined",
            "uri-omitted-direct");
        check(Reflect.apply(globalThis.encodeURI, null, ["a b"]) === "a%20b" &&
            Reflect.apply(globalThis.encodeURIComponent, null, ["a/b"]) === "a%2Fb" &&
            Reflect.apply(globalThis.decodeURI, null, ["a%20b"]) === "a b" &&
            Reflect.apply(globalThis.decodeURIComponent, null, ["a%2Fb"]) === "a/b",
            "uri-reflective-call");

        var trace = "";
        var inputObject = {
            toString: function () { trace += "s"; return "17tail"; },
            valueOf: function () { trace += "wrong"; return 99; }
        };
        var radixObject = { valueOf: function () { trace += "r"; return 10; } };
        checkNumber("parseInt-object-direct", parseInt(inputObject, radixObject), 17);
        check(trace === "sr", "parseInt-object-direct-order");
        trace = "";
        checkNumber("parseInt-object-reflect",
            Reflect.apply(globalThis.parseInt, null, [inputObject, radixObject]), 17);
        check(trace === "sr", "parseInt-object-reflect-order");

        var ignoredTrace = 0;
        function markIgnored() { ignoredTrace = 1; return 1; }
        checkNumber("parseFloat-ignored", parseFloat("2.5", markIgnored()), 2.5);
        check(ignoredTrace === 1, "parseFloat-ignored-order");
        var sentinel = {};
        var abrupt = { toString: function () { throw sentinel; } };
        var exact = false;
        try { Reflect.apply(globalThis.parseFloat, null, [abrupt]); }
        catch (error) { exact = error === sentinel; }
        check(exact, "parseFloat-abrupt-identity");
        var symbolTypeError = false;
        try { Reflect.apply(globalThis.parseInt, null, [Symbol(), 10]); }
        catch (error) { symbolTypeError = error instanceof TypeError; }
        check(symbolTypeError, "parseInt-symbol-TypeError");
        print(failures.length === 0 ? "global-number-functions-ok" : failures.join(","));
    `);
    return lines.join("\n");
}

test("global numeric functions follow one length-driven parse model", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-global-number-functions-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/global-number-functions.js#sloppy";
    try {
        await fs.writeFile(entry, subjectSource(), "utf8");
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
                stdout: "global-number-functions-ok\n",
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

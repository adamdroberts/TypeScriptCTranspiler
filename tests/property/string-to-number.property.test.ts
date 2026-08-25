import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";

interface StringNumberProbe {
    readonly label: string;
    readonly input: string;
    readonly expected: number;
}

interface ConversionProbe {
    readonly label: string;
    readonly expression: string;
    readonly expected: number;
}

const ecmascriptWhitespace = [
    0x0009, 0x000a, 0x000b, 0x000c, 0x000d, 0x0020, 0x00a0, 0x1680,
    0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007,
    0x2008, 0x2009, 0x200a, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000,
    0xfeff,
].map((codePoint) => String.fromCodePoint(codePoint)).join("");

const probes: readonly StringNumberProbe[] = [
    { label: "empty", input: "", expected: 0 },
    { label: "whitespace-only", input: ecmascriptWhitespace, expected: 0 },
    { label: "trimmed-decimal", input: `${ecmascriptWhitespace}-42.5${ecmascriptWhitespace}`, expected: -42.5 },
    { label: "leading-dot", input: ".5", expected: 0.5 },
    { label: "trailing-dot", input: "1.", expected: 1 },
    { label: "exponent", input: "1e2", expected: 100 },
    { label: "incomplete-exponent", input: "1e+", expected: Number.NaN },
    { label: "positive-infinity", input: "+Infinity", expected: Infinity },
    { label: "negative-infinity", input: "-Infinity", expected: -Infinity },
    { label: "infinity-case", input: "infinity", expected: Number.NaN },
    { label: "hex", input: "0x10", expected: 16 },
    { label: "hex-upper", input: "0Xff", expected: 255 },
    { label: "binary", input: "0b101", expected: 5 },
    { label: "binary-upper", input: "0B101", expected: 5 },
    { label: "octal", input: "0o10", expected: 8 },
    { label: "octal-upper", input: "0O10", expected: 8 },
    { label: "signed-hex", input: "+0x1", expected: Number.NaN },
    { label: "negative-binary", input: "-0b1", expected: Number.NaN },
    { label: "invalid-binary", input: "0b2", expected: Number.NaN },
    { label: "invalid-octal", input: "0o8", expected: Number.NaN },
    { label: "invalid-hex", input: "0xg", expected: Number.NaN },
    { label: "legacy-leading-zero", input: "08", expected: 8 },
    { label: "numeric-separator", input: "1_0", expected: Number.NaN },
    { label: "trailing-input", input: "1tail", expected: Number.NaN },
    { label: "nan-spelling", input: "NaN", expected: Number.NaN },
    { label: "negative-zero", input: "-0", expected: -0 },
    { label: "former-whitespace", input: "\u180e1", expected: Number.NaN },
    { label: "embedded-nul", input: "1\0", expected: Number.NaN },
    { label: "hex-round-down-tie", input: "0x20000000000001", expected: 9007199254740992 },
    { label: "hex-round-up-tie", input: "0x20000000000003", expected: 9007199254740996 },
    { label: "decimal-finite-boundary", input: "1.7976931348623157e308", expected: Number.MAX_VALUE },
    { label: "decimal-overflow", input: "1e309", expected: Infinity },
    { label: "minimum-subnormal", input: "5e-324", expected: Number.MIN_VALUE },
    { label: "representative-wide-decimal", input: `${"0".repeat(4096)}1`, expected: 1 },
] as const;

const conversionProbes: readonly ConversionProbe[] = [
    { label: "true", expression: "true", expected: 1 },
    { label: "false", expression: "false", expected: 0 },
    { label: "null", expression: "null", expected: 0 },
    { label: "undefined", expression: "undefined", expected: Number.NaN },
    { label: "empty-array", expression: "[]", expected: 0 },
    { label: "singleton-number-array", expression: "[1]", expected: 1 },
    { label: "singleton-infinity-array", expression: "[Infinity]", expected: Infinity },
    { label: "singleton-nan-array", expression: "[NaN]", expected: Number.NaN },
    { label: "multi-element-array", expression: "[1, 2]", expected: Number.NaN },
    { label: "value-of-object", expression: "({ valueOf() { return 7; } })", expected: 7 },
    { label: "to-string-fallback", expression: "({ valueOf() { return {}; }, toString() { return '8'; } })", expected: 8 },
] as const;

function numberExpression(value: number): string {
    if (Number.isNaN(value)) return "NaN";
    if (value === Infinity) return "Infinity";
    if (value === -Infinity) return "-Infinity";
    if (Object.is(value, -0)) return "-0";
    return String(value);
}

function subjectSource(): string {
    const lines = [
        "var failures = [];",
        "function check(condition, label) { if (!condition) failures.push(label); }",
        "function checkNumber(label, actual, expected) {",
        "  check(Number.isNaN(expected) ? Number.isNaN(actual) : Object.is(actual, expected), label);",
        "}",
        "function checkTypeError(label, callback) {",
        "  try { callback(); check(false, label + ':missing'); }",
        "  catch (error) { check(error instanceof TypeError, label + ':type'); }",
        "}",
    ];
    for (const probe of probes) {
        const input = JSON.stringify(probe.input);
        const expected = numberExpression(probe.expected);
        lines.push(
            `checkNumber(${JSON.stringify(`Number:${probe.label}`)}, Number(${input}), ${expected});`,
            `checkNumber(${JSON.stringify(`unary-plus:${probe.label}`)}, +(${input}), ${expected});`,
            `check(isFinite(${input}) === ${Number.isFinite(probe.expected)}, ${JSON.stringify(`isFinite:${probe.label}`)});`,
            `check(isNaN(${input}) === ${Number.isNaN(probe.expected)}, ${JSON.stringify(`isNaN:${probe.label}`)});`,
        );
    }
    for (const probe of conversionProbes) {
        const expected = numberExpression(probe.expected);
        lines.push(
            `checkNumber(${JSON.stringify(`Number:${probe.label}`)}, Number(${probe.expression}), ${expected});`,
            `checkNumber(${JSON.stringify(`unary-plus:${probe.label}`)}, +(${probe.expression}), ${expected});`,
            `check(isFinite(${probe.expression}) === ${Number.isFinite(probe.expected)}, ${JSON.stringify(`isFinite:${probe.label}`)});`,
            `check(isNaN(${probe.expression}) === ${Number.isNaN(probe.expected)}, ${JSON.stringify(`isNaN:${probe.label}`)});`,
        );
    }
    lines.push(
        'checkNumber("Number:bigint", Number(1n), 1);',
        'checkTypeError("unary-plus:bigint", function() { +(1n); });',
        'checkTypeError("isFinite:bigint", function() { isFinite(1n); });',
        'checkTypeError("isNaN:bigint", function() { isNaN(1n); });',
        'checkTypeError("Number:symbol", function() { Number(Symbol("number")); });',
        'checkTypeError("unary-plus:symbol", function() { +(Symbol("plus")); });',
        'checkTypeError("isFinite:symbol", function() { isFinite(Symbol("finite")); });',
        'checkTypeError("isNaN:symbol", function() { isNaN(Symbol("nan")); });',
    );
    lines.push('console.log(failures.length === 0 ? "string-to-number-ok" : failures.join(","));');
    return lines.join("\n");
}

test("StringNumericLiteral conversion follows one complete-input scanner", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-string-to-number-property-"));
    const entry = path.join(temporary, "subject.js");
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
                noGc,
                diagnosticWriter: (message) => diagnostics.push(message),
            });
            expect(diagnostics.join("")).toBe("");
            expect(result.exitCode).toBe(0);

            const process = Bun.spawnSync([executable], { stdout: "pipe", stderr: "pipe" });
            expect(process.exitCode).toBe(0);
            expect(process.stderr.toString()).toBe("");
            expect(process.stdout.toString()).toBe("string-to-number-ok\n");
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

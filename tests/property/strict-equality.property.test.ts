import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";

type EcmaType =
    | "Undefined"
    | "Null"
    | "Boolean"
    | "Number"
    | "BigInt"
    | "String"
    | "Symbol"
    | "Object";

interface StrictValue {
    readonly label: string;
    readonly expression: string;
    readonly type: EcmaType;
    readonly value: boolean | number | bigint | string | null;
}

const values: readonly StrictValue[] = [
    { label: "undefined", expression: "undefined", type: "Undefined", value: null },
    { label: "null", expression: "null", type: "Null", value: null },
    { label: "false", expression: "false", type: "Boolean", value: false },
    { label: "true", expression: "true", type: "Boolean", value: true },
    { label: "zero", expression: "0", type: "Number", value: 0 },
    { label: "negativeZero", expression: "-0", type: "Number", value: -0 },
    { label: "one", expression: "1", type: "Number", value: 1 },
    { label: "nan", expression: "NaN", type: "Number", value: Number.NaN },
    { label: "emptyString", expression: '""', type: "String", value: "" },
    { label: "oneString", expression: '"1"', type: "String", value: "1" },
    { label: "oneBigInt", expression: "1n", type: "BigInt", value: 1n },
    { label: "twoBigInt", expression: "2n", type: "BigInt", value: 2n },
    { label: "symbolA", expression: "symbolA", type: "Symbol", value: "symbol-a" },
    { label: "symbolB", expression: "symbolB", type: "Symbol", value: "symbol-b" },
    { label: "objectA", expression: "objectA", type: "Object", value: "object-a" },
    { label: "objectB", expression: "objectB", type: "Object", value: "object-b" },
    { label: "functionA", expression: "functionA", type: "Object", value: "function-a" },
    { label: "functionB", expression: "functionB", type: "Object", value: "function-b" },
];

function strictEqual(left: StrictValue, right: StrictValue): boolean {
    if (left.type !== right.type) return false;
    if (left.type === "Undefined" || left.type === "Null") return true;
    if (left.type === "Number") {
        const leftNumber = left.value as number;
        const rightNumber = right.value as number;
        return !Number.isNaN(leftNumber) && !Number.isNaN(rightNumber) && leftNumber === rightNumber;
    }
    return left.value === right.value;
}

function source(): string {
    const lines = [
        "(function () {",
        "var trace = '';",
        "var symbolA = Symbol('a');",
        "var symbolB = Symbol('b');",
        "var objectA = /a/;",
        "var objectB = /b/;",
        "var functionA = function () {};",
        "var functionB = function () {};",
    ];
    for (const left of values) {
        for (const right of values) {
            lines.push(
                "trace = '';",
                `console.log(String((trace += "L", ${left.expression}) === (trace += "R", ${right.expression})) + ":" + trace);`,
                "trace = '';",
                `console.log(String((trace += "L", ${left.expression}) !== (trace += "R", ${right.expression})) + ":" + trace);`,
            );
        }
    }
    lines.push("})();");
    return lines.join("\n");
}

function expectedOutput(): string[] {
    const output: string[] = [];
    for (const left of values) {
        for (const right of values) {
            const equal = strictEqual(left, right);
            output.push(`${equal}:LR`, `${!equal}:LR`);
        }
    }
    return output;
}

test("strict equality follows the canonical ECMAScript Type partition", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-strict-equality-property-"));
    const entry = path.join(temporary, "subject.js");
    try {
        await fs.writeFile(entry, source(), "utf8");
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
            expect(process.stdout.toString().trimEnd().split("\n")).toEqual(expectedOutput());
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";

type ModelValue =
    | { readonly kind: "undefined" | "null" }
    | { readonly kind: "boolean"; readonly value: boolean }
    | { readonly kind: "number"; readonly value: number }
    | { readonly kind: "string" | "bigint"; readonly value: string }
    | { readonly kind: "object" | "symbol"; readonly identity: string };

interface ValuePlan {
    readonly label: string;
    readonly source: string;
    readonly model: ModelValue;
}

const valuePlan: readonly ValuePlan[] = [
    { label: "undefined", source: "undefined", model: { kind: "undefined" } },
    { label: "null", source: "null", model: { kind: "null" } },
    { label: "false", source: "false", model: { kind: "boolean", value: false } },
    { label: "true", source: "true", model: { kind: "boolean", value: true } },
    { label: "zero", source: "0", model: { kind: "number", value: 0 } },
    { label: "negative-zero", source: "-0", model: { kind: "number", value: -0 } },
    { label: "nan", source: "NaN", model: { kind: "number", value: Number.NaN } },
    { label: "number-one", source: "1", model: { kind: "number", value: 1 } },
    { label: "string-one", source: "'1'", model: { kind: "string", value: "1" } },
    { label: "empty", source: "''", model: { kind: "string", value: "" } },
    { label: "object-a", source: "objectA", model: { kind: "object", identity: "object-a" } },
    { label: "object-b", source: "objectB", model: { kind: "object", identity: "object-b" } },
    { label: "symbol-a", source: "symbolA", model: { kind: "symbol", identity: "symbol-a" } },
    { label: "symbol-b", source: "symbolB", model: { kind: "symbol", identity: "symbol-b" } },
    { label: "bigint-one", source: "1n", model: { kind: "bigint", value: "1" } },
    { label: "function-a", source: "functionA", model: { kind: "object", identity: "function-a" } },
    { label: "function-b", source: "functionB", model: { kind: "object", identity: "function-b" } },
];

function strictEqual(left: ModelValue, right: ModelValue): boolean {
    if (left.kind !== right.kind) return false;
    switch (left.kind) {
        case "undefined":
        case "null":
            return true;
        case "boolean":
            return left.value === (right as Extract<ModelValue, { kind: "boolean" }>).value;
        case "number": {
            const rightNumber = (right as Extract<ModelValue, { kind: "number" }>).value;
            return !Number.isNaN(left.value) && !Number.isNaN(rightNumber) && left.value === rightNumber;
        }
        case "string":
        case "bigint":
            return left.value === (right as Extract<ModelValue, { kind: "string" | "bigint" }>).value;
        case "object":
        case "symbol":
            return left.identity === (right as Extract<ModelValue, { kind: "object" | "symbol" }>).identity;
    }
}

function rotatedCaseIndices(discriminantIndex: number): number[] {
    return valuePlan.map((_, offset) => (discriminantIndex + 5 + offset) % valuePlan.length);
}

function modeledSelection(discriminantIndex: number, caseIndices: readonly number[]): {
    readonly selected: string;
    readonly evaluated: readonly string[];
} {
    const evaluated: string[] = [];
    for (const caseIndex of caseIndices) {
        const candidate = valuePlan[caseIndex]!;
        evaluated.push(candidate.label);
        if (strictEqual(valuePlan[discriminantIndex]!.model, candidate.model)) {
            return { selected: candidate.label, evaluated };
        }
    }
    return { selected: "default", evaluated };
}

function sourceAndExpected(): { source: string; expected: string } {
    const numberOneIndex = valuePlan.findIndex((value) => value.label === "number-one");
    const stringOneIndex = valuePlan.findIndex((value) => value.label === "string-one");
    if (numberOneIndex < 0 || stringOneIndex < 0) throw new Error("mixed-Type switch plan is incomplete");
    const source: string[] = [
        "var objectA = {};",
        "var objectB = {};",
        "var unmatchedObject = {};",
        "var symbolA = Symbol('same');",
        "var symbolB = Symbol('same');",
        "function functionA() {}",
        "function functionB() {}",
        `var switchValues = [${valuePlan.map((value) => value.source).join(",")}];`,
    ];
    const expected: string[] = [];

    for (let discriminantIndex = 0; discriminantIndex < valuePlan.length; discriminantIndex++) {
        const cases = rotatedCaseIndices(discriminantIndex);
        const modeled = modeledSelection(discriminantIndex, cases);
        source.push(
            `var trace_${discriminantIndex} = "D";`,
            `var selected_${discriminantIndex} = "unselected";`,
            `switch ((trace_${discriminantIndex} += ":disc", switchValues[${discriminantIndex}])) {`,
            ...cases.map((caseIndex) =>
                `case (trace_${discriminantIndex} += ":${valuePlan[caseIndex]!.label}", switchValues[${caseIndex}]): ` +
                `selected_${discriminantIndex} = "${valuePlan[caseIndex]!.label}"; break;`,
            ),
            `default: selected_${discriminantIndex} = "default";`,
            "}",
            `console.log("partition:${valuePlan[discriminantIndex]!.label}:" + selected_${discriminantIndex} + ":" + trace_${discriminantIndex});`,
        );
        expected.push(
            `partition:${valuePlan[discriminantIndex]!.label}:${modeled.selected}:` +
            `D:disc:${modeled.evaluated.join(":")}`,
        );
    }

    source.push(
        "var staticMixed = '';",
        "switch ('1') {",
        `case switchValues[${numberOneIndex}]: staticMixed = 'coerced'; break;`,
        `case switchValues[${stringOneIndex}]: staticMixed = 'strict'; break;`,
        "default: staticMixed = 'default';",
        "}",
        "console.log('static-mixed:' + staticMixed);",
        "var lateTrace = 'D';",
        "var lateResult = '';",
        "switch ((lateTrace += ':disc', objectB)) {",
        "case (lateTrace += ':object-a', objectA): lateResult = 'early'; break;",
        "default: lateResult += 'default>';",
        "case (lateTrace += ':true', true): lateResult += 'fall'; break;",
        "case (lateTrace += ':object-b', objectB): lateResult = 'late'; break;",
        "}",
        "console.log('default-middle-match:' + lateResult + ':' + lateTrace);",
        "var missTrace = 'D';",
        "var missResult = '';",
        "switch ((missTrace += ':disc', unmatchedObject)) {",
        "case (missTrace += ':object-a', objectA): missResult = 'early'; break;",
        "default: missResult += 'default>';",
        "case (missTrace += ':true', true): missResult += 'fall'; break;",
        "case (missTrace += ':object-b', objectB): missResult = 'late'; break;",
        "}",
        "console.log('default-middle-miss:' + missResult + ':' + missTrace);",
        "var fallthrough = '';",
        "switch (switchValues[3]) {",
        "case switchValues[3]: fallthrough += 'selected>';",
        "case switchValues[4]: fallthrough += 'fall'; break;",
        "default: fallthrough = 'default';",
        "}",
        "console.log('fallthrough:' + fallthrough);",
        "var sentinel = {};",
        "var abruptTrace = '';",
        "function abrupt(label) { abruptTrace += label; throw sentinel; }",
        "try { switch (abrupt('D')) { case (abruptTrace += 'C', 0): break; } }",
        "catch (error) { console.log('abrupt-disc:' + String(error === sentinel) + ':' + abruptTrace); }",
        "abruptTrace = '';",
        "try { switch (0) { case abrupt('C'): break; case (abruptTrace += 'L', 0): break; } }",
        "catch (error) { console.log('abrupt-case:' + String(error === sentinel) + ':' + abruptTrace); }",
    );
    expected.push(
        "static-mixed:strict",
        "default-middle-match:late:D:disc:object-a:true:object-b",
        "default-middle-miss:default>fall:D:disc:object-a:true:object-b",
        "fallthrough:selected>fall",
        "abrupt-disc:true:D",
        "abrupt-case:true:C",
    );

    const fixedCases = valuePlan.map((_, index) => index);
    source.push(
        "async function asyncSelect(index) {",
        "var trace = 'D';",
        "var selected = 'unselected';",
        "switch ((trace += ':disc', await Promise.resolve(switchValues[index]))) {",
        ...fixedCases.map((caseIndex) =>
            `case (trace += ':${valuePlan[caseIndex]!.label}', switchValues[${caseIndex}]): ` +
            `selected = '${valuePlan[caseIndex]!.label}'; break;`,
        ),
        "default: selected = 'default';",
        "}",
        "return selected + ':' + trace;",
        "}",
        "async function asyncAwaitedSelect() {",
        "var trace = 'D';",
        "var selected = 'unselected';",
        "switch ((trace += ':disc', await Promise.resolve(functionA))) {",
        "case await (trace += ':function-b', Promise.resolve(functionB)): selected = 'function-b'; break;",
        "default: selected = 'default'; break;",
        "case await (trace += ':function-a', Promise.resolve(functionA)): selected = 'function-a'; break;",
        "}",
        "return selected + ':' + trace;",
        "}",
        "async function runAsyncSelections() {",
        ...valuePlan.flatMap((value, index) => [
            `var asyncResult_${index} = await asyncSelect(${index});`,
            `console.log('async:${value.label}:' + asyncResult_${index});`,
        ]),
        "var asyncAwaitedResult = await asyncAwaitedSelect();",
        "console.log('async-awaited:' + asyncAwaitedResult);",
        "}",
        "runAsyncSelections();",
    );
    for (let index = 0; index < valuePlan.length; index++) {
        const value = valuePlan[index]!;
        const modeled = modeledSelection(index, fixedCases);
        expected.push(
            `async:${value.label}:${modeled.selected}:D:disc:${modeled.evaluated.join(":")}`,
        );
    }
    expected.push(
        "async-awaited:function-a:D:disc:function-b:function-a",
    );
    return { source: source.join("\n"), expected: expected.join("\n") + "\n" };
}

test("switch selection follows one Strict Equality clause worklist", async () => {
    const generated = sourceAndExpected();
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-switch-selection-property-"));
    const entry = path.join(temporary, "subject.js");
    try {
        await fs.writeFile(entry, generated.source, "utf8");
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
            if (diagnostics.length > 0) {
                const line = Number(/:(\d+):\d+:/.exec(diagnostics[0] ?? "")?.[1] ?? 1);
                const excerpt = generated.source.split("\n")
                    .slice(Math.max(0, line - 3), line + 2)
                    .map((sourceLine, offset) => `${Math.max(0, line - 3) + offset + 1}: ${sourceLine}`)
                    .join("\n");
                throw new Error(`${diagnostics.join("")}\n${excerpt}`);
            }
            expect(diagnostics.join("")).toBe("");
            expect(result.exitCode).toBe(0);

            const process = Bun.spawnSync([executable], { stdout: "pipe", stderr: "pipe" });
            expect(process.exitCode).toBe(0);
            expect(process.stderr.toString()).toBe("");
            expect(process.stdout.toString()).toBe(generated.expected);
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

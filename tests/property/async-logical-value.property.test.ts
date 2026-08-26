import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";

interface LogicalValuePartition {
    readonly label: string;
    readonly expression: string;
    readonly truthy: boolean;
    readonly nullish: boolean;
}

interface LogicalOperatorPartition {
    readonly label: "&&" | "||" | "??";
    readonly functionName: string;
    readonly selectsRight: (value: LogicalValuePartition) => boolean;
}

const values: readonly LogicalValuePartition[] = [
    { label: "undefined", expression: "undefined", truthy: false, nullish: true },
    { label: "null", expression: "null", truthy: false, nullish: true },
    { label: "false", expression: "false", truthy: false, nullish: false },
    { label: "true", expression: "true", truthy: true, nullish: false },
    { label: "zero", expression: "0", truthy: false, nullish: false },
    { label: "one", expression: "1", truthy: true, nullish: false },
    { label: "nan", expression: "NaN", truthy: false, nullish: false },
    { label: "empty-string", expression: "''", truthy: false, nullish: false },
    { label: "string", expression: "'value'", truthy: true, nullish: false },
    { label: "zero-bigint", expression: "0n", truthy: false, nullish: false },
    { label: "bigint", expression: "1n", truthy: true, nullish: false },
    { label: "symbol", expression: "symbolValue", truthy: true, nullish: false },
    { label: "object", expression: "objectValue", truthy: true, nullish: false },
    { label: "function", expression: "functionValue", truthy: true, nullish: false },
];

const operators: readonly LogicalOperatorPartition[] = [
    { label: "&&", functionName: "logicalAnd", selectsRight: (value) => value.truthy },
    { label: "||", functionName: "logicalOr", selectsRight: (value) => !value.truthy },
    { label: "??", functionName: "logicalNullish", selectsRight: (value) => value.nullish },
];

function subjectSource(): string {
    const lines = [
        "const symbolValue = Symbol('logical');",
        "const objectValue = { marker: 'left-object' };",
        "const rightValue = { marker: 'right-object' };",
        "const leftError = { marker: 'left-error' };",
        "const rightError = { marker: 'right-error' };",
        "const functionValue = function logicalFunction(): string { return 'function'; };",
        `const values: any[] = [${values.map((value) => value.expression).join(", ")}];`,
        "let trace = '';",
        "function left(value: any): any { trace += 'L'; return value; }",
        "async function leftAsync(value: any): Promise<any> { trace += 'A'; return await Promise.resolve(value); }",
        "async function right(value: any): Promise<any> { trace += 'R'; return await Promise.resolve(value); }",
        "function same(leftValue: any, rightValue: any): boolean { " +
            "return leftValue === rightValue || (leftValue !== leftValue && rightValue !== rightValue); }",
        "async function logicalAnd(index: number): Promise<any> { return left(values[index]) && await right(rightValue); }",
        "async function logicalOr(index: number): Promise<any> { return left(values[index]) || await right(rightValue); }",
        "async function logicalNullish(index: number): Promise<any> { return left(values[index]) ?? await right(rightValue); }",
        "async function nestedLogical(): Promise<any> { " +
            "return left(null) ?? (left('') || (left(objectValue) && await right(rightValue))); }",
        "async function suspendingLeft(): Promise<any> { " +
            "return (await leftAsync(false)) || await right(rightValue); }",
        "async function conditionalLeft(): Promise<any> { " +
            "return (left(false) ? left('never') : left('')) || await right(rightValue); }",
        "class GetterHolder {",
        "    reads = 0;",
        "    get value(): string { this.reads += 1; trace += 'G'; return ''; }",
        "    async choose(): Promise<any> { return this.value || await right(rightValue); }",
        "}",
        "class OptionalHolder {",
        "    value: string | undefined;",
        "    constructor(value: string | undefined) { this.value = value; }",
        "    async choose(): Promise<any> { return this.value ?? await right(rightValue); }",
        "}",
        "class NullableHolder {",
        "    value: string | null;",
        "    constructor(value: string | null) { this.value = value; }",
        "    async choose(): Promise<any> { return this.value ?? await right(rightValue); }",
        "}",
        "class EitherHolder {",
        "    value: string | null | undefined;",
        "    constructor(value: string | null | undefined) { this.value = value; }",
        "    async choose(): Promise<any> { return this.value && await right(rightValue); }",
        "}",
        "function failLeft(): any { trace += 'X'; throw leftError; }",
        "async function failRight(): Promise<any> { trace += 'Y'; throw rightError; }",
        "async function abruptLeft(): Promise<any> { return failLeft() || await right(rightValue); }",
        "async function abruptRight(): Promise<any> { return left(false) || await failRight(); }",
        "async function main(): Promise<void> {",
    ];

    let ordinal = 0;
    for (const operator of operators) {
        for (let index = 0; index < values.length; index++) {
            const value = values[index]!;
            const selectsRight = operator.selectsRight(value);
            lines.push(
                "trace = '';",
                `const result_${ordinal} = await ${operator.functionName}(${index});`,
                `console.log('${operator.label}:${value.label}:' + String(same(result_${ordinal}, ${selectsRight ? "rightValue" : `values[${index}]`})) + ':' + trace);`,
            );
            ordinal++;
        }
    }

    lines.push(
        "trace = '';",
        "const nestedResult = await nestedLogical();",
        "console.log('nested:' + String(nestedResult === rightValue) + ':' + trace);",
        "trace = '';",
        "const suspendingResult = await suspendingLeft();",
        "console.log('suspending-left:' + String(suspendingResult === rightValue) + ':' + trace);",
        "trace = '';",
        "const conditionalResult = await conditionalLeft();",
        "console.log('conditional-left:' + String(conditionalResult === rightValue) + ':' + trace);",
        "trace = '';",
        "const getter = new GetterHolder();",
        "const getterResult = await getter.choose();",
        "console.log('getter:' + String(getterResult === rightValue) + ':' + String(getter.reads === 1) + ':' + trace);",
        "trace = '';",
        "const optionalMissing = await new OptionalHolder(undefined).choose();",
        "console.log('optional-missing:' + String(optionalMissing === rightValue) + ':' + trace);",
        "trace = '';",
        "const optionalPresent = await new OptionalHolder('present').choose();",
        "console.log('optional-present:' + String(optionalPresent === 'present') + ':' + trace);",
        "trace = '';",
        "const nullableMissing = await new NullableHolder(null).choose();",
        "console.log('nullable-null:' + String(nullableMissing === rightValue) + ':' + trace);",
        "trace = '';",
        "const nullablePresent = await new NullableHolder('present').choose();",
        "console.log('nullable-present:' + String(nullablePresent === 'present') + ':' + trace);",
        "trace = '';",
        "const eitherNull = await new EitherHolder(null).choose();",
        "console.log('either-null:' + String(eitherNull === null) + ':' + trace);",
        "trace = '';",
        "const eitherUndefined = await new EitherHolder(undefined).choose();",
        "console.log('either-undefined:' + String(eitherUndefined === undefined) + ':' + trace);",
        "trace = '';",
        "try { await abruptLeft(); } catch (error) { " +
            "console.log('abrupt-left:' + String(error === leftError) + ':' + trace); }",
        "trace = '';",
        "try { await abruptRight(); } catch (error) { " +
            "console.log('abrupt-right:' + String(error === rightError) + ':' + trace); }",
        "}",
        "void main();",
    );
    return lines.join("\n");
}

function expectedOutput(): string[] {
    const output: string[] = [];
    for (const operator of operators) {
        for (const value of values) {
            const selectsRight = operator.selectsRight(value);
            output.push(`${operator.label}:${value.label}:true:${selectsRight ? "LR" : "L"}`);
        }
    }
    output.push(
        "nested:true:LLLR",
        "suspending-left:true:AR",
        "conditional-left:true:LLR",
        "getter:true:true:GR",
        "optional-missing:true:R",
        "optional-present:true:",
        "nullable-null:true:R",
        "nullable-present:true:",
        "either-null:true:",
        "either-undefined:true:",
        "abrupt-left:true:X",
        "abrupt-right:true:LY",
    );
    return output;
}

test("async logical values follow one evaluate-once semantic partition", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-async-logical-value-"));
    const entry = path.join(temporary, "subject.ts");
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
            expect(process.stdout.toString().trimEnd().split("\n")).toEqual(expectedOutput());
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 120_000);

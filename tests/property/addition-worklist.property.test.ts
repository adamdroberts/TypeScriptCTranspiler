import { expect, test } from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const deepTree = Array.from({ length: 768 }, () => "1 + (").join("") + '"end"' + ")".repeat(768);
const source = `const host: any = globalThis;
function collect(): void { if (NATIVE_GC) host.$262.gc(); }
let trace: string[] = [];
function encode(value: any): string {
    if (typeof value === "number") {
        if (Number.isNaN(value)) return "number:NaN";
        if (Object.is(value, -0)) return "number:-0";
    }
    return typeof value + ":" + String(value);
}
function number(label: string, value: number): number { trace.push(label); collect(); return value; }
function bigint(label: string, value: bigint): bigint { trace.push(label); collect(); return value; }
host.print("native-number:" + encode(number("L", 4) + number("R", 5)) + ":" + trace.join(","));
trace = [];
host.print("native-bigint:" + encode(bigint("L", 4n) + bigint("R", 5n)) + ":" + trace.join(","));
function wideNumber(): number { const first = 4611686018427387904; const second = first; return first + second; }
host.print("native-wide-number:" + Object.is(wideNumber(), 9223372036854775808));
let numberSlot = 1;
function mutateNumber(): number { numberSlot = 9; collect(); return 2; }
host.print("native-snapshot:" + (numberSlot + mutateNumber()) + ":" + numberSlot);
let bigintSlot = 1n;
function mutateBigint(): bigint { bigintSlot = 9n; collect(); return 2n; }
host.print("bigint-snapshot:" + String(bigintSlot + mutateBigint()) + ":" + String(bigintSlot));
trace = [];
function operand(label: string, value: any): any {
    trace.push(label + ":expression");
    return { [Symbol.toPrimitive](hint: string): any { trace.push(label + ":" + hint); collect(); return value; } };
}
function tail(): any { trace.push("tail:expression"); return "!"; }
const ordered: any = operand("L", "left") + operand("R", 7) + tail();
host.print("ordered:" + ordered + ":" + trace.join(","));
trace = [];
const grouped: any = operand("L", "left") + (operand("R", 7) + operand("T", 8));
host.print("grouped:" + grouped + ":" + trace.join(","));
const reason: any = {};
trace = [];
function abruptOperand(label: string): any { trace.push(label + ":expression"); return { [Symbol.toPrimitive](hint: string): any { trace.push(label + ":" + hint); collect(); throw reason; } }; }
try { const ignored: any = abruptOperand("L") + operand("R", 1) + tail(); host.print(ignored); }
catch (error) { host.print("abrupt-conversion:" + Object.is(error, reason) + ":" + trace.join(",")); }
trace = [];
function abruptExpression(): any { trace.push("throw:expression"); collect(); throw reason; }
try { const ignored: any = abruptExpression() + operand("R", 1); host.print(ignored); }
catch (error) { host.print("abrupt-expression:" + Object.is(error, reason) + ":" + trace.join(",")); }
const ephemeralLeft: any = { [Symbol.toPrimitive](): string { return String.fromCharCode(65).repeat(4096); } };
const ephemeralRight: any = { [Symbol.toPrimitive](): string { collect(); return "Z"; } };
const ephemeral: any = ephemeralLeft + ephemeralRight;
host.print("conversion-root:" + ephemeral.length + ":" + ephemeral.charCodeAt(0) + ":" + ephemeral.charCodeAt(4096));
const numericLeft: any = { valueOf(): bigint { return BigInt("900719925474099312345"); } };
const numericRight: any = { valueOf(): bigint { collect(); return 7n; } };
const difference: any = numericLeft - numericRight;
host.print("numeric-root:" + String(difference));
let retained: any = null;
try { const input: any = {}; throw input; }
catch (error) { const saved: any = error; retained = (): any => saved; }
finally { const done: any = "finally"; host.print(done); }
collect(); host.print("catch-block:" + (typeof retained() === "object"));
const values: any[] = [undefined, null, false, true, -0, NaN, Infinity, -Infinity, 1.5, 2n, "", "text", Symbol("value"),
    { [Symbol.toPrimitive](hint: string): any { trace.push("primitive:" + hint); collect(); return 7; } },
    { valueOf(): any { trace.push("valueOf"); collect(); return {}; }, toString(): string { trace.push("toString"); return "fallback"; } }];
for (let left = 0; left < values.length; left++) {
    for (let right = 0; right < values.length; right++) {
        trace = [];
        let result: string;
        try { const actual: any = values[left] + values[right]; result = encode(actual); }
        catch (error) { result = "throw:" + (error instanceof TypeError); }
        host.print("partition:" + left + ":" + right + ":" + result + ":" + trace.join(","));
    }
}
const deep: any = DEEP_TREE;
host.print("tree:" + encode(deep));
`.replace("DEEP_TREE", deepTree);

test("addition preserves one source tree, operand order and ordinary coercion", async () => {
    const expected: string[] = [];
    new Function("globalThis", ts.transpileModule(source.replaceAll("NATIVE_GC", "false"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText)({ print: (value: unknown) => expected.push(String(value)) });
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-addition-worklist-"));
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", entry = path.join(temporary, name + ".ts"), driver = path.join(temporary, name + "-driver.js"), output = path.join(temporary, name);
            await fs.writeFile(entry, source.replaceAll("NATIVE_GC", String(!noGc))); await fs.writeFile(driver, "");
            const diagnostics: string[] = [];
            const result = await compile({ entry: driver, output, noGc, additionalRoots: [entry], initializationEntries: [entry, driver], buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/addition-worklist.ts#strict", setupEntries: [], testEntry: driver, async: false },
                diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000, env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString())); expect(observation.kind).toBe("normal");
            const actual = (observation.stdout ?? "").trimEnd().split("\n"); expect(actual.length).toBe(expected.length);
            expect(expected.flatMap((line, index) => line === actual[index] ? [] : [{ index, expected: line, actual: actual[index] }])).toEqual([]);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 240_000);

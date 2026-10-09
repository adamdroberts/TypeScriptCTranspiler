import { expect, test } from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const domains = [
    { label: "number", type: "number", values: ["0", "-0", "NaN", "-2", "Infinity"] },
    { label: "boolean", type: "boolean", values: ["false", "true"] },
    { label: "string", type: "string", values: ['""', '"live"'] },
    { label: "bigint", type: "bigint", values: ["0n", "2n"] },
    { label: "symbol", type: "symbol", values: ["symbolValue"] },
    { label: "array", type: "number[]", values: ["arrayValue"] },
    { label: "callable", type: "() => number", values: ["functionValue"] },
    { label: "optional", type: "string | undefined", values: ["undefined", '"live"'] },
    { label: "nullable", type: "string | null", values: ["null", '"live"'] },
    { label: "boxed", type: "any", values: ["undefined", "null", "objectValue"] },
];
const operators = ["&&", "||", "??"];
function source(): string {
    const plans = domains.flatMap(domain => operators.map((operator, index) => {
        const name = `${domain.label}_${index}`;
        return `function ${name}(input: ${domain.type}): any {
            return left_${domain.label}(input) ${operator} right();
        }\n` + domain.values.map(value => `trace = ""; const input_${name}_${domain.values.indexOf(value)}: ${domain.type} = ${value};
            const expected_${name}_${domain.values.indexOf(value)} = (input_${name}_${domain.values.indexOf(value)} as any) ${operator} "right";
            check("${name}:${value.replaceAll('"', '')}", ${name}(input_${name}_${domain.values.indexOf(value)}), expected_${name}_${domain.values.indexOf(value)});`).join("\n");
    })).join("\n");
    const producers = domains.map(domain => `function left_${domain.label}(value: ${domain.type}): ${domain.type} { trace += "L"; collect(); return value; }`).join("\n");
    return `const host: any = globalThis;
        function collect(): void { if (NATIVE_GC) host.$262.gc(); }
        const symbolValue = Symbol("logical"), arrayValue: number[] = [7], objectValue: any = {};
        const functionValue = (): number => 9;
        let trace = "";
        function right(): string { trace += "R"; collect(); return "right"; }
        function check(label: string, actual: any, expected: any): void {
            host.print(label + ":" + Object.is(actual, expected) + ":" + typeof actual + ":" + trace);
        }
        ${producers}
        ${plans}
        const marker: any = {};
        function failLeft(): number { trace += "L"; throw marker; }
        function failRight(): string { trace += "R"; throw marker; }
        trace = ""; try { failLeft() || failRight(); } catch (error) { check("left-error", error, marker); }
        trace = ""; try { left_number(0) || failRight(); } catch (error) { check("right-error", error, marker); }
        trace = ""; check("suppressed", left_number(0) && failRight(), 0);
        trace = ""; check("mixed-tree", (left_number(0) || left_boolean(false)) ?? (left_string("") && right()), false);
        let visited = 0;
        function step(index: number): number { visited++; return index === 511 ? -7 : 0; }
        function deep(): any { return ${Array.from({ length: 512 }, (_, index) => `step(${index})`).join(" || ")}; }
        trace = ""; const result = deep(); check("tree-stress", result, -7); host.print("visited:" + visited);
    `;
}

test("ordinary logical trees preserve selected values, evaluation order and physical boundaries", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-ordinary-logical-"));
    const program = source();
    const expected: string[] = [];
    const oracle = ts.transpileModule(program.replaceAll("NATIVE_GC", "false"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    new Function("globalThis", oracle)({ print: (value: unknown) => expected.push(String(value)) });
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", entry = path.join(temporary, name + ".ts"), output = path.join(temporary, name);
            await fs.writeFile(entry, program.replaceAll("NATIVE_GC", String(!noGc)));
            // The ordinary typed entry keeps its native declaration ABI. A
            // separate empty Script installs the GC/print observation hooks.
            const driver = path.join(temporary, name + "-driver.js");
            await fs.writeFile(driver, "");
            const diagnostics: string[] = [];
            const result = await compile({ entry: driver, output, noGc, additionalRoots: [entry], initializationEntries: [entry, driver], buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/ordinary-logical.ts#strict", setupEntries: [], testEntry: driver, async: false },
                diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000, env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            expect(observation.kind).toBe("normal");
            const actual = (observation.stdout ?? "").trimEnd().split("\n");
            expect(actual.length).toBe(expected.length);
            expect(expected.flatMap((line, index) => line === actual[index] ? [] : [{ index, expected: line, actual: actual[index] }]).slice(0, 12)).toEqual([]);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 240_000);

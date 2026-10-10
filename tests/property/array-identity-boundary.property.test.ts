import { expect, test } from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const domains = [
    { label: "number", type: "number", initial: "-0", replacement: "NaN" },
    { label: "boolean", type: "boolean", initial: "false", replacement: "true" },
    { label: "string", type: "string", initial: '"first:" + String(1)', replacement: '"next:" + String(2)' },
    { label: "bigint", type: "bigint", initial: "1n", replacement: "2n" },
    { label: "symbol", type: "symbol", initial: "firstSymbol", replacement: "nextSymbol" },
    { label: "array", type: "number[]", initial: "firstArray", replacement: "nextArray" },
];
function source(): string {
    const plans = domains.map(domain => `
        function borrow_${domain.label}(values: ${domain.type}[]): any { collect(); return values; }
        function mutate_${domain.label}(values: ${domain.type}[], replacement: ${domain.type}): any { values[0] = replacement; values.push(replacement); collect(); return values; }
        const initial_${domain.label}: ${domain.type} = ${domain.initial}, replacement_${domain.label}: ${domain.type} = ${domain.replacement};
        const native_${domain.label}: ${domain.type}[] = [initial_${domain.label}], boxed_${domain.label}: any = native_${domain.label};
        const borrowed_${domain.label} = borrow_${domain.label}(boxed_${domain.label});
        host.print("native:${domain.label}:" + Object.is(borrowed_${domain.label}, boxed_${domain.label}));
        const selected_${domain.label} = mutate_${domain.label}(boxed_${domain.label}, replacement_${domain.label});
        host.print("write:${domain.label}:" + Object.is(selected_${domain.label}, boxed_${domain.label}) + ":" + Object.is(native_${domain.label}[0], replacement_${domain.label}) + ":" + boxed_${domain.label}.length);
        const dynamic_${domain.label}: any[] = [initial_${domain.label}], alias_${domain.label}: any = dynamic_${domain.label};
        const adapted_${domain.label} = borrow_${domain.label}(dynamic_${domain.label});
        host.print("boxed:${domain.label}:" + Object.is(adapted_${domain.label}, alias_${domain.label}) + ":" + Object.is(alias_${domain.label}[0], initial_${domain.label}));
        mutate_${domain.label}(dynamic_${domain.label}, replacement_${domain.label}); collect();
        host.print("alias:${domain.label}:" + Object.is(alias_${domain.label}[0], replacement_${domain.label}) + ":" + Object.is(dynamic_${domain.label}[1], replacement_${domain.label}));
    `).join("\n");
    return `const host: any = globalThis;
        function collect(): void { if (NATIVE_GC) host.$262.gc(); }
        const firstSymbol = Symbol("first"), nextSymbol = Symbol("next");
        const firstArray: number[] = [1], nextArray: number[] = [2];
        ${plans}
        const literals: number[][] = [[1], []], literalAlias: any = literals;
        host.print("fresh-literals:" + Object.is(borrow_array(literalAlias), literalAlias) + ":" + literalAlias[0][0] + ":" + literalAlias[1].length);
        const poison: any[] = [], poisonAlias: any = poison;
        let reads = 0;
        Object.defineProperty(poison, "0", { get() { reads++; collect(); return "getter"; }, enumerable: true, configurable: true });
        const returned = borrow_string(poison);
        host.print("getter-intake:" + reads + ":" + Object.is(returned, poisonAlias));
        host.print("getter-read:" + returned[0] + ":" + reads);
        const fixed: any[] = ["fixed"], fixedAlias: any = fixed;
        Object.defineProperty(fixedAlias, "tag", { value: 19, enumerable: false });
        Object.freeze(fixedAlias);
        const frozen = borrow_string(fixed);
        host.print("metadata:" + Object.is(frozen, fixedAlias) + ":" + Object.isFrozen(frozen) + ":" + frozen.tag + ":" + Object.getOwnPropertyDescriptor(frozen, "tag").enumerable);
        const sparse: any[] = ["a", "b", "c"], sparseAlias: any = sparse;
        delete sparseAlias[1];
        const sparseResult = borrow_string(sparse);
        host.print("holes:" + Object.is(sparseResult, sparseAlias) + ":" + (1 in sparseResult) + ":" + sparseResult.length);
        let tree: any = ["leaf:" + String(3)];
        for (let depth = 0; depth < 2048; depth++) tree = [tree];
        function borrowTree(values: any[][]): any { collect(); return values; }
        const treeResult = borrowTree(tree); collect();
        let cursor: any = treeResult;
        for (let depth = 0; depth < 2048; depth++) cursor = cursor[0];
        host.print("deep-owner:" + Object.is(tree, treeResult) + ":" + cursor[0]);
    `;
}

async function run(program: string, scenario: string): Promise<string[]> {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-array-identity-"));
    const results: string[] = [];
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", entry = path.join(temporary, name + ".ts"), driver = path.join(temporary, name + "-driver.js"), output = path.join(temporary, name);
            await fs.writeFile(entry, program.replaceAll("NATIVE_GC", String(!noGc))); await fs.writeFile(driver, "");
            const diagnostics: string[] = [];
            const result = await compile({ entry: driver, output, noGc, additionalRoots: [entry], initializationEntries: [entry, driver], buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: scenario, setupEntries: [], testEntry: driver, async: false },
                diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000, env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString())); expect(observation).toMatchObject({ kind: "normal" });
            results.push(observation.stdout ?? "");
        }
        return results;
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}

test("Array native boundaries preserve identity, aliases, metadata and getter order", async () => {
    const program = source(), expected: string[] = [];
    new Function("globalThis", ts.transpileModule(program.replaceAll("NATIVE_GC", "false"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText)({ print: (value: unknown) => expected.push(String(value)) });
    for (const output of await run(program, "property/array-identity.ts#strict")) {
        const actual = output.trimEnd().split("\n"); expect(actual.length).toBe(expected.length);
        expect(expected.flatMap((line, index) => line === actual[index] ? [] : [{ index, expected: line, actual: actual[index] }]).slice(0, 12)).toEqual([]);
    }
}, 240_000);

test("incompatible native Array layouts fail closed without invoking element coercion", async () => {
    const program = `const host: any = globalThis;
        class Boundary { native(values: number[]): any { return values; } }
        const boundary = new Boundary();
        let calls = 0;
        const value: any = {};
        Object.defineProperty(value, "valueOf", { value: function () { calls++; return 1; } });
        const source: any[] = [value], alias: any = source;
        try { boundary.native(source); } catch (error: any) { host.print(error.name + ":" + error.message); }
        host.print("unchanged:" + calls + ":" + Object.is(source[0], value) + ":" + Object.is(alias, source));
    `;
    const expected = "TypeError:Array cannot preserve identity through this native element representation\nunchanged:0:true:true\n";
    for (const output of await run(program, "property/array-native-layout.ts#strict")) expect(output).toBe(expected);
}, 240_000);

import { expect, test } from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { invokeCc } from "../../src/link/cc";
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

test("ordinary class calls preserve actual Array owners without element coercion", async () => {
    const program = `const host: any = globalThis;
        class Boundary { native(values: globalThis.Array<number>): any { return values; } }
        const boundary = new Boundary();
        let calls = 0;
        const value: any = {};
        Object.defineProperty(value, "valueOf", { value: function () { calls++; return 1; } });
        const source: any[] = [value], alias: any = source;
        const result = boundary.native(source); host.print("result:" + Object.is(result, source));
        host.print("unchanged:" + calls + ":" + Object.is(source[0], value) + ":" + Object.is(alias, source));
    `;
    const observed: string[] = [];
    new Function("globalThis", ts.transpileModule(program, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText)({print: (value: unknown) => observed.push(String(value))});
    const expected = observed.join("\n") + "\n";
    expect(expected).toBe("result:true\nunchanged:0:true:true\n");
    for (const output of await run(program, "property/array-native-layout.ts#strict")) expect(output).toBe(expected);
}, 240_000);


// This probe explicitly consumes the native C representation. A source method
// annotation alone does not create that boundary or alter ECMAScript values.
test("explicit native Array consumers preserve identity or fail before coercion", async () => {
    const driver = String.raw`#include "tsc_internal.h"
static unsigned conversions = 0;
static tsc_value_t box_number(const void* value) { return tsc_value_num(*(const double*)value); }
static bool unbox_number(tsc_value_t value, void* output) { ++conversions; *(double*)output = tsc_value_to_number(value); return true; }
static tsc_value_t convert_object(void* environment, tsc_value_t receiver, tsc_array_t* args) { ++conversions; return tsc_value_num(1); }
int main(int argc, char** argv) {
    tsc_bootstrap(argc, argv);
    tsc_array_t* volatile numbers = tsc_array_new(sizeof(tsc_value_t), 0);
    tsc_array_push_value(numbers, tsc_value_num(-0.0));
    tsc_array_push_value(numbers, tsc_value_num(2.0));
    tsc_value_t alias = tsc_value_array(numbers);
    if (tsc_array_require_native_representation(alias, sizeof(double), box_number, unbox_number, TSC_NATIVE_ELEMENT_NUMBER, false) != numbers ||
        !tsc_value_object_is(tsc_value_get_index(alias, 0), tsc_value_num(-0.0)) ||
        !tsc_value_object_is(tsc_value_get_index(alias, 1), tsc_value_num(2.0))) return 2;
    tsc_object_t* volatile object = tsc_object_new();
    tsc_object_define(object, tsc_str_from_cstr("valueOf"), tsc_value_function_generic(convert_object, NULL), true, true, true);
    tsc_array_t* volatile values = tsc_array_new(sizeof(tsc_value_t), 0);
    tsc_array_push_value(values, tsc_value_object(object));
    conversions = 0;
    TSC_TRY_FRAME(frame); tsc_try_push(&frame);
    if (setjmp(frame.jb) == 0) {
        (void)tsc_array_require_native_representation(tsc_value_array(values), sizeof(double), box_number, unbox_number, TSC_NATIVE_ELEMENT_NUMBER, false);
        tsc_try_pop(); return 3;
    }
    tsc_value_t error = tsc_current_error_value();
    void* volatile error_root = tsc_value_gc_root(error); (void)error_root;
    tsc_try_pop();
    if (!tsc_str_eq(tsc_value_as_string(tsc_value_get_prop(error, tsc_str_from_cstr("name"))), tsc_str_from_cstr("TypeError")) ||
        conversions != 0 || !tsc_value_object_is(tsc_value_get_index(tsc_value_array(values), 0), tsc_value_object(object))) return 4;
    puts("identity:true\nclosed-before-coercion:true"); return 0;
}`;
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-explicit-array-boundary-"));
    try {
        const entry = path.join(temporary, "empty.ts"), probe = path.join(temporary, "probe.c");
        await fs.writeFile(entry, ""); await fs.writeFile(probe, driver);
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", buildDir = path.join(temporary, name + "-build"), output = path.join(temporary, name), diagnostics: string[] = [];
            const prepared = await compile({entry, output, buildDir, noGc, emitCOnly: true, diagnosticWriter: message => diagnostics.push(message)});
            expect({exitCode: prepared.exitCode, diagnostics: diagnostics.join("")}).toEqual({exitCode: 0, diagnostics: ""});
            const sources = (await fs.readdir(buildDir)).filter(file => file.endsWith(".c") && file !== "main.c").sort().map(file => path.join(buildDir, file));
            const linked = await invokeCc({sources: [probe, ...sources], output, includeDirs: [buildDir],
                libs: [...(noGc ? [] : ["gc"]), "m", "resolv", "ssl", "crypto", "icui18n", "icuuc", "icudata", "gmp"],
                extraFlags: noGc ? ["-DTSC_NO_GC"] : [], stderrWriter: message => diagnostics.push(message)});
            expect({exitCode: linked.exitCode, diagnostics: diagnostics.join("")}).toEqual({exitCode: 0, diagnostics: ""});
            const native = Bun.spawnSync([output], {stdout: "pipe", stderr: "pipe", timeout: 120_000});
            expect({exitCode: native.exitCode, stderr: native.stderr.toString(), stdout: native.stdout.toString()}).toEqual({exitCode: 0, stderr: "", stdout: "identity:true\nclosed-before-coercion:true\n"});
        }
    } finally {await fs.rm(temporary, {recursive: true, force: true});}
}, 240_000);

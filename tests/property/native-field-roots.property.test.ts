import { expect, test } from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

function source(): string {
    return `const host: any = globalThis;
        function collect(): void { if (NATIVE_GC) host.$262.gc(); }
        function churn(): void { for (let index = 0; index < 8192; index++) { const text = "churn:" + String(index); if (text.length < 1) throw "churn"; } }
        function sweep(): void { churn(); collect(); churn(); collect(); }
        function payload(kind: number, index: number): any {
            switch (kind) {
                case 0: return "string:" + String(index);
                case 1: return ["array:" + String(index)];
                case 2: return { text: "object:" + String(index) };
                case 3: return BigInt(index);
                case 4: return Symbol("symbol:" + String(index));
                default: return () => "callable:" + String(index);
            }
        }
        function describe(value: any): string {
            if (typeof value === "string") return value;
            if (typeof value === "bigint") return "bigint:" + String(value);
            if (typeof value === "symbol") return value.description ?? "";
            if (typeof value === "function") return value();
            if (Array.isArray(value)) return value[0];
            return value.text;
        }
        class Base { value: any; }
        class Owner extends Base {
            second: any = payload(2, 31);
            constructor(value: any) { super(); this.value = value; }
        }
        interface RecordOwner { value: any; second: any; }
        class StaticOwner { static value: any = payload(0, 32); static missing: any; }
        class ReservedOwner {
            __tsc_type: any = payload(0, 35);
            __tsc_root_value: any = payload(2, 36);
            static __tsc_type: any = payload(0, 37);
        }
        function inherited(owner: Base): string { return describe(owner.value); }
        function create(kind: number): Owner { return new Owner(payload(kind, 17)); }
        function literal(kind: number): RecordOwner { return { value: payload(kind, 18), second: payload(0, 19) }; }
        function shorthand(): RecordOwner { const value: any = payload(0, 20), second: any = payload(0, 21); return { value, second }; }
        function spread(): RecordOwner { const original = literal(0); return { ...original, value: payload(0, 22) }; }
        for (let kind = 0; kind < 6; kind++) {
            const owner = create(kind), record = literal(kind);
            sweep();
            host.print("field:" + kind + ":" + inherited(owner) + ":" + describe(owner.second));
            host.print("literal:" + kind + ":" + describe(record.value) + ":" + describe(record.second));
        }
        const short = shorthand(), copied = spread(); sweep();
        host.print("shorthand:" + describe(short.value) + ":" + describe(short.second));
        host.print("spread:" + describe(copied.value) + ":" + describe(copied.second));
        const reflect = literal(0);
        Reflect.set(reflect, "value", payload(0, 23));
        Object.assign(reflect, { second: payload(0, 24) }); sweep();
        host.print("reflect:" + describe(reflect.value) + ":" + describe(reflect.second));
        const boxed: any = create(0); boxed.value = payload(0, 25); sweep();
        host.print("boxed-setter:" + describe(boxed.value));
        StaticOwner.value = payload(0, 26); sweep();
        host.print("static:" + describe(StaticOwner.value) + ":" + typeof StaticOwner.missing);
        const reserved = new ReservedOwner(); sweep();
        host.print("reserved:" + describe(reserved.__tsc_type) + ":" + describe(reserved.__tsc_root_value) + ":" + describe(ReservedOwner.__tsc_type));
        let trace = "";
        const mutation = create(0);
        function receiver(): Owner { trace += "L"; collect(); return mutation; }
        function right(): any { trace += "R"; collect(); mutation.value = 100; return 2; }
        mutation.value = 9; trace = "";
        const selected = receiver().value += right(); sweep();
        host.print("compound:" + selected + ":" + mutation.value + ":" + trace);
        mutation.value = undefined; trace = "";
        const nullish = receiver().value ??= payload(0, 27); sweep();
        host.print("nullish:" + describe(nullish) + ":" + describe(mutation.value) + ":" + trace);
        mutation.value = ""; receiver().value ||= payload(0, 28); sweep();
        host.print("or:" + describe(mutation.value));
        receiver().value &&= payload(0, 29); sweep(); host.print("and:" + describe(mutation.value));
        mutation.value = 5n; const previous: any = receiver().value++; const next: any = --receiver().value;
        sweep(); host.print("updates:" + String(previous) + ":" + String(next) + ":" + String(mutation.value));
        mutation.value = null; trace = ""; receiver().value &&= right();
        host.print("skipped:" + trace + ":" + String(mutation.value));
        function invalid(): Owner { trace += "L"; return null as unknown as Owner; }
        trace = ""; try { invalid().value = right(); } catch (error: any) { host.print("null-reference:" + error.name + ":" + trace); }
        // A representative deep owner graph, traversed without recursive GC or
        // fixture-shape lowering. Every next field owns its decoded wrapper.
        class Chain {
            value: any; next: Chain | undefined;
            constructor(index: number, next: Chain | undefined) { this.value = "item:" + String(index); this.next = next; }
        }
        function build(): Chain | undefined {
            let chain: Chain | undefined = undefined;
            for (let index = 0; index < 2048; index++) chain = new Chain(index, chain);
            return chain;
        }
        let cursor = build(); sweep(); let expectedIndex = 2047, valid = true;
        while (cursor !== undefined) {
            if (cursor.value !== "item:" + String(expectedIndex)) valid = false;
            cursor = cursor.next; expectedIndex--;
        }
        host.print("owner-graph:" + valid + ":" + expectedIndex);
        function stack(): void { const record: RecordOwner = { value: payload(0, 33), second: payload(0, 34) }; sweep(); host.print("stack:" + describe(record.value) + ":" + describe(record.second)); }
        stack();
    `;
}

test("native aggregate fields own boxed referents through construction, writes and collection", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-native-field-roots-"));
    const program = source(), expected: string[] = [];
    const oracle = ts.transpileModule(program.replaceAll("NATIVE_GC", "false"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    new Function("globalThis", oracle)({ print: (value: unknown) => expected.push(String(value)) });
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", entry = path.join(temporary, name + ".ts"), driver = path.join(temporary, name + "-driver.js"), output = path.join(temporary, name);
            await fs.writeFile(entry, program.replaceAll("NATIVE_GC", String(!noGc))); await fs.writeFile(driver, "");
            const diagnostics: string[] = [];
            const result = await compile({ entry: driver, output, noGc, additionalRoots: [entry], initializationEntries: [entry, driver], buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/native-field-roots.ts#strict", setupEntries: [], testEntry: driver, async: false },
                diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000, env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString())); expect(observation).toMatchObject({ kind: "normal" });
            const actual = (observation.stdout ?? "").trimEnd().split("\n");
            expect(actual.length).toBe(expected.length);
            expect(expected.flatMap((line, index) => line === actual[index] ? [] : [{ index, expected: line, actual: actual[index] }]).slice(0, 12)).toEqual([]);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 240_000);

test("unrepresentable native field layouts fail with stable diagnostics", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-native-field-layout-"));
    const partitions = [
        { source: 'class Base { value: number = 1; } class Owner extends Base { value: any = "x"; } console.log(new Owner().value);', diagnostic: "native inherited field redeclaration changes physical storage" },
        { source: 'interface Base { value: number; } interface Owner extends Base { value: any; } const owner: Owner = { value: "x" }; console.log(owner.value);', diagnostic: "native inherited field redeclaration changes physical storage" },
    ];
    try {
        for (const [index, partition] of partitions.entries()) {
            const entry = path.join(temporary, index + ".ts"); await fs.writeFile(entry, partition.source);
            const diagnostics: string[] = [];
            const result = await compile({ entry, output: path.join(temporary, index + "-native"), diagnosticWriter: message => diagnostics.push(message) });
            expect(result.exitCode).not.toBe(0); expect(diagnostics.join("")).toContain(partition.diagnostic);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
});

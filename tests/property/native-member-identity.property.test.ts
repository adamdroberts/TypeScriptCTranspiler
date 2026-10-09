import { expect, test } from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const keys = ["method", "get_slot", "set_slot", "static_method", "instance_method", "__tsc_iterator",
    "tsc_js_6_method", "$", "λ", "变量", "𐐀", "a.b", "", "_0024_"];
const definitions = keys.map((key, index) =>
    `[${JSON.stringify(key)}](): number { return ${index * 2 + 1}; } static [${JSON.stringify(key)}](): number { return ${index * 2 + 2}; }`).join("\n");
const checks = keys.map((key, index) =>
    `check(owner[${JSON.stringify(key)}]() === ${index * 2 + 1} && Owner[${JSON.stringify(key)}]() === ${index * 2 + 2}, ${JSON.stringify("key:" + key)});`).join("\n");
const source = `
const host: any = globalThis;
function collect(): void { if (NATIVE_GC) host.$262.gc(); }
function check(value: boolean, label: string): void { if (!value) throw label; host.print(label + ":true"); }
class Owner {
    value: number = 3; static value: number = 5;
    ${definitions}
    get slot(): number { return this.value + 1; } set slot(value: number) { this.value = value; }
    static get slot(): number { return Owner.value + 2; } static set slot(value: number) { Owner.value = value; }
    echo<T>(value: T): T { return value; } static echo<T>(value: T): T { return value; }
}
const owner = new Owner(); ${checks}
owner.slot = 7; Owner.slot = 11;
check(owner.slot === 8 && Owner.slot === 13 && owner.get_slot() === 3 && Owner.get_slot() === 4, "accessor-domains");
check(owner.echo(17) === 17 && Owner.echo("text") === "text", "generic-domains");
class Child extends Owner {}
check(new Child().method() === 1, "inherited-member-owner");
const boxed: any = owner, constructor: any = Owner;
collect(); check(boxed.method.call(boxed) === 1 && constructor.method.call(constructor) === 2 &&
    boxed.echo({ marker: 17 }).marker === 17 && constructor.echo("erased") === "erased", "method-value-adapters");
interface Step { done: boolean; value: number; }
class Counter {
    current: number = 0;
    static closed: number = 0;
    static next(): number { return 997; }
    next(): Step { const value = this.current++; return { done: value >= 3, value }; }
    static return(): number { return 983; }
    return(): Step { Counter.closed++; return { done: true, value: -1 }; }
    static [Symbol.iterator](): number[] { return [991]; }
    [Symbol.iterator](): Counter { return this; }
}
let sum = 0; for (const value of new Counter()) sum += value;
check(sum === 3 && Counter.next() === 997, "iterator-member-domains");
const captures: (() => number)[] = [];
for (const value of new Counter()) captures.push(() => value);
collect(); check(captures[0]() === 0 && captures[1]() === 1 && captures[2]() === 2, "iterator-binding-cells");
for (const value of new Counter()) { if (value === 1) break; }
check(Counter.closed === 1 && Counter.return() === 983, "iterator-close-member-domain");
// One retained native-owner graph exercises the same member naming plan at
// depth, independently of declaration or method-family cardinality.
class Link {
    value: number; previous: Link | undefined;
    constructor(value: number, previous: Link | undefined) { this.value = value; this.previous = previous; }
    method(): number { return this.value; } static method(): number { return -1; }
}
let graph: Link | undefined = undefined;
for (let index = 0; index < 4096; index++) { graph = new Link(index, graph); if (index % 37 === 0) collect(); }
let remaining = 4095, total = 0;
while (graph !== undefined) { if (graph.method() !== remaining) throw "retained-owner"; total += graph.method(); graph = graph.previous; remaining--; if (remaining % 41 === 0) collect(); }
check(remaining === -1 && total === 4095 * 4096 / 2 && Link.method() === -1, "retained-member-graph");
`;

test("native member identity preserves scope, member kind and property-key domains", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-native-member-identity-"));
    const expected: string[] = [];
    new Function("globalThis", ts.transpileModule(source.replaceAll("NATIVE_GC", "false"),
        { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText)({ print: (value: unknown) => expected.push(String(value)) });
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", subject = path.join(temporary, name + ".ts"), driver = path.join(temporary, name + "-driver.js"), output = path.join(temporary, name);
            await fs.writeFile(subject, source.replaceAll("NATIVE_GC", String(!noGc))); await fs.writeFile(driver, "");
            const diagnostics: string[] = [];
            const result = await compile({ entry: driver, output, noGc, additionalRoots: [subject], initializationEntries: [subject, driver], buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/native-member-identity.ts#strict", setupEntries: [], testEntry: driver, async: false },
                diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000, env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString())); expect(observation).toMatchObject({ kind: "normal" });
            expect((observation.stdout ?? "").trimEnd().split("\n")).toEqual(expected);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 240_000);

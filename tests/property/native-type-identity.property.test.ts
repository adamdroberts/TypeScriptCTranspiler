import { expect, test } from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";
import { createEcmaSourceFile } from "../../src/ecmascript-source";
import { earlyFunctionStaticSemanticsFailure } from "../../src/function-static-semantics";

test("class inheritance expressions retain the ECMAScript grammar", () => {
    const operands = ["Base", "namespace.Base", "namespace[key]", "(factory())", "(flag ? Left : Right)", "null"];
    for (const operand of operands) {
        const source = `class Child extends ${operand} { method() {} }`;
        // Native syntax validation is independent of the TypeScript AST's
        // ExpressionWithTypeArguments classification.
        expect(() => new Function(source)).not.toThrow();
        const parsed = createEcmaSourceFile("heritage.js", source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS, "script");
        expect(earlyFunctionStaticSemanticsFailure(parsed)).toBeNull();
    }
    for (const source of ["class Child extends Base<number> {}", "class Child implements Base {}", "interface Child extends Base {}"] ) {
        expect(() => new Function(source)).toThrow(SyntaxError);
        const parsed = createEcmaSourceFile("heritage.js", source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS, "script");
        expect(earlyFunctionStaticSemanticsFailure(parsed)?.message).toBe("TypeScript syntax is not permitted in ECMAScript source");
    }
});

test("unrepresented merged interface owners fail with a stable diagnostic", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-native-type-merge-"));
    try {
        const subject = path.join(temporary, "subject.ts");
        await fs.writeFile(subject, "export {}; interface Owner { left: number; } interface Owner { right: string; } const record: Owner = { left: 1, right: 'value' }; console.log(record.left, record.right);");
        await expect(compile({ entry: subject, output: path.join(temporary, "subject"), noGc: true,
            diagnosticWriter: () => {} })).rejects.toThrow("native type declaration merging requires a canonical owner");
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 30_000);

const leftSource = `export interface Record { value: number; } export class Shared { value: number = 7; method(): number { return this.value; } static method(): number { return 11; } }`;
const rightSource = `export interface Record { value: string; } export class Shared { value: string = "right"; method(): string { return this.value; } static method(): string { return "static"; } }`;
const names = ["log", "nan", "int", "$", "λ", "变量", "𐐀", "Map", "Date", "tsc_js", "__tsc_type"];
const generated = names.map((name, index) => `class ${name} { value: number = ${index + 17}; method(): number { return this.value; } }
check(new ${name}().method() === ${index + 17}, ${JSON.stringify("spelling:" + name)});`).join("\n");
const source = `
import { Shared as Left, Record as LeftRecord } from "./left";
import { Shared as Right, Record as RightRecord } from "./right";
const host: any = globalThis;
function collect(): void { if (NATIVE_GC) host.$262.gc(); }
function check(value: boolean, label: string): void { if (!value) throw label; host.print(label + ":true"); }
const left = new Left(), right = new Right();
check(left.method() === 7 && right.method() === "right" && Left.method() === 11 && Right.method() === "static", "module-owners");
const leftRecord: LeftRecord = { value: 13 }, rightRecord: RightRecord = { value: "record" };
collect(); check(leftRecord.value === 13 && rightRecord.value === "record", "interface-layout-owners");
class Child extends Left {}
const child = new Child();
check(left instanceof Left && !(left instanceof Right) && child instanceof Left && !(child instanceof Right), "declaration-brands");
const boxedLeft: any = left, boxedRight: any = right;
collect(); check(boxedLeft.method() === 7 && boxedRight.method() === "right", "adapter-owners");
check(boxedLeft instanceof Left && !(boxedLeft instanceof Right), "boxed-brand-owner");
const constructor: any = Left;
check(constructor.name === "Shared", "public-class-name");
namespace First { export interface Record { value: number; } export class Shared { value: number = 29; } export function make(): Shared { return new Shared(); } export function record(): Record { return { value: 31 }; } }
namespace Second { export interface Record { value: string; } export class Shared { value: string = "namespace"; } export function make(): Shared { return new Shared(); } export function record(): Record { return { value: "record" }; } }
check(First.make().value === 29 && Second.make().value === "namespace" && First.record().value === 31 && Second.record().value === "record", "namespace-owners");
${generated}
// One retained owner graph crosses independently named physical layouts.
class Link { value: any; previous: Link | undefined; constructor(value: any, previous: Link | undefined) { this.value = value; this.previous = previous; } }
let graph: Link | undefined = undefined;
for (let index = 0; index < 4096; index++) { graph = new Link(index % 2 ? new Left() : new Right(), graph); if (index % 37 === 0) collect(); }
let remaining = 4095;
while (graph !== undefined) { const actual: any = graph.value.method(), expected: any = remaining % 2 ? 7 : "right"; if (actual !== expected) { host.print("retained-owner:" + String(remaining) + ":" + typeof actual + ":" + String(actual)); throw "retained-owner"; } graph = graph.previous; remaining--; if (remaining % 41 === 0) collect(); }
check(remaining === -1, "retained-type-owner-graph");
`;

test("native types follow declaration identity across modules, namespaces, spellings and layouts", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-native-type-identity-"));
    const expected: string[] = [], modules = new Map<string, { exports: Record<string, unknown> }>();
    const transpile = (text: string): string => ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
    for (const [name, text] of [["./left", leftSource], ["./right", rightSource]]) {
        const module = { exports: {} }; new Function("exports", transpile(text!))(module.exports); modules.set(name!, module);
    }
    new Function("exports", "require", "globalThis", transpile(source.replaceAll("NATIVE_GC", "false")))({},
        (name: string) => modules.get(name)!.exports, { print: (value: unknown) => expected.push(String(value)) });
    try {
        await fs.writeFile(path.join(temporary, "left.ts"), leftSource); await fs.writeFile(path.join(temporary, "right.ts"), rightSource);
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", subject = path.join(temporary, name + ".ts"), driver = path.join(temporary, name + "-driver.js"), output = path.join(temporary, name);
            await fs.writeFile(subject, source.replaceAll("NATIVE_GC", String(!noGc))); await fs.writeFile(driver, "");
            const diagnostics: string[] = [];
            const result = await compile({ entry: driver, output, noGc, additionalRoots: [subject], initializationEntries: [subject, driver], buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/native-type-identity.ts#strict", setupEntries: [], testEntry: driver, async: false },
                diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000, env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString())); expect(observation).toMatchObject({ kind: "normal" });
            expect((observation.stdout ?? "").trimEnd().split("\n")).toEqual(expected);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 240_000);

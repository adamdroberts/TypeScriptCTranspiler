import { expect, test } from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const source = `const host: any = globalThis;
function collect(): void { if (NATIVE_GC) host.$262.gc(); }
let globalText = "";
function appendGlobal(): void { globalText += "global"; }
appendGlobal(); host.print("global:" + globalText);
function grouping(): void {
    let text = "";
    text += (1 + 2);
    text = text + (4 + 5);
    host.print("grouping:" + text);
    const result = (text += true);
    host.print("assignment-value:" + result + ":" + text);
}
grouping();
function reentry(): void {
    let text = "";
    const replace = (): string => { text = text + "inner"; collect(); return "outer"; };
    text += replace();
    host.print("captured-old-value:" + text);
    const snapshot = text;
    text += "later";
    host.print("snapshot:" + snapshot + ":" + text);
}
reentry();
function abrupt(): void {
    let text = "";
    const reason: any = {};
    const trace: string[] = [];
    const value: any = { [Symbol.toPrimitive](hint: string): any {
        trace.push(hint); collect(); throw reason;
    } };
    try { text = text + "partial" + value; }
    catch (error) { host.print("abrupt:" + Object.is(error, reason) + ":" + text.length + ":" + trace.join(",")); }
}
abrupt();
function conversions(): void {
    let text = "";
    const trace: string[] = [];
    const value: any = { [Symbol.toPrimitive](hint: string): string { trace.push(hint); collect(); return "value"; } };
    text += value;
    host.print("default-hint:" + text + ":" + trace.join(","));
    const symbol: any = Symbol("throw");
    try { text += symbol; } catch (error) { host.print("symbol:" + (error instanceof TypeError) + ":" + text); }
}
conversions();
function selfReference(): void {
    let text = "";
    text += "A";
    text += text;
    text = text + "B" + text;
    host.print("self-reference:" + text);
}
selfReference();
let outer = "";
function writer(value: string): void { outer += value; }
const escaped: any = writer;
escaped("escaped"); collect(); host.print("escaped:" + outer);
interface Holder { text: string; }
const first: Holder = { text: "first" }, second: Holder = { text: "second" };
let target: Holder = first;
const referenceTrace: string[] = [];
function locate(): Holder { referenceTrace.push("reference"); return target; }
function mutate(): string { referenceTrace.push("rhs"); target = second; first.text = "changed"; collect(); return "!"; }
const fieldResult = (locate().text += mutate());
host.print("field-reference:" + fieldResult + ":" + first.text + ":" + second.text + ":" + referenceTrace.join(","));
function unicode(): void {
    let text = "";
    text += String.fromCharCode(0xd83d);
    text += String.fromCharCode(0xde00);
    text += "\0";
    host.print("unicode:" + text.length + ":" + text.charCodeAt(0) + ":" + text.charCodeAt(1) + ":" + text.charCodeAt(2));
}
unicode();
function stress(): void {
    let text = "";
    for (let index = 0; index < 4096; index++) { text += index % 2 === 0 ? "A" : "B"; if (index % 257 === 0) collect(); }
    let valid = text.length === 4096;
    for (let index = 0; index < text.length; index++) valid = valid && text.charCodeAt(index) === (index % 2 === 0 ? 65 : 66);
    host.print("worklist:" + valid);
}
stress();
`;

test("ordinary string assignments preserve storage, grouping and completion order", async () => {
    const expected: string[] = [];
    new Function("globalThis", ts.transpileModule(source.replaceAll("NATIVE_GC", "false"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText)({ print: (value: unknown) => expected.push(String(value)) });
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-string-assignment-"));
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", entry = path.join(temporary, name + ".ts"), driver = path.join(temporary, name + "-driver.js"), output = path.join(temporary, name);
            await fs.writeFile(entry, source.replaceAll("NATIVE_GC", String(!noGc))); await fs.writeFile(driver, "");
            const diagnostics: string[] = [];
            const result = await compile({ entry: driver, output, noGc, additionalRoots: [entry], initializationEntries: [entry, driver], buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/string-assignment.ts#strict", setupEntries: [], testEntry: driver, async: false },
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

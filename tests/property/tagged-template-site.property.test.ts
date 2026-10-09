import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as vm from "node:vm";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const evaluations = ["(function(){ return function(){return (s => s)`eval-site`;};})()",
    "(s => s)`foreign-site`"];
// Generated semantic partitions vary lexical content and actual values, rather
// than enumerating substitution counts. The engine executes each original tag.
function generatedPartitions(): string {
    const raw = ["", String.raw`\n`, String.raw`\uD800`, String.raw`\u{1F600}`, String.raw`\u{110000}`, "\r\n", "\u2028"];
    let seed = 0x6A09E667;
    const choose = (length: number): number => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) % length; };
    const cases: string[] = [];
    for (let partition = 0; partition < raw.length; ++partition) {
        const pieces: string[] = [raw[partition]!];
        for (let index = 0; index < 5; ++index) {
            const values = ["undefined", "null", "31", "({ marker: 37 })"];
            pieces.push("${" + values[choose(values.length)] + "}", raw[choose(raw.length)]!);
        }
        cases.push("audit`" + pieces.join("") + "`;");
    }
    return `
function units(text) { if (text === undefined) return "undefined"; const out = [];
    for (let index = 0; index < text.length; ++index) out.push(text.charCodeAt(index)); return out.join("."); }
function audit(strings, ...values) { const out = [];
    for (let index = 0; index < strings.length; ++index) out.push(units(strings[index]) + ":" + units(strings.raw[index]));
    for (const value of values) out.push(typeof value + ":" + (value === null ? "null" : typeof value === "object" ? value.marker : value));
    host.print(out.join("|")); }
${cases.join("\n")}
`;
}
const source = "var host = globalThis;\n" + generatedPartitions() + await fs.readFile(new URL("./fixtures/tagged-template-sites.js", import.meta.url), "utf8");

function input(noGc: boolean): string { return source.replaceAll("NATIVE_GC", noGc ? "false" : "true"); }

async function oracle(): Promise<string[]> {
    const lines: string[] = [];
    const context = vm.createContext({ print: (line: string) => lines.push(line), $262: {
        gc() {}, createRealm() {
            const foreign = vm.createContext({});
            return { global: new vm.Script("globalThis").runInContext(foreign), evalScript: (text: string) => new vm.Script(text).runInContext(foreign) };
        },
    } });
    await new vm.Script(input(true)).runInContext(context);
    return lines;
}

test("one template-site collection preserves independent engine semantics and retained parse owners", async () => {
    const expected = await oracle(); expect(expected.at(-1)).toBe("deep-retained-parse-owners:true");
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-template-sites-"));
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", entry = path.join(temporary, name + ".js"), output = path.join(temporary, name), diagnostics: string[] = [];
            await fs.writeFile(entry, input(noGc));
            const evalEntries = [];
            for (const [index, text] of evaluations.entries()) {
                const script = path.join(temporary, name + "-eval-" + index + ".js"); await fs.writeFile(script, text); evalEntries.push({ source: text, entry: script });
            }
            const roots = evalEntries.map(record => record.entry);
            const result = await compile({ entry, output, noGc, additionalRoots: roots, isolatedScriptRoots: [entry, ...roots], initializationEntries: [entry], buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/tagged-template-site.js#sloppy", setupEntries: [], testEntry: entry, async: false,
                    scriptEntries: [entry, ...roots], evalScriptEntries: evalEntries, directEvalEntries: [{ ...evalEntries[0]!, strict: false, strictCaller: false }] },
                diagnosticWriter: message => diagnostics.push(message) });
            expect({ exitCode: result.exitCode, diagnostics: diagnostics.join("") }).toEqual({ exitCode: 0, diagnostics: "" });
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000, env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString())); expect(observation).toMatchObject({ kind: "normal" });
            expect((observation.stdout ?? "").trimEnd().split("\n")).toEqual(expected);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 600_000);

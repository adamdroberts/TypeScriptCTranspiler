import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const source = `
var host = globalThis;
function check(value, label) { if (!value) throw label; host.print(label + ":true"); }
function collect() { if (NATIVE_GC) host.$262.gc(); }
async function subject() {
    const events = [];
    const receiver = { tag: 17, value: 3, get method() {
        events.push("get");
        return function (...values) { events.push("call:" + this.tag); let sum = 0; for (const value of values) sum += value; return sum; };
    } };
    function mark(value) { events.push("mark:" + String(value)); return value; }
    const iterable = { [Symbol.iterator]() { let index = 0; return { next() { events.push("step:" + String(index)); return index < 2 ? { value: ++index * 2, done: false } : { done: true }; } }; } };
    const changeMethod = { then(resolve) {
        events.push("then"); Object.defineProperty(receiver, "method", { value: function () { return -99; }, configurable: true });
        collect(); resolve(3);
    } };
    const called = receiver.method(mark(1), await changeMethod, ...iterable, mark(5));
    check(called === 15 && events.join(",") === "get,mark:1,then,step:0,step:1,step:2,mark:5,call:17", "callee-and-actual-list-order");
    events.length = 0;
    const key = { [Symbol.toPrimitive]() { events.push("key"); return "value"; } };
    const changeField = { then(resolve) { events.push("field-then"); receiver.value = 99; collect(); resolve(7); } };
    const assigned = receiver[key] += await changeField;
    check(assigned === 10 && receiver.value === 10 && events.join(",") === "key,field-then", "saved-reference-and-old-value");
    events.length = 0;
    receiver[key] = await { then(resolve) { events.push("set-then"); collect(); resolve(19); } };
    check(receiver.value === 19 && events.join(",") === "set-then,key", "assignment-reference-key-order");
    events.length = 0;
    let nullishRejected = false;
    try { null[key] = await { then(resolve) { events.push("nullish-then"); collect(); resolve(1); } }; }
    catch (error) { nullishRejected = error instanceof TypeError; }
    check(nullishRejected && events.join(",") === "nullish-then", "nullish-reference-key-skip");
    const abrupt = {};
    const abruptKey = { [Symbol.toPrimitive]() { throw abrupt; } };
    let preserved = false;
    try { receiver[abruptKey] = await Promise.resolve(7); } catch (error) { preserved = error === abrupt; }
    check(preserved && receiver.value === 19, "reference-abrupt-identity");
    events.length = 0;
    const ignored = null;
    const optional = ignored?.method(await mark(1)).value;
    check(optional === undefined && events.length === 0, "optional-chain-argument-skip");
    const boundary = ignored?.method;
    let rejected = false;
    try { (ignored?.method)(await mark(2)); } catch (error) { rejected = error instanceof TypeError; }
    check(rejected && boundary === undefined && events.join(",") === "mark:2", "parenthesized-reference-boundary");
    events.length = 0;
    const spread = { get copied() { events.push("copy"); collect(); return receiver; } };
    const literal = { ...spread, [key]: await { then(resolve) { events.push("literal-then"); collect(); resolve(23); } }, ...null };
    check(literal.copied === receiver && literal.value === 23 && events.join(",") === "copy,key,literal-then", "literal-owner-and-key-order");
    events.length = 0;
    const conversion = { toString() { events.push("string"); collect(); return "text"; } };
    const text = \`head:\${conversion}:\${await { then(resolve) { events.push("template-then"); collect(); resolve("tail"); } }}\`;
    check(text === "head:text:tail" && events.join(",") === "string,template-then", "template-conversion-order");
    const symbol = Symbol("copied");
    const symbolSource = { [symbol]: receiver };
    const symbolLiteral = { ...symbolSource, tail: await Promise.resolve(31) };
    check(symbolLiteral[symbol] === receiver && Reflect.ownKeys(symbolLiteral).length === 2, "spread-symbol-identity");
    const deep = DEEP_EXPRESSION;
    check(deep === 4107, "deep-operation-expression");
}
subject();
`;

test("native suspension operations retain actual references and argument Lists", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-resumable-native-expression-"));
    // The pinned GetValue/PutValue cache [[ReferencedName]]. Some reference
    // engines still convert a compound key twice, while Bun currently also
    // skips a parenthesized optional callee's argument. Assert the pinned
    // semantic partitions directly instead of inheriting those differences.
    const expected = ["callee-and-actual-list-order", "saved-reference-and-old-value",
        "assignment-reference-key-order", "nullish-reference-key-skip", "reference-abrupt-identity", "optional-chain-argument-skip",
        "parenthesized-reference-boundary", "literal-owner-and-key-order", "template-conversion-order",
        "spread-symbol-identity", "deep-operation-expression"];
    const expectedLines = expected.map(label => label + ":true");
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", subject = path.join(temporary, name + ".js"), driver = path.join(temporary, name + "-driver.js"), output = path.join(temporary, name);
            await fs.writeFile(subject, source.replace("DEEP_EXPRESSION", "(await Promise.resolve(11))" + " + 1".repeat(4096)).replaceAll("NATIVE_GC", String(!noGc))); await fs.writeFile(driver, "");
            const diagnostics: string[] = [];
            const result = await compile({ entry: driver, output, noGc, additionalRoots: [subject], initializationEntries: [subject, driver], buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/resumable-native-expression.js#sloppy", setupEntries: [], testEntry: driver, async: false },
                diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000, env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString())); expect(observation).toMatchObject({ kind: "normal" });
            expect((observation.stdout ?? "").trimEnd().split("\n")).toEqual(expectedLines);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 900_000);

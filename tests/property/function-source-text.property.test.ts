import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const generatedSpans = [0x13579bdf, 0x2468ace0, 0x98765432].map((seed, index) => {
    const gap = seed % 2 ? "\r\n" : "\n", value = seed % 97;
    const definition = index % 2 ? `(/* a:${seed} */ value = ${value}) /* b */ =>${gap}{ /* c */ return value; }` :
        `function /* a:${seed} */ ( /* b */ value = ${value} )${gap}{ /* c */ return value; }`;
    return `const generated${index} = (${definition}); check(text.call(generated${index}) === ${JSON.stringify(definition)}, "generated-source-${seed}");`;
}).join("\n");

const source = String.raw`
function collect() { if (NATIVE_GC) $262.gc(); }
function check(value, label) { if (!value) throw label; print(label + ":true"); }
const text = Function.prototype.toString;
/* before */function /* a */ named /* b */ ( /* c */ value /* d */ ) /* e */ { /* f */ return value; }/* after */
const declaredSource = "function /* a */ named /* b */ ( /* c */ value /* d */ ) /* e */ { /* f */ return value; }";
check(text.call(named) === declaredSource && String(named) === declaredSource, "declaration-span");
const expression = /* before */ function /* a */ internal /* b */ (value) { return value; } /* after */;
check(text.call(expression) === "function /* a */ internal /* b */ (value) { return value; }", "expression-span");
const arrow = /* before */ ( /* a */ value /* b */ ) /* c */ => /* d */ value + 1 /* after */;
check(text.call(arrow) === "( /* a */ value /* b */ ) /* c */ => /* d */ value + 1", "arrow-span");
const asyncFunction = async /* a */ function /* b */ (value) { return value; };
check(text.call(asyncFunction) === "async /* a */ function /* b */ (value) { return value; }", "async-span");
function* /* a */ generator /* b */ () { yield 1; }
check(text.call(generator) === "function* /* a */ generator /* b */ () { yield 1; }", "generator-span");
const owner = {
    /* before */ method /* a */ (value) /* b */ { return value; } /* after */,
    get /* a */ field /* b */ () { return 7; },
    set /* a */ field /* b */ (value) { this.saved = value; },
    ["computed"] /* a */ () { return 11; }
};
const descriptor = Object.getOwnPropertyDescriptor(owner, "field");
check(text.call(owner.method) === "method /* a */ (value) /* b */ { return value; }" &&
    text.call(owner.computed) === '["computed"] /* a */ () { return 11; }', "method-spans");
check(text.call(descriptor.get) === "get /* a */ field /* b */ () { return 7; }" &&
    text.call(descriptor.set) === "set /* a */ field /* b */ (value) { this.saved = value; }", "accessor-spans");
class Plain { method /* a */ () { return 19; } static /* outside */ staticMethod /* b */ () { return 23; } }
check(text.call(Plain) === "class Plain { method /* a */ () { return 19; } static /* outside */ staticMethod /* b */ () { return 23; } }" &&
    text.call(Plain.staticMethod) === "staticMethod /* b */ () { return 23; }" &&
    text.call(new Plain().method) === "method /* a */ () { return 19; }", "class-declaration-spans");
const ClassExpression = class Inner { method() { return 29; } static method() { return 31; } };
check(text.call(ClassExpression) === "class Inner { method() { return 29; } static method() { return 31; } }" &&
    text.call(ClassExpression.method) === "method() { return 31; }" &&
    text.call(ClassExpression.prototype.method) === "method() { return 29; }", "class-expression-spans");
const Generated = Function("a", " /* a */ b, c /* b */ //", "/* c */ ; /* d */ //");
const generatedSource = "function anonymous(a, /* a */ b, c /* b */ //\n) {\n/* c */ ; /* d */ //\n}";
check(text.call(Generated) === generatedSource, "dynamic-function-source");
check(text.call(Function()) === "function anonymous(\n) {\n\n}", "empty-dynamic-source");
let trace = "";
Object.defineProperty(named, "name", { get() { trace += "N"; throw "name getter"; }, configurable: true });
Object.defineProperty(named, "length", { get() { trace += "L"; throw "length getter"; }, configurable: true });
collect(); check(text.call(named) === declaredSource && trace === "", "source-internal-slot");
const builtin = Object.keys;
Object.defineProperty(builtin, "name", { get() { trace += "B"; throw "builtin name getter"; }, configurable: true });
check(text.call(builtin) === "function keys() { [native code] }" && trace === "", "builtin-initial-name");
const callable = function target() {}, bound = callable.bind(null), proxy = new Proxy(callable, { get() { throw "proxy getter"; } });
const revoked = Proxy.revocable(callable, {}); revoked.revoke();
for (const value of [bound, proxy, revoked.proxy]) {
    check(/^function(?:\s+[A-Za-z_$][\w$]*)?\s*\([^)]*\)\s*\{\s*\[native code\]\s*\}$/.test(text.call(value)),
        "opaque-callable-source");
}
for (const value of [undefined, null, 13, "x", {}, new Proxy({}, {})]) {
    try { text.call(value); throw "accepted non-callable"; }
    catch (error) { check(error instanceof TypeError, "non-callable-receiver"); }
}
const original = Function.prototype.toString;
Function.prototype.toString = function() { return "replacement"; };
check(named.toString() === "replacement" && String(named) === "replacement", "ordinary-method-lookup");
Function.prototype.toString = original;
const foreign = $262.createRealm().global;
try { foreign.Function.prototype.toString.call(17); } catch (error) {
    check(error instanceof foreign.TypeError, "callee-realm-error");
}
const make = Function("value", "previous", "return { previous: previous, fn: function /* retained */ () { return value; } };");
let graph = null;
for (let index = 0; index < 4096; index++) { graph = make(index, graph); if (index % 37 === 0) collect(); }
let remaining = 4095, sum = 0;
while (graph !== null) {
    if (graph.fn() !== remaining || text.call(graph.fn) !== "function /* retained */ () { return value; }") throw "retained source";
    sum += graph.fn(); graph = graph.previous; remaining--; if (remaining % 41 === 0) collect();
}
check(remaining === -1 && sum === 4095 * 4096 / 2, "retained-source-graph");
` + generatedSpans;

test("callable SourceText is one retained definition span and toString observes internal metadata", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-function-source-text-"));
    const expected: string[] = [], vm = await import("node:vm");
    new vm.Script(source.replaceAll("NATIVE_GC", "false")).runInContext(vm.createContext({
        print: (value: unknown) => expected.push(String(value)), $262: {
            gc() {}, createRealm() { return { global: new vm.Script("this").runInContext(vm.createContext({})) }; },
        },
    }));
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", entry = path.join(temporary, name + ".js"), output = path.join(temporary, name);
            await fs.writeFile(entry, source.replaceAll("NATIVE_GC", String(!noGc)));
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, noGc, initializationEntries: [entry], buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/function-source-text.js#sloppy", setupEntries: [], testEntry: entry, async: false },
                diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000,
                env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString())); expect(observation).toMatchObject({ kind: "normal" });
            expect((observation.stdout ?? "").trimEnd().split("\n")).toEqual(expected);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 240_000);

import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const source = String.raw`
function collect() { if (NATIVE_GC) $262.gc(); }
function check(value, label) { print(label + ":" + value); }
function named(receiver, method, values) {
    if (method === "call") return receiver.call(...values);
    if (method === "apply") return receiver.apply(...values);
    return receiver.bind(...values);
}
function optionalReceiver(receiver, method, values) {
    if (method === "call") return receiver?.call(...values);
    if (method === "apply") return receiver?.apply(...values);
    return receiver?.bind(...values);
}
function optionalMethod(receiver, method, values) {
    if (method === "call") return receiver.call?.(...values);
    if (method === "apply") return receiver.apply?.(...values);
    return receiver.bind?.(...values);
}
let ordinary = true, ordering = true, abrupt = true, optional = true, identities = true;
for (const method of ["call", "apply", "bind"]) {
    const steps = [], marker = { method: method }, receiver = {};
    const target = function () { collect(); return [this, Array.from(arguments)]; };
    Object.defineProperty(receiver, method, { configurable: true, get() { steps.push("get"); collect(); return target; } });
    const values = { [Symbol.iterator]() { steps.push("iterator"); let index = 0; return {
        next() { steps.push("next:" + index); if (index++ === 0) { Object.defineProperty(receiver, method, { value: null, configurable: true }); return { value: marker, done: false }; } return { done: true }; }
    }; } };
    const received = named(receiver, method, values);
    ordinary = ordinary && received[0] === receiver && received[1].length === 1 && received[1][0] === marker;
    ordering = ordering && steps.join(",") === "get,iterator,next:0,next:1";
    let evaluated = false;
    const badValues = { [Symbol.iterator]() { evaluated = true; return [marker][Symbol.iterator](); } };
    try { named(receiver, method, badValues); abrupt = false; }
    catch (error) { abrupt = abrupt && error instanceof TypeError && evaluated; }
    Object.defineProperty(receiver, method, { get() { throw marker; }, configurable: true }); evaluated = false;
    try { named(receiver, method, badValues); abrupt = false; }
    catch (error) { abrupt = abrupt && error === marker && !evaluated; }
    optional = optional && optionalReceiver(null, method, badValues) === undefined && !evaluated;
    Object.defineProperty(receiver, method, { value: undefined, configurable: true });
    optional = optional && optionalMethod(receiver, method, badValues) === undefined && !evaluated;
    const inherited = { [method]: target }, child = Object.create(inherited);
    const observed = named(child, method, [marker]);
    identities = identities && observed[0] === child && observed[1][0] === marker;
    const proxy = new Proxy(inherited, { get(object, key, actual) { return Reflect.get(object, key, actual); } });
    const throughProxy = named(proxy, method, [marker]);
    identities = identities && throughProxy[0] === proxy && throughProxy[1][0] === marker;
    const fn = function () {};
    Object.defineProperty(fn, method, { get() { return target; }, configurable: true });
    const overridden = named(fn, method, [marker]);
    identities = identities && overridden[0] === fn && overridden[1][0] === marker;
}
check(ordinary, "ordinary-properties"); check(ordering, "lookup-before-spread"); check(abrupt, "abrupt-order");
check(optional, "optional-skipping"); check(identities, "inherited-proxy-function-receivers");
function sum() { "use strict"; let total = 0; for (let index = 0; index < arguments.length; ++index) total += arguments[index]; return [this, total, arguments.length]; }
const values = [], depth = 4096; let expected = 0;
for (let index = 0; index < depth; ++index) { values.push(index); expected += index; }
collect();
const called = sum.call(undefined, ...values), applied = sum.apply(undefined, values), bound = sum.bind(undefined, ...values)();
check(called[0] === undefined && applied[0] === undefined && bound[0] === undefined &&
    called[1] === expected && applied[1] === expected && bound[1] === expected &&
    called[2] === depth && applied[2] === depth && bound[2] === depth, "actual-argument-worklist");
const descriptor = Object.getOwnPropertyDescriptor(Function.prototype, "call");
Object.defineProperty(Function.prototype, "call", { value: function () { return this === sum && arguments[0] === "changed"; }, configurable: true });
check(sum.call("changed"), "mutable-function-prototype");
Object.defineProperty(Function.prototype, "call", descriptor);
`;

test("ordinary function helper names use the rooted lookup and actual argument worklist", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-function-method-"));
    try {
        const expected = ["ordinary-properties", "lookup-before-spread", "abrupt-order", "optional-skipping",
            "inherited-proxy-function-receivers", "actual-argument-worklist", "mutable-function-prototype"].map(label => label + ":true");
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", entry = path.join(temporary, name + ".js"), output = path.join(temporary, name);
            await fs.writeFile(entry, source.replaceAll("NATIVE_GC", String(!noGc)));
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, initializationEntries: [entry], noGc, buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/ordinary-function-method.js#default", setupEntries: [], testEntry: entry, async: false },
                diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000,
                env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            if (observation.kind !== "normal") throw new Error(JSON.stringify(observation));
            expect((observation.stdout ?? "").trimEnd().split("\n")).toEqual(expected);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 180_000);

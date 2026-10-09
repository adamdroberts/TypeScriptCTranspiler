import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const source = String.raw`
function collect() { if (NATIVE_GC) $262.gc(); }
function check(value, label) { if (!value) throw label; print(label + ":true"); }
const keys = Object.keys, values = Object.values, entries = Object.entries;
let trace = "";
const oldKeys = Object.keys;
Object.defineProperty(Object, "keys", { configurable: true, get() {
    trace += "G"; collect();
    return function(target) { trace += "C"; return [this === Object, target.marker]; };
} });
function input() { trace += "A"; Object.defineProperty(Object, "keys", { value: oldKeys, writable: true, configurable: true }); collect(); return { marker: 17 }; }
const chosen = Object.keys(input(), ...(function() { trace += "S"; collect(); return [19]; })());
check(trace === "GASC" && chosen[0] && chosen[1] === 17, "lookup-before-arguments");
Object.keys = function() { trace += "U"; return []; }; trace = ""; Object.keys({});
check(trace === "U", "unused-call"); Object.keys = oldKeys;
const savedGet = Reflect.get; trace = "";
Reflect.get = function(target, key, receiver) { return [this === Reflect, target[key], receiver]; };
const custom = Reflect.get({ field: 23 }, "field", 29);
check(custom[0] && custom[1] === 23 && custom[2] === 29, "reflect-override"); Reflect.get = savedGet;
const shadow = { keys() { return [31]; } };
check((function(Object) { return Object.keys({})[0]; })(shadow) === 31, "shadowed-object");
const ownMethods = { hasOwnProperty() { return "own"; }, propertyIsEnumerable() { return "enum"; } };
check(ownMethods["hasOwnProperty"]("missing") === "own" && ownMethods.propertyIsEnumerable("missing") === "enum", "prototype-name-overrides");
for (const method of [values, entries]) {
    const owner = {};
    Object.defineProperty(owner, "first", { enumerable: true, configurable: true, get() {
        delete owner.deleted;
        Object.defineProperty(owner, "hidden", { value: 41, enumerable: false, configurable: true });
        owner.added = 43; collect(); return 37;
    } });
    owner.deleted = 47; owner.hidden = 53; owner.kept = 59;
    const result = method(owner);
    check(result.length === 2 && (method === values ? result[0] === 37 && result[1] === 59 :
        result[0][0] === "first" && result[0][1] === 37 && result[1][0] === "kept" && result[1][1] === 59), "descriptor-recheck-" + (method === values ? "values" : "entries"));
}
const symbol = Symbol("key"), target = { first: 61, hidden: 67, last: 71 };
target[symbol] = 73; trace = "";
const proxy = new Proxy(target, {
    ownKeys() { trace += "K"; return ["last", symbol, "hidden", "first"]; },
    getOwnPropertyDescriptor(object, key) { trace += "D" + key + ";";
        if (key === "hidden") return { value: 67, enumerable: false, configurable: true };
        return Object.getOwnPropertyDescriptor(object, key);
    },
    get(object, key) { trace += "G" + key + ";"; collect(); return object[key]; }
});
const observed = values(proxy);
check(observed.join(",") === "71,61" && trace === "KDlast;Glast;Dhidden;Dfirst;Gfirst;", "proxy-operation-order");
trace = ""; const projected = Object.getOwnPropertySymbols(proxy);
check(projected.length === 1 && projected[0] === symbol && trace === "K", "symbol-key-projection");
const marker = {};
const abrupt = new Proxy({}, { ownKeys() { return ["x"]; }, getOwnPropertyDescriptor() { throw marker; } });
try { values(abrupt); } catch (error) { check(error === marker, "abrupt-identity"); }
const chars = "A\ud83d\ude00";
check(keys(chars).join(",") === "0,1,2" && values(chars).join("") === chars, "primitive-utf16");
const fragments = ["A", "\ud83d", "", "\ude00", "\0", "\ud800", "Z"];
const combined = "A\ud83d\ude00\0\ud800Z";
check("".concat(...fragments) === combined && fragments.join("") === combined &&
    fragments.reduce((left, right) => left + right, "") === combined, "fragment-code-unit-materialization");
check(Object.getOwnPropertyNames(chars).join(",") === "0,1,2,length" && Object.hasOwn(chars, 1), "primitive-descriptors");
const sparse = [79, , 83]; sparse.extra = 89;
check(keys(sparse).join(",") === "0,2,extra" && values(sparse).join(",") === "79,83,89", "indexed-and-ordinary-keys");
trace = ""; const key = { [Symbol.toPrimitive]() { trace += "P"; collect(); return "x"; } };
try { Object.prototype.hasOwnProperty.call(null, key); } catch (error) { check(error instanceof TypeError && trace === "P", "prototype-key-before-coercion"); }
trace = "";
try { Object.hasOwn(null, key); } catch (error) { check(error instanceof TypeError && trace === "", "static-coercion-before-key"); }
check(Object.prototype.isPrototypeOf.call(null, 1) === false, "primitive-prototype-argument");
check(typeof Object.prototype.valueOf.call(1) === "object", "value-of-boxing");
const inherited = { field: 97 }, receiver = { field: 101 };
Object.defineProperty(inherited, "read", { get() { return this.field; }, configurable: true });
check(Reflect.get(inherited, "read", receiver) === 101 && Reflect.set(inherited, "field", 103, receiver) &&
    receiver.field === 103 && inherited.field === 97, "reflect-receiver");
const legacy = {}, getter = function() { return this.field; };
legacy.field = 107; Object.prototype.__defineGetter__.call(legacy, symbol, getter);
check(legacy[symbol] === 107 && Object.prototype.__lookupGetter__.call(legacy, symbol) === getter, "legacy-symbol-accessor");
for (const method of [keys, values, entries, Reflect.ownKeys]) {
    try { method(); } catch (error) { check(error instanceof TypeError, "missing-target-" + method.name); }
}
// A representative wide key List retains freshly created values across Get,
// pair construction and subsequent collection; its independent checksum has
// no dependence on the runtime's enumeration implementation.
const wide = {}, depth = 4096;
for (let index = 0; index < depth; index++) {
    Object.defineProperty(wide, "key:" + index, { enumerable: true, configurable: true, get() {
        if (index % 257 === 0) collect(); return { index, text: "item:" + index };
    } });
}
const retained = entries(wide); collect(); let sum = 0, valid = retained.length === depth;
for (let index = 0; index < retained.length; index++) {
    const pair = retained[index]; sum += pair[1].index;
    valid = valid && pair[0] === "key:" + index && pair[1].text === "item:" + index;
}
check(valid && sum === depth * (depth - 1) / 2, "retained-key-list");
`;

test("ordinary reflection shares actual lookup and ordered descriptor/Get traversal", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-ordinary-reflection-"));
    const expected: string[] = [];
    new Function("print", "$262", source.replaceAll("NATIVE_GC", "false"))((value: unknown) => expected.push(String(value)), { gc() {} });
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", entry = path.join(temporary, name + ".js"), output = path.join(temporary, name);
            await fs.writeFile(entry, source.replaceAll("NATIVE_GC", String(!noGc)));
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, noGc, initializationEntries: [entry], buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/ordinary-reflection.js#sloppy", setupEntries: [], testEntry: entry, async: false },
                diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000, env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString())); expect(observation).toMatchObject({ kind: "normal" });
            expect((observation.stdout ?? "").trimEnd().split("\n")).toEqual(expected);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 240_000);

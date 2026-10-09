import { expect, test } from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

// Independent model: array indices have integer order; all other strings
// retain creation chronology, including delete/recreate. No Object reflection
// API is used to construct the expected key List.
const insertion = ["tail", "4294967295", "01", "-0", "NaN", "Infinity", "4294967294", "0"];
let seed = 0x4152847;
const indices = Array.from({ length: 233 }, (_, index) => String(index * 37 + 1));
for (let index = indices.length - 1; index > 0; --index) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const selected = seed % (index + 1);
    [indices[index], indices[selected]] = [indices[selected]!, indices[index]!];
}
insertion.push(...indices, "last");
const numeric = insertion.filter(key => /^(0|[1-9][0-9]*)$/.test(key) && BigInt(key) < 4294967295n);
const other = insertion.filter(key => !numeric.includes(key) && key !== "tail");
const expectedKeys = [...numeric.sort((left, right) => Number(left) - Number(right)), ...other, "tail"];
const source = String.raw`"use strict";
const host: any = globalThis;
function collect(): void { if (NATIVE_GC) host.$262.gc(); }
function check(value: boolean, label: string): void { host.print(label + ":" + value); }
const intrinsic: any = Object.getOwnPropertyDescriptors;
check(typeof intrinsic === "function" && intrinsic.length === 1 && intrinsic.name === "getOwnPropertyDescriptors", "method-metadata");
const methodDescriptor: any = Object.getOwnPropertyDescriptor(Object, "getOwnPropertyDescriptors");
check(methodDescriptor.value === intrinsic && methodDescriptor.writable && !methodDescriptor.enumerable && methodDescriptor.configurable, "method-descriptor");
check(Object.getPrototypeOf(intrinsic) === Function.prototype && !Reflect.has(intrinsic, "prototype"), "method-function");
for (const target of [null, undefined]) {
    try { intrinsic(target); check(false, "nullish-target"); } catch (error) { check(error instanceof TypeError, "nullish-target"); }
}
try { intrinsic(); check(false, "missing-target"); } catch (error) { check(error instanceof TypeError, "missing-target"); }
for (const primitive of [1, false, 0n, Symbol("primitive")]) check(Reflect.ownKeys(intrinsic(primitive)).length === 0, "primitive-wrapper");
for (const text of ["", "abc", "\ud83d\ude00\u0000\ud800"]) {
    const descriptors: any = intrinsic(text);
    check(descriptors.length.value === text.length && !descriptors.length.writable && !descriptors.length.enumerable && !descriptors.length.configurable, "string-length");
    check(Reflect.ownKeys(descriptors).length === text.length + 1, "string-key-list");
    for (let index = 0; index < text.length; ++index) {
        const item: any = descriptors[index];
        check(item.value === text.charAt(index) && !item.writable && item.enumerable && !item.configurable, "string-code-unit");
    }
}
const numeric: number[] = [1.25, -0, NaN, Infinity];
const numericDescriptors: any = Object.getOwnPropertyDescriptors(numeric);
for (let index = 0; index < numeric.length; ++index) check(Object.is(numericDescriptors[index].value, numeric[index]), "array-native-codec");
const sparse: any = [1, 2, 3]; delete sparse[1];
const symbol: any = Symbol("array"); sparse[symbol] = { tag: "symbol" }; sparse.extra = "extra";
const sparseDescriptors: any = intrinsic(sparse);
check(!Reflect.has(sparseDescriptors, "1") && sparseDescriptors.length.value === 3 && sparseDescriptors[symbol].value === sparse[symbol], "array-hole-symbol");
const accessor: any = function(): any { throw "getter must stay uncalled"; };
const inherited: any = { inherited: true }, object: any = Object.create(inherited);
Object.defineProperty(object, "access", { get: accessor, enumerable: false, configurable: true });
Object.defineProperty(object, "length", { value: { tag: "actual-length" }, writable: true, enumerable: false, configurable: true });
const descriptors: any = intrinsic(object);
check(!Reflect.has(descriptors, "inherited") && descriptors.access.get === accessor && descriptors.access.set === undefined, "accessor-identity");
check(descriptors.length.value === object.length && descriptors.length.value.tag === "actual-length", "ordinary-length-value");
check(Object.getPrototypeOf(descriptors) === Object.prototype && Object.getOwnPropertyDescriptor(descriptors, "access").enumerable, "fresh-result-properties");
let lengthTrace = "";
const lengthOwner: any = { get length(): any { lengthTrace += "G"; collect(); return object; } };
check(lengthOwner.length === object && lengthOwner?.length === object && lengthTrace === "GG", "length-getter");
const keys: string[] = INSERTION_KEYS;
const expected: string[] = EXPECTED_KEYS;
const keyed: any = {};
const firstSymbol: any = Symbol("first"), secondSymbol: any = Symbol("second");
keyed[firstSymbol] = 1;
for (let index = 0; index < keys.length; ++index) keyed[keys[index]] = index;
keyed[secondSymbol] = 2;
delete keyed.tail; keyed.tail = "recreated";
const actual: any[] = Reflect.ownKeys(keyed);
check(actual.length === expected.length + 2 && actual[actual.length - 2] === firstSymbol && actual[actual.length - 1] === secondSymbol, "ordinary-key-partitions");
check(Object.getOwnPropertyNames(keyed).join("|") === expected.join("|") && Object.keys(intrinsic(keyed)).join("|") === expected.join("|"), "numeric-order-creation");
let trace = "";
const target: any = { a: 1, b: 2, c: 3 };
const proxy: any = new Proxy(target, {
    ownKeys: function(owner: any): any[] { trace += "K"; check(owner === target, "proxy-target"); collect(); return ["c", "a", "b"]; },
    getOwnPropertyDescriptor: function(owner: any, key: string): any {
        trace += key; collect();
        if (key === "c") { delete target.b; return undefined; }
        return Object.getOwnPropertyDescriptor(owner, key);
    },
    get: function(): any { throw "Get is forbidden"; }
});
const proxyDescriptors: any = intrinsic(proxy);
check(trace === "Kcab" && Object.keys(proxyDescriptors).join(",") === "a", "proxy-snapshot-skip-order");
trace = "";
const marker: any = { marker: true };
const abrupt: any = new Proxy({}, { ownKeys: function(): any[] { return ["a", "b", "c"]; },
    getOwnPropertyDescriptor: function(_owner: any, key: string): any { trace += key; if (key === "b") throw marker; return { value: 1, configurable: true }; } });
try { intrinsic(abrupt); check(false, "proxy-abrupt"); } catch (error) { check(error === marker && trace === "ab", "proxy-abrupt"); }
let conversionTrace = "";
const rawDescriptor: any = new Proxy({ value: marker, configurable: true }, {
    has: function(owner: any, key: string): boolean { conversionTrace += "H" + key + "|"; collect(); return Reflect.has(owner, key); },
    get: function(owner: any, key: string): any { conversionTrace += "G" + key + "|"; collect(); return owner[key]; }
});
const completed: any = intrinsic(new Proxy({}, { ownKeys: function(): string[] { return ["item"]; },
    getOwnPropertyDescriptor: function(): any { return rawDescriptor; } })).item;
check(conversionTrace === "Henumerable|Hconfigurable|Gconfigurable|Hvalue|Gvalue|Hwritable|Hget|Hset|", "descriptor-conversion-order");
check(completed !== rawDescriptor && completed.value === marker && !completed.writable && !completed.enumerable && completed.configurable, "descriptor-completion-snapshot");
const getterDescriptor: any = intrinsic(new Proxy({}, { ownKeys: function(): string[] { return ["item"]; },
    getOwnPropertyDescriptor: function(): any { return { get: accessor, configurable: true }; } })).item;
check(getterDescriptor.get === accessor && getterDescriptor.set === undefined && !getterDescriptor.enumerable && !Reflect.has(getterDescriptor, "value"), "accessor-completion");
for (const invalid of [1, null, { get: 1, configurable: true }, { get: undefined, value: 1, configurable: true }, { value: 1 }]) {
    const invalidProxy: any = new Proxy({}, { ownKeys: function(): string[] { return ["item"]; }, getOwnPropertyDescriptor: function(): any { return invalid; } });
    try { intrinsic(invalidProxy); check(false, "invalid-descriptor"); } catch (error) { check(error instanceof TypeError, "invalid-descriptor"); }
}
for (const accessorKind of [false, true]) for (const writable of [false, true]) {
    const fixed: any = {};
    Object.defineProperty(fixed, "item", accessorKind ? { get: accessor } : { value: marker, writable });
    const fixedProxy: any = new Proxy(fixed, { ownKeys: function(): string[] { return ["item"]; }, getOwnPropertyDescriptor: function(): any {
        return accessorKind ? { get: accessor } : { value: marker, writable };
    } });
    const correct: any = intrinsic(fixedProxy).item;
    check(accessorKind ? correct.get === accessor : correct.value === marker && correct.writable === writable, "invariant-compatible");
    const wrongProxy: any = new Proxy(fixed, { ownKeys: function(): string[] { return ["item"]; }, getOwnPropertyDescriptor: function(): any {
        return accessorKind ? { get: undefined } : writable ? { value: marker, writable: false } : { value: {} };
    } });
    try { intrinsic(wrongProxy); check(false, "invariant-reject"); } catch (error) { check(error instanceof TypeError, "invariant-reject"); }
}
const sealed: any = Object.preventExtensions({ item: 1 });
const hidden: any = new Proxy(sealed, { getOwnPropertyDescriptor: function(): any { return undefined; } });
try { intrinsic(hidden); check(false, "nonextensible-hide"); } catch (error) { check(error instanceof TypeError, "nonextensible-hide"); }
let targetOrder = "";
const layeredTarget: any = new Proxy({}, {
    getOwnPropertyDescriptor: function(): any { targetOrder += "T"; return undefined; },
    isExtensible: function(): boolean { targetOrder += "E"; return true; }
});
const layered: any = new Proxy(layeredTarget, { ownKeys: function(): string[] { return ["item"]; },
    getOwnPropertyDescriptor: function(): any { targetOrder += "R"; return { get configurable(): boolean { targetOrder += "D"; return true; } }; }
});
check(Reflect.getOwnPropertyDescriptor(layered, "item").value === undefined && targetOrder === "RTED", "target-before-descriptor-conversion");
trace = "";
function mark(label: string): any { trace += label; collect(); return marker; }
try {
    let receiver: any;
    Object.defineProperty(Object, "getOwnPropertyDescriptors", { configurable: true, get: function(this: any): any {
        trace += "G"; check(this === Object, "static-getter-receiver"); collect();
        return function(this: any, ...args: any[]): any { receiver = this; trace += "C"; collect(); return { args }; };
    } });
    const result: any = Object.getOwnPropertyDescriptors(mark("A"), ...[mark("B"), mark("D")]);
    check(trace === "GABDC" && receiver === Object && result.args.length === 3 && result.args[0] === marker, "lookup-before-actual-list");
    trace = "";
    Object.getOwnPropertyDescriptors({ unused: true });
    Object.getOwnPropertyDescriptors({ unused: true });
    check(trace === "GCGC", "unused-calls-retained");
    Object.defineProperty(Object, "getOwnPropertyDescriptors", { configurable: true, value: undefined });
    trace = "";
    check(Object.getOwnPropertyDescriptors?.(mark("never")) === undefined && trace === "", "optional-static-call");
    try { Object.getOwnPropertyDescriptors(mark("A")); check(false, "non-callable-static"); }
    catch (error) { check(error instanceof TypeError && trace === "A", "non-callable-static"); }
} finally { Object.defineProperty(Object, "getOwnPropertyDescriptors", methodDescriptor); }
interface Fields { length: any; value: any; }
const fields: Fields = { length: marker, value: "initial" };
const fieldOwner: any = fields;
const fieldDescriptors: any = Object.getOwnPropertyDescriptors(fields);
check(fieldDescriptors.length.value === marker && fieldDescriptors.value.value === "initial" && !Reflect.has(fieldDescriptors.value, "get"), "native-field-data-descriptor");
fields.value = "live";
check(intrinsic(fieldOwner).value.value === "live" && Reflect.get(fieldOwner, "value", {}) === "live", "native-field-live-read");
Reflect.set(fieldOwner, "value", marker);
check(fields.value === marker && intrinsic(fieldOwner).value.value === marker, "native-field-live-write");
// One deep retained graph plus a wide key List exercises storage and traversal
// independently of emitter nesting and source fixture shapes.
const graph: any = {};
let cursor: any = graph;
for (let depth = 0; depth < 4096; ++depth) { const next: any = {}; cursor.length = next; graph[String(4095 - depth)] = next; cursor = next; }
cursor.end = marker; collect();
const graphDescriptors: any = intrinsic(graph);
check(Reflect.ownKeys(graphDescriptors).length === 4097 && Reflect.ownKeys(graphDescriptors)[0] === "0", "wide-own-key-worklist");
cursor = graph;
for (let depth = 0; depth < 4096; ++depth) cursor = intrinsic(cursor).length.value;
collect(); check(cursor.end === marker, "deep-descriptor-owner-graph");
`.replace("INSERTION_KEYS", JSON.stringify(insertion)).replace("EXPECTED_KEYS", JSON.stringify(expectedKeys));

test("Ordinary descriptors preserve actual values, ordered key partitions and live native fields", async () => {
    const expected: string[] = [];
    new Function("globalThis", ts.transpileModule(source.replaceAll("NATIVE_GC", "false"),
        { compilerOptions: { target: ts.ScriptTarget.ESNext } }).outputText)({ print: (value: unknown) => expected.push(String(value)) });
    expect(expected.filter(line => !line.endsWith(":true"))).toEqual([]);
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-descriptor-worklist-"));
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", entry = path.join(temporary, name + "-driver.js");
            const subject = path.join(temporary, name + "-subject.ts"), output = path.join(temporary, name);
            await fs.writeFile(entry, ""); await fs.writeFile(subject, source.replaceAll("NATIVE_GC", String(!noGc)));
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, additionalRoots: [subject], initializationEntries: [subject, entry], noGc,
                buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/object-descriptor-worklist.js#strict",
                    setupEntries: [], testEntry: entry, async: false }, diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000,
                env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            if (observation.kind !== "normal") throw new Error(JSON.stringify({ ...observation,
                stdout: (observation.stdout ?? "").slice(-1500) }));
            const actual = (observation.stdout ?? "").trimEnd().split("\n");
            expect(actual.length).toBe(expected.length);
            expect(expected.flatMap((value, index) => actual[index] === value ? [] : [{ index, expected: value, actual: actual[index] }]).slice(0, 12)).toEqual([]);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 180_000);

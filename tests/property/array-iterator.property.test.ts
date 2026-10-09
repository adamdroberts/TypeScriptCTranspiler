import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const source = String.raw`
function describe(value) {
    if (Array.isArray(value)) return "[" + value.map(describe).join(",") + "]";
    if (typeof value === "string") {
        var units = [];
        for (var unit = 0; unit < value.length; unit++) units.push(value.charCodeAt(unit));
        return "s:" + units.join(".");
    }
    return String(value);
}
function step(iterator) { var result = iterator.next(); return result.done + ":" + describe(result.value); }
for (var kind of ["keys", "values", "entries"]) {
    var method = Array.prototype[kind];
    for (var length of [undefined, null, -2, -0, NaN, "2.9", 3, 1n, Symbol("length")]) {
        var log = [];
        var source = Object.create({ 1: "inherited" });
        Object.defineProperties(source, {
            length: { get() { log.push("length"); return length; } },
            0: { get() { log.push("zero"); return "own"; } }
        });
        var iterator = method.call(source);
        print("created:" + kind + ":" + log.join(",") + ":" + Object.keys(iterator).length);
        try { print("step:" + step(iterator) + ":" + log.join(",")); }
        catch (error) { print("step:" + error.name + ":" + log.join(",")); }
        try { print("step:" + step(iterator) + ":" + log.join(",")); }
        catch (error) { print("step:" + error.name + ":" + log.join(",")); }
    }
    var values = ["a", "b"];
    var iterator = method.call(values);
    print("live:" + step(iterator));
    values[1] = "B"; values.push("c");
    print("live:" + step(iterator) + ":" + step(iterator) + ":" + step(iterator));
    values.push("late");
    print("completed:" + step(iterator));
    for (var receiver of [null, undefined, 1, true, "😀"]) {
        try { print("borrowed:" + describe(Array.from(method.call(receiver)))); }
        catch (error) { print("borrowed:" + error.name); }
    }
}
var log = [];
var marker = {};
var current = 0;
var source = { get length() { log.push("length"); if (!current++) throw marker; return 2; },
    get 0() { log.push("zero"); throw marker; }, 1: "one" };
var iterator = Array.prototype.values.call(source);
for (var turn = 0; turn < 4; turn++) {
    try { print("abrupt:" + step(iterator) + ":" + log.join(",")); }
    catch (error) { print("abrupt:" + (error === marker) + ":" + log.join(",")); }
}
var entered = false;
var iterator;
var log = [];
var source = { get length() { if (!entered) { entered = true; log.push(step(iterator)); } return 2; } };
iterator = Array.prototype.keys.call(source);
print("reentrant:" + step(iterator) + ":" + log.join(",") + ":" + step(iterator));
function argumentsValues() { return Array.from(arguments).map(describe).join("|"); }
print("arguments:" + argumentsValues(1, "two", undefined, { x: 1 }));
var iterator = [1].values();
var prototype = Object.getPrototypeOf(iterator);
var next = prototype.next;
var descriptor = Object.getOwnPropertyDescriptor(prototype, "next");
var tag = Object.getOwnPropertyDescriptor(prototype, Symbol.toStringTag);
print("metadata:" + next.name + ":" + next.length + ":" + descriptor.writable + ":" + descriptor.enumerable + ":" + descriptor.configurable + ":" + tag.value + ":" + tag.writable + ":" + tag.enumerable + ":" + tag.configurable);
print("prototypes:" + (iterator[Symbol.iterator]() === iterator) + ":" + (Array.prototype.values === Array.prototype[Symbol.iterator]) + ":" + (Object.getPrototypeOf(prototype) === Object.getPrototypeOf(Object.getPrototypeOf("x"[Symbol.iterator]()))));
for (var receiver of [undefined, null, 1, {}, [], "x", new Proxy(iterator, {})]) {
    try { next.call(receiver); } catch (error) { print("brand:" + error.name); }
}
prototype.next = function() { return { value: "overridden", done: true }; };
print("lookup:" + Array.from([1, 2]).length);
prototype.next = next;
function* generatorValues() { yield 7; yield 8; }
var generator = generatorValues();
print("generator:" + (generator[Symbol.iterator]() === generator) + ":" + Array.from(generator).join("|"));
print("generator-completed:" + (generator[Symbol.iterator]() === generator) + ":" + step(generator));
var generator = generatorValues();
generator.next = function() { return { value: "changed", done: true }; };
print("generator-next-lookup:" + Array.from(generator).length);
var generator = generatorValues();
generator[Symbol.iterator] = function() { return [4].values(); };
print("generator-method-lookup:" + Array.from(generator).join("|"));
var source = { length: 12000 };
Object.defineProperty(source, "0", { get() { return "first"; } });
Object.defineProperty(source, "11999", { get() { return "last"; } });
var iterator = Array.prototype.entries.call(source);
var valid = true;
for (var index = 0; index < source.length; index++) {
    var result = iterator.next();
    if (result.done || result.value[0] !== index || result.value[1] !== (index === 0 ? "first" : index === source.length - 1 ? "last" : undefined)) valid = false;
}
print("stress:" + valid + ":" + step(iterator));
`;

test("Array iterator state reads live properties through the ordinary iterator protocol", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-array-iterator-"));
    const expected: string[] = [];
    new Function("print", source)((value: unknown) => expected.push(String(value)));
    try {
        const entry = path.join(temporary, "subject.js"); await fs.writeFile(entry, source);
        for (const noGc of [false, true]) {
            const output = path.join(temporary, noGc ? "no-gc" : "gc");
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, initializationEntries: [entry], noGc,
                buildDir: path.join(temporary, noGc ? "build-no-gc" : "build-gc"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/array-iterator.js#sloppy",
                    setupEntries: [], testEntry: entry, async: false }, diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe" });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            expect(observation.kind).toBe("normal");
            const actual = (observation.stdout ?? "").trimEnd().split("\n");
            expect(actual.length).toBe(expected.length);
            expect(expected.flatMap((value, index) => actual[index] === value ? [] : [{ index, expected: value, actual: actual[index] }]).slice(0, 12)).toEqual([]);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 180_000);

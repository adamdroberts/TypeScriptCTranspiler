import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";
import ts from "typescript";
import { requireCallSpecifier } from "../../src/module-specifiers";

const operations = [
    "next", "delete:a", "delete:b", "write:d", "next", "write:c", "clear",
    "write:e", "next", "delete:e", "write:e", "next", "next", "write:late", "next",
];

test("static collection projection requires explicit iterator materialization", () => {
    for (const constructor of ['new Set(["key"])', 'new Map([["key", "value"]])']) {
        for (const method of ["keys", "values", "entries"]) {
            const projection = `${constructor}.${method}()`;
            for (const materialized of [false, true]) {
                const item = materialized ? `Array.from(${projection})[0]` : `${projection}[0]`;
                const expression = method === "entries" ? `${item}[0]` : item;
                const source = `require("./probe_" + ${expression});`;
                const parsed = ts.createSourceFile("probe.js", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
                const call = (parsed.statements[0] as ts.ExpressionStatement).expression;
                const folded = requireCallSpecifier(call, new Set(["require"]));
                if (!materialized) expect(folded).toBeNull();
                else {
                    let expected: string | null = null;
                    new Function("require", source)((specifier: unknown) => { expected = String(specifier); });
                    expect(folded).toBe(expected);
                }
            }
        }
    }
});
const partitions = [true, false].flatMap(isMap => ["keys", "values", "entries"].map(kind => `
(function() {
    var collection = new ${isMap ? "Map" : "Set"}(${isMap ? '[["a", "A"], ["b", "B"], ["c", "C"]]' : '["a", "b", "c"]'});
    var iterator = collection.${kind}();
    var observations = [];
    for (const operation of ${JSON.stringify(operations)}) {
        var parts = operation.split(":");
        if (parts[0] === "next") {
            var result = iterator.next("ignored");
            observations.push(result.done + ":" + String(JSON.stringify(result.value)));
        } else if (parts[0] === "delete") collection.delete(parts[1]);
        else if (parts[0] === "clear") collection.clear();
        else ${isMap ? 'collection.set(parts[1], parts[1].toUpperCase())' : 'collection.add(parts[1])'};
    }
    print("${isMap ? "Map" : "Set"}:${kind}:" + observations.join("|"));
    print("fresh:${isMap ? "Map" : "Set"}:${kind}:" + JSON.stringify(Array.from(collection.${kind}())));
})();
`)).join("\n");

const source = String.raw`
function collect() { if (NATIVE_GC) $262.gc(); }
PARTITIONS
var object = {}, symbol = Symbol("key"), callable = function() {}, array = [];
var values = [undefined, null, NaN, -0, false, "string", 13n, object, symbol, callable, array];
for (const C of [Map, Set]) {
    var collection = new C();
    for (const value of values) {
        print("write-identity:" + (C === Map ? collection.set(value, value) === collection : collection.add(value) === collection));
    }
    collect();
    var seen = Array.from(collection.values()), identity = seen.length === values.length;
    for (var index = 0; index < values.length; index++) {
        identity = identity && (index === 3 ? Object.is(seen[index], 0) : Object.is(seen[index], values[index]));
        identity = identity && collection.has(values[index]);
        if (C === Map) identity = identity && Object.is(collection.get(values[index]), values[index]);
    }
    print("payloads:" + (C === Map ? "Map" : "Set") + ":" + identity + ":" + collection.size);
    print("aliases:" + (collection[Symbol.iterator] === (C === Map ? collection.entries : collection.values)) +
        ":" + (C === Map || collection.keys === collection.values));
    var iterator = collection.values();
    print("iterator:" + (iterator[Symbol.iterator]() === iterator) + ":" + Object.prototype.toString.call(iterator));
    for (const receiver of [undefined, null, {}, collection, new Proxy(iterator, {})]) {
        try { iterator.next.call(receiver); print("bad-next"); }
        catch (error) { print("next-brand:" + (error instanceof TypeError)); }
    }
    for (const method of ["has", "delete", "clear", "values", "entries", "forEach"]) {
        try { collection[method].call({}); print("bad-method"); }
        catch (error) { print("method-brand:" + method + ":" + (error instanceof TypeError)); }
    }
    var visited = [], once = false, context = {};
    collection.clear();
    if (C === Map) { collection.set("a", "A"); collection.set("b", "B"); }
    else { collection.add("a"); collection.add("b"); }
    collection.forEach(function(value, key, owner) {
        "use strict";
        visited.push(key + ":" + value + ":" + (this === context) + ":" + (owner === collection) + ":" + arguments.length);
        if (!once) {
            once = true; collection.clear();
            if (C === Map) collection.set("later", "LATER"); else collection.add("later");
            collect();
        }
    }, context, "ignored");
    print("forEach:" + (C === Map ? "Map" : "Set") + ":" + visited.join("|"));
    visited = [];
    once = false;
    for (const item of collection) {
        visited.push(JSON.stringify(item));
        if (!once) {
            once = true;
            if (C === Map) collection.set("tail", "TAIL"); else collection.add("tail");
        }
    }
    print("for-of:" + (C === Map ? "Map" : "Set") + ":" + visited.join("|"));
    var metadata = Object.getOwnPropertyDescriptor(C.prototype, "size");
    print("metadata:" + C.name + ":" + C.length + ":" + metadata.get.name + ":" + metadata.get.length +
        ":" + metadata.enumerable + ":" + metadata.configurable + ":" + collection.values.name + ":" + collection.values.length);
    try { C(); } catch (error) { print("requires-new:" + (error instanceof TypeError)); }
    print("copy:" + new C(collection).size);
    try { new collection.values(); } catch (error) { print("method-constructor:" + (error instanceof TypeError)); }
}
var mapNext = new Map().values().next, setIterator = new Set().values();
try { mapNext.call(setIterator); } catch (error) { print("cross-brand:" + (error instanceof TypeError)); }
for (const C of [Map, Set]) {
    var log = [], marker = {}, closeError = {}, adder = C === Map ? "set" : "add";
    var original = C.prototype[adder];
    C.prototype[adder] = function() { log.push("adder"); collect(); throw marker; };
    var input = { [Symbol.iterator]: function() {
        log.push("iterator");
        return { next: function() { log.push("next"); return { value: ["key", "value"], done: false }; },
            return: function() { log.push("close"); throw closeError; } };
    } };
    try { new C(input); } catch (error) { print("constructor-close:" + (error === marker) + ":" + log.join(",")); }
    C.prototype[adder] = original;
    log = [];
    input = { [Symbol.iterator]: function() {
        return { next: function() { log.push("next"); throw marker; }, return: function() { log.push("close"); return {}; } };
    } };
    try { new C(input); } catch (error) { print("constructor-step:" + (error === marker) + ":" + log.join(",")); }
    C.prototype[adder] = 0;
    log = [];
    input = { get [Symbol.iterator]() { log.push("iterator"); throw marker; } };
    try { new C(input); } catch (error) { print("adder-before-iterator:" + (error instanceof TypeError) + ":" + log.length); }
    print("nullish:" + new C(null).size + ":" + new C(undefined).size);
    C.prototype[adder] = original;
}
var log = [], marker = {};
var pair = { get 0() { log.push("key"); return "key"; }, get 1() { log.push("value"); throw marker; } };
var input = { [Symbol.iterator]: function() {
    return { next: function() { log.push("next"); return { value: pair, done: false }; },
        return: function() { log.push("close"); return {}; } };
} };
try { new Map(input); } catch (error) { print("entry-close:" + (error === marker) + ":" + log.join(",")); }
var alternatePrototype = {}, Alternate = function() {};
Alternate.prototype = alternatePrototype;
print("newTarget:" + (Object.getPrototypeOf(Reflect.construct(Map, [], Alternate)) === alternatePrototype));
var iteratorPrototype = Object.getPrototypeOf(Object.getPrototypeOf(new Map().values()));
for (const method of ["forEach", "reduce"]) {
    var log = [], index = 0, record = {
        get [Symbol.iterator]() { throw "must not get iterator"; },
        get next() { log.push("get-next"); return function() {
            log.push("next"); return index < 3 ? { value: ++index, done: false } : { done: true };
        }; },
        return: function() { log.push("close"); return {}; }
    };
    var result = iteratorPrototype[method].call(record, function(a, b, c) {
        "use strict";
        log.push("call:" + arguments.length + ":" + (this === undefined) + ":" +
            (method === "reduce" ? c : b));
        collect();
        return method === "reduce" ? a + b : undefined;
    }, 17);
    print("consumer:" + method + ":" + result + ":" + log.join(","));
    log = [];
    record = { get next() { log.push("next"); throw marker; },
        return: function() { log.push("close"); return {}; } };
    try { iteratorPrototype[method].call(record, null); }
    catch (error) { print("consumer-invalid:" + (error instanceof TypeError) + ":" + log.join(",")); }
    try { iteratorPrototype[method].call(record, function() {}); }
    catch (error) { print("consumer-get-next:" + (error === marker) + ":" + log.join(",")); }
    log = [];
    record = { next: function() { log.push("next"); return { value: 1, done: false }; },
        return: function() { log.push("close"); throw "close failure"; } };
    try { iteratorPrototype[method].call(record, function() { throw marker; }, 0); }
    catch (error) { print("consumer-callback:" + (error === marker) + ":" + log.join(",")); }
    log = [];
    record = { next: function() { log.push("next"); throw marker; },
        return: function() { log.push("close"); return {}; } };
    try { iteratorPrototype[method].call(record, function() {}, 0); }
    catch (error) { print("consumer-step:" + (error === marker) + ":" + log.join(",")); }
}
print("reduce-implicit:" + new Set([3, 5, 7]).values().reduce(function(a, b) { return a + b; }));
var initial = {};
print("reduce-empty:" + (new Map().values().reduce(function() {}, initial) === initial));
try { new Map().values().reduce(function() {}); }
catch (error) { print("reduce-empty-abrupt:" + (error instanceof TypeError)); }
var stress = new Map([[0, { index: 0 }]]), cursor = stress.entries(), depth = 20000, valid = true;
for (var index = 0; index < depth; index++) {
    var result = cursor.next();
    valid = valid && !result.done && result.value[0] === index && result.value[1].index === index;
    stress.delete(index);
    stress.set(index + 1, { index: index + 1 });
    if (index % 257 === 0) collect();
}
var final = cursor.next();
print("stress:" + valid + ":" + final.value[0] + ":" + cursor.next().done);
`.replace("PARTITIONS", partitions);

test("Map and Set share ordinary live insertion-link iterators and actual constructor/callback protocols", async () => {
    const expected: string[] = [];
    new Function("print", source.replaceAll("NATIVE_GC", "false"))((value: unknown) => expected.push(String(value)));
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-collection-iterator-"));
    try {
        for (const noGc of [false, true]) {
            const entry = path.join(temporary, noGc ? "subject-no-gc.js" : "subject.js");
            await fs.writeFile(entry, source.replaceAll("NATIVE_GC", String(!noGc)));
            const output = path.join(temporary, noGc ? "no-gc" : "gc");
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, initializationEntries: [entry], noGc,
                buildDir: path.join(temporary, noGc ? "build-no-gc" : "build-gc"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/collection-iterator.js#sloppy",
                    setupEntries: [], testEntry: entry, async: false }, diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe",
                env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            expect(observation.kind).toBe("normal");
            expect((observation.stdout ?? "").trimEnd().split("\n")).toEqual(expected);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 120_000);

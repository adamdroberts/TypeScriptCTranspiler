import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const source = String.raw`
function encode(value) {
    if (value === undefined) return "U";
    if (Array.isArray(value)) return "[" + value.map(encode).join("|") + "]";
    if (typeof value === "string") { var units = []; for (var i = 0; i < value.length; i++) units.push(value.charCodeAt(i)); return units.join(","); }
    return String(value);
}
function snapshot(iterator) { var result = iterator.next(); return result.done + ":" + encode(result.value) + ":" + (result.value === undefined ? "U" : result.value.index); }
var all = RegExp.prototype[Symbol.matchAll];
for (var flags of ["g", "gu", "gv", "dg", "dgu", "dgv", "gy", ""]) {
    for (var pattern of ["", "a", "(?<part>a)?b", "."]) {
        for (var start of [-1, 1.9, Infinity, NaN]) {
            var regexp = new RegExp(pattern, flags);
            regexp.lastIndex = start;
            var iterator = all.call(regexp, "😀ab");
            var matches = Array.from(iterator);
            print("native:" + flags + ":" + pattern + ":" + start + ":" + encode(matches) + ":" + matches.map(function(match) { return match.index + ":" + match.input + ":" + (match.groups === undefined ? "U" : encode(match.groups.part)) + ":" + encode(match.indices); }).join("/") + ":" + String(regexp.lastIndex) + ":" + snapshot(iterator));
        }
    }
}
for (var flags of ["g", "gu", "gv", ""]) {
    var log = [];
    var last = 0;
    var matcher = {
        get lastIndex() { log.push("get-last:" + last); return last; },
        set lastIndex(value) { log.push("set-last:" + value); last = value; },
        exec: function(text) { log.push("exec:" + this.lastIndex); return last > text.length ? null : { 0: "", index: last, length: 1 }; }
    };
    function Species(receiver, flagString) { log.push("construct:" + (receiver === original) + ":" + flagString + ":" + arguments.length); return matcher; }
    var constructor = { get [Symbol.species]() { log.push("species"); return Species; } };
    var original = {
        get constructor() { log.push("constructor"); return constructor; },
        get flags() { log.push("flags"); return { toString: function() { log.push("flags-string"); return flags; } }; },
        get lastIndex() { log.push("original-last"); return { valueOf: function() { log.push("last-number"); return -1; } }; }
    };
    var iterator = all.call(original, { toString: function() { log.push("input-string"); return "😀"; } });
    print("created:" + flags + ":" + log.join(","));
    print("custom:" + encode(Array.from(iterator)) + ":" + log.join(",") + ":" + snapshot(iterator));
}
for (var constructor of [undefined, null, 1, {}, { [Symbol.species]: null }, { [Symbol.species]: 1 }, { [Symbol.species]: function() { return Object.freeze({ lastIndex: 0 }); } }]) {
    var original = { constructor: constructor, flags: "g", source: "a", lastIndex: 0, [Symbol.match]: true };
    try { print("species-result:" + encode(Array.from(all.call(original, "a")))); }
    catch (error) { print("species-result:" + error.name); }
}
for (var lastIndex of [1n, Symbol("index")]) {
    var log = [];
    var original = { flags: "g", lastIndex: lastIndex, constructor: { [Symbol.species]: function() { log.push("construct"); return {}; } } };
    try { all.call(original, "x"); } catch (error) { print("last-index:" + error.name + ":" + log.join(",")); }
}
var reentered = false;
var iterator;
var matcher = { exec: function() { if (!reentered) { reentered = true; print("reentrant-inner:" + snapshot(iterator)); return { 0: "x", index: 0 }; } return null; } };
var original = { flags: "g", lastIndex: 0, constructor: { [Symbol.species]: function() { return matcher; } } };
iterator = all.call(original, "x");
print("reentrant-outer:" + snapshot(iterator) + ":" + snapshot(iterator));
var marker = {};
var attempt = 0;
var matcher = { exec: function() { if (!attempt++) throw marker; return attempt === 2 ? { 0: "x", length: 1 } : null; } };
var original = { flags: "g", lastIndex: 0, constructor: { [Symbol.species]: function() { return matcher; } } };
var iterator = all.call(original, "x");
try { iterator.next(); } catch (error) { print("retry:" + (error === marker)); }
print("retry:" + snapshot(iterator) + ":" + snapshot(iterator) + ":" + snapshot(iterator));
var matcher = { exec: function() { return { get 0() { throw marker; } }; } };
var original = { flags: "", lastIndex: 0, constructor: { [Symbol.species]: function() { return matcher; } } };
var iterator = all.call(original, "x");
print("single-skips-zero:" + iterator.next().done + ":" + iterator.next().done);
for (var isRegExp of [false, true]) {
    for (var flags of [undefined, null, "", "g"]) {
        var log = [];
        var receiver = { toString: function() { log.push("input-string"); return "a"; } };
        var pattern = { [Symbol.match]: isRegExp,
            get flags() { log.push("flags"); return flags; },
            get [Symbol.matchAll]() { log.push("method"); return function(value) { log.push("call:" + (value === receiver)); return marker; }; } };
        try { print("dispatch:" + (String.prototype.matchAll.call(receiver, pattern) === marker) + ":" + log.join(",")); }
        catch (error) { print("dispatch:" + error.name + ":" + log.join(",")); }
    }
}
for (var receiver of [undefined, null]) {
    try { String.prototype.matchAll.call(receiver, { get [Symbol.matchAll]() { throw marker; } }); }
    catch (error) { print("coercible:" + error.name); }
}
print("fallback:" + encode(Array.from("aba".matchAll("a"))) + ":" + encode([..."a".matchAll()]));
try { "a".matchAll(/a/); } catch (error) { print("global-required:" + error.name); }
var iterator = "a".matchAll(/a/g);
var prototype = Object.getPrototypeOf(iterator);
var next = prototype.next;
var descriptor = Object.getOwnPropertyDescriptor(prototype, "next");
var tag = Object.getOwnPropertyDescriptor(prototype, Symbol.toStringTag);
print("metadata:" + all.name + ":" + all.length + ":" + next.name + ":" + next.length + ":" + descriptor.writable + ":" + descriptor.enumerable + ":" + descriptor.configurable + ":" + tag.value + ":" + tag.writable + ":" + tag.enumerable + ":" + tag.configurable);
print("prototype:" + (iterator[Symbol.iterator]() === iterator) + ":" + (Object.getPrototypeOf(prototype) === Object.getPrototypeOf(Object.getPrototypeOf([].values()))));
for (var receiver of [undefined, null, 1, {}, [], new Proxy(iterator, {})]) {
    try { next.call(receiver); } catch (error) { print("brand:" + error.name); }
}
prototype.next = function() { return { done: true }; };
print("override:" + Array.from("a".matchAll(/a/g)).length);
prototype.next = next;
var iterator = "a".repeat(12000).matchAll(/a/dg);
var valid = true;
for (var index = 0; index < 12000; index++) {
    var match = iterator.next().value;
    if (match[0] !== "a" || match.index !== index || match.indices[0][0] !== index || match.indices[0][1] !== index + 1) valid = false;
}
print("stress:" + valid + ":" + snapshot(iterator));
`;

test("matchAll uses species construction and one ordinary lazy iterator state", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-match-all-"));
    const expected: string[] = [];
    new Function("print", source)((value: unknown) => expected.push(String(value)));
    try {
        const entry = path.join(temporary, "subject.js"); await fs.writeFile(entry, source);
        for (const noGc of [false, true]) {
            const output = path.join(temporary, noGc ? "no-gc" : "gc");
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, initializationEntries: [entry], noGc,
                buildDir: path.join(temporary, noGc ? "build-no-gc" : "build-gc"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/regexp-match-all.js#sloppy",
                    setupEntries: [], testEntry: entry, async: false }, diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe",
                env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            expect(observation.kind).toBe("normal");
            const actual = (observation.stdout ?? "").trimEnd().split("\n");
            expect(actual.length).toBe(expected.length);
            expect(expected.flatMap((value, index) => actual[index] === value ? [] : [{ index, expected: value, actual: actual[index] }]).slice(0, 12)).toEqual([]);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 180_000);

import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const plans = ["", "g", "gu", "gv", "gy", "y"].flatMap(flags =>
    ["", ".", "(a)?b", "(?<part>a)|(?<part>b)"].flatMap(pattern =>
        ["", "aba", "😀b"].flatMap(text =>
            ["tokens", "callback"].map(replacement => ({ flags, pattern, text, replacement })))));
const script = String.raw`
function encode(value) {
    if (value === undefined) return "U";
    if (value === null) return "N";
    if (typeof value === "string") { var units = []; for (var index = 0; index < value.length; index++) units.push(value.charCodeAt(index)); return units.join(","); }
    if (Array.isArray(value)) return "[" + value.map(encode).join("|") + "]";
    if (typeof value === "object") return Object.keys(value).map(function(key) { return key + ":" + encode(value[key]); }).join(";");
    return String(value);
}
var plans = JSON.parse(PLAN_JSON);
for (var plan of plans) {
    var regexp = new RegExp(plan.pattern, plan.flags);
    regexp.lastIndex = 1;
    var calls = [];
    var replacement = plan.replacement === "tokens" ? "$&-$1-$2-$01-$10-$99-$$-$\x60-$'-$<part>" : function() {
        "use strict";
        calls.push((this === undefined) + ":" + encode(Array.from(arguments)) + ":" + regexp.lastIndex);
        return "X";
    };
    var result = plan.text.replace(regexp, replacement);
    print("native:" + encode(result) + ":" + regexp.lastIndex + ":" + calls.join("/"));
}
var replace = RegExp.prototype[Symbol.replace];
var descriptor = Object.getOwnPropertyDescriptor(RegExp.prototype, Symbol.replace);
print("metadata:" + replace.name + ":" + replace.length + ":" + descriptor.writable + ":" + descriptor.enumerable + ":" + descriptor.configurable);
for (var position of [-Infinity, -1.5, -0, NaN, 0.5, 2.8, 99, Infinity]) {
    for (var named of [undefined, null, 7, "named", { part: null }]) {
        for (var functional of [false, true]) {
            var log = [];
            var capture = { toString: function() { log.push("capture-string"); return "C"; } };
            var hit = {
                get length() { log.push("length"); return { valueOf: function() { log.push("length-number"); return 4; } }; },
                get 0() { log.push("matched"); return { toString: function() { log.push("matched-string"); return "longer"; } }; },
                get index() { log.push("position"); return { valueOf: function() { log.push("position-number"); return position; } }; },
                get 1() { log.push("capture-1"); return undefined; },
                get 2() { log.push("capture-2"); return null; },
                get 3() { log.push("capture-3"); return capture; },
                get groups() { log.push("groups"); return named; }
            };
            var generic = { get flags() { log.push("flags"); return ""; }, exec: function() { log.push("exec"); return hit; } };
            var replacement = functional ? function() { "use strict"; log.push("callback:" + (this === undefined) + ":" + encode(Array.from(arguments))); return { toString: function() { log.push("return-string"); return "X"; } }; } :
                { toString: function() { log.push("replacement-string"); return "$&:$1:$2:$3:$04:$00:$99:$\x60:$':$<part>"; } };
            var text = { toString: function() { log.push("input-string"); return "abc"; } };
            try { print("generic:" + encode(replace.call(generic, text, replacement)) + ":" + log.join(",")); }
            catch (error) { print("generic:" + error.name + ":" + log.join(",")); }
        }
    }
}
for (var flags of ["g", "gu", "gv"]) {
    var log = [];
    var generic = {
        flags: flags, lastIndex: 4,
        exec: function(text) {
            log.push("exec:" + this.lastIndex);
            return this.lastIndex > text.length ? null : { length: 1, 0: "", index: this.lastIndex };
        }
    };
    var callback = function(match, position) { log.push("callback:" + position + ":" + generic.lastIndex); generic.lastIndex = 50; return "X"; };
    print("empty:" + encode(replace.call(generic, "😀", callback)) + ":" + generic.lastIndex + ":" + log.join(","));
}
var log = [];
var results = [2, 0, 2, 99].map(function(position) { return { length: 2, 0: "b", 1: "capture", index: position, groups: { part: position } }; });
var cursor = 0;
var generic = { flags: "g", lastIndex: 0, exec: function() { log.push("exec"); return cursor < results.length ? results[cursor++] : null; } };
print("overlap:" + encode(replace.call(generic, "abc", function() { log.push("callback:" + encode(Array.from(arguments))); return "X"; })) + ":" + log.join(","));
var log = [];
var named = {};
Object.defineProperty(named, "part", { get: function() { log.push("get-name"); return { toString: function() { log.push("name-string"); return "G"; } }; } });
var generic = { flags: "", exec: function() { return { length: 1, 0: "a", index: 0, groups: named }; } };
print("named:" + replace.call(generic, "a", "$<part>-$<missing>-$<part>-$<unterminated") + ":" + log.join(","));
for (var method of ["replace", "replaceAll"]) {
    var regexp = /a/g;
    regexp[Symbol.replace] = undefined;
    print("fallback:" + "/a/g/a"[method](regexp, "X"));
    Object.defineProperty(regexp, "flags", { value: undefined });
    try { print("flags-fallback:" + "a"[method](regexp, "X")); } catch (error) { print("flags-fallback:" + error.name); }
}
for (var returned of [undefined, 0, "a", null]) {
    try { print("return:" + encode(replace.call({ flags: "", exec: function() { return returned; } }, "a", "X"))); }
    catch (error) { print("return:" + error.name); }
}
for (var receiver of [null, undefined, 0, "a"]) {
    var log = [];
    try { replace.call(receiver, { toString: function() { log.push("input-string"); return "a"; } }, "X"); }
    catch (error) { print("brand:" + error.name + ":" + log.join(",")); }
}
var frozen = /a/g;
Object.defineProperty(frozen, "lastIndex", { writable: false });
try { replace.call(frozen, "a", "X"); } catch (error) { print("strict-write:" + error.name); }
var log = [];
var current = 0;
var generic = { flags: "g", exec: function() { log.push("exec"); return { length: 9007199254740991, 0: "a", index: 0, get 1() { log.push("first-capture"); throw marker; } }; } };
var marker = {};
generic.exec = function() { return current++ ? null : { length: 9007199254740991, 0: "a", index: 0, get 1() { log.push("first-capture"); throw marker; } }; };
try { replace.call(generic, "a", "X"); } catch (error) { print("large-list:" + (error === marker) + ":" + log.join(",")); }
`;

test("RegExp replacement shares RegExpExec results, capture Lists and GetSubstitution", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-regexp-replace-"));
    const source = script.replace("PLAN_JSON", JSON.stringify(JSON.stringify(plans)));
    const expected: string[] = [];
    new Function("print", source)((value: unknown) => expected.push(String(value)));
    // JSC preallocates a capture vector from LengthOfArrayLike and fails its
    // resource limit. The pinned algorithm reads capture 1 before appending to
    // the List, so the sentinel is observable without any large allocation.
    expected[expected.length - 1] = "large-list:true:first-capture";
    try {
        const entry = path.join(temporary, "subject.js"); await fs.writeFile(entry, source);
        for (const noGc of [false, true]) {
            const executable = path.join(temporary, noGc ? "no-gc" : "gc");
            const diagnostics: string[] = [];
            const result = await compile({ entry, output: executable, initializationEntries: [entry], noGc,
                buildDir: path.join(temporary, noGc ? "build-no-gc" : "build-gc"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/regexp-replace.js#sloppy",
                    setupEntries: [], testEntry: entry, async: false }, diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([executable], { stdout: "pipe", stderr: "pipe" });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            if (observation.kind !== "normal") throw new Error(JSON.stringify({ ...observation, stdout: observation.stdout?.slice(-400) }));
            expect(observation.kind).toBe("normal");
            const actual = (observation.stdout ?? "").trimEnd().split("\n");
            expect(actual.length).toBe(expected.length);
            expect(expected.flatMap((value, index) => actual[index] === value ? [] : [{ index, expected: value, actual: actual[index] }]).slice(0, 12)).toEqual([]);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 180_000);

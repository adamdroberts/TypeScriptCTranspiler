import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { escapeRegExpString } from "../../src/regexp-escape";
import { parseHostObservation } from "../test262/protocol";

const units = [...Array.from({ length: 128 }, (_, unit) => unit), 0x00a0, 0x1680,
    ...Array.from({ length: 11 }, (_, unit) => 0x2000 + unit), 0x2028, 0x2029, 0x202f,
    0x205f, 0x3000, 0xfeff, 0xd800, 0xdbff, 0xdc00, 0xdfff, 0x00e9];
const strings = [...units.map(unit => String.fromCharCode(unit)), "", "😀", "\ud83d\ude00", "\ud800a\udfff",
    "\ud800\ud800\udc00\udc00", "\u0085\u200b\u180e"];
const escapePlans = strings.flatMap(text => [text, "a" + text, text + "0", "^" + text + "$"]);
const sourcePlans = ["", "/", "[/]", "[\\/]", "\\/", "a\nb", "[\r\n\u2028\u2029]", "\\\n",
    "[\\\r]", "a\u2028b", "\\\u2029", "[a[/]b]", "\\\\/", "\\\\\n", "😀|\ud800", "(?i:a)/b"].flatMap(pattern =>
    ["", "u", "v"].flatMap(flags => {
        // JSC accepts escaped raw LineTerminators in Unicode mode. The
        // pinned IdentityEscape grammar excludes them, as V8 also verifies.
        if (flags) for (let index = 0; index < pattern.length; index++) {
            if (pattern[index] === "\\" && /[\n\r\u2028\u2029]/.test(pattern[++index] ?? "")) return [];
        }
        try { new RegExp(pattern, flags); return [{ pattern, flags }]; } catch { return []; }
    }));
const script = String.raw`
function encode(text) { var units = []; for (var index = 0; index < text.length; index++) units.push(text.charCodeAt(index)); return units.join(","); }
var texts = JSON.parse(ESCAPE_PLANS);
for (var text of texts) {
    var escaped = RegExp.escape(text);
    var roundtrip = true;
    for (var flags of ["", "u", "v"]) {
        var regexp = new RegExp("^(?:" + escaped + ")$", flags);
        if (!regexp.test(text) || regexp.test(text + "x")) roundtrip = false;
    }
    print("escape:" + encode(escaped) + ":" + roundtrip);
}
for (var text of ["0", "1", "9", "a", "c", "f", "foo"]) {
    var escaped = RegExp.escape(text);
    print("context:" + new RegExp("^(a)\\1" + escaped + "$").test("aa" + text) + ":" +
        new RegExp("^\\0" + escaped + "$").test("\0" + text));
}
var plans = JSON.parse(SOURCE_PLANS);
for (var plan of plans) {
    var regexp = new RegExp(plan.pattern, plan.flags);
    var source = regexp.source;
    var clone = new RegExp(source, plan.flags);
    var same = true;
    for (var text of ["", "/", "a\nb", "\n", "\r", "\u2028", "\u2029", "😀", "\ud800", "a/b", "\\/", "b"]) {
        if (regexp.test(text) !== clone.test(text)) same = false;
    }
    print("source:" + encode(source) + ":" + same + ":" + (source === regexp.source) + ":" + encode(regexp.toString()));
}
for (var name of ["source", "flags", "global", "hasIndices", "ignoreCase", "multiline", "dotAll", "unicode", "unicodeSets", "sticky"]) {
    var descriptor = Object.getOwnPropertyDescriptor(RegExp.prototype, name);
    print("getter:" + descriptor.get.name + ":" + descriptor.get.length + ":" + (descriptor.set === undefined) + ":" + descriptor.enumerable + ":" + descriptor.configurable);
}
var sourceGetter = Object.getOwnPropertyDescriptor(RegExp.prototype, "source").get;
for (var receiver of [null, undefined, 0, {}, [], function() {}]) {
    try { sourceGetter.call(receiver); } catch (error) { print("brand:" + error.name); }
}
print("prototype:" + RegExp.prototype.source);
var regexp = /a/;
regexp.toString = function() { return "changed"; };
print("coerce:" + String(regexp));
`;

test("RegExp escaping and source serialization consume the same UTF-16 sequence", async () => {
    for (const text of escapePlans) expect(escapeRegExpString(text)).toBe(RegExp.escape(text));
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-regexp-serialization-"));
    const source = script.replace("ESCAPE_PLANS", JSON.stringify(JSON.stringify(escapePlans)))
        .replace("SOURCE_PLANS", JSON.stringify(JSON.stringify(sourcePlans)));
    const expected: string[] = [];
    new Function("print", source)((value: unknown) => expected.push(String(value)));
    try {
        const entry = path.join(temporary, "subject.js"); await fs.writeFile(entry, source);
        for (const noGc of [false, true]) {
            const executable = path.join(temporary, noGc ? "no-gc" : "gc");
            const diagnostics: string[] = [];
            const result = await compile({ entry, output: executable, initializationEntries: [entry], noGc,
                buildDir: path.join(temporary, noGc ? "build-no-gc" : "build-gc"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/regexp-serialization.js#sloppy",
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

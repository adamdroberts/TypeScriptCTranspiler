import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { hostProtocolVersion, parseHostObservation } from "../test262/protocol";

function subjectSource(): string {
    return `
        var failures = [];
        function check(condition, label) { if (!condition) failures.push(label); }

        var high = String.fromCharCode(0xd83d);
        var low = String.fromCharCode(0xde00);
        var splitPair = Reflect.get({ value: high + low }, "value");
        var scalar = Reflect.get({ value: String.fromCodePoint(0x1f600) }, "value");
        var replacement = String.fromCodePoint(0xfffd);

        check(splitPair === scalar && Object.is(splitPair, scalar), "representation-equality");
        check(!(splitPair < scalar) && !(splitPair > scalar), "representation-order-equality");
        check(scalar < "\\ue000" && !("\\ue000" < scalar), "utf16-order-not-wtf8-order");

        /** @param {string} scalarText @param {string} splitText */
        function checkHashCollections(scalarText, splitText) {
            var map = new Map();
            map.set(scalarText, "scalar-key");
            check(map.get(splitText) === "scalar-key" && map.has(splitText), "map-semantic-hash");
            map.set(splitText, "replacement-key");
            check(map.size === 1 && map.get(scalarText) === "replacement-key", "map-key-collapse");
            var set = new Set();
            set.add(scalarText);
            set.add(splitText);
            check(set.size === 1 && set.has(scalarText) && set.has(splitText), "set-key-collapse");
            var keyed = {};
            keyed[scalarText] = 17;
            check(keyed[splitText] === 17 && Object.keys(keyed).length === 1,
                "property-key-semantic-hash");
        }
        checkHashCollections(scalar, splitPair);

        try {
        var text = "A" + splitPair + "B" + scalar + "C";
        check(text.length === 7, "sequence-length");
        var needles = [scalar, splitPair];
        for (var needleIndex = 0; needleIndex < needles.length; needleIndex++) {
            var needle = needles[needleIndex];
            check(text.indexOf(needle) === 1, "index-of-representation-" + needleIndex);
            check(text.lastIndexOf(needle) === 4, "last-index-of-representation-" + needleIndex);
            check(text.includes(needle, 1), "includes-representation-" + needleIndex);
            check(text.startsWith(needle, 1), "starts-with-representation-" + needleIndex);
            check(text.endsWith(needle, 6), "ends-with-representation-" + needleIndex);
        }
        check(scalar.indexOf(high) === 0 && scalar.indexOf(low) === 1,
            "search-inside-surrogate-pair");
        check(text.startsWith(low, 2) && text.endsWith(high, 2),
            "position-is-code-unit-offset");
        check(text.indexOf("", 99) === text.length && text.lastIndexOf("", 99) === text.length,
            "empty-needle-clamped-position");

        var rangeMethods = [
            { label: "slice", whole: text.slice(1, 3), high: text.slice(1, 2), low: text.slice(2, 3) },
            { label: "substring", whole: text.substring(1, 3), high: text.substring(1, 2), low: text.substring(2, 3) },
            { label: "substr", whole: text.substr(1, 2), high: text.substr(1, 1), low: text.substr(2, 1) }
        ];
        for (var rangeIndex = 0; rangeIndex < rangeMethods.length; rangeIndex++) {
            var range = rangeMethods[rangeIndex];
            check(range.whole === scalar && range.whole.isWellFormed(), range.label + ":whole-pair");
            check(range.high.charCodeAt(0) === 0xd83d && !range.high.isWellFormed(),
                range.label + ":isolated-high");
            check(range.low.charCodeAt(0) === 0xde00 && !range.low.isWellFormed(),
                range.label + ":isolated-low");
        }
        check(text.slice(-3, -1) === scalar, "slice-negative-code-unit-range");
        check(text.substring(3, 1) === scalar, "substring-swapped-code-unit-range");

        var paddedStart = "X".padStart(3, splitPair);
        var paddedEnd = "X".padEnd(3, splitPair);
        check(paddedStart === scalar + "X" && paddedStart.length === 3, "pad-start-full-pair");
        check(paddedEnd === "X" + scalar && paddedEnd.length === 3, "pad-end-full-pair");
        var truncatedStart = "X".padStart(2, scalar);
        var truncatedEnd = "X".padEnd(2, scalar);
        check(truncatedStart.charCodeAt(0) === 0xd83d && truncatedStart.charAt(1) === "X" &&
            !truncatedStart.isWellFormed(), "pad-start-code-unit-truncation");
        check(truncatedEnd.charAt(0) === "X" && truncatedEnd.charCodeAt(1) === 0xd83d &&
            !truncatedEnd.isWellFormed(), "pad-end-code-unit-truncation");

        var iterated = Array.from(splitPair);
        check(iterated.length === 1 && iterated[0] === scalar && iterated[0].length === 2,
            "iterator-combines-adjacent-pair");
        check(splitPair.isWellFormed() && splitPair.toWellFormed() === scalar,
            "well-formed-across-storage-boundary");
        var malformed = high + "X" + low;
        var repaired = malformed.toWellFormed();
        check(!malformed.isWellFormed() && repaired === replacement + "X" + replacement &&
            repaired.isWellFormed(), "repair-unpaired-code-units");
        } catch (error) {
            failures.push("unexpected-throw-string-operations:" + String(error));
        }

        print(failures.length === 0 ? "string-utf16-sequence-ok" : failures.join(","));
    `;
}

test("String algorithms consume one representation-independent UTF-16 sequence", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-string-utf16-sequence-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/string-utf16-sequence.js#sloppy";
    try {
        await fs.writeFile(entry, subjectSource(), "utf8");
        for (const noGc of [false, true]) {
            const mode = noGc ? "no-gc" : "gc";
            const executable = path.join(temporary, `subject-${mode}`);
            const diagnostics: string[] = [];
            const result = await compile({
                entry,
                output: executable,
                buildDir: path.join(temporary, `build-${mode}`),
                initializationEntries: [entry],
                noGc,
                test262Observation: {
                    kind: "test262-native-observation",
                    scenarioId,
                    setupEntries: [],
                    testEntry: entry,
                    async: false,
                },
                diagnosticWriter: (message) => diagnostics.push(message),
            });
            expect(diagnostics.join("")).toBe("");
            expect(result.exitCode).toBe(0);

            const process = Bun.spawnSync([executable], { stdout: "pipe", stderr: "pipe" });
            expect(process.exitCode).toBe(0);
            expect(process.stderr.toString()).toBe("");
            expect(parseHostObservation(JSON.parse(process.stdout.toString()))).toEqual({
                protocolVersion: hostProtocolVersion,
                scenarioId,
                kind: "normal",
                asyncCompletion: undefined,
                stdout: "string-utf16-sequence-ok\n",
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

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
        function units(value) {
            var result = [];
            for (var index = 0; index < value.length; index++) result.push(value.charCodeAt(index));
            return result.join(",");
        }

        var high = String.fromCharCode(0xd83d);
        var low = String.fromCharCode(0xde00);
        var splitPair = Reflect.get({ value: high + low }, "value");
        var scalar = Reflect.get({ value: String.fromCodePoint(0x1f600) }, "value");

        /**
         * @param {string} source
         * @param {string} scalarText
         * @param {string} search
         * @param {string} label
         */
        function checkSearch(source, scalarText, search, label) {
            var parts = source.split(search);
            check(parts.length === 3 && parts[0] === "A" && parts[1] === "B" && parts[2] === "C",
                "split-representation-" + label);
            var limited = source.split(search, 2);
            check(limited.length === 2 && limited[0] === "A" && limited[1] === "B",
                "split-limit-representation-" + label);
            check(source.replace(search, "X") === "AXB" + scalarText + "C",
                "replace-first-representation-" + label);
            check(source.replaceAll(search, "X") === "AXBXC",
                "replace-all-representation-" + label);
        }

        /**
         * @param {string} scalarText
         * @param {string} splitText
         * @param {string} highText
         * @param {string} lowText
         */
        function exercise(scalarText, splitText, highText, lowText) {
            var source = "A" + splitText + "B" + scalarText + "C";
            checkSearch(source, scalarText, scalarText, "scalar");
            checkSearch(source, scalarText, splitText, "split");

            var scalarUnits = scalarText.split("");
            var splitUnits = splitText.split("");
            check(scalarUnits.length === 2 && splitUnits.length === 2 &&
                scalarUnits[0].charCodeAt(0) === 0xd83d && scalarUnits[1].charCodeAt(0) === 0xde00 &&
                splitUnits[0].charCodeAt(0) === 0xd83d && splitUnits[1].charCodeAt(0) === 0xde00,
                "empty-separator-code-units");
            check(scalarUnits[0] === highText && scalarUnits[1] === lowText,
                "empty-separator-isolated-surrogates");

            var highParts = source.split(highText);
            check(highParts.length === 3 && highParts[0] === "A" &&
                units(highParts[1]) === "56832,66" && units(highParts[2]) === "56832,67",
                "split-high-surrogate");
            var lowParts = source.split(lowText);
            check(lowParts.length === 3 && units(lowParts[0]) === "65,55357" &&
                units(lowParts[1]) === "66,55357" && lowParts[2] === "C",
                "split-low-surrogate");

            var firstHigh = source.replace(String(highText), "H");
            var allHigh = source.replaceAll(String(highText), "H");
            check(units(firstHigh) === "65,72,56832,66,55357,56832,67",
                "replace-first-high-surrogate");
            check(units(allHigh) === "65,72,56832,66,72,56832,67",
                "replace-all-high-surrogate");

            var tokenSource = "A" + splitText + "B";
            var tokenReplacement = "$$|$&|$\\u0060|$'|$1";
            var tokenExpected = "A$|" + scalarText + "|A|B|$1B";
            check(tokenSource.replace(String(scalarText), tokenReplacement) === tokenExpected,
                "replacement-token-scalar-search");
            check(tokenSource.replace(String(splitText), tokenReplacement) === tokenExpected,
                "replacement-token-split-search");
            check("x".replace("x", splitText) === scalarText,
                "replacement-content-representation");

            check("ab".replace("", "-") === "-ab", "replace-empty-search");
            check("ab".replaceAll("", "-") === "-a-b-", "replace-all-empty-search");
            check("".replaceAll("", "-") === "-", "replace-all-empty-source-search");
            check("ab".replaceAll("", "$&") === "ab", "replace-all-empty-match-token");
            check("aaa".replaceAll("aa", "X") === "Xa", "replace-all-non-overlap");

            check("".split("").length === 0, "split-empty-source-empty-separator");
            var emptyUnmatched = "".split("x");
            check(emptyUnmatched.length === 1 && emptyUnmatched[0] === "",
                "split-empty-source-unmatched-separator");
            check(source.split(splitText, 0).length === 0, "split-zero-limit");

        }

        exercise(scalar, splitPair, high, low);
        print(failures.length === 0 ? "string-utf16-replace-split-ok" : failures.join(","));
    `;
}

test("literal replacement and split consume one UTF-16 sequence", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-string-utf16-replace-split-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/string-utf16-replace-split.js#sloppy";
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
                stdout: "string-utf16-replace-split-ok\n",
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

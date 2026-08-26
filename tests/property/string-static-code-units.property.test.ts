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
        function checkThrows(label, constructor, callback) {
            try { callback(); check(false, label + ":missing"); }
            catch (error) { check(error instanceof constructor, label + ":type"); }
        }

        var staticNames = ["fromCharCode", "fromCodePoint", "raw"];
        for (var staticIndex = 0; staticIndex < staticNames.length; staticIndex++) {
            var staticName = staticNames[staticIndex];
            var staticDescriptor = Object.getOwnPropertyDescriptor(String, staticName);
            check(staticDescriptor.value === String[staticName], staticName + ":descriptor-value");
            check(staticDescriptor.writable === true, staticName + ":writable");
            check(staticDescriptor.enumerable === false, staticName + ":enumerable");
            check(staticDescriptor.configurable === true, staticName + ":configurable");
            check(String[staticName].name === staticName, staticName + ":name");
            check(String[staticName].length === 1, staticName + ":length");
        }
        check(String.fromCharCode === String.fromCharCode, "char-code-stable-identity");
        check(String.fromCodePoint === String.fromCodePoint, "code-point-stable-identity");

        var charAlias = String.fromCharCode;
        var pointAlias = String.fromCodePoint;
        check(Reflect.apply(charAlias, null, [75, 76]) === "KL", "char-code-reflective-alias");
        check(Reflect.apply(pointAlias, null, [77, 78]) === "MN", "code-point-reflective-alias");
        var rawAlias = String.raw;
        check(Reflect.apply(rawAlias, null, [{ raw: ["a", "b"] }, 1]) === "a1b", "raw-reflective-alias");

        var originalCharCode = String.fromCharCode;
        var mutationTrace = "";
        String.fromCharCode = function(value) { mutationTrace += "m"; return "changed-" + value; };
        check(String.fromCharCode(79) === "changed-79", "char-code-property-mutation");
        check(mutationTrace === "m", "char-code-property-mutation-call");
        String.fromCharCode = originalCharCode;
        check(String.fromCharCode(79) === "O", "char-code-property-restoration");

        var originalCharDescriptor = Object.getOwnPropertyDescriptor(String, "fromCharCode");
        var lookupTrace = "";
        Object.defineProperty(String, "fromCharCode", {
            configurable: true,
            get: function() {
                lookupTrace += "g";
                return function(value) { lookupTrace += "c"; return "getter-" + value; };
            }
        });
        function lookupArgument() { lookupTrace += "a"; return 80; }
        check(String.fromCharCode(lookupArgument()) === "getter-80", "char-code-getter-call");
        check(lookupTrace === "gac", "char-code-get-before-arguments");
        lookupTrace = "";
        check(String.fromCharCode(...[lookupArgument()]) === "getter-80", "char-code-getter-spread-call");
        check(lookupTrace === "gac", "char-code-get-before-spread");
        Object.defineProperty(String, "fromCharCode", originalCharDescriptor);

        check(String.fromCharCode() === "", "char-code-empty");
        check(String.fromCharCode(65).charCodeAt(0) === 65, "char-code-ascii");
        check(String.fromCharCode(65.9).charCodeAt(0) === 65, "char-code-truncate");
        check(String.fromCharCode(-1).charCodeAt(0) === 65535, "char-code-negative-wrap");
        check(String.fromCharCode(65536).charCodeAt(0) === 0, "char-code-positive-wrap");
        check(String.fromCharCode(NaN).charCodeAt(0) === 0, "char-code-nan");
        check(String.fromCharCode(Infinity).charCodeAt(0) === 0, "char-code-infinity");
        check(String.fromCharCode(undefined).charCodeAt(0) === 0, "char-code-undefined");
        check(String.fromCharCode(1e20).charCodeAt(0) === 0, "char-code-large-finite");
        check(String.fromCharCode("66").charCodeAt(0) === 66, "char-code-string");
        check(String.fromCharCode(true).charCodeAt(0) === 1, "char-code-boolean");
        check(String.fromCharCode(null).charCodeAt(0) === 0, "char-code-null");

        var pair = String.fromCharCode(0xd83d, 0xde00);
        check(pair.codePointAt(0) === 0x1f600, "char-code-surrogate-pair");
        var isolatedHigh = String.fromCharCode(0xd800);
        var isolatedLow = String.fromCharCode(0xdc00);
        check(!isolatedHigh.isWellFormed(), "char-code-isolated-high");
        check(!isolatedLow.isWellFormed(), "char-code-isolated-low");

        var conversionTrace = "";
        var first = { valueOf: function() { conversionTrace += "x"; return 67; } };
        var second = { valueOf: function() { conversionTrace += "y"; return 68; } };
        function argument(label, value) { conversionTrace += label; return value; }
        var ordered = String.fromCharCode(argument("a", first), argument("b", second));
        check(ordered === "CD", "char-code-object-values");
        check(conversionTrace === "abxy", "char-code-evaluate-then-convert");
        var discardedTrace = "";
        String.fromCharCode({ valueOf: function() { discardedTrace += "d"; return 65; } });
        check(discardedTrace === "d", "char-code-discarded-conversion");

        var sentinel = {};
        var abruptTrace = "";
        var abrupt = { valueOf: function() { abruptTrace += "x"; throw sentinel; } };
        var unconverted = { valueOf: function() { abruptTrace += "y"; return 69; } };
        var exact = false;
        try {
            String.fromCharCode(
                (abruptTrace += "c", abrupt),
                (abruptTrace += "d", unconverted)
            );
        } catch (error) { exact = error === sentinel; }
        check(exact, "char-code-abrupt-identity");
        check(abruptTrace === "cdx", "char-code-abrupt-order");
        checkThrows("char-code-bigint", TypeError, function() { String.fromCharCode(1n); });
        checkThrows("char-code-symbol", TypeError, function() { String.fromCharCode(Symbol("unit")); });

        check(String.fromCodePoint() === "", "code-point-empty");
        check(String.fromCodePoint(0).codePointAt(0) === 0, "code-point-zero");
        check(String.fromCodePoint(0x7f).codePointAt(0) === 0x7f, "code-point-one-byte-high");
        check(String.fromCodePoint(0x80).codePointAt(0) === 0x80, "code-point-two-byte-low");
        check(String.fromCodePoint(0x7ff).codePointAt(0) === 0x7ff, "code-point-two-byte-high");
        check(String.fromCodePoint(0x800).codePointAt(0) === 0x800, "code-point-three-byte-low");
        check(String.fromCodePoint(0xffff).codePointAt(0) === 0xffff, "code-point-three-byte-high");
        check(String.fromCodePoint(0x10000).codePointAt(0) === 0x10000, "code-point-four-byte-low");
        check(String.fromCodePoint(0x10ffff).codePointAt(0) === 0x10ffff, "code-point-four-byte-high");
        check(!String.fromCodePoint(0xd800).isWellFormed(), "code-point-surrogate-preserved");
        var pointPair = String.fromCodePoint(0xd83d, 0xde00);
        check(pointPair === pair && pointPair.isWellFormed(), "code-point-adjacent-surrogates");
        check(String.fromCodePoint("70", true, null) === "F\\u0001\\u0000", "code-point-conversions");
        var pointObject = { valueOf: function() { return 71; } };
        check(String.fromCodePoint(pointObject) === "G", "code-point-object");
        check(String.fromCodePoint(-0).codePointAt(0) === 0, "code-point-negative-zero");

        var pointConversionTrace = "";
        var pointFirst = { valueOf: function() { pointConversionTrace += "x"; return 72; } };
        var pointSecond = { valueOf: function() { pointConversionTrace += "y"; return 0x1f600; } };
        function pointArgument(label, value) { pointConversionTrace += label; return value; }
        var pointOrdered = String.fromCodePoint(
            pointArgument("a", pointFirst),
            pointArgument("b", pointSecond)
        );
        check(pointOrdered.codePointAt(0) === 72 && pointOrdered.codePointAt(1) === 0x1f600,
            "code-point-object-values");
        check(pointConversionTrace === "abxy", "code-point-evaluate-then-convert");

        var pointSentinel = {};
        var pointAbruptTrace = "";
        var pointAbrupt = { valueOf: function() { pointAbruptTrace += "x"; throw pointSentinel; } };
        var pointUnconverted = { valueOf: function() { pointAbruptTrace += "y"; return 73; } };
        var pointExact = false;
        try {
            String.fromCodePoint(
                (pointAbruptTrace += "c", pointAbrupt),
                (pointAbruptTrace += "d", pointUnconverted)
            );
        } catch (error) { pointExact = error === pointSentinel; }
        check(pointExact, "code-point-abrupt-identity");
        check(pointAbruptTrace === "cdx", "code-point-abrupt-order");

        var pointRangeTrace = "";
        var invalidPoint = { valueOf: function() { pointRangeTrace += "x"; return 1.5; } };
        var afterInvalidPoint = { valueOf: function() { pointRangeTrace += "y"; return 74; } };
        checkThrows("code-point-range-short-circuit", RangeError, function() {
            String.fromCodePoint(invalidPoint, afterInvalidPoint);
        });
        check(pointRangeTrace === "x", "code-point-range-short-circuit-order");

        var iteratorText = "A" + String.fromCodePoint(0x1f600) + "B";
        var iteratorValues = Array.from(iteratorText);
        check(iteratorValues.length === 3, "string-iterator-code-point-cardinality");
        check(iteratorValues[0] === "A" && iteratorValues[1].codePointAt(0) === 0x1f600 &&
            iteratorValues[2] === "B", "string-iterator-code-point-values");

        function isRangeError(value) {
            try { String.fromCodePoint(value); }
            catch (error) { return error instanceof RangeError; }
            return false;
        }
        var invalidPoints = [-1, 0x110000, 1.5, NaN, Infinity, undefined];
        for (var invalidIndex = 0; invalidIndex < invalidPoints.length; invalidIndex++) {
            var invalid = invalidPoints[invalidIndex];
            check(isRangeError(invalid), "code-point-range-" + invalidIndex);
        }
        checkThrows("code-point-bigint", TypeError, function() { String.fromCodePoint(1n); });
        checkThrows("code-point-symbol", TypeError, function() { String.fromCodePoint(Symbol("point")); });

        var units = [72, 73, 74];
        check(String.fromCharCode(...units) === "HIJ", "char-code-spread-worklist");
        check(String.fromCodePoint(...units) === "HIJ", "code-point-spread-worklist");

        var text = "wxyz";
        var keyTrace = "";
        var objectKey = {
            valueOf: function() { keyTrace += "v"; return 0; },
            toString: function() { keyTrace += "s"; return "2"; }
        };
        check(text[objectKey] === "y", "string-computed-object-key");
        check(keyTrace === "s", "string-computed-string-hint");
        check(text["length"] === 4, "string-computed-length");
        check(text["99"] === undefined, "string-computed-absent");
        var keySentinel = {};
        var keyExact = false;
        try { text[{ toString: function() { throw keySentinel; } }]; }
        catch (error) { keyExact = error === keySentinel; }
        check(keyExact, "string-computed-abrupt-identity");

        print(failures.length === 0 ? "string-static-code-units-ok" : failures.join(","));
    `;
}

test("String constructors and iteration share canonical argument and code-point worklists", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-string-code-units-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/string-static-code-units.js#sloppy";
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
                stdout: "string-static-code-units-ok\n",
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

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
        function typeError(thunk, label) {
            try { thunk(); failures.push(label + ":missing"); }
            catch (error) { check(error instanceof TypeError, label + ":type"); }
        }
        function rangeError(thunk, label) {
            try { thunk(); failures.push(label + ":missing"); }
            catch (error) { check(error instanceof RangeError, label + ":type"); }
        }
        function codeUnits(value) {
            var result = [];
            for (var index = 0; index < value.length; index++) result.push(value.charCodeAt(index));
            return result;
        }
        function sameUnits(actual, expected, label) {
            var actualUnits = codeUnits(actual);
            if (actualUnits.length !== expected.length) {
                failures.push(label + ":length:" + actualUnits.length);
                return;
            }
            for (var index = 0; index < expected.length; index++) {
                if (actualUnits[index] !== expected[index]) {
                    failures.push(label + ":unit-" + index);
                    return;
                }
            }
        }

        var methodNames = ["toLowerCase", "toUpperCase", "normalize"];
        var intrinsics = {};
        for (var methodIndex = 0; methodIndex < methodNames.length; methodIndex++) {
            var methodName = methodNames[methodIndex];
            var intrinsic = String.prototype[methodName];
            intrinsics[methodName] = intrinsic;
            var descriptor = Object.getOwnPropertyDescriptor(String.prototype, methodName);
            var nameDescriptor = Object.getOwnPropertyDescriptor(intrinsic, "name");
            var lengthDescriptor = Object.getOwnPropertyDescriptor(intrinsic, "length");
            check(typeof intrinsic === "function" && intrinsic === String.prototype[methodName],
                methodName + ":surface-stable-callable");
            check(descriptor.value === intrinsic && descriptor.writable && !descriptor.enumerable &&
                descriptor.configurable, methodName + ":surface-descriptor");
            check(intrinsic.name === methodName && !nameDescriptor.writable &&
                !nameDescriptor.enumerable && nameDescriptor.configurable,
                methodName + ":name-descriptor");
            check(intrinsic.length === 0 && !lengthDescriptor.writable &&
                !lengthDescriptor.enumerable && lengthDescriptor.configurable,
                methodName + ":length-descriptor");
            typeError(function() { Reflect.construct(intrinsic, []); }, methodName + ":nonconstructor");
            check(!Object.prototype.hasOwnProperty.call(intrinsic, "prototype"),
                methodName + ":no-prototype");
        }
        check("surface".toUpperCase === intrinsics.toUpperCase &&
            "surface".toLowerCase.length === 0, "typed-direct-method-value-uses-prototype-surface");

        check(intrinsics.toUpperCase.call(12) === "12", "toupper-number-receiver");
        check(intrinsics.toLowerCase.call(true) === "true", "tolower-boolean-receiver");
        check(intrinsics.toUpperCase.call(["a", "b"]) === "A,B", "toupper-array-receiver");
        check(intrinsics.toLowerCase.call(new String("AbC")) === "abc", "tolower-boxed-receiver");
        var receiverCalls = 0;
        var ordinaryReceiver = { toString: function() { receiverCalls++; return "AbC"; } };
        check(intrinsics.toUpperCase.call(ordinaryReceiver) === "ABC" && receiverCalls === 1,
            "ordinary-receiver-once");
        typeError(function() { intrinsics.toLowerCase.call(undefined); }, "tolower-undefined-receiver");
        typeError(function() { intrinsics.toUpperCase.call(null); }, "toupper-null-receiver");
        typeError(function() { intrinsics.normalize.call(Symbol("receiver")); }, "normalize-symbol-receiver");

        var seen = "";
        function mark(label) { seen += label; return label; }
        check("aBc".toUpperCase(mark("a"), mark("b")) === "ABC" && seen === "ab",
            "toupper-extra-args-evaluated-ignored");
        seen = "";
        var formProbe = { toString: function() { seen += "c"; return "NFC"; } };
        check("aBc".normalize(formProbe) === "aBc" && seen === "c",
            "normalize-form-evaluated");

        check("aBcXyZ".toUpperCase() === "ABCXYZ", "toupper-ascii");
        check("ABCXYZ".toLowerCase() === "abcxyz", "tolower-ascii");
        sameUnits("ß".toUpperCase(), [0x53, 0x53], "toupper-sharp-s-expands");
        sameUnits("SS".toLowerCase(), [0x73, 0x73], "tolower-ascii-pair");
        sameUnits("İ".toLowerCase(), [0x69, 0x307], "tolower-dotted-capital-expands");
        sameUnits("ﬁ".toUpperCase(), [0x46, 0x49], "toupper-ligature-expands");
        sameUnits("σς".toUpperCase(), [0x3a3, 0x3a3], "toupper-sigmas");
        check("ΟΔΥΣΣΕΎΣ".toLowerCase().slice(-1) === "ς", "tolower-final-sigma-context");
        sameUnits("Ὀ".toLowerCase(), [0x1f40], "tolower-precomposed-greek");
        var deseret = String.fromCodePoint(0x10400);
        sameUnits(deseret.toLowerCase(), [0xd801, 0xdc28], "tolower-astral-pair");
        sameUnits(String.fromCodePoint(0x10428).toUpperCase(), [0xd801, 0xdc00],
            "toupper-astral-pair");

        var loneHigh = String.fromCharCode(0xd800);
        var loneLow = String.fromCharCode(0xdc00);
        sameUnits(intrinsics.toUpperCase.call(loneHigh + "a"), [0xd800, 0x41],
            "toupper-lone-surrogate-preserved");
        sameUnits(intrinsics.toLowerCase.call("A" + loneLow), [0x61, 0xdc00],
            "tolower-lone-surrogate-preserved");
        sameUnits(intrinsics.normalize.call(loneHigh + "é"), [0xd800, 0xe9],
            "normalize-lone-surrogate-preserved");

        var eAcute = "é";
        var eCombining = "é";
        check(eAcute.length === 1 && eCombining.length === 2, "fixture-sanity");
        sameUnits(eAcute.normalize("NFD"), [0x65, 0x301], "normalize-nfd-splits");
        sameUnits(eCombining.normalize("NFC"), [0xe9], "normalize-nfc-composes");
        sameUnits(eAcute.normalize(), [0xe9], "normalize-default-form");
        sameUnits(eAcute.normalize(undefined), [0xe9], "normalize-undefined-form");
        check("ﬁ".normalize("NFKC") === "fi", "normalize-nfkc-compat");
        check("Å".normalize("NFD").length === 2, "normalize-nfd-ring");
        check("Å".normalize("NFC") === "Å", "normalize-nfc-angstrom");
        check("Ω".normalize("NFKC") === "Ω", "normalize-nfkc-omega");
        rangeError(function() { "x".normalize("bogus"); }, "normalize-invalid-form");
        rangeError(function() { "x".normalize(""); }, "normalize-empty-form");
        typeError(function() { "x".normalize(Symbol("form")); }, "normalize-symbol-form");
        typeError(function() { intrinsics.normalize.call(Symbol("r"), { toString: function() {
            failures.push("normalize-form-after-receiver");
            return "NFC";
        }}); }, "normalize-receiver-before-form");
        var formCalls = 0;
        check("x".normalize({ toString: function() { formCalls++; return "NFC"; } }) === "x" &&
            formCalls === 1, "normalize-form-once");

        var evaluated = false;
        String.prototype.toUpperCase = function() { return "custom"; };
        check("abc".toUpperCase() === "custom", "direct-call-observes-writable-surface");
        Object.defineProperty(String.prototype, "normalize", {
            configurable: true,
            get: function() {
                check(!evaluated, "lookup-before-argument-evaluation");
                return function() { return "getter-selected"; };
            }
        });
        evaluated = false;
        check("abc".normalize((evaluated = true, "NFC")) === "getter-selected" && evaluated,
            "getter-selected-before-arguments");
        Object.defineProperty(String.prototype, "normalize", {
            value: intrinsics.normalize,
            writable: true,
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(String.prototype, "toUpperCase", {
            value: intrinsics.toUpperCase,
            writable: true,
            enumerable: false,
            configurable: true
        });
        check("abc".toUpperCase() === "ABC" && String.prototype.toUpperCase === intrinsics.toUpperCase,
            "surface-restored");

        print(failures.length === 0 ? "string-case-ok" : failures.join(","));
    `;
}

test("String case conversion and normalization share one generic UTF-16 mapping worklist", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-string-case-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/string-case.js#sloppy";
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
                stdout: "string-case-ok\n",
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

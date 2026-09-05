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

        var methodNames = ["toLocaleLowerCase", "toLocaleUpperCase"];
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
        check("surface".toLocaleUpperCase === intrinsics.toLocaleUpperCase &&
            "surface".toLocaleLowerCase.length === 0, "typed-direct-method-value-uses-prototype-surface");

        check(intrinsics.toLocaleUpperCase.call(12) === "12", "toupper-number-receiver");
        check(intrinsics.toLocaleLowerCase.call(true) === "true", "tolower-boolean-receiver");
        check(intrinsics.toLocaleUpperCase.call(["a", "b"]) === "A,B", "toupper-array-receiver");
        check(intrinsics.toLocaleLowerCase.call(new String("AbC")) === "abc", "tolower-boxed-receiver");
        var receiverCalls = 0;
        var ordinaryReceiver = { toString: function() { receiverCalls++; return "AbC"; } };
        check(intrinsics.toLocaleUpperCase.call(ordinaryReceiver) === "ABC" && receiverCalls === 1,
            "ordinary-receiver-once");
        typeError(function() { intrinsics.toLocaleLowerCase.call(undefined); }, "tolower-undefined-receiver");
        typeError(function() { intrinsics.toLocaleUpperCase.call(null); }, "toupper-null-receiver");
        typeError(function() { intrinsics.toLocaleLowerCase.call(Symbol("receiver")); }, "tolower-symbol-receiver");

        var seen = "";
        function mark(label) { seen += label; return label; }
        check("aBc".toLocaleUpperCase(mark("a"), mark("b")) === "ABC" && seen === "ab",
            "toupper-reserved-args-evaluated-ignored");
        seen = "";
        check("aBc".toLocaleLowerCase(mark("c"), mark("d")) === "abc" && seen === "cd",
            "tolower-reserved-args-evaluated-ignored");
        check("aBc".toLocaleUpperCase("tr", { toString: function() { return "x"; } }) === "ABC",
            "toupper-locale-args-ignored");
        check("ABC".toLocaleLowerCase(Symbol("locale"), 12) === "abc",
            "tolower-symbol-reserved-ignored");

        check("aBcXyZ".toLocaleUpperCase() === "ABCXYZ", "toupper-ascii");
        check("ABCXYZ".toLocaleLowerCase() === "abcxyz", "tolower-ascii");
        sameUnits("ß".toLocaleUpperCase(), [0x53, 0x53], "toupper-sharp-s-expands");
        sameUnits("SS".toLocaleLowerCase(), [0x73, 0x73], "tolower-ascii-pair");
        sameUnits("İ".toLocaleLowerCase(), [0x69, 0x307], "tolower-dotted-capital-expands");
        sameUnits("ﬁ".toLocaleUpperCase(), [0x46, 0x49], "toupper-ligature-expands");
        sameUnits("σς".toLocaleUpperCase(), [0x3a3, 0x3a3], "toupper-sigmas");
        check("ΟΔΥΣΣΕΎΣ".toLocaleLowerCase().slice(-1) === "ς", "tolower-final-sigma-context");
        sameUnits("Ὀ".toLocaleLowerCase(), [0x1f40], "tolower-precomposed-greek");
        var deseret = String.fromCodePoint(0x10400);
        sameUnits(deseret.toLocaleLowerCase(), [0xd801, 0xdc28], "tolower-astral-pair");
        sameUnits(String.fromCodePoint(0x10428).toLocaleUpperCase(), [0xd801, 0xdc00],
            "toupper-astral-pair");

        var loneHigh = String.fromCharCode(0xd800);
        var loneLow = String.fromCharCode(0xdc00);
        sameUnits(intrinsics.toLocaleUpperCase.call(loneHigh + "a"), [0xd800, 0x41],
            "toupper-lone-surrogate-preserved");
        sameUnits(intrinsics.toLocaleLowerCase.call("A" + loneLow), [0x61, 0xdc00],
            "tolower-lone-surrogate-preserved");

        var evaluated = false;
        String.prototype.toLocaleUpperCase = function() { return "custom"; };
        check("abc".toLocaleUpperCase() === "custom", "direct-call-observes-writable-surface");
        Object.defineProperty(String.prototype, "toLocaleLowerCase", {
            configurable: true,
            get: function() {
                check(!evaluated, "lookup-before-argument-evaluation");
                return function() { return "getter-selected"; };
            }
        });
        evaluated = false;
        check("abc".toLocaleLowerCase((evaluated = true, "tr")) === "getter-selected" && evaluated,
            "getter-selected-before-arguments");
        Object.defineProperty(String.prototype, "toLocaleLowerCase", {
            value: intrinsics.toLocaleLowerCase,
            writable: true,
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(String.prototype, "toLocaleUpperCase", {
            value: intrinsics.toLocaleUpperCase,
            writable: true,
            enumerable: false,
            configurable: true
        });
        check("abc".toLocaleUpperCase() === "ABC" && String.prototype.toLocaleUpperCase === intrinsics.toLocaleUpperCase,
            "surface-restored");

        print(failures.length === 0 ? "string-locale-case-ok" : failures.join(","));
    `;
}

test("String locale-case conversion shares one generic UTF-16 mapping worklist", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-string-locale-case-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/string-locale-case.js#sloppy";
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
                stdout: "string-locale-case-ok\n",
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

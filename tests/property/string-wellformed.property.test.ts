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

        var methodNames = ["isWellFormed", "toWellFormed"];
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
        check("surface".isWellFormed === intrinsics.isWellFormed &&
            "surface".toWellFormed.length === 0, "typed-direct-method-value-uses-prototype-surface");

        check(intrinsics.isWellFormed.call(12) === true, "iswellformed-number-receiver");
        check(intrinsics.toWellFormed.call(true) === "true", "towellformed-boolean-receiver");
        check(intrinsics.isWellFormed.call(["a", "b"]) === true, "iswellformed-array-receiver");
        check(intrinsics.toWellFormed.call(new String("AbC")) === "AbC", "towellformed-boxed-receiver");
        var receiverCalls = 0;
        var ordinaryReceiver = { toString: function() { receiverCalls++; return "abc"; } };
        check(intrinsics.isWellFormed.call(ordinaryReceiver) === true && receiverCalls === 1,
            "ordinary-receiver-once");
        typeError(function() { intrinsics.isWellFormed.call(undefined); },
            "iswellformed-undefined-receiver");
        typeError(function() { intrinsics.toWellFormed.call(null); },
            "towellformed-null-receiver");
        typeError(function() { intrinsics.isWellFormed.call(Symbol("receiver")); },
            "iswellformed-symbol-receiver");

        var seen = "";
        function mark(label) { seen += label; return label; }
        check("abc".isWellFormed(mark("a"), mark("b")) === true && seen === "ab",
            "iswellformed-extra-args-evaluated-ignored");
        seen = "";
        check("abc".toWellFormed(mark("c")) === "abc" && seen === "c",
            "towellformed-extra-arg-evaluated-ignored");

        check("".isWellFormed() === true, "iswellformed-empty");
        check("abc".isWellFormed() === true, "iswellformed-ascii");
        var face = String.fromCodePoint(0x1f600);
        check(face.isWellFormed() === true, "iswellformed-astral-pair");
        var loneHigh = String.fromCharCode(0xd800);
        var loneLow = String.fromCharCode(0xdc00);
        check(loneHigh.isWellFormed() === false, "iswellformed-lone-high");
        check(loneLow.isWellFormed() === false, "iswellformed-lone-low");
        check((loneHigh + loneHigh).isWellFormed() === false, "iswellformed-split-pair");
        check((loneLow + loneLow).isWellFormed() === false, "iswellformed-low-pair");
        check(("a" + loneHigh + "b").isWellFormed() === false, "iswellformed-embedded-lone");
        check((face + loneLow).isWellFormed() === false, "iswellformed-trailing-lone");

        sameUnits("".toWellFormed(), [], "towellformed-empty");
        sameUnits("abc".toWellFormed(), [0x61, 0x62, 0x63], "towellformed-ascii-identity");
        sameUnits(face.toWellFormed(), [0xd83d, 0xde00], "towellformed-astral-identity");
        sameUnits(loneHigh.toWellFormed(), [0xfffd], "towellformed-lone-high-replaced");
        sameUnits(loneLow.toWellFormed(), [0xfffd], "towellformed-lone-low-replaced");
        sameUnits(("a" + loneHigh + "b").toWellFormed(), [0x61, 0xfffd, 0x62],
            "towellformed-embedded-replaced");
        sameUnits((loneHigh + loneHigh).toWellFormed(), [0xfffd, 0xfffd],
            "towellformed-split-pair-replaced");
        sameUnits((loneHigh + face).toWellFormed(), [0xfffd, 0xd83d, 0xde00],
            "towellformed-leading-lone");
        sameUnits((face + loneHigh).toWellFormed(), [0xd83d, 0xde00, 0xfffd],
            "towellformed-astral-then-lone");

        var evaluated = false;
        String.prototype.isWellFormed = function() { return "custom"; };
        check("abc".isWellFormed() === "custom", "direct-call-observes-writable-surface");
        Object.defineProperty(String.prototype, "toWellFormed", {
            configurable: true,
            get: function() {
                check(!evaluated, "lookup-before-argument-evaluation");
                return function() { return "getter-selected"; };
            }
        });
        evaluated = false;
        check("abc".toWellFormed((evaluated = true, 1)) === "getter-selected" && evaluated,
            "getter-selected-before-arguments");
        Object.defineProperty(String.prototype, "toWellFormed", {
            value: intrinsics.toWellFormed,
            writable: true,
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(String.prototype, "isWellFormed", {
            value: intrinsics.isWellFormed,
            writable: true,
            enumerable: false,
            configurable: true
        });
        check("abc".isWellFormed() === true && String.prototype.isWellFormed === intrinsics.isWellFormed,
            "surface-restored");

        print(failures.length === 0 ? "string-wellformed-ok" : failures.join(","));
    `;
}

test("String wellformedness shares one generic UTF-16 scan worklist", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-string-wellformed-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/string-wellformed.js#sloppy";
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
                stdout: "string-wellformed-ok\n",
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

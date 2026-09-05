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
                failures.push(label + ":length");
                return;
            }
            for (var index = 0; index < expected.length; index++) {
                if (actualUnits[index] !== expected[index]) {
                    failures.push(label + ":unit-" + index);
                    return;
                }
            }
        }

        var methodNames = ["trim", "trimStart", "trimEnd"];
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
        check(String.prototype.trimLeft === intrinsics.trimStart, "trimleft-alias-identity");
        check(String.prototype.trimRight === intrinsics.trimEnd, "trimright-alias-identity");
        check(String.prototype.trimLeft.name === "trimStart", "trimleft-alias-name");
        check((String.prototype.trimRight).name === "trimEnd", "trimright-alias-name");
        var leftDescriptor = Object.getOwnPropertyDescriptor(String.prototype, "trimLeft");
        var rightDescriptor = Object.getOwnPropertyDescriptor(String.prototype, "trimRight");
        check(leftDescriptor.value === intrinsics.trimStart && leftDescriptor.writable &&
            !leftDescriptor.enumerable && leftDescriptor.configurable, "trimleft-alias-descriptor");
        check(rightDescriptor.value === intrinsics.trimEnd && rightDescriptor.writable &&
            !rightDescriptor.enumerable && rightDescriptor.configurable, "trimright-alias-descriptor");
        check("surface".trim === intrinsics.trim && "surface".trim.length === 0,
            "typed-direct-method-value-uses-prototype-surface");

        check(intrinsics.trim.call(12) === "12", "trim-number-receiver");
        check(intrinsics.trimStart.call(true) === "true", "trimstart-boolean-receiver");
        check(intrinsics.trimEnd.call(["a", "b"]) === "a,b", "trimend-array-receiver");
        check(intrinsics.trim.call(new String("  box  ")) === "box", "trim-boxed-receiver");
        var receiverCalls = 0;
        var ordinaryReceiver = { toString: function() { receiverCalls++; return "  xy  "; } };
        check(intrinsics.trimStart.call(ordinaryReceiver) === "xy  " && receiverCalls === 1,
            "ordinary-receiver-once");
        var entryNames = ["trim", "trimStart", "trimEnd", "trimLeft", "trimRight"];
        for (var entryIndex = 0; entryIndex < entryNames.length; entryIndex++) {
            var entry = entryNames[entryIndex] === "trimLeft" ? intrinsics.trimStart :
                entryNames[entryIndex] === "trimRight" ? intrinsics.trimEnd :
                intrinsics[entryNames[entryIndex]];
            typeError(function() { entry.call(undefined); }, entryNames[entryIndex] + ":undefined-receiver");
            typeError(function() { entry.call(null); }, entryNames[entryIndex] + ":null-receiver");
            typeError(function() { entry.call(Symbol("receiver")); }, entryNames[entryIndex] + ":symbol-receiver");
        }

        var seen = "";
        function mark(label) { seen += label; return label; }
        check("  x  ".trim(mark("a"), mark("b")) === "x" && seen === "ab", "trim-extra-args-evaluated-ignored");
        seen = "";
        check("  x  ".trimStart(mark("c")) === "x  " && seen === "c", "trimstart-extra-arg-evaluated-ignored");

        var whites = [0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x20, 0xa0, 0x1680, 0x2000, 0x200a,
            0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff];
        for (var whiteIndex = 0; whiteIndex < whites.length; whiteIndex++) {
            var pad = String.fromCharCode(whites[whiteIndex]);
            check(("  " + pad + "x" + pad + "  ").trim() === "x", "trim-whitespace-" + whiteIndex);
            check((pad + "x").trimStart() === "x", "trimstart-whitespace-" + whiteIndex);
            check(("x" + pad).trimEnd() === "x", "trimend-whitespace-" + whiteIndex);
        }
        var nonWhites = [0x00, 0x01, 0x08, 0x0e, 0x1f, 0x7f];
        for (var nonIndex = 0; nonIndex < nonWhites.length; nonIndex++) {
            var edge = String.fromCharCode(nonWhites[nonIndex]);
            check((edge + "x" + edge).trim() === edge + "x" + edge, "trim-keeps-" + nonIndex);
        }
        check("   ".trim() === "" && "".trim() === "", "trim-all-whitespace-and-empty");
        check("   ".trimStart() === "" && "   ".trimEnd() === "", "trimstart-trimend-all-whitespace");

        var face = String.fromCodePoint(0x1f600);
        var high = String.fromCharCode(0xd83d);
        var low = String.fromCharCode(0xde00);
        var loneHigh = String.fromCharCode(0xd800);
        sameUnits(intrinsics.trim.call("  " + face + "  "), [0xd83d, 0xde00], "trim-scalar-preserved");
        sameUnits(intrinsics.trimStart.call("  " + high + low), [0xd83d, 0xde00],
            "trimstart-explicit-pair-preserved");
        sameUnits(intrinsics.trimEnd.call(loneHigh + "  "), [0xd800], "trimend-lone-surrogate-preserved");
        sameUnits(intrinsics.trim.call(face), [0xd83d, 0xde00], "trim-astral-only-unchanged");

        check(String.prototype.trimLeft.call("  x  ") === "x  ", "trimleft-behaves-as-trimstart");
        check(String.prototype.trimRight.call("  x  ") === "  x", "trimright-behaves-as-trimend");

        var evaluated = false;
        String.prototype.trim = function() { return "custom"; };
        check("  abc  ".trim() === "custom", "direct-call-observes-writable-surface");
        Object.defineProperty(String.prototype, "trim", {
            configurable: true,
            get: function() {
                check(!evaluated, "lookup-before-argument-evaluation");
                return function() { return "getter-selected"; };
            }
        });
        evaluated = false;
        check("  abc  ".trim((evaluated = true, 1)) === "getter-selected" && evaluated,
            "getter-selected-before-arguments");
        Object.defineProperty(String.prototype, "trim", {
            value: intrinsics.trim,
            writable: true,
            enumerable: false,
            configurable: true
        });
        check("  x  ".trim() === "x" && String.prototype.trim === intrinsics.trim, "surface-restored");

        print(failures.length === 0 ? "string-trim-ok" : failures.join(","));
    `;
}

test("String trim shares one generic UTF-16 boundary worklist", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-string-trim-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/string-trim.js#sloppy";
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
                stdout: "string-trim-ok\n",
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

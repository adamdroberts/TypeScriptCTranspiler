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
        function repeatedUnits(filler, count) {
            var result = [];
            for (var repetition = 0; repetition < count; repetition++) {
                for (var index = 0; index < filler.length; index++) result.push(filler[index]);
            }
            return result;
        }
        function paddedUnits(base, filler, target, before) {
            var fillLength = target > base.length ? target - base.length : 0;
            var fill = [];
            for (var index = 0; index < fillLength; index++) fill.push(filler[index % filler.length]);
            return before ? fill.concat(base) : base.concat(fill);
        }

        var methodNames = ["repeat", "padStart", "padEnd"];
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
            check(intrinsic.length === 1 && !lengthDescriptor.writable &&
                !lengthDescriptor.enumerable && lengthDescriptor.configurable,
                methodName + ":length-descriptor");
            typeError(function() { Reflect.construct(intrinsic, []); }, methodName + ":nonconstructor");
            check(!Object.prototype.hasOwnProperty.call(intrinsic, "prototype"),
                methodName + ":no-prototype");
        }
        check("surface".repeat === intrinsics.repeat && "surface".repeat.length === 1,
            "typed-direct-method-value-uses-prototype-surface");

        check(intrinsics.repeat.call(true, 2) === "truetrue", "repeat-boolean-receiver");
        check(intrinsics.padStart.call(12, 4, 0) === "0012", "padstart-number-receiver");
        check(intrinsics.padEnd.call(12n, 4, "-") === "12--", "padend-bigint-receiver");
        check(intrinsics.repeat.call(["a", "b"], 2) === "a,ba,b", "repeat-array-receiver");
        check(intrinsics.padEnd.call(new String("box"), 5, ".") === "box..",
            "padend-boxed-receiver");
        var receiverCalls = 0;
        var ordinaryReceiver = { toString: function() { receiverCalls++; return "xy"; } };
        check(intrinsics.repeat.call(ordinaryReceiver, 2) === "xyxy" && receiverCalls === 1,
            "ordinary-receiver-once");
        for (var receiverMethodIndex = 0; receiverMethodIndex < methodNames.length; receiverMethodIndex++) {
            var receiverMethod = intrinsics[methodNames[receiverMethodIndex]];
            typeError(function() { receiverMethod.call(undefined, 2, "."); },
                methodNames[receiverMethodIndex] + ":undefined-receiver");
            typeError(function() { receiverMethod.call(null, 2, "."); },
                methodNames[receiverMethodIndex] + ":null-receiver");
            typeError(function() { receiverMethod.call(Symbol("receiver"), 2, "."); },
                methodNames[receiverMethodIndex] + ":symbol-receiver");
        }

        check(intrinsics.repeat.call("x") === "", "repeat-omitted-count");
        check(intrinsics.repeat.call("x", undefined) === "", "repeat-undefined-count");
        check(intrinsics.repeat.call("x", NaN) === "", "repeat-nan-count");
        check(intrinsics.repeat.call("x", null) === "", "repeat-null-count");
        check(intrinsics.repeat.call("x", false) === "", "repeat-false-count");
        check(intrinsics.repeat.call("x", true) === "x", "repeat-true-count");
        check(intrinsics.repeat.call("x", "2.9") === "xx", "repeat-string-fraction-count");
        check(intrinsics.repeat.call("x", -0.9) === "", "repeat-negative-fraction-count");
        check(intrinsics.repeat.call("x", [3]) === "xxx", "repeat-array-count");
        var countCalls = 0;
        var countObject = { valueOf: function() { countCalls++; return 2; } };
        check(intrinsics.repeat.call("xy", countObject) === "xyxy" && countCalls === 1,
            "repeat-object-count-once");
        rangeError(function() { intrinsics.repeat.call("x", -1); }, "repeat-negative-range");
        rangeError(function() { intrinsics.repeat.call("x", Infinity); }, "repeat-positive-infinity-range");
        rangeError(function() { intrinsics.repeat.call("", -Infinity); }, "repeat-empty-negative-infinity-range");
        typeError(function() { intrinsics.repeat.call("x", 1n); }, "repeat-bigint-count");
        typeError(function() { intrinsics.repeat.call("x", Symbol("count")); }, "repeat-symbol-count");

        check(intrinsics.padStart.call("xy") === "xy", "padstart-omitted-target");
        check(intrinsics.padEnd.call("xy", undefined) === "xy", "padend-undefined-target");
        check(intrinsics.padStart.call("xy", NaN, ".") === "xy", "padstart-nan-target");
        check(intrinsics.padEnd.call("xy", -1, ".") === "xy", "padend-negative-target");
        check(intrinsics.padStart.call("xy", "5.9", ".") === "...xy", "padstart-string-target");
        check(intrinsics.padEnd.call("xy", [5], ".") === "xy...", "padend-array-target");
        check(intrinsics.padStart.call("xy", 4) === "  xy", "padstart-default-filler");
        check(intrinsics.padEnd.call("xy", 6, null) === "xynull", "padend-null-filler");
        check(intrinsics.padStart.call("xy", 6, true) === "truexy", "padstart-boolean-filler");
        check(intrinsics.padEnd.call("xy", 5, 12n) === "xy121", "padend-bigint-filler");
        check(intrinsics.padStart.call("xy", Infinity, "") === "xy", "padstart-infinity-empty-filler");
        typeError(function() { intrinsics.padStart.call("xy", 4, Symbol("fill")); },
            "padstart-symbol-filler-needed");
        typeError(function() { intrinsics.padEnd.call("xy", 1n, "."); }, "padend-bigint-target");
        typeError(function() { intrinsics.padEnd.call("xy", Symbol("target"), "."); },
            "padend-symbol-target");

        var ordered = [];
        var orderedReceiver = { toString: function() { ordered.push("receiver"); return "x"; } };
        var orderedTarget = { valueOf: function() { ordered.push("target"); return 4; } };
        var orderedFill = { toString: function() { ordered.push("fill"); return "ab"; } };
        check(intrinsics.padStart.call(orderedReceiver, orderedTarget, orderedFill) === "abax" &&
            ordered.join(",") === "receiver,target,fill", "pad-conversion-order-once");
        ordered = [];
        check(intrinsics.repeat.call(orderedReceiver, {
            valueOf: function() { ordered.push("count"); return 2; }
        }) === "xx" && ordered.join(",") === "receiver,count", "repeat-conversion-order-once");
        var skippedFill = false;
        check(intrinsics.padEnd.call("long", 2, {
            toString: function() { skippedFill = true; return "."; }
        }) === "long" && !skippedFill, "pad-skips-filler-conversion-when-long-enough");

        var receiverSentinel = { phase: "receiver" };
        var targetTouched = false;
        try {
            intrinsics.padStart.call({ toString: function() { throw receiverSentinel; } }, {
                valueOf: function() { targetTouched = true; return 4; }
            }, ".");
            failures.push("pad-receiver-abrupt-missing");
        } catch (error) {
            check(error === receiverSentinel && !targetTouched, "pad-receiver-abrupt-order");
        }
        var targetSentinel = { phase: "target" };
        var fillTouched = false;
        try {
            intrinsics.padEnd.call("x", {
                valueOf: function() { throw targetSentinel; }
            }, { toString: function() { fillTouched = true; return "."; } });
            failures.push("pad-target-abrupt-missing");
        } catch (error) {
            check(error === targetSentinel && !fillTouched, "pad-target-abrupt-order");
        }
        var fillSentinel = { phase: "fill" };
        try {
            intrinsics.padStart.call("x", 3, { toString: function() { throw fillSentinel; } });
            failures.push("pad-fill-abrupt-missing");
        } catch (error) {
            check(error === fillSentinel, "pad-fill-abrupt-identity");
        }
        var countSentinel = { phase: "count" };
        try {
            intrinsics.repeat.call("x", { valueOf: function() { throw countSentinel; } });
            failures.push("repeat-count-abrupt-missing");
        } catch (error) {
            check(error === countSentinel, "repeat-count-abrupt-identity");
        }

        var face = String.fromCodePoint(0x1f600);
        var high = String.fromCharCode(0xd83d);
        var low = String.fromCharCode(0xde00);
        var loneHigh = String.fromCharCode(0xd800);
        var faceUnits = [0xd83d, 0xde00];
        sameUnits(intrinsics.repeat.call(face, 3), repeatedUnits(faceUnits, 3),
            "repeat-scalar-code-unit-worklist");
        sameUnits(intrinsics.repeat.call(high + low, 2), repeatedUnits(faceUnits, 2),
            "repeat-explicit-pair-equivalence");
        sameUnits(intrinsics.repeat.call(loneHigh, 2), [0xd800, 0xd800],
            "repeat-lone-surrogate");
        sameUnits(intrinsics.padStart.call("X", 4, face),
            paddedUnits([0x58], faceUnits, 4, true), "padstart-truncates-filler-by-code-unit");
        sameUnits(intrinsics.padEnd.call("X", 4, high + low),
            paddedUnits([0x58], faceUnits, 4, false), "padend-explicit-pair-truncation");

        var evaluated = false;
        String.prototype.padStart = function(length, value) { return this + ":" + length + ":" + value; };
        check("abc".padStart((evaluated = true, 5), "x") === "abc:5:x" && evaluated,
            "direct-call-observes-writable-surface");
        Object.defineProperty(String.prototype, "padStart", {
            configurable: true,
            get: function() {
                check(!evaluated, "lookup-before-argument-evaluation");
                return function() { return "getter-selected"; };
            }
        });
        evaluated = false;
        check("abc".padStart((evaluated = true, 5), "x") === "getter-selected" && evaluated,
            "getter-selected-before-arguments");
        Object.defineProperty(String.prototype, "padStart", {
            value: intrinsics.padStart,
            writable: true,
            enumerable: false,
            configurable: true
        });
        check("x".padStart(3, ".") === "..x" && String.prototype.padStart === intrinsics.padStart,
            "surface-restored");

        print(failures.length === 0 ? "string-fill-ok" : failures.join(","));
    `;
}

test("String repeat and padding share one generic UTF-16 fill worklist", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-string-fill-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/string-fill.js#sloppy";
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
                stdout: "string-fill-ok\n",
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

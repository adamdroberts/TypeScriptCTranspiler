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

        var intrinsic = String.prototype.substr;
        var descriptor = Object.getOwnPropertyDescriptor(String.prototype, "substr");
        var nameDescriptor = Object.getOwnPropertyDescriptor(intrinsic, "name");
        var lengthDescriptor = Object.getOwnPropertyDescriptor(intrinsic, "length");
        check(typeof intrinsic === "function" && intrinsic === String.prototype.substr,
            "surface-stable-callable");
        check(descriptor.value === intrinsic && descriptor.writable && !descriptor.enumerable &&
            descriptor.configurable, "surface-descriptor");
        check(intrinsic.name === "substr" && !nameDescriptor.writable && !nameDescriptor.enumerable &&
            nameDescriptor.configurable, "name-descriptor");
        check(intrinsic.length === 2 && !lengthDescriptor.writable && !lengthDescriptor.enumerable &&
            lengthDescriptor.configurable, "length-descriptor");
        typeError(function() { Reflect.construct(intrinsic, []); }, "nonconstructor");
        check(!Object.prototype.hasOwnProperty.call(intrinsic, "prototype"), "no-prototype");

        var genericCases = [
            [12345, 1, 3, "234"],
            [true, -3, 2, "ru"],
            [12n, 0, 1, "1"],
            [["a", "b"], 1, 1, ","],
            [new String("boxed"), -3, undefined, "xed"]
        ];
        for (var genericIndex = 0; genericIndex < genericCases.length; genericIndex++) {
            var generic = genericCases[genericIndex];
            check(intrinsic.call(generic[0], generic[1], generic[2]) === generic[3],
                "generic-receiver-" + genericIndex);
        }
        var receiverCalls = 0;
        var ordinaryReceiver = { toString: function() { receiverCalls++; return "ordinary"; } };
        check(intrinsic.call(ordinaryReceiver, 2, 4) === "dina" && receiverCalls === 1,
            "ordinary-receiver-once");
        Number.prototype.substr = intrinsic;
        var numericReceiver = 11.001002;
        check(numericReceiver.substr() === "11.001002", "number-prototype-borrowed-direct-call");
        delete Number.prototype.substr;
        Boolean.prototype.substr = intrinsic;
        var booleanReceiver = true;
        check(booleanReceiver.substr(1, 2) === "ru", "boolean-prototype-borrowed-direct-call");
        delete Boolean.prototype.substr;
        typeError(function() { intrinsic.call(undefined, 0); }, "undefined-receiver");
        typeError(function() { intrinsic.call(null, 0); }, "null-receiver");
        typeError(function() { intrinsic.call(Symbol(), 0); }, "symbol-receiver");

        var ranges = [
            [undefined, undefined, "012345"],
            [NaN, undefined, "012345"],
            [2.9, 2.9, "23"],
            [-2.9, undefined, "45"],
            [-Infinity, Infinity, "012345"],
            [Infinity, undefined, ""],
            [-99, 99, "012345"],
            [4, 0, ""],
            [1, -1, ""],
            ["2", "3", "234"],
            [false, true, "0"],
            [4, undefined, "45"],
            [null, 2, "01"],
            [2, null, ""]
        ];
        for (var rangeIndex = 0; rangeIndex < ranges.length; rangeIndex++) {
            var range = ranges[rangeIndex];
            check(intrinsic.call("012345", range[0], range[1]) === range[2],
                "relative-start-length-" + rangeIndex);
        }

        var face = String.fromCodePoint(0x1f600);
        var loneHigh = String.fromCharCode(0xd800);
        var utf16 = "A" + face + "B" + loneHigh + "C";
        check(intrinsic.call(utf16, 1, 1).charCodeAt(0) === 0xd83d,
            "utf16-high-surrogate-range");
        check(intrinsic.call(utf16, 2, 1).charCodeAt(0) === 0xde00,
            "utf16-low-surrogate-range");
        check(intrinsic.call(utf16, 1, 2) === face, "utf16-scalar-range");
        check(intrinsic.call(utf16, -2, 1).charCodeAt(0) === 0xd800,
            "utf16-lone-surrogate-range");

        var order = [];
        var orderedReceiver = { toString: function() { order.push("receiver"); return "abcdef"; } };
        var orderedStart = { valueOf: function() { order.push("start"); return 1; } };
        var orderedLength = { valueOf: function() { order.push("length"); return 3; } };
        check(intrinsic.call(orderedReceiver, orderedStart, orderedLength) === "bcd" &&
            order.join(",") === "receiver,start,length", "coercion-order-once");

        var fallbackOrder = [];
        var fallbackStart = {
            valueOf: function() { fallbackOrder.push("valueOf"); return {}; },
            toString: function() { fallbackOrder.push("toString"); return "2"; }
        };
        check(intrinsic.call("abcd", fallbackStart) === "cd" &&
            fallbackOrder.join(",") === "valueOf,toString", "start-toprimitive-fallback");

        var receiverSentinel = { phase: "receiver" };
        var startTouched = false;
        try {
            intrinsic.call({ toString: function() { throw receiverSentinel; } }, {
                valueOf: function() { startTouched = true; return 0; }
            });
            failures.push("receiver-abrupt-missing");
        } catch (error) {
            check(error === receiverSentinel && !startTouched, "receiver-abrupt-identity-order");
        }
        var startSentinel = { phase: "start" };
        var lengthTouched = false;
        try {
            intrinsic.call("abc", { valueOf: function() { throw startSentinel; } }, {
                valueOf: function() { lengthTouched = true; return 2; }
            });
            failures.push("start-abrupt-missing");
        } catch (error) {
            check(error === startSentinel && !lengthTouched, "start-abrupt-identity-order");
        }
        var lengthSentinel = { phase: "length" };
        try {
            intrinsic.call("abc", 0, { valueOf: function() { throw lengthSentinel; } });
            failures.push("length-abrupt-missing");
        } catch (error) {
            check(error === lengthSentinel, "length-abrupt-identity");
        }
        typeError(function() { intrinsic.call("abc", Symbol()); }, "symbol-start");
        typeError(function() { intrinsic.call("abc", 0, 1n); }, "bigint-length");

        var argumentEvaluated = false;
        String.prototype.substr = function(start, length) {
            return this + ":" + start + ":" + length;
        };
        check("abc".substr((argumentEvaluated = true, 1), 2) === "abc:1:2" && argumentEvaluated,
            "direct-call-observes-writable-surface");
        Object.defineProperty(String.prototype, "substr", {
            configurable: true,
            get: function() {
                check(!argumentEvaluated, "lookup-before-argument-evaluation");
                return function() { return "getter-selected"; };
            }
        });
        argumentEvaluated = false;
        check("abc".substr((argumentEvaluated = true, 1)) === "getter-selected" && argumentEvaluated,
            "getter-selected-before-arguments");
        Object.defineProperty(String.prototype, "substr", {
            value: intrinsic,
            writable: true,
            enumerable: false,
            configurable: true
        });
        check("abc".substr(1) === "bc" && String.prototype.substr === intrinsic,
            "surface-restored");

        print(failures.length === 0 ? "string-substr-ok" : failures.join(","));
    `;
}

test("String.prototype.substr follows one generic UTF-16 relative start/length algorithm", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-string-substr-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/string-substr.js#sloppy";
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
                stdout: "string-substr-ok\n",
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

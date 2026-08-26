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

        var charAt = String.prototype.charAt;
        var charCodeAt = String.prototype.charCodeAt;
        var codePointAt = String.prototype.codePointAt;
        var methods = [
            ["charAt", charAt],
            ["charCodeAt", charCodeAt],
            ["codePointAt", codePointAt]
        ];
        for (var methodIndex = 0; methodIndex < methods.length; methodIndex++) {
            var methodName = methods[methodIndex][0];
            var intrinsic = methods[methodIndex][1];
            var descriptor = Object.getOwnPropertyDescriptor(String.prototype, methodName);
            var nameDescriptor = Object.getOwnPropertyDescriptor(intrinsic, "name");
            var lengthDescriptor = Object.getOwnPropertyDescriptor(intrinsic, "length");
            check(typeof intrinsic === "function" && intrinsic === String.prototype[methodName],
                methodName + ":surface-stable-callable");
            check(descriptor.value === intrinsic && descriptor.writable && !descriptor.enumerable &&
                descriptor.configurable, methodName + ":surface-descriptor");
            check(intrinsic.name === methodName && !nameDescriptor.writable && !nameDescriptor.enumerable &&
                nameDescriptor.configurable, methodName + ":name-descriptor");
            check(intrinsic.length === 1 && !lengthDescriptor.writable && !lengthDescriptor.enumerable &&
                lengthDescriptor.configurable, methodName + ":length-descriptor");
            typeError(function() { Reflect.construct(intrinsic, []); }, methodName + ":nonconstructor");
            check(!Object.prototype.hasOwnProperty.call(intrinsic, "prototype"),
                methodName + ":no-prototype");
            typeError(function() { intrinsic.call(undefined, 0); }, methodName + ":undefined-receiver");
            typeError(function() { intrinsic.call(null, 0); }, methodName + ":null-receiver");
            typeError(function() { intrinsic.call(Symbol(), 0); }, methodName + ":symbol-receiver");
        }

        check(charAt.call(12345, 2) === "3", "charAt:number-receiver");
        check(charAt.call(true, 1) === "r", "charAt:boolean-receiver");
        check(charAt.call(["a", "b"], 1) === ",", "charAt:array-receiver");
        check(charCodeAt.call(12n, 0) === 49, "charCodeAt:bigint-receiver");
        check(charCodeAt.call(new String("box"), 2) === 120, "charCodeAt:boxed-receiver");
        var ordinaryCalls = 0;
        var ordinary = { toString: function() { ordinaryCalls++; return "ordinary"; } };
        check(codePointAt.call(ordinary, 2) === 100 && ordinaryCalls === 1,
            "codePointAt:ordinary-receiver-once");

        Number.prototype.charAt = charAt;
        var numericChar = 12345;
        check(numericChar.charAt(2) === "3", "charAt:number-prototype-borrowed-direct-call");
        delete Number.prototype.charAt;
        Boolean.prototype.charCodeAt = charCodeAt;
        var booleanCode = true;
        check(booleanCode.charCodeAt(1) === 114, "charCodeAt:boolean-prototype-borrowed-direct-call");
        delete Boolean.prototype.charCodeAt;
        Number.prototype.codePointAt = codePointAt;
        var numericPoint = 12;
        check(numericPoint.codePointAt(0) === 49, "codePointAt:number-prototype-borrowed-direct-call");
        delete Number.prototype.codePointAt;

        var indexCases = [undefined, NaN, 1.9, -1, Infinity, "2", false, true, []];
        var charAtExpected = ["A", "A", "B", "", "", "C", "A", "B", "A"];
        var charCodeExpected = [65, 65, 66, NaN, NaN, 67, 65, 66, 65];
        var codePointExpected = [65, 65, 66, undefined, undefined, 67, 65, 66, 65];
        for (var indexCase = 0; indexCase < indexCases.length; indexCase++) {
            var indexValue = indexCases[indexCase];
            check(charAt.call("ABC", indexValue) === charAtExpected[indexCase],
                "charAt:index-partition-" + indexCase);
            var actualCode = charCodeAt.call("ABC", indexValue);
            var expectedCode = charCodeExpected[indexCase];
            check(actualCode === expectedCode || (actualCode !== actualCode && expectedCode !== expectedCode),
                "charCodeAt:index-partition-" + indexCase);
            check(codePointAt.call("ABC", indexValue) === codePointExpected[indexCase],
                "codePointAt:index-partition-" + indexCase);
        }
        check(charAt.call("ABC") === "A" && charCodeAt.call("ABC") === 65 &&
            codePointAt.call("ABC") === 65, "omitted-index-zero");
        typeError(function() { charAt.call("A", Symbol()); }, "charAt:symbol-index");
        typeError(function() { charCodeAt.call("A", 0n); }, "charCodeAt:bigint-index");
        typeError(function() { codePointAt.call("A", Symbol()); }, "codePointAt:symbol-index");

        var face = String.fromCodePoint(0x1f600);
        var loneHigh = String.fromCharCode(0xd800);
        var utf16 = "A" + face + loneHigh + "Z";
        check(charAt.call(utf16, 1).charCodeAt(0) === 0xd83d,
            "charAt:high-surrogate-unit");
        check(charAt.call(utf16, 2).charCodeAt(0) === 0xde00,
            "charAt:low-surrogate-unit");
        check(charCodeAt.call(utf16, 1) === 0xd83d && charCodeAt.call(utf16, 2) === 0xde00,
            "charCodeAt:surrogate-units");
        check(codePointAt.call(utf16, 1) === 0x1f600,
            "codePointAt:surrogate-pair");
        check(codePointAt.call(utf16, 2) === 0xde00,
            "codePointAt:trailing-surrogate-unit");
        check(codePointAt.call(utf16, 3) === 0xd800,
            "codePointAt:lone-surrogate-unit");
        check(codePointAt.call(utf16, 5) === undefined,
            "codePointAt:out-of-range-undefined");

        for (var orderedIndex = 0; orderedIndex < methods.length; orderedIndex++) {
            var orderedName = methods[orderedIndex][0];
            var orderedMethod = methods[orderedIndex][1];
            var order = [];
            var orderedReceiver = {
                toString: function() { order.push("receiver"); return "ABC"; }
            };
            var orderedPosition = {
                valueOf: function() { order.push("position"); return 1; }
            };
            orderedMethod.call(orderedReceiver, orderedPosition);
            check(order.join(",") === "receiver,position",
                orderedName + ":coercion-order-once");

            var receiverSentinel = { method: orderedName, phase: "receiver" };
            var positionTouched = false;
            try {
                orderedMethod.call({ toString: function() { throw receiverSentinel; } }, {
                    valueOf: function() { positionTouched = true; return 0; }
                });
                failures.push(orderedName + ":receiver-abrupt-missing");
            } catch (error) {
                check(error === receiverSentinel && !positionTouched,
                    orderedName + ":receiver-abrupt-identity-order");
            }
            var positionSentinel = { method: orderedName, phase: "position" };
            try {
                orderedMethod.call("ABC", { valueOf: function() { throw positionSentinel; } });
                failures.push(orderedName + ":position-abrupt-missing");
            } catch (error) {
                check(error === positionSentinel, orderedName + ":position-abrupt-identity");
            }
        }

        var argumentEvaluated = false;
        String.prototype.charAt = function(position) { return this + ":" + position; };
        check("abc".charAt((argumentEvaluated = true, 1)) === "abc:1" && argumentEvaluated,
            "charAt:direct-call-observes-writable-surface");
        Object.defineProperty(String.prototype, "charAt", {
            configurable: true,
            get: function() {
                check(!argumentEvaluated, "charAt:lookup-before-argument-evaluation");
                return function() { return "charAt-getter"; };
            }
        });
        argumentEvaluated = false;
        check("abc".charAt((argumentEvaluated = true, 1)) === "charAt-getter" && argumentEvaluated,
            "charAt:getter-selected-before-arguments");
        Object.defineProperty(String.prototype, "charAt", {
            value: charAt, writable: true, enumerable: false, configurable: true
        });

        String.prototype.charCodeAt = function(position) { return 1000 + position; };
        check("abc".charCodeAt((argumentEvaluated = true, 2)) === 1002 && argumentEvaluated,
            "charCodeAt:direct-call-observes-writable-surface");
        Object.defineProperty(String.prototype, "charCodeAt", {
            configurable: true,
            get: function() {
                check(!argumentEvaluated, "charCodeAt:lookup-before-argument-evaluation");
                return function() { return 2000; };
            }
        });
        argumentEvaluated = false;
        check("abc".charCodeAt((argumentEvaluated = true, 1)) === 2000 && argumentEvaluated,
            "charCodeAt:getter-selected-before-arguments");
        Object.defineProperty(String.prototype, "charCodeAt", {
            value: charCodeAt, writable: true, enumerable: false, configurable: true
        });

        String.prototype.codePointAt = function(position) { return 3000 + position; };
        check("abc".codePointAt((argumentEvaluated = true, 2)) === 3002 && argumentEvaluated,
            "codePointAt:direct-call-observes-writable-surface");
        Object.defineProperty(String.prototype, "codePointAt", {
            configurable: true,
            get: function() {
                check(!argumentEvaluated, "codePointAt:lookup-before-argument-evaluation");
                return function() { return 4000; };
            }
        });
        argumentEvaluated = false;
        check("abc".codePointAt((argumentEvaluated = true, 1)) === 4000 && argumentEvaluated,
            "codePointAt:getter-selected-before-arguments");
        Object.defineProperty(String.prototype, "codePointAt", {
            value: codePointAt, writable: true, enumerable: false, configurable: true
        });
        check("abc".charAt(1) === "b" && "abc".charCodeAt(1) === 98 &&
            "abc".codePointAt(1) === 98, "surfaces-restored");

        print(failures.length === 0 ? "string-index-access-ok" : failures.join(","));
    `;
}

test("String indexed access intrinsics share one generic UTF-16 sequence projection", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-string-index-access-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/string-index-access.js#sloppy";
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
                stdout: "string-index-access-ok\n",
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

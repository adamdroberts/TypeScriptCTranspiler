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

        var intrinsic = String.prototype.concat;
        var descriptor = Object.getOwnPropertyDescriptor(String.prototype, "concat");
        var nameDescriptor = Object.getOwnPropertyDescriptor(intrinsic, "name");
        var lengthDescriptor = Object.getOwnPropertyDescriptor(intrinsic, "length");
        check(typeof intrinsic === "function" && intrinsic === String.prototype.concat,
            "surface-stable-callable");
        check(descriptor.value === intrinsic && descriptor.writable && !descriptor.enumerable &&
            descriptor.configurable, "surface-descriptor");
        check(intrinsic.name === "concat" && !nameDescriptor.writable && !nameDescriptor.enumerable &&
            nameDescriptor.configurable, "name-descriptor");
        check(intrinsic.length === 1 && !lengthDescriptor.writable && !lengthDescriptor.enumerable &&
            lengthDescriptor.configurable, "length-descriptor");
        typeError(function() { Reflect.construct(intrinsic, []); }, "nonconstructor");
        check(!Object.prototype.hasOwnProperty.call(intrinsic, "prototype"), "no-prototype");

        var receiverCalls = 0;
        var ordinaryReceiver = {
            toString: function() { receiverCalls++; return "ordinary"; }
        };
        check(intrinsic.call(ordinaryReceiver, ":", true, null, undefined) ===
            "ordinary:truenullundefined" && receiverCalls === 1,
            "ordinary-generic-receiver-and-values");
        check(intrinsic.call(12345, "!") === "12345!", "number-receiver");
        check(intrinsic.call(true, "!") === "true!", "boolean-receiver");
        check(intrinsic.call(12n, "!") === "12!", "bigint-receiver");
        check(intrinsic.call(["a", "b"], "!") === "a,b!", "array-receiver");
        check(intrinsic.call(new String("boxed"), "!") === "boxed!", "boxed-receiver");
        check(intrinsic.call("unchanged") === "unchanged", "zero-arguments");
        typeError(function() { intrinsic.call(undefined, "x"); }, "undefined-receiver");
        typeError(function() { intrinsic.call(null, "x"); }, "null-receiver");
        typeError(function() { intrinsic.call(Symbol("receiver"), "x"); }, "symbol-receiver");
        typeError(function() { intrinsic.call("x", Symbol("argument")); }, "symbol-argument");

        Number.prototype.concat = intrinsic;
        var numericReceiver = 11.001002;
        check(numericReceiver.concat("!") === "11.001002!", "number-borrowed-direct-call");
        delete Number.prototype.concat;
        Boolean.prototype.concat = intrinsic;
        var booleanReceiver = true;
        check(booleanReceiver.concat("!") === "true!", "boolean-borrowed-direct-call");
        delete Boolean.prototype.concat;

        var order = [];
        var orderedReceiver = {
            get concat() {
                order.push("lookup");
                return intrinsic;
            },
            toString: function() {
                order.push("receiver-string");
                return "R";
            }
        };
        function evaluateReceiver() {
            order.push("receiver-expression");
            return orderedReceiver;
        }
        function evaluateArgument(label) {
            order.push(label + "-expression");
            return {
                toString: function() {
                    order.push(label + "-string");
                    return label;
                }
            };
        }
        check(evaluateReceiver().concat(evaluateArgument("A"), evaluateArgument("B")) === "RAB" &&
            order.join(",") ===
                "receiver-expression,lookup,A-expression,B-expression,receiver-string,A-string,B-string",
            "lookup-evaluation-and-coercion-order-once");

        var fallbackOrder = [];
        var fallbackArgument = {
            toString: function() { fallbackOrder.push("toString"); return {}; },
            valueOf: function() { fallbackOrder.push("valueOf"); return 7; }
        };
        check(intrinsic.call("x", fallbackArgument) === "x7" &&
            fallbackOrder.join(",") === "toString,valueOf", "argument-toprimitive-fallback");

        var receiverSentinel = { phase: "receiver" };
        var argumentConversionTouched = false;
        try {
            intrinsic.call({ toString: function() { throw receiverSentinel; } }, {
                toString: function() { argumentConversionTouched = true; return "later"; }
            });
            failures.push("receiver-abrupt-missing");
        } catch (error) {
            check(error === receiverSentinel && !argumentConversionTouched,
                "receiver-abrupt-identity-and-short-circuit");
        }
        var firstSentinel = { phase: "first" };
        var laterConversionTouched = false;
        try {
            intrinsic.call("x", {
                toString: function() { throw firstSentinel; }
            }, {
                toString: function() { laterConversionTouched = true; return "later"; }
            });
            failures.push("argument-abrupt-missing");
        } catch (error) {
            check(error === firstSentinel && !laterConversionTouched,
                "argument-abrupt-identity-and-short-circuit");
        }

        var high = String.fromCharCode(0xd83d);
        var low = String.fromCharCode(0xde00);
        var face = String.fromCodePoint(0x1f600);
        var loneHigh = String.fromCharCode(0xd800);
        var loneLow = String.fromCharCode(0xdc00);
        check(intrinsic.call(high, low) === face, "surrogate-parts-equal-scalar");
        var unpaired = intrinsic.call("A", loneHigh, "B", loneLow, "C");
        check(unpaired.length === 5 && unpaired.charCodeAt(1) === 0xd800 &&
            unpaired.charCodeAt(3) === 0xdc00, "unpaired-surrogates-preserved");

        var unitPlan = [0x41, 0x20ac, 0xd83d, 0xde00, 0xd800, 0x42, 0xdc00];
        var parts = [];
        var expectedUnits = [];
        for (var workIndex = 0; workIndex < unitPlan.length; workIndex++) {
            var unit = unitPlan[workIndex % unitPlan.length];
            parts.push(String.fromCharCode(unit));
            expectedUnits.push(unit);
        }
        var collected = Reflect.apply(intrinsic, "", parts);
        check(collected.length === expectedUnits.length, "canonical-worklist-length");
        for (var unitIndex = 0; unitIndex < expectedUnits.length; unitIndex++) {
            if (collected.charCodeAt(unitIndex) !== expectedUnits[unitIndex]) {
                failures.push("canonical-worklist-unit-" + unitIndex);
                break;
            }
        }

        var evaluated = [];
        String.prototype.concat = function(first, second) {
            return "replacement:" + first + ":" + second;
        };
        function mark(value) { evaluated.push(value); return value; }
        check("abc".concat(mark("x"), mark("y")) === "replacement:x:y" &&
            evaluated.join(",") === "x,y", "direct-call-observes-writable-surface");
        Object.defineProperty(String.prototype, "concat", {
            configurable: true,
            get: function() {
                check(evaluated.length === 0, "lookup-before-argument-evaluation");
                return function() { return "getter-selected"; };
            }
        });
        evaluated = [];
        check("abc".concat(mark("z")) === "getter-selected" &&
            evaluated.join(",") === "z", "getter-selected-before-arguments");
        Object.defineProperty(String.prototype, "concat", {
            value: intrinsic,
            writable: true,
            enumerable: false,
            configurable: true
        });
        check("a".concat("b", "c") === "abc" && String.prototype.concat === intrinsic,
            "surface-restored");

        print(failures.length === 0 ? "string-concat-ok" : failures.join(","));
    `;
}

test("String.prototype.concat follows one generic ordered argument-worklist algorithm", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-string-concat-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/string-concat.js#sloppy";
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
                stdout: "string-concat-ok\n",
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

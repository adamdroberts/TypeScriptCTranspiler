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

        var intrinsic = String.prototype.at;
        check(typeof intrinsic === "function", "surface-callable");
        check(intrinsic === String.prototype.at, "surface-stable-identity");
        var methodDescriptor = Object.getOwnPropertyDescriptor(String.prototype, "at");
        check(methodDescriptor.value === intrinsic && methodDescriptor.writable &&
            !methodDescriptor.enumerable && methodDescriptor.configurable, "surface-descriptor");
        var nameDescriptor = Object.getOwnPropertyDescriptor(intrinsic, "name");
        var lengthDescriptor = Object.getOwnPropertyDescriptor(intrinsic, "length");
        check(intrinsic.name === "at" && !nameDescriptor.writable && !nameDescriptor.enumerable &&
            nameDescriptor.configurable, "name-descriptor");
        check(intrinsic.length === 1 && !lengthDescriptor.writable && !lengthDescriptor.enumerable &&
            lengthDescriptor.configurable, "length-descriptor");

        var face = String.fromCodePoint(0x1f600);
        var loneHigh = String.fromCharCode(0xd800);
        var text = "A" + face + "\u03a9" + loneHigh + "Z";
        var units = [65, 0xd83d, 0xde00, 0x03a9, 0xd800, 90];
        for (var index = 0; index < units.length; index++) {
            var direct = text.at(index);
            var relative = intrinsic.call(text, index - units.length);
            check(direct.charCodeAt(0) === units[index], "direct-unit-" + index);
            check(relative.charCodeAt(0) === units[index], "relative-unit-" + index);
        }
        check(text.at(units.length) === undefined && text.at(-units.length - 1) === undefined,
            "range-undefined");
        check(text.at(Infinity) === undefined && text.at(-Infinity) === undefined,
            "infinity-undefined");
        check(text.at(NaN).charCodeAt(0) === units[0] && text.at().charCodeAt(0) === units[0],
            "nan-and-omitted-zero");
        check(text.at(2.9).charCodeAt(0) === units[2], "positive-fraction-truncation");
        check(text.at(-1.9).charCodeAt(0) === units[units.length - 1],
            "negative-fraction-truncation");

        var indexCalls = 0;
        var indexObject = { valueOf: function() { indexCalls++; return 2; } };
        check(intrinsic.call("012", indexObject) === "2" && indexCalls === 1,
            "index-object-once");
        var coercions = [
            { label: "false", value: false, expected: "0" },
            { label: "null", value: null, expected: "0" },
            { label: "undefined", value: undefined, expected: "0" },
            { label: "empty-string", value: "", expected: "0" },
            { label: "true", value: true, expected: "1" },
            { label: "numeric-string", value: "2", expected: "2" },
            { label: "empty-array", value: [], expected: "0" }
        ];
        for (var coercionIndex = 0; coercionIndex < coercions.length; coercionIndex++) {
            var coercion = coercions[coercionIndex];
            check(intrinsic.call("012", coercion.value) === coercion.expected,
                "index-coercion-" + coercion.label);
        }
        typeError(function() { intrinsic.call("01", Symbol()); }, "symbol-index");
        typeError(function() { intrinsic.call("01", 0n); }, "bigint-index");

        check(intrinsic.call(12345, 2) === "3", "number-receiver");
        check(intrinsic.call(true, 1) === "r", "boolean-receiver");
        check(intrinsic.call(12n, 0) === "1", "bigint-receiver");
        check(intrinsic.call(["a", "b"], 1) === ",", "array-receiver");
        check(intrinsic.call(new String("box"), -1) === "x", "boxed-receiver");
        var receiverCalls = 0;
        var receiverObject = {
            toString: function() { receiverCalls++; return "xy"; }
        };
        check(intrinsic.call(receiverObject, 1) === "y" && receiverCalls === 1,
            "ordinary-receiver-once");
        typeError(function() { intrinsic.call(undefined, 0); }, "undefined-receiver");
        typeError(function() { intrinsic.call(null, 0); }, "null-receiver");
        typeError(function() { intrinsic.call(Symbol(), 0); }, "symbol-receiver");

        var receiverSentinel = { source: "receiver" };
        var receiverOrder = [];
        var indexTouched = false;
        try {
            intrinsic.call({
                toString: function() { receiverOrder.push("receiver"); throw receiverSentinel; }
            }, {
                valueOf: function() { indexTouched = true; receiverOrder.push("index"); return 0; }
            });
            failures.push("receiver-abrupt-missing");
        } catch (error) {
            check(error === receiverSentinel && !indexTouched && receiverOrder.join(",") === "receiver",
                "receiver-abrupt-order-identity");
        }

        var indexSentinel = { source: "index" };
        var indexOrder = [];
        try {
            intrinsic.call({
                toString: function() { indexOrder.push("receiver"); return "ab"; }
            }, {
                valueOf: function() { indexOrder.push("index"); throw indexSentinel; }
            });
            failures.push("index-abrupt-missing");
        } catch (error) {
            check(error === indexSentinel && indexOrder.join(",") === "receiver,index",
                "index-abrupt-order-identity");
        }

        var atArgumentEvaluated = false;
        String.prototype.at = function(index) { return this + ":" + index; };
        check("abc".at((atArgumentEvaluated = true, 1)) === "abc:1" && atArgumentEvaluated,
            "direct-call-observes-writable-surface");
        Object.defineProperty(String.prototype, "at", {
            configurable: true,
            get: function() {
                check(!atArgumentEvaluated, "lookup-before-argument-evaluation");
                return function() { return "getter-selected"; };
            }
        });
        atArgumentEvaluated = false;
        check("abc".at((atArgumentEvaluated = true, 1)) === "getter-selected" && atArgumentEvaluated,
            "getter-selected-before-arguments");
        Object.defineProperty(String.prototype, "at", {
            value: intrinsic,
            writable: true,
            enumerable: false,
            configurable: true
        });
        check(String.prototype.at === intrinsic && "abc".at(1) === "b", "surface-restored");

        print(failures.length === 0 ? "string-at-ok" : failures.join(","));
    `;
}

test("String.prototype.at follows one generic UTF-16 relative-index algorithm", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-string-at-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/string-at.js#sloppy";
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
                stdout: "string-at-ok\n",
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

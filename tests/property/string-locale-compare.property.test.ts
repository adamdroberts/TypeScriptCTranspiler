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
        function isUnit(value) {
            return value === -1 || value === 0 || value === 1;
        }

        var methodName = "localeCompare";
        var intrinsic = String.prototype[methodName];
        var descriptor = Object.getOwnPropertyDescriptor(String.prototype, methodName);
        var nameDescriptor = Object.getOwnPropertyDescriptor(intrinsic, "name");
        var lengthDescriptor = Object.getOwnPropertyDescriptor(intrinsic, "length");
        check(typeof intrinsic === "function" && intrinsic === String.prototype[methodName],
            "surface-stable-callable");
        check(descriptor.value === intrinsic && descriptor.writable && !descriptor.enumerable &&
            descriptor.configurable, "surface-descriptor");
        check(intrinsic.name === methodName && !nameDescriptor.writable &&
            !nameDescriptor.enumerable && nameDescriptor.configurable,
            "name-descriptor");
        check(intrinsic.length === 1 && !lengthDescriptor.writable &&
            !lengthDescriptor.enumerable && lengthDescriptor.configurable,
            "length-descriptor");
        typeError(function() { Reflect.construct(intrinsic, ["x"]); }, "nonconstructor");
        check(!Object.prototype.hasOwnProperty.call(intrinsic, "prototype"),
            "no-prototype");
        check("surface".localeCompare === intrinsic &&
            "surface".localeCompare.length === 1, "typed-direct-method-value-uses-prototype-surface");

        check(intrinsic.call(12, "12") === 0, "compare-number-receiver");
        check(intrinsic.call(true, "true") === 0, "compare-boolean-receiver");
        check(intrinsic.call(["a", "b"], "a,b") === 0, "compare-array-receiver");
        check(intrinsic.call(new String("AbC"), "AbC") === 0, "compare-boxed-receiver");
        var receiverCalls = 0;
        var ordinaryReceiver = { toString: function() { receiverCalls++; return "AbC"; } };
        check(intrinsic.call(ordinaryReceiver, "AbC") === 0 && receiverCalls === 1,
            "ordinary-receiver-once");
        typeError(function() { intrinsic.call(undefined, ""); }, "undefined-receiver");
        typeError(function() { intrinsic.call(null, ""); }, "null-receiver");
        typeError(function() { intrinsic.call(Symbol("receiver"), ""); }, "symbol-receiver");

        var thatCalls = 0;
        var ordinaryThat = { toString: function() { thatCalls++; return "abc"; } };
        check("abc".localeCompare(ordinaryThat) === 0 && thatCalls === 1,
            "that-converted-once");
        typeError(function() { "abc".localeCompare(Symbol("that")); }, "symbol-that");
        check("a".localeCompare() === "a".localeCompare(undefined) &&
            "a".localeCompare(undefined) === "a".localeCompare("undefined"),
            "missing-undefined-string-that-equivalent");
        check("t".localeCompare() === "t".localeCompare(undefined) &&
            "xyz".localeCompare(undefined) === "xyz".localeCompare("undefined"),
            "missing-that-equivalent-more-receivers");

        var seen = "";
        function mark(label) { seen += label; return label; }
        check("abc".localeCompare("abc", mark("a"), mark("b")) === 0 && seen === "ab",
            "reserved-args-evaluated-ignored");
        seen = "";
        var order = "";
        var throwingReceiver = { toString: function() { order += "r"; throw new TypeError("recv"); } };
        var throwingThat = { toString: function() { order += "t"; throw new TypeError("that"); } };
        typeError(function() { intrinsic.call(throwingReceiver, throwingThat); }, "receiver-before-that");
        check(order === "r", "receiver-abrupt-wins");

        check("a".localeCompare("a") === 0, "equal-zero");
        check("a".localeCompare("b") === -1, "primary-less");
        check("b".localeCompare("a") === 1, "primary-greater");
        check("h".localeCompare("H") === -"H".localeCompare("h"), "antisymmetric");
        check("abc".localeCompare("abd") === -"abd".localeCompare("abc"), "antisymmetric-prefix");
        var sameA = "abc".localeCompare("abd");
        var sameB = "abd".localeCompare("abc");
        check(isUnit(sameA) && isUnit(sameB) && sameA === -sameB, "normalized-units");
        check("o\\u0308".localeCompare("\\u00f6") === 0, "canonical-equivalence-precomposed");
        check("\\u00f6".localeCompare("o\\u0308") === 0, "canonical-equivalence-decomposed");
        check("\\u212b".localeCompare("\\u00c5") === 0, "canonical-equivalence-compat");
        check("\\u03a9".localeCompare("\\u2126") === 0, "canonical-equivalence-omega");

        var loneHigh = String.fromCharCode(0xd800);
        check(isUnit(intrinsic.call(loneHigh + "a", loneHigh + "a")), "lone-surrogate-stable");
        check(isUnit("a".localeCompare(loneHigh)), "lone-surrogate-that");

        var evaluated = false;
        String.prototype.localeCompare = function() { return 42; };
        check("abc".localeCompare("abc") === 42, "direct-call-observes-writable-surface");
        Object.defineProperty(String.prototype, "localeCompare", {
            configurable: true,
            get: function() {
                check(!evaluated, "lookup-before-argument-evaluation");
                return function() { return -1; };
            }
        });
        evaluated = false;
        check("abc".localeCompare((evaluated = true, "abc")) === -1 && evaluated,
            "getter-selected-before-arguments");
        Object.defineProperty(String.prototype, "localeCompare", {
            value: intrinsic,
            writable: true,
            enumerable: false,
            configurable: true
        });
        check("abc".localeCompare("abc") === 0 && String.prototype.localeCompare === intrinsic,
            "surface-restored");

        print(failures.length === 0 ? "string-locale-compare-ok" : failures.join(","));
    `;
}

test("String localeCompare shares one generic UTF-16 collation worklist", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-string-locale-compare-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/string-locale-compare.js#sloppy";
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
                stdout: "string-locale-compare-ok\n",
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

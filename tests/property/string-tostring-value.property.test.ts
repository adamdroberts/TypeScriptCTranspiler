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

        var methodNames = ["toString", "valueOf"];
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
        check("surface".toString === intrinsics.toString &&
            "surface".valueOf.length === 0, "typed-direct-method-value-uses-prototype-surface");

        check("".toString() === "" && "".valueOf() === "", "empty-identity");
        check("abc".toString() === "abc" && "abc".valueOf() === "abc", "ascii-identity");
        var face = String.fromCodePoint(0x1f600);
        check(face.toString() === face && face.valueOf() === face, "astral-identity");
        var loneHigh = String.fromCharCode(0xd800);
        check(loneHigh.toString() === loneHigh && loneHigh.valueOf() === loneHigh,
            "lone-surrogate-preserved");
        check(String.prototype.toString() === "" && String.prototype.valueOf() === "",
            "prototype-receiver-uses-string-data");

        var boxed = new String("AbC");
        check(boxed.toString() === "AbC" && boxed.valueOf() === "AbC", "boxed-unwraps");
        check(intrinsics.toString.call(boxed) === "AbC" &&
            intrinsics.valueOf.call(Object("y")) === "y", "generic-boxed-receivers");
        typeError(function() { intrinsics.toString.call(12); }, "tostring-number-receiver");
        typeError(function() { intrinsics.valueOf.call(true); }, "valueof-boolean-receiver");
        typeError(function() { intrinsics.toString.call(["a", "b"]); }, "tostring-array-receiver");
        typeError(function() { intrinsics.valueOf.call({}); }, "valueof-plain-object-receiver");
        typeError(function() { intrinsics.toString.call(undefined); }, "tostring-undefined-receiver");
        typeError(function() { intrinsics.valueOf.call(null); }, "valueof-null-receiver");
        typeError(function() { intrinsics.toString.call(Symbol("receiver")); },
            "tostring-symbol-receiver");

        var seen = "";
        function mark(label) { seen += label; return label; }
        check("abc".toString(mark("a"), mark("b")) === "abc" && seen === "ab",
            "tostring-extra-args-evaluated-ignored");
        seen = "";
        check("abc".valueOf(mark("c")) === "abc" && seen === "c",
            "valueof-extra-arg-evaluated-ignored");

        String.prototype.toString = function() { return "custom"; };
        check("abc".toString() === "custom", "direct-call-observes-writable-surface");
        Object.defineProperty(String.prototype, "valueOf", {
            configurable: true,
            get: function() { return function() { return "getter-selected"; }; }
        });
        check("abc".valueOf() === "getter-selected", "getter-selected-from-surface");
        Object.defineProperty(String.prototype, "valueOf", {
            value: intrinsics.valueOf,
            writable: true,
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(String.prototype, "toString", {
            value: intrinsics.toString,
            writable: true,
            enumerable: false,
            configurable: true
        });
        check("abc".toString() === "abc" && String.prototype.valueOf === intrinsics.valueOf,
            "surface-restored");

        print(failures.length === 0 ? "string-tostring-value-ok" : failures.join(","));
    `;
}

test("String toString and valueOf share one generic thisStringValue worklist", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-string-tostring-value-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/string-tostring-value.js#sloppy";
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
                stdout: "string-tostring-value-ok\n",
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

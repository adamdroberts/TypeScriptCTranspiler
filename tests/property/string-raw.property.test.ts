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

        var descriptor = Object.getOwnPropertyDescriptor(String, "raw");
        var nameDescriptor = Object.getOwnPropertyDescriptor(String.raw, "name");
        var lengthDescriptor = Object.getOwnPropertyDescriptor(String.raw, "length");
        check(typeof String.raw === "function" && String.raw === String.raw, "surface-stable");
        check(descriptor.value === String.raw && descriptor.writable && !descriptor.enumerable &&
            descriptor.configurable, "surface-descriptor");
        check(String.raw.name === "raw" && !nameDescriptor.writable &&
            !nameDescriptor.enumerable && nameDescriptor.configurable, "name-descriptor");
        check(String.raw.length === 1 && !lengthDescriptor.writable &&
            !lengthDescriptor.enumerable && lengthDescriptor.configurable, "length-descriptor");
        typeError(function() { Reflect.construct(String.raw, [[], "x"]); }, "nonconstructor");
        check(!Object.prototype.hasOwnProperty.call(String.raw, "prototype"), "no-prototype");

        check(String.raw({ raw: ["a", "b", "c"] }) === "abc", "segments-only");
        check(String.raw({ raw: ["a", "b", "d", "f"] }, "", "c", "e") === "abcdef",
            "interleaved");
        check(String.raw({ raw: ["a", "b", "d", "f"] }, 1) === "a1bdf",
            "missing-substitutions-skipped");
        check(String.raw({ raw: ["a", "c", "e"] }, "b", "d", "unused") === "abcde",
            "extra-substitutions-ignored");
        check(String.raw({ raw: [] }) === "", "empty-raw");
        check(String.raw({ raw: { length: 0 } }) === "", "zero-length");
        check(String.raw({ raw: { length: 2.9, 0: "a", 1: "b", 2: "c" } }) === "ab",
            "fractional-length-floored");
        check(String.raw({ raw: { length: "2", 0: "a", 1: "b", 2: "c" } }) === "ab",
            "string-length-converted");
        check(String.raw({ raw: { length: -3, 0: "a" } }) === "", "negative-length-empty");
        check(String.raw({ raw: { length: 5, 0: "e", 1: "", 2: null, 3: undefined, 4: 123 } }) ===
            "enullundefined123", "segment-values-coerced");

        typeError(function() { String.raw(null); }, "null-template");
        typeError(function() { String.raw(undefined); }, "undefined-template");
        typeError(function() { String.raw({}); }, "missing-raw");
        typeError(function() { String.raw({ raw: null }); }, "null-raw");
        typeError(function() { String.raw({ raw: undefined }); }, "undefined-raw");
        typeError(function() { String.raw({ raw: { length: Symbol("n") } }); }, "symbol-length");
        typeError(function() { String.raw({ raw: { length: 1, 0: Symbol("s") } }); },
            "symbol-segment");
        var boom = { name: "boom" };
        try {
            String.raw({ get raw() { throw boom; } });
            failures.push("abrupt-raw:missing");
        } catch (error) { check(error === boom, "abrupt-raw-identity"); }
        try {
            String.raw({ raw: { get length() { throw boom; } } });
            failures.push("abrupt-length:missing");
        } catch (error) { check(error === boom, "abrupt-length-identity"); }
        var order = "";
        check(String.raw({
            raw: {
                length: 2,
                get 0() { order += "s0"; return "a"; },
                get 1() { order += "s1"; return "b"; }
            }
        }, { toString: function() { order += "u0"; return "x"; } }) === "axb",
            "order-result");
        check(order === "s0u0s1", "segment-before-substitution");

        check(String.raw\`head\${"mid"}tail\` === "headmidtail", "tagged-basic");
        check(String.raw\`a\\nb\` === "a\\\\nb", "tagged-raw-backslash");
        var tagged = "T";
        check(String.raw\`x\${tagged}y\${1}z\` === "xTy1z", "tagged-interleaved");
        check(String.raw({ raw: ["x", "y", "z"] }, tagged, 1) === "xTy1z",
            "direct-matches-tagged");

        var seen = "";
        function mark(label) { seen += label; return label; }
        check(String.raw({ raw: ["a", "b"] }, mark("s")) === "asb" && seen === "s",
            "extra-args-evaluated");

        var intrinsic = String.raw;
        String.raw = function() { return "custom"; };
        check(String.raw({ raw: ["a"] }) === "custom", "direct-call-observes-writable-surface");
        Object.defineProperty(String, "raw", {
            value: intrinsic,
            writable: true,
            enumerable: false,
            configurable: true
        });
        check(String.raw({ raw: ["a"] }) === "a" && String.raw === intrinsic, "surface-restored");

        print(failures.length === 0 ? "string-raw-ok" : failures.join(","));
    `;
}

test("String raw shares one generic template worklist", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-string-raw-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/string-raw.js#sloppy";
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
                stdout: "string-raw-ok\n",
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

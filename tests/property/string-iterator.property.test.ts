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

        var intrinsic = String.prototype[Symbol.iterator];
        var descriptor = Object.getOwnPropertyDescriptor(String.prototype, Symbol.iterator);
        var nameDescriptor = Object.getOwnPropertyDescriptor(intrinsic, "name");
        var lengthDescriptor = Object.getOwnPropertyDescriptor(intrinsic, "length");
        check(typeof intrinsic === "function" && intrinsic === String.prototype[Symbol.iterator],
            "surface-stable-callable");
        check(descriptor.value === intrinsic && descriptor.writable && !descriptor.enumerable &&
            descriptor.configurable, "surface-descriptor");
        check(intrinsic.name === "[Symbol.iterator]" && !nameDescriptor.writable &&
            !nameDescriptor.enumerable && nameDescriptor.configurable, "name-descriptor");
        check(intrinsic.length === 0 && !lengthDescriptor.writable &&
            !lengthDescriptor.enumerable && lengthDescriptor.configurable, "length-descriptor");
        typeError(function() { Reflect.construct(intrinsic, []); }, "nonconstructor");
        check(!Object.prototype.hasOwnProperty.call(intrinsic, "prototype"), "no-prototype");
        check("surface"[Symbol.iterator] === intrinsic,
            "typed-direct-method-value-uses-prototype-surface");

        function drain(iterator, label) {
            var values = [];
            for (;;) {
                var result = iterator.next();
                check(result !== null && typeof result === "object", label + ":result-object");
                if (result.done) {
                    check(result.value === undefined, label + ":done-value");
                    check(iterator.next().done === true, label + ":done-idempotent");
                    return values;
                }
                values.push(result.value);
            }
        }
        function joined(iterator, label) { return drain(iterator, label).join("|"); }

        check(joined(intrinsic.call(""), "empty") === "", "empty-string");
        check(joined(intrinsic.call("abc"), "ascii") === "a|b|c", "ascii-chars");
        var face = String.fromCodePoint(0x1f600);
        check(joined(intrinsic.call("A" + face + "z"), "mixed") === "A|" + face + "|z",
            "astral-pair-single-char");
        var loneHigh = String.fromCharCode(0xd800);
        var loneLow = String.fromCharCode(0xdc00);
        check(joined(intrinsic.call(loneHigh + "b"), "lone-high") === loneHigh + "|b",
            "lone-high-single-char");
        check(joined(intrinsic.call("a" + loneLow), "lone-low") === "a|" + loneLow,
            "lone-low-single-char");

        check(joined(intrinsic.call(new String("AbC")), "boxed") === "A|b|C", "boxed-receiver");
        check(joined(intrinsic.call(Object("y")), "object-receiver") === "y", "object-coerced");
        check(joined(intrinsic.call(12), "number-receiver") === "1|2", "number-coerced");
        check(joined(intrinsic.call(String.prototype), "prototype-receiver") === "",
            "prototype-empty");
        typeError(function() { intrinsic.call(undefined); }, "undefined-receiver");
        typeError(function() { intrinsic.call(null); }, "null-receiver");
        typeError(function() { intrinsic.call(Symbol("receiver")); }, "symbol-receiver");
        var boom = { name: "boom" };
        try {
            intrinsic.call({ toString: function() { throw boom; } });
            failures.push("abrupt-tostring:missing");
        } catch (error) { check(error === boom, "abrupt-tostring-identity"); }

        var seen = "";
        function mark(label) { seen += label; return label; }
        check(joined(intrinsic.call("ab", mark("a"), mark("b")), "extra-args") === "a|b" &&
            seen === "ab", "extra-args-evaluated-ignored");

        var first = intrinsic.call("xy");
        var second = intrinsic.call("xy");
        check(first !== second, "fresh-iterator-per-call");
        check(first.next().value === "x", "first-advance");
        check(second.next().value === "x" && second.next().value === "y" &&
            second.next().done === true, "second-independent");
        check(first.next().value === "y" && first.next().done === true, "first-independent");

        check(first[Symbol.iterator]() === first, "iterator-self");
        var proto = Object.getPrototypeOf(first);
        check(typeof proto.next === "function", "proto-next-callable");
        typeError(function() { proto.next.call({}); }, "borrowed-next-rejects");

        var spread = [...("p" + face + "q")];
        check(spread.length === 3 && spread[0] === "p" && spread[1] === face && spread[2] === "q",
            "spread-equivalence");
        var iterated = "";
        for (var ch of "r" + face) iterated += ch + ".";
        check(iterated === "r." + face + ".", "forof-equivalence");
        check(Array.from(loneHigh + loneHigh).length === 2, "array-from-equivalence");

        var orderEvaluated = false;
        Object.defineProperty(String.prototype, Symbol.iterator, {
            configurable: true,
            get: function() {
                check(!orderEvaluated, "lookup-before-argument-evaluation");
                return function() { return "getter-selected"; };
            }
        });
        orderEvaluated = false;
        check("abc"[Symbol.iterator]((orderEvaluated = true, 1)) === "getter-selected" &&
            orderEvaluated, "getter-selected-before-arguments");
        Object.defineProperty(String.prototype, Symbol.iterator, {
            value: intrinsic,
            writable: true,
            enumerable: false,
            configurable: true
        });

        var customCalls = 0;
        String.prototype[Symbol.iterator] = function() {
            return { next: function() {
                customCalls++;
                return customCalls > 1
                    ? { value: undefined, done: true }
                    : { value: "C", done: false };
            } };
        };
        var customJoined = Array.from("ab").join("");
        check(customJoined === "C" && customCalls === 2,
            "direct-iteration-observes-writable-surface");
        Object.defineProperty(String.prototype, Symbol.iterator, {
            value: intrinsic,
            writable: true,
            enumerable: false,
            configurable: true
        });
        var restored = Array.from("ab").join("");
        check(restored === "ab" && String.prototype[Symbol.iterator] === intrinsic,
            "surface-restored");

        print(failures.length === 0 ? "string-iterator-ok" : failures.join(","));
    `;
}

test("String iterator shares one generic code-point iteration worklist", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-string-iterator-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/string-iterator.js#sloppy";
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
                stdout: "string-iterator-ok\n",
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

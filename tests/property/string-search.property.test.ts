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

        var methodNames = ["includes", "indexOf", "lastIndexOf", "startsWith", "endsWith"];
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
        check("surface".includes === intrinsics.includes && "surface".includes.length === 1,
            "typed-direct-method-value-uses-prototype-surface");

        check(intrinsics.includes.call(true, "ru"), "includes-boolean-receiver");
        check(intrinsics.indexOf.call(12345, "34") === 2, "indexof-number-receiver");
        check(intrinsics.lastIndexOf.call(12121, "21") === 3, "lastindexof-number-receiver");
        check(intrinsics.startsWith.call(12n, "1"), "startswith-bigint-receiver");
        check(intrinsics.endsWith.call(["a", "b"], "b"), "endswith-array-receiver");
        check(intrinsics.includes.call(new String("boxed"), "oxe"), "boxed-receiver");
        var receiverCalls = 0;
        var ordinaryReceiver = { toString: function() { receiverCalls++; return "ordinary"; } };
        check(intrinsics.indexOf.call(ordinaryReceiver, "dina") === 2 && receiverCalls === 1,
            "ordinary-receiver-once");
        for (var receiverMethodIndex = 0; receiverMethodIndex < methodNames.length; receiverMethodIndex++) {
            var receiverMethod = intrinsics[methodNames[receiverMethodIndex]];
            typeError(function() { receiverMethod.call(undefined, "x"); },
                methodNames[receiverMethodIndex] + ":undefined-receiver");
            typeError(function() { receiverMethod.call(null, "x"); },
                methodNames[receiverMethodIndex] + ":null-receiver");
            typeError(function() { receiverMethod.call(Symbol("receiver"), "x"); },
                methodNames[receiverMethodIndex] + ":symbol-receiver");
            typeError(function() { receiverMethod.call("x", Symbol("search")); },
                methodNames[receiverMethodIndex] + ":symbol-search");
        }

        check(intrinsics.includes.call("undefined") === true, "includes-omitted-search");
        check(intrinsics.indexOf.call("undefined") === 0, "indexof-omitted-search");
        check(intrinsics.lastIndexOf.call("undefined") === 0, "lastindexof-omitted-search");
        check(intrinsics.startsWith.call("undefined") === true, "startswith-omitted-search");
        check(intrinsics.endsWith.call("undefined") === true, "endswith-omitted-search");
        check(intrinsics.includes.call("xnulltrue12a,b", null) &&
            intrinsics.includes.call("xnulltrue12a,b", true) &&
            intrinsics.includes.call("xnulltrue12a,b", 12n) &&
            intrinsics.endsWith.call("xnulltrue12a,b", ["a", "b"]),
            "search-tostring-primitives-and-array");
        var searchCalls = 0;
        var ordinarySearch = { toString: function() { searchCalls++; return "needle"; } };
        check(intrinsics.includes.call("a-needle-z", ordinarySearch) && searchCalls === 1,
            "ordinary-search-once");

        var source = "012012";
        check(intrinsics.includes.call(source, "12", 2.9), "includes-fractional-position");
        check(intrinsics.indexOf.call(source, "12", "2") === 4, "indexof-string-position");
        check(intrinsics.indexOf.call(source, "12", null) === 1, "indexof-null-position");
        check(intrinsics.indexOf.call(source, "12", Infinity) === -1, "indexof-infinite-position");
        check(intrinsics.lastIndexOf.call(source, "12") === 4, "lastindexof-omitted-position");
        check(intrinsics.lastIndexOf.call(source, "12", undefined) === 4,
            "lastindexof-undefined-position");
        check(intrinsics.lastIndexOf.call(source, "12", NaN) === 4,
            "lastindexof-nan-position");
        check(intrinsics.lastIndexOf.call(source, "12", 3.9) === 1,
            "lastindexof-fractional-position");
        check(intrinsics.startsWith.call(source, "12", 1.9), "startswith-fractional-position");
        check(intrinsics.startsWith.call(source, "", Infinity), "startswith-empty-at-end");
        check(intrinsics.endsWith.call(source, "12"), "endswith-omitted-position");
        check(intrinsics.endsWith.call(source, "12", undefined), "endswith-undefined-position");
        check(intrinsics.endsWith.call(source, "12", 3.9), "endswith-fractional-position");
        check(!intrinsics.endsWith.call(source, "12", -Infinity), "endswith-negative-infinity");
        var positionCalls = 0;
        var ordinaryPosition = { valueOf: function() { positionCalls++; return 2; } };
        check(intrinsics.indexOf.call(source, "12", ordinaryPosition) === 4 && positionCalls === 1,
            "ordinary-position-once");
        typeError(function() { intrinsics.indexOf.call(source, "12", 1n); }, "bigint-position");
        typeError(function() { intrinsics.indexOf.call(source, "12", Symbol()); }, "symbol-position");

        var nativeRegExp = /12/;
        typeError(function() { intrinsics.includes.call(source, nativeRegExp); }, "includes-regexp");
        typeError(function() { intrinsics.startsWith.call(source, nativeRegExp); }, "startswith-regexp");
        typeError(function() { intrinsics.endsWith.call(source, nativeRegExp); }, "endswith-regexp");
        var regexpText = String(nativeRegExp);
        check(intrinsics.indexOf.call("x" + regexpText + "x", nativeRegExp) === 1,
            "indexof-regexp-tostring");
        check(intrinsics.lastIndexOf.call(regexpText + regexpText, nativeRegExp) === regexpText.length,
            "lastindexof-regexp-tostring");
        nativeRegExp[Symbol.match] = false;
        check(intrinsics.includes.call("x" + regexpText + "x", nativeRegExp),
            "regexp-match-false-accepted");
        var regexpLike = { toString: function() { return "12"; } };
        regexpLike[Symbol.match] = true;
        typeError(function() { intrinsics.includes.call(source, regexpLike); },
            "ordinary-regexp-like-rejected");

        var ordered = [];
        var orderedReceiver = { toString: function() { ordered.push("receiver"); return source; } };
        var orderedSearch = { toString: function() { ordered.push("search"); return "12"; } };
        Object.defineProperty(orderedSearch, Symbol.match, {
            configurable: true,
            get: function() { ordered.push("match"); return false; }
        });
        var orderedPosition = { valueOf: function() { ordered.push("position"); return 2; } };
        check(intrinsics.includes.call(orderedReceiver, orderedSearch, orderedPosition) &&
            ordered.join(",") === "receiver,match,search,position",
            "regexp-check-and-coercion-order-once");
        ordered = [];
        check(intrinsics.indexOf.call(orderedReceiver, orderedSearch, orderedPosition) === 4 &&
            ordered.join(",") === "receiver,search,position",
            "indexof-skips-regexp-check");

        var receiverSentinel = { phase: "receiver" };
        var matchTouched = false;
        var untouchedSearch = {};
        Object.defineProperty(untouchedSearch, Symbol.match, {
            get: function() { matchTouched = true; return false; }
        });
        try {
            intrinsics.includes.call({ toString: function() { throw receiverSentinel; } }, untouchedSearch);
            failures.push("receiver-abrupt-missing");
        } catch (error) {
            check(error === receiverSentinel && !matchTouched, "receiver-abrupt-identity-order");
        }
        var matchSentinel = { phase: "match" };
        var searchTouched = false;
        var positionTouched = false;
        var abruptMatch = { toString: function() { searchTouched = true; return "12"; } };
        Object.defineProperty(abruptMatch, Symbol.match, {
            get: function() { throw matchSentinel; }
        });
        try {
            intrinsics.startsWith.call(source, abruptMatch, {
                valueOf: function() { positionTouched = true; return 0; }
            });
            failures.push("match-abrupt-missing");
        } catch (error) {
            check(error === matchSentinel && !searchTouched && !positionTouched,
                "match-abrupt-identity-order");
        }
        var searchSentinel = { phase: "search" };
        positionTouched = false;
        try {
            intrinsics.indexOf.call(source, { toString: function() { throw searchSentinel; } }, {
                valueOf: function() { positionTouched = true; return 0; }
            });
            failures.push("search-abrupt-missing");
        } catch (error) {
            check(error === searchSentinel && !positionTouched, "search-abrupt-identity-order");
        }
        var positionSentinel = { phase: "position" };
        try {
            intrinsics.endsWith.call(source, "12", {
                valueOf: function() { throw positionSentinel; }
            });
            failures.push("position-abrupt-missing");
        } catch (error) {
            check(error === positionSentinel, "position-abrupt-identity");
        }

        var face = String.fromCodePoint(0x1f600);
        var high = String.fromCharCode(0xd83d);
        var low = String.fromCharCode(0xde00);
        var loneHigh = String.fromCharCode(0xd800);
        var utf16 = "A" + face + "B" + loneHigh + "C";
        check(intrinsics.indexOf.call(utf16, low) === 2, "utf16-low-surrogate-index");
        check(intrinsics.lastIndexOf.call(utf16, loneHigh) === 4, "utf16-last-high-surrogate");
        check(intrinsics.includes.call(utf16, loneHigh, 3), "utf16-lone-surrogate-includes");
        check(intrinsics.startsWith.call(utf16, high, 1), "utf16-surrogate-startswith");
        check(intrinsics.endsWith.call(utf16, low, 3), "utf16-surrogate-endswith");
        check(intrinsics.includes.call(face, high + low), "utf16-representation-equivalence");

        var evaluated = false;
        String.prototype.includes = function(value) { return this + ":" + value; };
        check("abc".includes((evaluated = true, "x")) === "abc:x" && evaluated,
            "direct-call-observes-writable-surface");
        Object.defineProperty(String.prototype, "includes", {
            configurable: true,
            get: function() {
                check(!evaluated, "lookup-before-argument-evaluation");
                return function() { return "getter-selected"; };
            }
        });
        evaluated = false;
        check("abc".includes((evaluated = true, "a")) === "getter-selected" && evaluated,
            "getter-selected-before-arguments");
        Object.defineProperty(String.prototype, "includes", {
            value: intrinsics.includes,
            writable: true,
            enumerable: false,
            configurable: true
        });
        check("abc".includes("b") && String.prototype.includes === intrinsics.includes,
            "surface-restored");

        print(failures.length === 0 ? "string-search-ok" : failures.join(","));
    `;
}

test("String search intrinsics share one generic UTF-16 matcher and coercion plan", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-string-search-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/string-search.js#sloppy";
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
                stdout: "string-search-ok\n",
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

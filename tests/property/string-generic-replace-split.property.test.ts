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

        var methodNames = ["replace", "replaceAll", "split"];
        var methodLengths = [2, 2, 2];
        for (var methodIndex = 0; methodIndex < methodNames.length; methodIndex++) {
            var methodName = methodNames[methodIndex];
            var intrinsic = Reflect.get(String.prototype, methodName);
            var descriptor = Object.getOwnPropertyDescriptor(String.prototype, methodName);
            var nameDescriptor = Object.getOwnPropertyDescriptor(intrinsic, "name");
            var lengthDescriptor = Object.getOwnPropertyDescriptor(intrinsic, "length");
            check(typeof intrinsic === "function" && intrinsic === Reflect.get(String.prototype, methodName),
                methodName + "-stable-callable");
            check(descriptor.value === intrinsic && descriptor.writable && !descriptor.enumerable &&
                descriptor.configurable, methodName + "-descriptor");
            check(intrinsic.name === methodName && !nameDescriptor.writable && !nameDescriptor.enumerable &&
                nameDescriptor.configurable, methodName + "-name");
            check(intrinsic.length === methodLengths[methodIndex] && !lengthDescriptor.writable &&
                !lengthDescriptor.enumerable && lengthDescriptor.configurable, methodName + "-length");
            typeError(function() { Reflect.construct(intrinsic, []); }, methodName + "-nonconstructor");
            typeError(function() { intrinsic.call(undefined, "x", "y"); }, methodName + "-undefined-this");
            typeError(function() { intrinsic.call(null, "x", "y"); }, methodName + "-null-this");
        }

        var replace = String.prototype.replace;
        var replaceAll = String.prototype.replaceAll;
        var split = String.prototype.split;
        check(replace.call(12345, "3", "X") === "12X45", "replace-number-receiver");
        check(replaceAll.call(true, "r", "R") === "tRue", "replace-all-boolean-receiver");
        var boxedSplit = split.call(new String("a-b-c"), "-");
        check(boxedSplit.length === 3 && boxedSplit.join("|") === "a|b|c", "split-boxed-receiver");
        var omittedSplit = split.call("abc");
        check(omittedSplit.length === 1 && omittedSplit[0] === "abc", "split-omitted-separator");

        var replaceProtocolOrder = [];
        var protocolReceiver = {
            toString: function() { replaceProtocolOrder.push("receiver"); throw new Error("receiver"); }
        };
        var protocolReplacement = { marker: "replacement" };
        var protocolResult = { marker: "result" };
        var replaceCarrier = {};
        Object.defineProperty(replaceCarrier, Symbol.replace, {
            get: function() {
                replaceProtocolOrder.push("get");
                return function(receiver, replacement) {
                    "use strict";
                    replaceProtocolOrder.push("call");
                    check(this === replaceCarrier, "replace-protocol-this");
                    check(receiver === protocolReceiver && replacement === protocolReplacement,
                        "replace-protocol-arguments");
                    return protocolResult;
                };
            }
        });
        check(replace.call(protocolReceiver, replaceCarrier, protocolReplacement) === protocolResult &&
            replaceProtocolOrder.join(",") === "get,call", "replace-protocol-before-tostring");

        var splitProtocolOrder = [];
        var splitCarrier = {};
        splitCarrier[Symbol.split] = function(receiver, limit) {
            "use strict";
            splitProtocolOrder.push("call");
            check(this === splitCarrier && receiver === protocolReceiver && limit === protocolReplacement,
                "split-protocol-arguments");
            return protocolResult;
        };
        check(split.call(protocolReceiver, splitCarrier, protocolReplacement) === protocolResult &&
            splitProtocolOrder.join(",") === "call", "split-protocol-before-tostring");

        var nullReplaceCarrier = {
            toString: function() { return "b"; }
        };
        nullReplaceCarrier[Symbol.replace] = null;
        check(replace.call("abc", nullReplaceCarrier, "X") === "aXc", "replace-null-protocol-fallback");
        var nullSplitCarrier = {
            toString: function() { return "b"; }
        };
        nullSplitCarrier[Symbol.split] = null;
        var nullSplit = split.call("abc", nullSplitCarrier);
        check(nullSplit.length === 2 && nullSplit[0] === "a" && nullSplit[1] === "c",
            "split-null-protocol-fallback");
        var badReplaceCarrier = {};
        badReplaceCarrier[Symbol.replace] = 1;
        typeError(function() { replace.call("abc", badReplaceCarrier, "X"); },
            "replace-noncallable-protocol");
        var badSplitCarrier = {};
        badSplitCarrier[Symbol.split] = 1;
        typeError(function() { split.call("abc", badSplitCarrier); }, "split-noncallable-protocol");

        var protocolSentinel = { marker: "protocol" };
        var poisonedReplaceCarrier = {};
        Object.defineProperty(poisonedReplaceCarrier, Symbol.replace, {
            get: function() { throw protocolSentinel; }
        });
        try { replace.call("abc", poisonedReplaceCarrier, "X"); failures.push("replace-get-abrupt-missing"); }
        catch (error) { check(error === protocolSentinel, "replace-get-abrupt-identity"); }
        var poisonedSplitCarrier = {};
        Object.defineProperty(poisonedSplitCarrier, Symbol.split, {
            get: function() { throw protocolSentinel; }
        });
        try { split.call("abc", poisonedSplitCarrier); failures.push("split-get-abrupt-missing"); }
        catch (error) { check(error === protocolSentinel, "split-get-abrupt-identity"); }

        var replaceOrder = [];
        var orderedReceiver = { toString: function() { replaceOrder.push("receiver"); return "aba"; } };
        var orderedSearch = { toString: function() { replaceOrder.push("search"); return "a"; } };
        var orderedReplacement = { toString: function() { replaceOrder.push("replacement"); return "X"; } };
        check(replace.call(orderedReceiver, orderedSearch, orderedReplacement) === "Xba" &&
            replaceOrder.join(",") === "receiver,search,replacement", "replace-coercion-order");
        replaceOrder.length = 0;
        check(replace.call(orderedReceiver, { toString: function() { replaceOrder.push("search"); return "z"; } },
            orderedReplacement) === "aba" && replaceOrder.join(",") === "receiver,search,replacement",
            "replace-no-match-still-coerces-template");

        var callbackCalls = [];
        var callbackThis = true;
        var callbackResultCoercions = 0;
        var functional = replaceAll.call("a-a", "a", function(match, position, source) {
            "use strict";
            callbackThis = callbackThis && this === undefined;
            callbackCalls.push(match + ":" + position + ":" + source);
            return {
                toString: function() { callbackResultCoercions++; return String(position); }
            };
        });
        check(functional === "0-2" && callbackThis && callbackResultCoercions === 2 &&
            callbackCalls.join("|") === "a:0:a-a|a:2:a-a", "replace-all-functional-worklist");
        var emptyPositions = [];
        check("ab".replaceAll("", function(match, position, source) {
            emptyPositions.push(match + ":" + position + ":" + source);
            return "-";
        }) === "-a-b-" && emptyPositions.join("|") === ":0:ab|:1:ab|:2:ab",
            "replace-all-empty-functional-boundaries");
        var onceCalls = 0;
        check("aaa".replace("a", function(match, position, source) {
            onceCalls++;
            return match + position + source.length;
        }) === "a03aa" && onceCalls === 1, "replace-functional-first-only");
        check("abc".replace("z", function() { failures.push("replace-no-match-callback"); }) === "abc",
            "replace-no-match-callback-skipped");

        var regexLikeOrder = [];
        var regexLike = {};
        regexLike[Symbol.match] = true;
        Object.defineProperty(regexLike, "flags", {
            get: function() { regexLikeOrder.push("flags"); return "g"; }
        });
        Object.defineProperty(regexLike, Symbol.replace, {
            get: function() {
                regexLikeOrder.push("replace");
                return function(receiver, replacement) {
                    regexLikeOrder.push("call");
                    return receiver + replacement;
                };
            }
        });
        check(replaceAll.call("x", regexLike, "y") === "xy" &&
            regexLikeOrder.join(",") === "flags,replace,call", "replace-all-regexp-protocol-order");
        var nonGlobal = {};
        nonGlobal[Symbol.match] = true;
        nonGlobal.flags = "i";
        Object.defineProperty(nonGlobal, Symbol.replace, {
            get: function() { failures.push("replace-all-nonglobal-replacer-touched"); return function() {}; }
        });
        typeError(function() { replaceAll.call("x", nonGlobal, "y"); }, "replace-all-global-required");
        var matchFalse = {};
        matchFalse[Symbol.match] = false;
        Object.defineProperty(matchFalse, "flags", {
            get: function() { failures.push("replace-all-match-false-flags-touched"); return ""; }
        });
        matchFalse[Symbol.replace] = function() { return "match-false"; };
        check(replaceAll.call("x", matchFalse, "y") === "match-false", "replace-all-match-false");

        var splitOrder = [];
        var splitReceiver = { toString: function() { splitOrder.push("receiver"); return "a-b-c"; } };
        var splitLimit = { valueOf: function() { splitOrder.push("limit"); return 2; } };
        var splitSeparator = { toString: function() { splitOrder.push("separator"); return "-"; } };
        var orderedSplit = split.call(splitReceiver, splitSeparator, splitLimit);
        check(orderedSplit.join("|") === "a|b" && splitOrder.join(",") === "receiver,limit,separator",
            "split-coercion-order");
        var zeroSplit = split.call("abc", { toString: function() { return "b"; } }, 0);
        check(zeroSplit.length === 0, "split-zero-limit");
        var wrappedLimit = split.call("a-b-c", "-", { valueOf: function() { return 2 ** 32 + 1; } });
        check(wrappedLimit.length === 1 && wrappedLimit[0] === "a", "split-touint32-modulo");
        var negativeLimit = split.call("a-b-c", "-", -1);
        check(negativeLimit.length === 3, "split-touint32-negative");
        var nanLimit = split.call("a-b-c", "-", NaN);
        check(nanLimit.length === 0, "split-touint32-nan");

        var high = String.fromCharCode(0xd83d);
        var low = String.fromCharCode(0xde00);
        var scalar = String.fromCodePoint(0x1f600);
        var utf16Positions = [];
        var utf16Functional = ("A" + scalar + "B" + high + low + "C").replaceAll(
            high + low,
            function(match, position) { utf16Positions.push(position); return "X"; }
        );
        check(utf16Functional === "AXBXC" && utf16Positions.join(",") === "1,4",
            "replace-all-functional-utf16-positions");

        var lookupOrder = [];
        var originalReplaceDescriptor = Object.getOwnPropertyDescriptor(String.prototype, "replace");
        Object.defineProperty(String.prototype, "replace", {
            configurable: true,
            get: function() { lookupOrder.push("lookup"); return replace; }
        });
        function makeLookupSearch() {
            lookupOrder.push("search-argument");
            return { toString: function() { lookupOrder.push("search-coercion"); return "a"; } };
        }
        function makeLookupReplacement() {
            lookupOrder.push("replacement-argument");
            return { toString: function() { lookupOrder.push("replacement-coercion"); return "X"; } };
        }
        check("aba".replace(makeLookupSearch(), makeLookupReplacement()) === "Xba" &&
            lookupOrder.join(",") ===
                "lookup,search-argument,replacement-argument,search-coercion,replacement-coercion",
            "method-lookup-before-argument-worklist");
        Object.defineProperty(String.prototype, "replace", originalReplaceDescriptor);

        String.prototype.replace = function() { return "changed"; };
        String.prototype.replaceAll = function() { return "changed-all"; };
        String.prototype.split = function() { return ["changed-split"]; };
        check("abc".replace("a", "x") === "changed", "replace-writable");
        check("abc".replaceAll("a", "x") === "changed-all", "replace-all-writable");
        check("abc".split("-")[0] === "changed-split", "split-writable");
        String.prototype.replace = replace;
        String.prototype.replaceAll = replaceAll;
        String.prototype.split = split;
        check("abc".replace("a", "x") === "xbc" && "abc".replaceAll("a", "x") === "xbc" &&
            "a-b".split("-").join("|") === "a|b", "surface-restored");

        print(failures.length === 0 ? "string-generic-replace-split-ok" : failures.join(","));
    `;
}

test("String replace and split use one generic protocol and match worklist", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-string-generic-replace-split-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/string-generic-replace-split.js#sloppy";
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
                stdout: "string-generic-replace-split-ok\n",
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

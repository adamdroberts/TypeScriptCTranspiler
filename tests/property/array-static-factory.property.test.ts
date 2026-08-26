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
        function checkThrows(label, constructor, callback) {
            try { callback(); check(false, label + ":missing"); }
            catch (error) { check(error instanceof constructor, label + ":type"); }
        }

        var iterableTrace = "";
        var iterable = {};
        Object.defineProperty(iterable, Symbol.iterator, {
            configurable: true,
            get: function () {
                iterableTrace += "g";
                return function () {
                    iterableTrace += "i";
                    var index = 0;
                    return {
                        next: function () {
                            iterableTrace += "n";
                            if (index === 2) return { done: true };
                            return { done: false, value: ++index };
                        }
                    };
                };
            }
        });
        function Collector(length) {
            iterableTrace += "c";
            this.argumentCount = arguments.length;
            this.constructedLength = length;
        }
        var mapperThis = { offset: 10 };
        var mapped = Array.from.call(
            Collector,
            iterable,
            function (value, index) {
                iterableTrace += "m" + index;
                return value + this.offset;
            },
            mapperThis
        );
        check(mapped instanceof Collector, "iterable-constructor-prototype");
        check(mapped.argumentCount === 0, "iterable-constructor-arity");
        check(mapped[0] === 11 && mapped[1] === 12 && mapped.length === 2,
            "iterable-result-values");
        check(iterableTrace === "gcinm0nm1n", "iterable-order-and-single-get");
        var firstDescriptor = Object.getOwnPropertyDescriptor(mapped, "0");
        check(firstDescriptor && firstDescriptor.writable && firstDescriptor.enumerable &&
            firstDescriptor.configurable, "iterable-create-data-property");

        var invalidMapperTouchedIterator = false;
        var invalidMapperSource = {};
        Object.defineProperty(invalidMapperSource, Symbol.iterator, {
            get: function () {
                invalidMapperTouchedIterator = true;
                return function () { return { next: function () { return { done: true }; } }; };
            }
        });
        checkThrows("mapper-validation", TypeError, function () {
            Array.from.call(Array, invalidMapperSource, 1);
        });
        check(!invalidMapperTouchedIterator, "mapper-validation-before-iterator");

        var arrayLikeTrace = "";
        var arrayLike = {};
        Object.defineProperty(arrayLike, "length", {
            get: function () { arrayLikeTrace += "l"; return 2; }
        });
        Object.defineProperty(arrayLike, "0", {
            get: function () { arrayLikeTrace += "a"; return "x"; }
        });
        Object.defineProperty(arrayLike, "1", {
            get: function () { arrayLikeTrace += "b"; return "y"; }
        });
        function ArrayLikeCollector(length) {
            arrayLikeTrace += "c" + length;
            this.argumentCount = arguments.length;
            this.constructedLength = length;
        }
        var copied = Array.from.call(ArrayLikeCollector, arrayLike);
        check(copied instanceof ArrayLikeCollector, "array-like-constructor-prototype");
        check(copied.argumentCount === 1 && copied.constructedLength === 2,
            "array-like-constructor-length");
        check(copied[0] === "x" && copied[1] === "y" && copied.length === 2,
            "array-like-result-values");
        check(arrayLikeTrace === "lc2ab", "array-like-order");

        var sparse = [0, , 2];
        check(sparse.length === 3 && !Object.hasOwn(sparse, "1"),
            "array-elision-creates-hole");
        var sparseCopy = Array.from(sparse);
        check(sparseCopy.length === 3 && Object.hasOwn(sparseCopy, "1") &&
            sparseCopy[1] === undefined, "array-iterator-materializes-hole");

        var computedKeyCalls = 0;
        function iteratorKey() {
            computedKeyCalls += 1;
            return Symbol.iterator;
        }
        var computedIterable = {
            [iteratorKey()]() {
                return {
                    done: false,
                    next() {
                        if (this.done) return { done: true };
                        this.done = true;
                        return { done: false, value: "computed" };
                    }
                };
            }
        };
        var computedCopy = Array.from(computedIterable);
        check(computedKeyCalls === 1 && computedCopy.length === 1 &&
            computedCopy[0] === "computed", "computed-iterator-method-key-once");

        function* generatorItems() { yield 2; }
        function ReconfigurableCollector() {
            Object.defineProperty(this, "0", {
                value: 1,
                writable: false,
                enumerable: false,
                configurable: true
            });
        }
        var reconfigured = Array.from.call(ReconfigurableCollector, generatorItems());
        var reconfiguredDescriptor = Object.getOwnPropertyDescriptor(reconfigured, "0");
        check(reconfigured[0] === 2 && reconfigured.length === 1 &&
            reconfiguredDescriptor && reconfiguredDescriptor.writable &&
            reconfiguredDescriptor.enumerable && reconfiguredDescriptor.configurable,
            "generator-create-data-property-reconfigures");

        var fallbackFrom = Array.from.call({}, { 0: "f", length: 1 });
        var fallbackOf = Array.of.call({}, "o", "p");
        check(Array.isArray(fallbackFrom) && fallbackFrom[0] === "f" && fallbackFrom.length === 1,
            "from-nonconstructor-fallback");
        check(Array.isArray(fallbackOf) && fallbackOf[0] === "o" &&
            fallbackOf[1] === "p" && fallbackOf.length === 2,
            "of-nonconstructor-fallback");

        var ofTrace = "";
        function OfCollector(length) {
            ofTrace += "c" + length;
            this.argumentCount = arguments.length;
            this.constructedLength = length;
        }
        var collected = Array.of.call(OfCollector, "a", "b", "c");
        check(collected instanceof OfCollector, "of-constructor-prototype");
        check(collected.argumentCount === 1 && collected.constructedLength === 3,
            "of-constructor-length");
        check(collected[0] === "a" && collected[1] === "b" &&
            collected[2] === "c" && collected.length === 3,
            "of-result-values");
        check(ofTrace === "c3", "of-constructor-once");

        function makeAbruptIterable(nextFailure, closeFailure, counters) {
            var source = {};
            Object.defineProperty(source, Symbol.iterator, {
                value: function () {
                    return {
                        next: function () {
                            counters.next += 1;
                            if (nextFailure) throw nextFailure;
                            return { done: false, value: 1 };
                        },
                        return: function () {
                            counters.close += 1;
                            if (closeFailure) throw closeFailure;
                            return {};
                        }
                    };
                }
            });
            return source;
        }
        var mapperSentinel = {};
        var closeSentinel = {};
        var mapperCounters = { next: 0, close: 0 };
        var mapperExact = false;
        try {
            Array.from.call(
                Array,
                makeAbruptIterable(null, closeSentinel, mapperCounters),
                function () { throw mapperSentinel; }
            );
        } catch (error) { mapperExact = error === mapperSentinel; }
        check(mapperExact && mapperCounters.next === 1 && mapperCounters.close === 1,
            "mapper-abrupt-close-preserves-throw");

        var defineCounters = { next: 0, close: 0 };
        function NonExtensibleResult() { return Object.preventExtensions({}); }
        var defineError;
        try {
            Array.from.call(
                NonExtensibleResult,
                makeAbruptIterable(null, closeSentinel, defineCounters)
            );
        } catch (error) { defineError = error; }
        check(defineError instanceof TypeError && defineError !== closeSentinel &&
            defineCounters.next === 1 && defineCounters.close === 1,
            "define-abrupt-close-preserves-throw");

        var nextSentinel = {};
        var nextCounters = { next: 0, close: 0 };
        var nextExact = false;
        try {
            Array.from.call(Array, makeAbruptIterable(nextSentinel, null, nextCounters));
        } catch (error) { nextExact = error === nextSentinel; }
        check(nextExact && nextCounters.next === 1 && nextCounters.close === 0,
            "next-abrupt-does-not-close");

        checkThrows("from-null", TypeError, function () { Array.from.call(Array, null); });
        checkThrows("from-undefined", TypeError, function () { Array.from.call(Array, undefined); });
        checkThrows("of-define-failure", TypeError, function () {
            Array.of.call(NonExtensibleResult, 1);
        });

        print(failures.length === 0 ? "array-static-factory-ok" : failures.join(","));
    `;
}

test("Array.from and Array.of share a generic constructor and item worklist", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-array-static-factory-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/array-static-factory.js#sloppy";
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
                stdout: "array-static-factory-ok\n",
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

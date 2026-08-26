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
        function checkThrowsExact(label, constructor, callback) {
            try { callback(); check(false, label + ":missing"); }
            catch (error) {
                check(error.constructor === constructor, label + ":constructor:" +
                    (error && error.constructor ? error.constructor.name : typeof error));
            }
        }
        function checkSentinel(label, sentinel, callback) {
            try { callback(); check(false, label + ":missing"); }
            catch (error) { check(error === sentinel, label + ":identity"); }
        }

        var stage = "surface";
        try {
        var originalReflect = Reflect;
        var globalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "Reflect");
        check(typeof Reflect === "object", "reflect-type");
        check(Reflect === globalThis.Reflect, "reflect-global-identity");
        var reflectPrototype = Object.getPrototypeOf(Reflect);
        check(reflectPrototype === Object.prototype, "reflect-prototype:" +
            (reflectPrototype === null ? "null" : Object.prototype.toString.call(reflectPrototype)));
        check(globalDescriptor.value === Reflect && globalDescriptor.writable === true &&
            globalDescriptor.enumerable === false && globalDescriptor.configurable === true,
            "reflect-global-descriptor");
        var reflectTagDescriptor = Object.getOwnPropertyDescriptor(Reflect, Symbol.toStringTag);
        check(reflectTagDescriptor.value === "Reflect" && reflectTagDescriptor.writable === false &&
            reflectTagDescriptor.enumerable === false && reflectTagDescriptor.configurable === true &&
            Object.prototype.toString.call(Reflect) === "[object Reflect]",
            "reflect-tostringtag");
        checkThrowsExact("reflect-call", TypeError, function() { Reflect(); });
        checkThrowsExact("reflect-construct", TypeError, function() { new Reflect(); });

        var constructDescriptor = Object.getOwnPropertyDescriptor(Reflect, "construct");
        var constructLengthDescriptor = Object.getOwnPropertyDescriptor(Reflect.construct, "length");
        var constructNameDescriptor = Object.getOwnPropertyDescriptor(Reflect.construct, "name");
        check(constructDescriptor.value === Reflect.construct && constructDescriptor.writable === true &&
            constructDescriptor.enumerable === false && constructDescriptor.configurable === true,
            "construct-descriptor");
        check(Reflect.construct.name === "construct" && Reflect.construct.length === 2,
            "construct-metadata");
        check(constructLengthDescriptor.writable === false &&
            constructLengthDescriptor.enumerable === false && constructLengthDescriptor.configurable === true,
            "construct-length-descriptor");
        check(constructNameDescriptor.writable === false &&
            constructNameDescriptor.enumerable === false && constructNameDescriptor.configurable === true,
            "construct-name-descriptor");
        checkThrowsExact("construct-method-not-constructor", TypeError, function() {
            new Reflect.construct(function() {}, []);
        });

        var lookupTrace = [];
        Object.defineProperty(Reflect, "construct", {
            configurable: true,
            get: function() {
                lookupTrace.push("get");
                return function(target, list) {
                    lookupTrace.push("call");
                    return { target: target, value: list[0] };
                };
            }
        });
        function lookupTarget() { lookupTrace.push("target"); return function() {}; }
        function lookupList() { lookupTrace.push("list"); return [41]; }
        var lookedUp = Reflect.construct(lookupTarget(), lookupList());
        check(lookupTrace.join("|") === "get|target|list|call", "construct-lookup-order");
        check(lookedUp.value === 41, "construct-lookup-result");
        Object.defineProperty(Reflect, "construct", constructDescriptor);

        stage = "global-replacement";
        var replacementTrace = [];
        globalThis.Reflect = {
            construct: function(target, list) {
                replacementTrace.push("replacement");
                return { target: target, value: list[0] };
            }
        };
        stage = "global-replacement-call";
        var replacementResult;
        try { replacementResult = Reflect.construct(function() {}, [42]); }
        catch (error) {
            failures.push("replacement-call:" +
                (error && error.constructor ? error.constructor.name : typeof error));
        }
        check(replacementTrace.join("") === "replacement" && replacementResult &&
            replacementResult.value === 42, "reflect-global-replacement:" + replacementTrace.join("|"));
        stage = "global-restoration";
        Object.defineProperty(globalThis, "Reflect", globalDescriptor);
        check(Reflect === originalReflect && Reflect.construct === constructDescriptor.value,
            "reflect-global-restoration");

        stage = "ordinary-construction";
        function Target(first, second, third) {
            this.first = first;
            this.second = second;
            this.third = third;
            this.count = arguments.length;
        }
        function Alternate() {}
        Alternate.prototype = { alternate: true };
        var direct = Reflect.construct(Target, [1, 2]);
        var alternate = Reflect.construct(Target, [3, 4, 5], Alternate);
        check(direct instanceof Target && direct.first === 1 && direct.second === 2 &&
            direct.third === undefined && direct.count === 2, "construct-direct");
        check(Object.getPrototypeOf(alternate) === Alternate.prototype && alternate.alternate === true &&
            alternate.first === 3 && alternate.third === 5 && alternate.count === 3,
            "construct-new-target");

        function ObjectResult(value) { this.discarded = true; return { value: value }; }
        function PrimitiveResult(value) { this.value = value; return 17; }
        var objectResult = Reflect.construct(ObjectResult, [6]);
        var primitiveResult = Reflect.construct(PrimitiveResult, [7]);
        check(objectResult.value === 6 && objectResult.discarded === undefined,
            "construct-object-result");
        check(primitiveResult.value === 7 && primitiveResult instanceof PrimitiveResult,
            "construct-primitive-result");

        var Bound = Target.bind(null, "bound");
        var boundResult = Reflect.construct(Bound, ["tail"]);
        check(boundResult instanceof Target && boundResult.first === "bound" &&
            boundResult.second === "tail" && boundResult.count === 2,
            "construct-bound-target");

        stage = "array-like";
        var listTrace = [];
        var arrayLike = {};
        Object.defineProperty(arrayLike, "length", {
            get: function() {
                listTrace.push("length");
                return { valueOf: function() { listTrace.push("coerce"); return 3.9; } };
            }
        });
        Object.defineProperty(arrayLike, "0", {
            get: function() { listTrace.push("zero"); return "a"; }
        });
        Object.defineProperty(arrayLike, "1", {
            get: function() { listTrace.push("one"); return "b"; }
        });
        Object.defineProperty(arrayLike, "2", {
            get: function() { listTrace.push("two"); return "c"; }
        });
        var fromArrayLike = Reflect.construct(Target, arrayLike);
        check(listTrace.join("|") === "length|coerce|zero|one|two",
            "construct-array-like-order");
        check(fromArrayLike.first === "a" && fromArrayLike.third === "c" &&
            fromArrayLike.count === 3, "construct-array-like-values");

        stage = "sparse-array";
        var sparse = [];
        sparse.length = 2;
        sparse[1] = "own";
        var fromSparse = Reflect.construct(Target, sparse);
        check(fromSparse.first === undefined && fromSparse.second === "own" &&
            fromSparse.count === 2, "construct-sparse-get");

        stage = "validation-and-abrupt";
        var listTouched = false;
        var untouchedList = {};
        Object.defineProperty(untouchedList, "length", {
            get: function() { listTouched = true; return 0; }
        });
        checkThrowsExact("construct-invalid-target", TypeError, function() {
            Reflect.construct({}, untouchedList);
        });
        check(listTouched === false, "construct-target-before-list");
        checkThrowsExact("construct-invalid-new-target", TypeError, function() {
            Reflect.construct(Target, untouchedList, {});
        });
        check(listTouched === false, "construct-new-target-before-list");
        checkThrowsExact("construct-primitive-list", TypeError, function() {
            Reflect.construct(Target, "ab");
        });

        var lengthSentinel = {};
        var throwingLength = {};
        Object.defineProperty(throwingLength, "length", {
            get: function() { throw lengthSentinel; }
        });
        checkSentinel("construct-length-abrupt", lengthSentinel, function() {
            Reflect.construct(Target, throwingLength);
        });
        var indexSentinel = {};
        var throwingIndex = { length: 1 };
        Object.defineProperty(throwingIndex, "0", {
            get: function() { throw indexSentinel; }
        });
        checkSentinel("construct-index-abrupt", indexSentinel, function() {
            Reflect.construct(Target, throwingIndex);
        });
        var constructorSentinel = {};
        function ThrowingTarget() { throw constructorSentinel; }
        checkSentinel("construct-target-abrupt", constructorSentinel, function() {
            Reflect.construct(ThrowingTarget, []);
        });

        var revoked = Proxy.revocable(Target, {});
        revoked.revoke();
        var revokedListSentinel = {};
        var revokedList = {};
        Object.defineProperty(revokedList, "length", {
            get: function() { throw revokedListSentinel; }
        });
        checkSentinel("construct-list-before-proxy-revocation", revokedListSentinel, function() {
            Reflect.construct(revoked.proxy, revokedList);
        });

        stage = "proxy-trap";
        var trapRecord = null;
        var constructProxy = new Proxy(Target, {
            construct: function(target, list, newTarget) {
                trapRecord = [target, list, newTarget];
                return { trapped: list.join("|") };
            }
        });
        var trapped = Reflect.construct(constructProxy, { 0: "x", 1: "y", length: 2 }, Alternate);
        check(trapped.trapped === "x|y" && trapRecord[0] === Target &&
            Array.isArray(trapRecord[1]) && trapRecord[2] === Alternate,
            "construct-proxy-list-and-new-target");

        } catch (error) {
            failures.push("uncaught-" + stage + ":" +
                (error && error.constructor ? error.constructor.name : typeof error));
        }

        print(failures.length === 0 ? "reflect-construct-ok" : failures.join(","));
    `;
}

test("Reflect.construct consumes one validated argument-list worklist", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-reflect-construct-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/reflect-construct.js#sloppy";
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
                stdout: "reflect-construct-ok\n",
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

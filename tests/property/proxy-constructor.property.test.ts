import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { hostProtocolVersion, parseHostObservation } from "../test262/protocol";

const expectedLines = [
    "global:function:true:true:false:true",
    "constructor:Proxy:2:false:false:true:false:false:true",
    "revocable:revocable:2:true:false:true:false:false:true",
    "call-without-new:TypeError",
    "validation:TypeError:TypeError:TypeError",
    "target-partitions:object:true:true:13",
    "callable-native-source:true:true",
    "native-source-spellings:function () { [native code] }|function apply() { [native code] }",
    "handler-partitions:true:true",
    "trap-errors:TypeError:TypeError",
    "revocation:true:true:TypeError",
    "new-target-prototype-reads:0:true",
    "method-order:get|first|second:true:true",
    "global-mutation:true:left:right",
    "restored:true:23",
    "argument-worklist:true",
] as const;

function subjectSource(): string {
    const representativeArgumentTail = Array.from(
        { length: 257 },
        (_, index) => String(index),
    ).join(",");
    return `
        (function () {
            function errorName(thunk) {
                try {
                    thunk();
                    return "missing";
                } catch (error) {
                    return error.constructor === TypeError
                        ? "TypeError"
                        : error.constructor.name;
                }
            }

            var globalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "Proxy");
            print("global:" + [
                typeof Proxy,
                Proxy === globalThis.Proxy,
                globalDescriptor.writable,
                globalDescriptor.enumerable,
                globalDescriptor.configurable,
            ].join(":"));

            var lengthDescriptor = Object.getOwnPropertyDescriptor(Proxy, "length");
            var nameDescriptor = Object.getOwnPropertyDescriptor(Proxy, "name");
            print("constructor:" + [
                Proxy.name,
                Proxy.length,
                Object.prototype.hasOwnProperty.call(Proxy, "prototype"),
                "prototype" in Proxy,
                Object.getPrototypeOf(Proxy) === Function.prototype,
                lengthDescriptor.writable,
                lengthDescriptor.enumerable,
                lengthDescriptor.configurable,
            ].join(":"));

            var originalProxy = Proxy;
            var originalRevocableDescriptor =
                Object.getOwnPropertyDescriptor(Proxy, "revocable");
            print("revocable:" + [
                Proxy.revocable.name,
                Proxy.revocable.length,
                Proxy.revocable === Proxy.revocable,
                originalRevocableDescriptor.enumerable,
                originalRevocableDescriptor.configurable,
                Object.getOwnPropertyDescriptor(Proxy.revocable, "length").writable,
                Object.getOwnPropertyDescriptor(Proxy.revocable, "length").enumerable,
                Object.getOwnPropertyDescriptor(Proxy.revocable, "length").configurable,
            ].join(":"));

            print("call-without-new:" + errorName(function () {
                Proxy({}, {});
            }));
            print("validation:" + [
                errorName(function () { return new Proxy(1, {}); }),
                errorName(function () { return new Proxy({}, null); }),
                errorName(function () { return Proxy.revocable({}, 1); }),
            ].join(":"));

            var objectTarget = { value: 13 };
            var objectProxy = new Proxy(objectTarget, {});
            var arrayProxy = new Proxy([], {});
            /** @type {any} */ var Callable = function Callable(value) {
                return value;
            };
            var callableProxy = new Proxy(Callable, {});
            print("target-partitions:" + [
                typeof objectProxy,
                Array.isArray(arrayProxy),
                typeof callableProxy === "function",
                callableProxy(13),
            ].join(":"));
            var callableSource = String(callableProxy);
            var directCallableSource = Function.prototype.toString.call(callableProxy);
            print("callable-native-source:" + [
                callableSource.indexOf("function") === 0 &&
                    callableSource.indexOf("[native code]") > 0,
                directCallableSource.indexOf("function") === 0 &&
                    directCallableSource.indexOf("[native code]") > 0,
            ].join(":"));
            print("native-source-spellings:" + [
                String(new Proxy(function () {}, {})),
                String(new Proxy(function () {}, { apply: function () {} }).apply),
            ].join("|"));

            var arrayHandlerProxy = new Proxy({ value: 17 }, []);
            var functionHandlerProxy = new Proxy({ value: 19 }, function () {});
            print("handler-partitions:" + [
                arrayHandlerProxy.value === 17,
                functionHandlerProxy.value === 19,
            ].join(":"));

            var fixedTarget = {};
            Object.defineProperty(fixedTarget, "fixed", {
                value: 1,
                writable: false,
                configurable: false,
            });
            print("trap-errors:" + [
                errorName(function () {
                    return Reflect.get(new Proxy({}, { get: 1 }), "value");
                }),
                errorName(function () {
                    return new Proxy(fixedTarget, {
                        get: function () { return 2; },
                    }).fixed;
                }),
            ].join(":"));

            var revocable = Proxy.revocable({ value: 21 }, {});
            var revoke = revocable.revoke;
            var beforeRevoke = revocable.proxy.value === 21;
            revoke.call(null);
            revoke();
            print("revocation:" + [
                beforeRevoke,
                revocable.revoke === revoke,
                errorName(function () { return revocable.proxy.value; }),
            ].join(":"));

            var prototypeReads = 0;
            /** @type {any} */ var AlternateNewTarget = function AlternateNewTarget() {};
            var observedNewTarget = new Proxy(AlternateNewTarget, {
                get: function (target, key, receiver) {
                    if (key === "prototype") prototypeReads++;
                    return Reflect.get(target, key, receiver);
                },
            });
            var reflectedProxy = Reflect.construct(
                originalProxy,
                [{ marker: true }, {}],
                observedNewTarget
            );
            print("new-target-prototype-reads:" + [
                prototypeReads,
                reflectedProxy.marker,
            ].join(":"));

            /** @type {any} */ var methodOrder = [];
            Object.defineProperty(Proxy, "revocable", {
                configurable: true,
                get: function () {
                    methodOrder.push("get");
                    return function (first, second) {
                        return { first: first, second: second };
                    };
                },
            });
            var observedCall = Proxy.revocable(
                (function () {
                    methodOrder.push("first");
                    return { label: "first" };
                })(),
                (function () {
                    methodOrder.push("second");
                    return { label: "second" };
                })()
            );
            print("method-order:" + [
                methodOrder.join("|"),
                observedCall.first.label === "first",
                observedCall.second.label === "second",
            ].join(":"));
            Object.defineProperty(Proxy, "revocable", originalRevocableDescriptor);

            /** @type {any} */ var Replacement = function Replacement(target, handler) {
                this.target = target;
                this.handler = handler;
            };
            globalThis.Proxy = Replacement;
            var replacement = new Proxy("left", "right");
            print("global-mutation:" + [
                Proxy === Replacement,
                replacement.target,
                replacement.handler,
            ].join(":"));
            Object.defineProperty(globalThis, "Proxy", globalDescriptor);

            var restored = new Proxy({ value: 23 }, {});
            print("restored:" + [
                Proxy === originalProxy,
                restored.value,
            ].join(":"));

            /** @type {any[]} */ var wideArguments =
                [{ marker: true }, {}, ${representativeArgumentTail}];
            var wideProxy = Reflect.construct(Proxy, wideArguments);
            print("argument-worklist:" + String(wideProxy.marker === true));
        })();
    `;
}

test("Proxy uses one Realm-owned exotic-constructor and argument-worklist path", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-proxy-constructor-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/proxy-constructor.js#sloppy";
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
                stdout: `${expectedLines.join("\n")}\n`,
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

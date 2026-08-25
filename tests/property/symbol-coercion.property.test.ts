import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { hostProtocolVersion, parseHostObservation } from "../test262/protocol";

const wellKnownSymbolNames = [
    "asyncIterator",
    "asyncDispose",
    "dispose",
    "hasInstance",
    "isConcatSpreadable",
    "iterator",
    "match",
    "matchAll",
    "replace",
    "search",
    "species",
    "split",
    "toPrimitive",
    "toStringTag",
    "unscopables",
] as const;

function subjectSource(): string {
    return `
        (function () {
            var wellKnownNames = ${JSON.stringify(wellKnownSymbolNames)};
            var wellKnownValues = [];
            for (var index = 0; index < wellKnownNames.length; index++) {
                var name = wellKnownNames[index];
                var symbol = Symbol[name];
                var descriptor = Object.getOwnPropertyDescriptor(Symbol, name);
                print([
                    "well-known",
                    name,
                    typeof symbol,
                    symbol.description,
                    String(symbol),
                    descriptor.value === symbol,
                    descriptor.writable,
                    descriptor.enumerable,
                    descriptor.configurable,
                ].join(":"));
                wellKnownValues.push(symbol);
            }
            print("well-known-identity:" + String(new Set(wellKnownValues).size === wellKnownNames.length));

            /** @type {any} */ var defaultReceiver = {
                [Symbol.toPrimitive]: function (hint) { return hint === "default" ? 4 : 40; },
            };
            print("hint-default:" + String(defaultReceiver + 1));
            /** @type {any} */ var numberReceiver = {
                [Symbol.toPrimitive]: function (hint) { return hint === "number" ? 5 : 50; },
            };
            print("hint-number:" + String(+numberReceiver));
            /** @type {any} */ var stringReceiver = {
                [Symbol.toPrimitive]: function (hint) { return hint; },
            };
            print("hint-string:" + String(stringReceiver));

            /** @type {any} */ var propertyKey = {
                [Symbol.toPrimitive]: function (hint) {
                    return hint === "string" ? "selected" : "wrong";
                },
            };
            var keyed = { selected: 7 };
            print("property-key-string:" + String(keyed[propertyKey]));

            /** @type {any} */ var symbolKey = {
                [Symbol.toPrimitive]: function (hint) {
                    return hint === "string" ? Symbol.iterator : Symbol.toPrimitive;
                },
            };
            var symbolKeyed = { [Symbol.iterator]: 8 };
            print("property-key-symbol:" + String(symbolKeyed[symbolKey]));

            function errorName(thunk) {
                try { thunk(); return "missing"; }
                catch (error) { return error.constructor === TypeError ? "TypeError" : error.constructor.name; }
            }
            print("noncallable-exotic:" + errorName(function () {
                return +({ [Symbol.toPrimitive]: 1 });
            }));
            print("object-exotic-result:" + errorName(function () {
                return +({ [Symbol.toPrimitive]: function () { return {}; } });
            }));
            var sentinel = {};
            var caught;
            try {
                String({ [Symbol.toPrimitive]: function () { throw sentinel; } });
            } catch (error) {
                caught = error;
            }
            print("abrupt-identity:" + String(caught === sentinel));

            /** @type {any} */ var ordinary = {
                [Symbol.toPrimitive]: undefined,
                valueOf: function () { return 9; },
                toString: function () { return "ten"; },
            };
            print("ordinary-default:" + String(ordinary + 1));
            print("ordinary-number:" + String(+ordinary));
            print("ordinary-string:" + String(ordinary));

            var computedKey = Symbol.toPrimitive;
            var computedTarget = {};
            computedTarget[computedKey] = "retained";
            var computedDescriptor = Object.getOwnPropertyDescriptor(computedTarget, computedKey);
            print("computed-symbol:" + [
                computedTarget[computedKey],
                computedKey in computedTarget,
                Object.prototype.hasOwnProperty.call(computedTarget, computedKey),
                Object.prototype.propertyIsEnumerable.call(computedTarget, computedKey),
                computedDescriptor.value,
                computedDescriptor.writable,
                computedDescriptor.enumerable,
                computedDescriptor.configurable,
            ].join(":"));
            print("computed-delete:" + String(delete computedTarget[computedKey]) + ":" +
                String(Object.prototype.hasOwnProperty.call(computedTarget, computedKey)));

            var firstCustom = Symbol("same");
            var secondCustom = Symbol("same");
            var legacyLookingKey = "__tsc_symbol_iterator";
            var customTarget = { text: 1 };
            customTarget[firstCustom] = "first";
            customTarget[secondCustom] = "second";
            customTarget[""] = "empty";
            customTarget[legacyLookingKey] = "legacy";
            var firstCustomDescriptor = Object.getOwnPropertyDescriptor(customTarget, firstCustom);
            print("custom-identity:" + [
                firstCustom !== secondCustom,
                customTarget[firstCustom],
                customTarget[secondCustom],
                customTarget[""],
                customTarget[legacyLookingKey],
                firstCustom in customTarget,
                Object.prototype.hasOwnProperty.call(customTarget, secondCustom),
                Object.prototype.propertyIsEnumerable.call(customTarget, firstCustom),
                firstCustomDescriptor.value,
            ].join(":"));
            var customSymbols = Object.getOwnPropertySymbols(customTarget);
            print("custom-symbols:" + [
                customSymbols.length,
                customSymbols[0] === firstCustom,
                customSymbols[1] === secondCustom,
            ].join(":"));
            var customOwnKeys = Reflect.ownKeys(customTarget);
            print("custom-own-key-order:" + [
                customOwnKeys.length,
                customOwnKeys[0] === "text",
                customOwnKeys[1] === "",
                customOwnKeys[2] === legacyLookingKey,
                customOwnKeys[3] === firstCustom,
                customOwnKeys[4] === secondCustom,
                Object.keys(customTarget).join("|"),
            ].join(":"));

            var reflectedKey = Symbol("reflected");
            var reflectedTarget = {};
            Object.defineProperty(reflectedTarget, reflectedKey, {
                get: function () { return this.marker; },
                set: function (value) { this.received = value; },
                enumerable: true,
                configurable: true,
            });
            var reflectedReceiver = { marker: 13 };
            var reflectedGet = Reflect.get(reflectedTarget, reflectedKey, reflectedReceiver);
            var reflectedSet = Reflect.set(reflectedTarget, reflectedKey, 14, reflectedReceiver);
            var reflectedHas = Reflect.has(reflectedTarget, reflectedKey);
            var reflectedDelete = Reflect.deleteProperty(reflectedTarget, reflectedKey);
            print("custom-reflect:" + [
                reflectedGet,
                reflectedSet,
                reflectedReceiver.received,
                reflectedHas,
                reflectedDelete,
                Reflect.has(reflectedTarget, reflectedKey),
            ].join(":"));

            var definedKey = Symbol("defined");
            var descriptorMap = {};
            descriptorMap[definedKey] = {
                value: 15,
                writable: true,
                enumerable: true,
                configurable: true,
            };
            var definedTarget = {};
            Object.defineProperties(definedTarget, descriptorMap);
            var definedDescriptors = Object.getOwnPropertyDescriptors(definedTarget);
            var assignedTarget = Object.assign({}, customTarget);
            var assignedSymbols = Object.getOwnPropertySymbols(assignedTarget);
            print("custom-copy-descriptors:" + [
                definedTarget[definedKey],
                definedDescriptors[definedKey].value,
                assignedTarget[firstCustom],
                assignedTarget[secondCustom],
                assignedSymbols[0] === firstCustom,
                assignedSymbols[1] === secondCustom,
            ].join(":"));

            var proxyKey = Symbol("proxy");
            /** @type {any} */ var proxyTarget = {};
            Object.defineProperty(proxyTarget, proxyKey, {
                value: 17,
                writable: true,
                enumerable: true,
                configurable: false,
            });
            /** @type {any} */ var proxyLog = [];
            /** @type {any} */ var symbolProxy = new Proxy(proxyTarget, {
                ownKeys: function () {
                    proxyLog.push("ownKeys");
                    return [proxyKey];
                },
                getOwnPropertyDescriptor: function (target, key) {
                    proxyLog.push("descriptor:" + String(key === proxyKey));
                    return Reflect.getOwnPropertyDescriptor(target, key);
                },
                get: function (target, key, receiver) {
                    proxyLog.push("get:" + String(key === proxyKey));
                    return Reflect.get(target, key, receiver);
                },
            });
            var proxyOwnKeys = Reflect.ownKeys(symbolProxy);
            var proxySymbols = Object.getOwnPropertySymbols(symbolProxy);
            print("proxy-symbol-ownkeys:" + [
                proxyOwnKeys.length,
                proxyOwnKeys[0] === proxyKey,
                proxySymbols.length,
                proxySymbols[0] === proxyKey,
                proxyLog.join("|"),
            ].join(":"));
            proxyLog.length = 0;
            print("proxy-symbol-string-projection:" + [
                Object.keys(symbolProxy).length,
                proxyLog.join("|"),
            ].join(":"));
            proxyLog.length = 0;
            var proxyAssigned = Object.assign({}, symbolProxy);
            print("proxy-symbol-assign:" + [
                proxyAssigned[proxyKey],
                proxyLog.join("|"),
            ].join(":"));
            proxyLog.length = 0;
            var proxyDescriptors = Object.getOwnPropertyDescriptors(symbolProxy);
            print("proxy-symbol-descriptors:" + [
                proxyDescriptors[proxyKey].value,
                proxyLog.join("|"),
            ].join(":"));
            print("proxy-symbol-invariants:" + [
                errorName(function () {
                    return Reflect.ownKeys(new Proxy({}, {
                        ownKeys: function () { return [proxyKey, proxyKey]; },
                    }));
                }),
                errorName(function () {
                    return Reflect.ownKeys(new Proxy(proxyTarget, {
                        ownKeys: function () { return []; },
                    }));
                }),
            ].join(":"));

            var stressTarget = {};
            var stressSymbols = [];
            for (var stressIndex = 0; stressIndex < 257; stressIndex++) {
                var stressSymbol = Symbol(String(stressIndex));
                stressSymbols.push(stressSymbol);
                stressTarget[stressSymbol] = stressIndex;
            }
            var stressObserved = Object.getOwnPropertySymbols(stressTarget);
            var stressValid = stressObserved.length === stressSymbols.length;
            for (var stressCheck = 0; stressCheck < stressSymbols.length; stressCheck++) {
                stressValid = stressValid &&
                    stressObserved[stressCheck] === stressSymbols[stressCheck] &&
                    stressTarget[stressSymbols[stressCheck]] === stressCheck;
            }
            print("custom-symbol-worklist:" + String(stressValid));

            var toPrimitiveDescriptor = Object.getOwnPropertyDescriptor(Symbol.prototype, Symbol.toPrimitive);
            var descriptionDescriptor = Object.getOwnPropertyDescriptor(Symbol.prototype, "description");
            print("prototype-intrinsics:" + [
                toPrimitiveDescriptor.value.name,
                toPrimitiveDescriptor.value.length,
                toPrimitiveDescriptor.writable,
                toPrimitiveDescriptor.enumerable,
                toPrimitiveDescriptor.configurable,
                typeof descriptionDescriptor.get,
                descriptionDescriptor.get.name,
                descriptionDescriptor.set,
                descriptionDescriptor.enumerable,
                descriptionDescriptor.configurable,
                Symbol("described").description,
                Symbol().description === undefined,
                Object(Symbol.iterator)[Symbol.toPrimitive]() === Symbol.iterator,
                Symbol.prototype[Symbol.toStringTag],
            ].join(":"));
        })();
    `;
}

function expectedOutput(): string {
    const lines = wellKnownSymbolNames.map((name) =>
        [
            "well-known",
            name,
            "symbol",
            `Symbol.${name}`,
            `Symbol(Symbol.${name})`,
            "true",
            "false",
            "false",
            "false",
        ].join(":"),
    );
    lines.push(
        "well-known-identity:true",
        "hint-default:5",
        "hint-number:5",
        "hint-string:string",
        "property-key-string:7",
        "property-key-symbol:8",
        "noncallable-exotic:TypeError",
        "object-exotic-result:TypeError",
        "abrupt-identity:true",
        "ordinary-default:10",
        "ordinary-number:9",
        "ordinary-string:ten",
        "computed-symbol:retained:true:true:true:retained:true:true:true",
        "computed-delete:true:false",
        "custom-identity:true:first:second:empty:legacy:true:true:true:first",
        "custom-symbols:2:true:true",
        "custom-own-key-order:5:true:true:true:true:true:text||__tsc_symbol_iterator",
        "custom-reflect:13:true:14:true:true:false",
        "custom-copy-descriptors:15:15:first:second:true:true",
        "proxy-symbol-ownkeys:1:true:1:true:ownKeys|ownKeys",
        "proxy-symbol-string-projection:0:ownKeys",
        "proxy-symbol-assign:17:ownKeys|descriptor:true|get:true",
        "proxy-symbol-descriptors:17:ownKeys|descriptor:true",
        "proxy-symbol-invariants:TypeError:TypeError",
        "custom-symbol-worklist:true",
        "prototype-intrinsics:[Symbol.toPrimitive]:1:false:false:true:function:get description::false:true:described:true:true:Symbol",
    );
    return `${lines.join("\n")}\n`;
}

test("Symbols and ToPrimitive share canonical identity-bearing property-key semantics", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-symbol-coercion-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/symbol-coercion.js#sloppy";
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
                stdout: expectedOutput(),
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

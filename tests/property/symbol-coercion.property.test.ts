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
        "prototype-intrinsics:[Symbol.toPrimitive]:1:false:false:true:function:get description::false:true:described:true:true:Symbol",
    );
    return `${lines.join("\n")}\n`;
}

test("well-known Symbols and ToPrimitive share canonical property-key semantics", async () => {
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

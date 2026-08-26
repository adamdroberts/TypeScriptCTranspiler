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

        var face = String.fromCodePoint(0x1f600);
        var high = String.fromCharCode(0xd800);
        var low = String.fromCharCode(0xdc00);
        var cases = [
            { label: "empty", text: "", units: [] },
            { label: "ascii", text: "ABC", units: [65, 66, 67] },
            { label: "bmp", text: "A\\u03a9Z", units: [65, 0x03a9, 90] },
            { label: "astral", text: face, units: [0xd83d, 0xde00] },
            { label: "high", text: high, units: [0xd800] },
            { label: "low", text: low, units: [0xdc00] },
            {
                label: "mixed",
                text: "A" + face + "\\u03a9" + high + "Z",
                units: [65, 0xd83d, 0xde00, 0x03a9, 0xd800, 90]
            }
        ];

        for (var caseIndex = 0; caseIndex < cases.length; caseIndex++) {
            var current = cases[caseIndex];
            var text = current.text;
            var units = current.units;
            var dynamicText = Reflect.get({ value: text }, "value");
            check(text.length === units.length, current.label + ":typed-length");
            check(dynamicText.length === units.length, current.label + ":dynamic-length");
            for (var index = 0; index < units.length; index++) {
                check(text[index].charCodeAt(0) === units[index], current.label + ":typed-index-" + index);
                check(dynamicText[index].charCodeAt(0) === units[index], current.label + ":dynamic-index-" + index);
                check(text.charAt(index).charCodeAt(0) === units[index], current.label + ":char-at-" + index);
                check(text.at(index).charCodeAt(0) === units[index], current.label + ":at-" + index);
                check(text.at(index - units.length).charCodeAt(0) === units[index], current.label + ":relative-at-" + index);
            }
            check(text[units.length] === undefined, current.label + ":typed-absent");
            check(dynamicText[units.length] === undefined, current.label + ":dynamic-absent");
            check(text.charAt(units.length) === "", current.label + ":char-at-absent");
            check(text.at(units.length) === undefined, current.label + ":at-absent");
        }

        var text = cases[cases.length - 1].text;
        var units = cases[cases.length - 1].units;
        var boxed = new String(text);
        var objectBoxed = Object(text);
        check(boxed.length === units.length && objectBoxed.length === units.length, "boxed-length");
        check(Object.getPrototypeOf(boxed) === String.prototype, "boxed-prototype");
        check(String.prototype.length === 0, "prototype-length");
        var prototypeLength = Object.getOwnPropertyDescriptor(String.prototype, "length");
        check(prototypeLength.value === 0 && !prototypeLength.writable && !prototypeLength.enumerable &&
            !prototypeLength.configurable, "prototype-length-descriptor");

        var lengthDescriptor = Object.getOwnPropertyDescriptor(boxed, "length");
        check(lengthDescriptor.value === units.length && !lengthDescriptor.writable &&
            !lengthDescriptor.enumerable && !lengthDescriptor.configurable, "boxed-length-descriptor");
        for (var descriptorIndex = 0; descriptorIndex < units.length; descriptorIndex++) {
            var descriptor = Object.getOwnPropertyDescriptor(boxed, String(descriptorIndex));
            check(descriptor.value.charCodeAt(0) === units[descriptorIndex] && !descriptor.writable &&
                descriptor.enumerable && !descriptor.configurable, "boxed-index-descriptor-" + descriptorIndex);
        }

        var names = Object.getOwnPropertyNames(boxed);
        var keys = Object.keys(text);
        var ownKeys = Reflect.ownKeys(boxed);
        check(names.length === units.length + 1 && ownKeys.length === units.length + 1, "own-key-cardinality");
        check(keys.length === units.length, "enumerable-key-cardinality");
        for (var keyIndex = 0; keyIndex < units.length; keyIndex++) {
            check(names[keyIndex] === String(keyIndex) && keys[keyIndex] === String(keyIndex) &&
                ownKeys[keyIndex] === String(keyIndex), "own-key-order-" + keyIndex);
            check(Object.hasOwn(text, String(keyIndex)), "primitive-has-own-" + keyIndex);
            check(Object.prototype.propertyIsEnumerable.call(text, String(keyIndex)),
                "primitive-enumerable-" + keyIndex);
        }
        check(names[units.length] === "length" && ownKeys[units.length] === "length", "length-key-order");
        check(Object.hasOwn(text, "length") && !Object.prototype.propertyIsEnumerable.call(text, "length"),
            "primitive-length-own-nonenumerable");
        var nonIndices = ["-0", "-1", "01", "1.0", "4294967295"];
        for (var nonIndex = 0; nonIndex < nonIndices.length; nonIndex++) {
            check(!Object.hasOwn(text, nonIndices[nonIndex]), "non-index-" + nonIndex);
        }

        var values = Object.values(text);
        var entries = Object.entries(text);
        check(values.length === units.length && entries.length === units.length, "value-entry-cardinality");
        for (var valueIndex = 0; valueIndex < units.length; valueIndex++) {
            check(values[valueIndex].charCodeAt(0) === units[valueIndex], "object-value-" + valueIndex);
            check(entries[valueIndex][0] === String(valueIndex) &&
                entries[valueIndex][1].charCodeAt(0) === units[valueIndex], "object-entry-" + valueIndex);
        }
        var iterated = Array.from(text);
        check(iterated.length === 5 && iterated[1].codePointAt(0) === 0x1f600,
            "iterator-remains-code-point-based");

        var assigned = Object.assign({}, text);
        var spread = { ...text };
        for (var copyIndex = 0; copyIndex < units.length; copyIndex++) {
            check(assigned[copyIndex].charCodeAt(0) === units[copyIndex], "assign-unit-" + copyIndex);
            check(spread[copyIndex].charCodeAt(0) === units[copyIndex], "spread-unit-" + copyIndex);
        }

        check(Reflect.set(boxed, "1", "x") === false && boxed[1].charCodeAt(0) === units[1],
            "boxed-index-write-rejected");
        check(Reflect.deleteProperty(boxed, "1") === false, "boxed-index-delete-rejected");
        check(Reflect.defineProperty(boxed, "1", { value: boxed[1] }) === true,
            "boxed-compatible-redefinition");
        check(Reflect.defineProperty(boxed, "1", { value: "x" }) === false,
            "boxed-incompatible-redefinition");
        boxed.extra = 7;
        check(boxed.extra === 7 && Object.keys(boxed)[units.length] === "extra", "boxed-extensible-tail");

        print(failures.length === 0 ? "string-utf16-exotic-ok" : failures.join(","));
    `;
}

test("String exotic properties consume one canonical UTF-16 code-unit collection", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-string-utf16-exotic-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/string-utf16-exotic.js#sloppy";
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
                stdout: "string-utf16-exotic-ok\n",
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

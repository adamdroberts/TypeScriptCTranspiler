import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { hostProtocolVersion, parseHostObservation } from "../test262/protocol";

interface SemanticProbe {
    readonly label: string;
    readonly expression: string;
    readonly expected: string;
}

const probes: readonly SemanticProbe[] = [
    { label: "bigint-type", expression: "typeof values[0]", expected: "bigint" },
    { label: "symbol-type", expression: "typeof values[3]", expected: "symbol" },
    { label: "bigint-zero-falsy", expression: "!values[0]", expected: "true" },
    { label: "bigint-nonzero-truthy", expression: "Boolean(values[1])", expected: "true" },
    { label: "symbol-truthy", expression: "Boolean(values[3])", expected: "true" },
    { label: "bigint-value-equality", expression: "values[1] === values[2]", expected: "true" },
    { label: "bigint-distinct-value", expression: "values[0] !== values[1]", expected: "true" },
    { label: "symbol-alias-identity", expression: "values[3] === values[4]", expected: "true" },
    { label: "symbol-distinct-identity", expression: "values[3] !== values[5]", expected: "true" },
    { label: "bigint-string", expression: "String(values[1])", expected: "42" },
    { label: "symbol-string", expression: "String(values[3])", expected: "Symbol(retained)" },
    { label: "bigint-tag", expression: "Object.prototype.toString.call(values[1])", expected: "[object BigInt]" },
    { label: "symbol-tag", expression: "Object.prototype.toString.call(values[3])", expected: "[object Symbol]" },
    { label: "bigint-wrapper-distinct", expression: "bigintWrapper !== values[1]", expected: "true" },
    { label: "symbol-wrapper-distinct", expression: "symbolWrapper !== values[3]", expected: "true" },
    { label: "bigint-wrapper-value", expression: "bigintWrapper.valueOf() === values[1]", expected: "true" },
    { label: "symbol-wrapper-value", expression: "symbolWrapper.valueOf() === values[3]", expected: "true" },
    { label: "bigint-wrapper-tag", expression: "Object.prototype.toString.call(bigintWrapper)", expected: "[object BigInt]" },
    { label: "symbol-wrapper-tag", expression: "Object.prototype.toString.call(symbolWrapper)", expected: "[object Symbol]" },
    { label: "bigint-prototype", expression: "Object.getPrototypeOf(values[1]) === BigInt.prototype", expected: "true" },
    { label: "symbol-prototype", expression: "Object.getPrototypeOf(values[3]) === Symbol.prototype", expected: "true" },
    { label: "bigint-map-value-key", expression: "bigintMap.get(values[2])", expected: "retained" },
    { label: "bigint-set-value-key", expression: "bigintSet.has(values[2])", expected: "true" },
    { label: "symbol-map-identity-key", expression: "symbolMap.get(values[4])", expected: "retained" },
    { label: "symbol-map-distinct-key", expression: "symbolMap.has(values[5])", expected: "false" },
];

function source(): string {
    return [
        "(function () {",
        "function makeValues() {",
        "  var retained = Symbol('retained');",
        "  return [0n, 42n, 42n, retained, retained, Symbol('retained')];",
        "}",
        "function collectIfAvailable() { try { $262.gc(); } catch (error) {} }",
        "var values = makeValues();",
        "collectIfAvailable();",
        "var bigintWrapper = Object(values[1]);",
        "var symbolWrapper = Object(values[3]);",
        "var bigintMap = new Map();",
        "bigintMap.set(values[1], 'retained');",
        "var bigintSet = new Set();",
        "bigintSet.add(values[1]);",
        "var symbolMap = new Map();",
        "symbolMap.set(values[3], 'retained');",
        "collectIfAvailable();",
        ...probes.map((probe) =>
            `print(${JSON.stringify(`${probe.label}:`)} + String(${probe.expression}));`
        ),
        "})();",
        "",
    ].join("\n");
}

test("dynamic BigInt and Symbol values preserve their semantic type and identity", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-dynamic-primitive-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/dynamic-primitive.js#sloppy";
    try {
        await fs.writeFile(entry, source(), "utf8");
        const expected = probes.map((probe) => `${probe.label}:${probe.expected}`).join("\n") + "\n";
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
                stdout: expected,
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

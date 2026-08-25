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
    { label: "host-global-identity", expression: "globalThis.$262 === $262", expected: "true" },
    { label: "host-global-descriptor", expression: "hostDescriptor.value === $262 && hostDescriptor.writable && !hostDescriptor.enumerable && hostDescriptor.configurable", expected: "true" },
    { label: "print-global-identity", expression: "globalThis.print === emit", expected: "true" },
    { label: "print-global-descriptor", expression: "printDescriptor.value === emit && printDescriptor.writable && !printDescriptor.enumerable && printDescriptor.configurable", expected: "true" },
    { label: "print-metadata", expression: "emit.name === 'print' && emit.length === 1", expected: "true" },
    { label: "typeof", expression: "typeof htmlDDA", expected: "undefined" },
    { label: "boolean", expression: "Boolean(htmlDDA)", expected: "false" },
    { label: "logical-not", expression: "!htmlDDA", expected: "true" },
    { label: "logical-or", expression: "htmlDDA || 'fallback'", expected: "fallback" },
    { label: "abstract-null-left", expression: "htmlDDA == null", expected: "true" },
    { label: "abstract-null-right", expression: "null == htmlDDA", expected: "true" },
    { label: "abstract-undefined-left", expression: "htmlDDA == undefined", expected: "true" },
    { label: "abstract-undefined-right", expression: "undefined == htmlDDA", expected: "true" },
    { label: "abstract-false", expression: "htmlDDA == false", expected: "false" },
    { label: "abstract-zero", expression: "htmlDDA == 0", expected: "false" },
    { label: "abstract-empty", expression: "htmlDDA == ''", expected: "false" },
    { label: "abstract-object", expression: "htmlDDA == ordinary", expected: "false" },
    { label: "abstract-self", expression: "htmlDDA == htmlDDA", expected: "true" },
    { label: "strict-null", expression: "htmlDDA === null", expected: "false" },
    { label: "strict-undefined", expression: "htmlDDA === undefined", expected: "false" },
    { label: "strict-self", expression: "htmlDDA === htmlDDA", expected: "true" },
    { label: "same-value-null", expression: "Object.is(htmlDDA, null)", expected: "false" },
    { label: "same-value-self", expression: "Object.is(htmlDDA, htmlDDA)", expected: "true" },
    { label: "nullish", expression: "(htmlDDA ?? 'fallback') === htmlDDA", expected: "true" },
    { label: "nullish-dead-reference", expression: "(htmlDDA ?? unresolved) === htmlDDA", expected: "true" },
    { label: "unbound-reference", expression: "unboundReferenceThrows", expected: "true" },
    { label: "typeof-unbound", expression: "typeof anotherUnresolved", expected: "undefined" },
    { label: "call-empty", expression: "htmlDDA() === null", expected: "true" },
    { label: "call-empty-string", expression: "htmlDDA('') === null", expected: "true" },
];

function source(): string {
    return [
        "var emit = print;",
        "var hostDescriptor = Object.getOwnPropertyDescriptor(globalThis, '$262');",
        "var printDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'print');",
        "var htmlDDA = $262.IsHTMLDDA;",
        "var ordinary = {};",
        "var unboundReferenceThrows = false;",
        "try { unresolved; } catch (error) { unboundReferenceThrows = error instanceof ReferenceError; }",
        ...probes.map((probe) =>
            `emit(${JSON.stringify(`${probe.label}:`)} + String(${probe.expression}));`
        ),
        "",
    ].join("\n");
}

test("Test262 host globals and [[IsHTMLDDA]] follow canonical semantic paths", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-html-dda-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/html-dda.js#sloppy";
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

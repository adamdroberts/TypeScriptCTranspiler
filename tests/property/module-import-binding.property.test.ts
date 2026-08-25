import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { hostProtocolVersion, parseHostObservation } from "../test262/protocol";

const compoundOperators = [
    "+=", "-=", "*=", "**=", "/=", "%=", "&=", "|=", "^=", "<<=", ">>=", ">>>=",
] as const;

function compoundWriteAssertions(): string {
    return compoundOperators.map((operator, index) => `
        setImportedValue(${17 + index});
        effects = 0;
        threw = false;
        try {
            importedValue ${operator} (++effects, ${2 + index});
        } catch (error) {
            threw = error instanceof TypeError;
        }
        if (!threw || effects !== 1 || importedValue !== ${17 + index}) {
            throw new Error("immutable compound import write differs: ${operator}");
        }
    `).join("\n");
}

function logicalWriteAssertion(
    operator: "&&=" | "||=" | "??=",
    initial: string,
    shouldAssign: boolean,
    index: number,
): string {
    return `
        setImportedValue(${initial});
        effects = 0;
        threw = false;
        try {
            importedValue ${operator} (++effects, ${101 + index});
        } catch (error) {
            threw = error instanceof TypeError;
        }
        if (threw !== ${shouldAssign} || effects !== ${shouldAssign ? 1 : 0} || importedValue !== ${initial}) {
            throw new Error("immutable logical import write differs at partition ${index}");
        }
    `;
}

function subjectSource(): string {
    return `
        import { value as importedValue, setValue as setImportedValue } from "./exporter.js";

        if (importedValue !== undefined) throw new Error("import did not read preinitialized exporter slot");
        setImportedValue(11);
        if (importedValue !== 11) throw new Error("import was not a live binding");

        let effects = 0;
        let threw = false;
        try {
            importedValue = (++effects, 12);
        } catch (error) {
            threw = error instanceof TypeError;
        }
        if (!threw || effects !== 1 || importedValue !== 11) {
            throw new Error("simple import assignment did not reject after its RHS");
        }

        ${compoundWriteAssertions()}
        ${logicalWriteAssertion("&&=", "1", true, 1)}
        ${logicalWriteAssertion("&&=", "0", false, 2)}
        ${logicalWriteAssertion("||=", "0", true, 3)}
        ${logicalWriteAssertion("||=", "1", false, 4)}
        ${logicalWriteAssertion("??=", "null", true, 5)}
        ${logicalWriteAssertion("??=", "37", false, 6)}

        setImportedValue(41);
        threw = false;
        try {
            importedValue++;
        } catch (error) {
            threw = error instanceof TypeError;
        }
        if (!threw || importedValue !== 41) throw new Error("postfix import update did not reject");

        threw = false;
        try {
            ++importedValue;
        } catch (error) {
            threw = error instanceof TypeError;
        }
        if (!threw || importedValue !== 41) throw new Error("prefix import update did not reject");

        let referenceError = false;
        try {
            missingModuleReference;
        } catch (error) {
            referenceError = error instanceof ReferenceError;
        }
        if (!referenceError || typeof missingModuleReference !== "undefined") {
            throw new Error("unresolvable module Reference semantics differ");
        }

        print("module-import-binding-ok");
    `;
}

test("Module imports share exporter slots and one immutable Reference write path", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-module-import-property-"));
    const entry = path.join(temporary, "subject.js");
    const exporter = path.join(temporary, "exporter.js");
    const scenarioId = "property/module-import-binding.js#module";
    await Promise.all([
        fs.writeFile(entry, subjectSource(), "utf8"),
        fs.writeFile(
            exporter,
            "export var value;\nexport function setValue(next) { value = next; }\n",
            "utf8",
        ),
    ]);
    try {
        for (const noGc of [false, true]) {
            const mode = noGc ? "no-gc" : "gc";
            const executable = path.join(temporary, `subject-${mode}`);
            const diagnostics: string[] = [];
            const result = await compile({
                entry,
                output: executable,
                buildDir: path.join(temporary, `build-${mode}`),
                initializationEntries: [entry],
                moduleRoots: [entry, exporter],
                ignoreCheckJsDirectiveRoots: [entry, exporter],
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
            const observation = parseHostObservation(JSON.parse(process.stdout.toString()));
            expect(observation.protocolVersion).toBe(hostProtocolVersion);
            expect(observation.scenarioId).toBe(scenarioId);
            if (observation.kind !== "normal") {
                throw new Error(`unexpected host observation: ${JSON.stringify(observation)}`);
            }
            expect(observation.stdout).toBe("module-import-binding-ok\n");
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

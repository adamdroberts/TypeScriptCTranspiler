import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { finiteEvalScriptSourceGraph } from "../test262/native-host";
import { hostProtocolVersion, parseHostObservation } from "../test262/protocol";

test("evalScript source discovery follows one transitive finite AST worklist", () => {
    const nested = '$262.evalScript("var nested = 1;");';
    const root = finiteEvalScriptSourceGraph([{
        path: "root.js",
        source: `$262.evalScript(flag ? ${JSON.stringify(nested)} : "var alternate = 2;");`,
    }]);
    expect(root.error).toBeNull();
    expect(new Set(root.sources)).toEqual(new Set([
        nested,
        "var nested = 1;",
        "var alternate = 2;",
    ]));

    const nonFinite = finiteEvalScriptSourceGraph([{
        path: "root.js",
        source: "$262.evalScript(runtimeSource);",
    }]);
    expect(nonFinite.sources).toEqual([]);
    expect(nonFinite.error).toContain("not a finite static string expression");
});

test("finite AOT evalScript records parse and evaluate on every call", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-test262-eval-script-property-"));
    const main = path.join(temporary, "main.js");
    const mutationSource = "executions += 1; var created = executions; function readCreated() { return created; }";
    const throwSource = "throw sentinel;";
    const invalidSource = "let = ;";
    const mutationEntry = path.join(temporary, "mutation.js");
    const throwEntry = path.join(temporary, "throw.js");
    const scenarioId = "property/test262-eval-script.js#sloppy";
    await Promise.all([
        fs.writeFile(mutationEntry, mutationSource, "utf8"),
        fs.writeFile(throwEntry, throwSource, "utf8"),
        fs.writeFile(main, `
            var executions = 0;
            var sentinel = {};
            $262.evalScript(${JSON.stringify(mutationSource)});
            if (executions !== 1 || created !== 1 || readCreated() !== 1) {
                throw new Error("first ScriptEvaluation differed");
            }
            $262.evalScript(${JSON.stringify(mutationSource)});
            if (executions !== 2 || created !== 2 || readCreated() !== 2) {
                throw new Error("Script record was cached instead of re-evaluated");
            }
            var exactThrow = false;
            try { $262.evalScript(${JSON.stringify(throwSource)}); } catch (error) { exactThrow = error === sentinel; }
            if (!exactThrow) throw new Error("evalScript did not preserve abrupt value identity");
            var syntax = false;
            try { $262.evalScript(${JSON.stringify(invalidSource)}); } catch (error) { syntax = error instanceof SyntaxError; }
            if (!syntax) throw new Error("ParseScript failure was not a native SyntaxError");
            print("test262-eval-script-ok");
        `, "utf8"),
    ]);

    try {
        for (const noGc of [false, true]) {
            const mode = noGc ? "no-gc" : "gc";
            const executable = path.join(temporary, `program-${mode}`);
            const diagnostics: string[] = [];
            const result = await compile({
                entry: main,
                output: executable,
                buildDir: path.join(temporary, `build-${mode}`),
                additionalRoots: [mutationEntry, throwEntry],
                initializationEntries: [main],
                isolatedScriptRoots: [mutationEntry, throwEntry],
                ignoreCheckJsDirectiveRoots: [main, mutationEntry, throwEntry],
                noGc,
                test262Observation: {
                    kind: "test262-native-observation",
                    scenarioId,
                    setupEntries: [],
                    testEntry: main,
                    async: false,
                    evalScriptEntries: [
                        { source: invalidSource, entry: null },
                        { source: mutationSource, entry: mutationEntry },
                        { source: throwSource, entry: throwEntry },
                    ],
                },
                diagnosticWriter: (message) => diagnostics.push(message),
            });
            expect(diagnostics.join("")).toBe("");
            expect(result.exitCode).toBe(0);
            const child = Bun.spawnSync([executable], { stdout: "pipe", stderr: "pipe" });
            expect(child.exitCode).toBe(0);
            expect(child.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(child.stdout.toString()));
            expect(observation.protocolVersion).toBe(hostProtocolVersion);
            expect(observation.scenarioId).toBe(scenarioId);
            if (observation.kind !== "normal") {
                throw new Error(`unexpected observation: ${JSON.stringify(observation)}`);
            }
            expect(observation.stdout).toBe("test262-eval-script-ok\n");
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

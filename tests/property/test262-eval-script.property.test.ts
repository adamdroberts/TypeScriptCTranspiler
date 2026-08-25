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
    const lexicalSource = `
        var sawTdz = false;
        try { evalTdz; } catch (error) { sawTdz = error instanceof ReferenceError; }
        let evalTdz = 4;
        let evalLexical = sharedLexical += 1;
        const evalConstant = sharedConstant;
        class EvalClass {}
        if (!sawTdz || evalTdz !== 4 || evalLexical !== 11 ||
            evalConstant !== sharedConstant || typeof EvalClass !== "function") {
            throw new Error("global declarative environment differed");
        }
    `;
    const shadowSource = 'let shadowable = "lexical";';
    const varCollisionSource = "var sharedLexical; var collisionSideEffect;";
    const lexicalCollisionSource = "let sharedLexical; var collisionSideEffect;";
    const functionCollisionSource = "function blockedFunction() {}";
    const existingVarSource = "var existingConfigurable; var existingRestricted;";
    const nonExtensibleSource = "var impossibleGlobal; var impossibleSideEffect;";
    const compiledSources = [
        ["mutation.js", mutationSource],
        ["throw.js", throwSource],
        ["lexical.js", lexicalSource],
        ["shadow.js", shadowSource],
        ["var-collision.js", varCollisionSource],
        ["lexical-collision.js", lexicalCollisionSource],
        ["function-collision.js", functionCollisionSource],
        ["existing-var.js", existingVarSource],
        ["non-extensible.js", nonExtensibleSource],
    ] as const;
    const compiledEntries = compiledSources.map(([filename, source]) => ({
        source,
        entry: path.join(temporary, filename),
    }));
    const scenarioId = "property/test262-eval-script.js#sloppy";
    await Promise.all([
        ...compiledEntries.map(({ entry, source }) => fs.writeFile(entry, source, "utf8")),
        fs.writeFile(main, `
            var executions = 0;
            var sentinel = {};
            let sharedLexical = 10;
            const sharedConstant = {};
            class SharedClass {}
            Object.defineProperty(globalThis, "shadowable", {
                value: "property", writable: true, configurable: true
            });
            Object.defineProperty(globalThis, "blockedFunction", {
                value: 1, writable: false, enumerable: false, configurable: false
            });
            Object.defineProperty(globalThis, "existingConfigurable", {
                value: 7, writable: false, enumerable: false, configurable: true
            });
            Object.defineProperty(globalThis, "existingRestricted", {
                value: 8, writable: false, enumerable: false, configurable: false
            });
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

            $262.evalScript(${JSON.stringify(lexicalSource)});
            if (sharedLexical !== 11 || typeof SharedClass !== "function" ||
                evalLexical !== 11 || evalTdz !== 4 || !sawTdz ||
                evalConstant !== sharedConstant || typeof EvalClass !== "function" ||
                "evalLexical" in globalThis || "evalConstant" in globalThis || "EvalClass" in globalThis) {
                throw new Error("separate Script lexical visibility/reflection differed");
            }
            var immutableThrow = false;
            try { evalConstant = 1; } catch (error) { immutableThrow = error instanceof TypeError; }
            if (!immutableThrow || evalConstant !== sharedConstant) {
                throw new Error("immutable global lexical assignment differed");
            }

            $262.evalScript(${JSON.stringify(shadowSource)});
            if (shadowable !== "lexical" || globalThis.shadowable !== "property") {
                throw new Error("global lexical did not shadow a configurable property");
            }

            var varCollision = false;
            try { $262.evalScript(${JSON.stringify(varCollisionSource)}); }
            catch (error) { varCollision = error instanceof SyntaxError; }
            if (!varCollision || "collisionSideEffect" in globalThis) {
                throw new Error("var/lexical collision was not atomic");
            }
            var lexicalCollision = false;
            try { $262.evalScript(${JSON.stringify(lexicalCollisionSource)}); }
            catch (error) { lexicalCollision = error instanceof SyntaxError; }
            if (!lexicalCollision || "collisionSideEffect" in globalThis) {
                throw new Error("lexical collision was not atomic");
            }
            var functionCollision = false;
            try { $262.evalScript(${JSON.stringify(functionCollisionSource)}); }
            catch (error) { functionCollision = error instanceof TypeError; }
            if (!functionCollision || globalThis.blockedFunction !== 1) {
                throw new Error("function definability preflight differed");
            }

            Object.preventExtensions(globalThis);
            $262.evalScript(${JSON.stringify(existingVarSource)});
            var configurableDescriptor = Object.getOwnPropertyDescriptor(globalThis, "existingConfigurable");
            var restrictedDescriptor = Object.getOwnPropertyDescriptor(globalThis, "existingRestricted");
            if (existingConfigurable !== 7 || configurableDescriptor.writable ||
                configurableDescriptor.enumerable || !configurableDescriptor.configurable ||
                existingRestricted !== 8 || restrictedDescriptor.writable ||
                restrictedDescriptor.enumerable || restrictedDescriptor.configurable) {
                throw new Error("existing global var property was reconfigured");
            }
            var nonExtensible = false;
            try { $262.evalScript(${JSON.stringify(nonExtensibleSource)}); }
            catch (error) { nonExtensible = error instanceof TypeError; }
            if (!nonExtensible || "impossibleGlobal" in globalThis || "impossibleSideEffect" in globalThis) {
                throw new Error("non-extensible global preflight was not atomic");
            }
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
                additionalRoots: compiledEntries.map(({ entry }) => entry),
                initializationEntries: [main],
                isolatedScriptRoots: [main, ...compiledEntries.map(({ entry }) => entry)],
                ignoreCheckJsDirectiveRoots: [main, ...compiledEntries.map(({ entry }) => entry)],
                noGc,
                test262Observation: {
                    kind: "test262-native-observation",
                    scenarioId,
                    setupEntries: [],
                    testEntry: main,
                    async: false,
                    scriptEntries: [main, ...compiledEntries.map(({ entry }) => entry)],
                    evalScriptEntries: [
                        { source: invalidSource, entry: null },
                        ...compiledEntries,
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

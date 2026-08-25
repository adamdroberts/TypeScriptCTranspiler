import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { hostProtocolVersion, parseHostObservation } from "../test262/protocol";

interface BindingPlan {
    readonly name: string;
    readonly initial: number;
    readonly propertyValue: number;
    readonly delta: number;
}

function bindingPlans(seed: number): BindingPlan[] {
    let state = seed >>> 0;
    const next = (): number => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state;
    };
    return Array.from({ length: 11 }, (_, index) => ({
        name: `generatedGlobal_${index}_${next().toString(16)}`,
        initial: next() % 1_000,
        propertyValue: next() % 1_000,
        delta: (next() % 31) + 1,
    }));
}

function bindingAssertions(plan: BindingPlan): string {
    const key = JSON.stringify(plan.name);
    const afterCompound = plan.propertyValue + plan.delta;
    const afterPostfix = afterCompound + 1;
    return `
        var ${plan.name} = ${plan.initial};
        if (globalThis[${key}] !== ${plan.initial}) throw new Error("identifier write was not reflected");
        globalThis[${key}] = ${plan.propertyValue};
        if (${plan.name} !== ${plan.propertyValue}) throw new Error("property write was not reflected");
        ${plan.name} += ${plan.delta};
        if (globalThis[${key}] !== ${afterCompound}) throw new Error("compound write was not reflected");
        if (${plan.name}++ !== ${afterCompound} || ${plan.name} !== ${afterPostfix}) {
            throw new Error("update did not use the canonical binding");
        }
        var descriptor_${plan.name} = Object.getOwnPropertyDescriptor(globalThis, ${key});
        if (!descriptor_${plan.name} || !descriptor_${plan.name}.writable ||
            !descriptor_${plan.name}.enumerable || descriptor_${plan.name}.configurable) {
            throw new Error("global var descriptor differs");
        }
        if (delete globalThis[${key}]) throw new Error("global var was configurable");
    `;
}

function deeplyNestedVar(depth: number, name: string, value: number): string {
    let statement = `var ${name} = ${value};`;
    for (let index = 0; index < depth; index++) statement = `if (true) { ${statement} }`;
    return statement;
}

function subjectSource(plans: readonly BindingPlan[]): string {
    const deepName = "representativeDeepGlobal";
    const deepValue = 7331;
    const lexicalName = "representativeGlobalLexical";
    return `
        if ($262.global !== globalThis || this !== globalThis) throw new Error("global identity differs");
        ${plans.map(bindingAssertions).join("\n")}

        var logicalAndGlobal = 1;
        logicalAndGlobal &&= 17;
        var logicalOrGlobal = 0;
        logicalOrGlobal ||= 19;
        var logicalNullishGlobal;
        logicalNullishGlobal ??= 23;
        if (logicalAndGlobal !== 17 || logicalOrGlobal !== 19 || logicalNullishGlobal !== 23) {
            throw new Error("logical assignment did not use the canonical binding");
        }

        if (!(${JSON.stringify(deepName)} in globalThis) || globalThis[${JSON.stringify(deepName)}] !== undefined) {
            throw new Error("nested var was not instantiated before evaluation");
        }
        ${deeplyNestedVar(97, deepName, deepValue)}
        if (${deepName} !== ${deepValue} || globalThis[${JSON.stringify(deepName)}] !== ${deepValue}) {
            throw new Error("nested var did not use the canonical binding");
        }

        let ${lexicalName} = 29;
        if (${JSON.stringify(lexicalName)} in globalThis || ${lexicalName} !== 29) {
            throw new Error("global lexical binding leaked onto the object");
        }

        function generatedSloppyThis() { return this; }
        function generatedStrictThis() { "use strict"; return this; }
        if (globalThis.generatedSloppyThis !== generatedSloppyThis ||
            generatedSloppyThis() !== globalThis || generatedStrictThis() !== undefined) {
            throw new Error("function this normalization differs");
        }
        print("script-global-property-ok");
    `;
}

test("Script bindings share one global-object environment model", async () => {
    const plans = bindingPlans(0xa5f1523d);
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-script-global-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/script-global-binding.js#sloppy";
    try {
        await fs.writeFile(entry, subjectSource(plans), "utf8");
        for (const noGc of [false, true]) {
            const mode = noGc ? "no-gc" : "gc";
            const executable = path.join(temporary, `subject-${mode}`);
            const diagnostics: string[] = [];
            const result = await compile({
                entry,
                output: executable,
                buildDir: path.join(temporary, `build-${mode}`),
                initializationEntries: [entry],
                ignoreCheckJsDirectiveRoots: [entry],
                test262Observation: {
                    kind: "test262-native-observation",
                    scenarioId,
                    setupEntries: [],
                    testEntry: entry,
                    async: false,
                },
                noGc,
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
            expect(observation.kind).toBe("normal");
            expect(observation.stdout).toBe("script-global-property-ok\n");
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

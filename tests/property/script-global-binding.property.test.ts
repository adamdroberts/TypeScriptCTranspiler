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

interface ReferencePlan {
    readonly created: string;
    readonly absentSimple: string;
    readonly absentCompound: string;
    readonly absentUpdate: string;
    readonly orderedLeft: string;
    readonly immutable: string;
    readonly deep: string;
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

function referencePlan(seed: number): ReferencePlan {
    let state = seed >>> 0;
    const name = (role: string): string => {
        state = (Math.imul(state, 1103515245) + 12345) >>> 0;
        return `generatedReference_${role}_${state.toString(16)}`;
    };
    return {
        created: name("created"),
        absentSimple: name("absent_simple"),
        absentCompound: name("absent_compound"),
        absentUpdate: name("absent_update"),
        orderedLeft: name("ordered_left"),
        immutable: name("immutable"),
        deep: name("deep"),
    };
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

function deeplyNestedStatement(depth: number, statement: string): string {
    for (let index = 0; index < depth; index++) statement = `if (true) { ${statement} }`;
    return statement;
}

function referenceAssertions(plan: ReferencePlan): string {
    const createdKey = JSON.stringify(plan.created);
    const absentSimpleKey = JSON.stringify(plan.absentSimple);
    const absentCompoundKey = JSON.stringify(plan.absentCompound);
    const absentUpdateKey = JSON.stringify(plan.absentUpdate);
    const orderedLeftKey = JSON.stringify(plan.orderedLeft);
    const immutableKey = JSON.stringify(plan.immutable);
    return `
        if (typeof ${plan.absentSimple} !== "undefined" || !delete ${plan.absentSimple}) {
            throw new Error("absent reference lookup/delete differs");
        }

        var strictSimpleEffects = 0;
        function strictSimpleWrite() {
            "use strict";
            try {
                ${plan.absentSimple} = (++strictSimpleEffects, 31);
            } catch (error) {
                return error instanceof ReferenceError;
            }
            return false;
        }
        if (!strictSimpleWrite() || strictSimpleEffects !== 1 || ${absentSimpleKey} in globalThis) {
            throw new Error("strict absent PutValue differs");
        }

        var compoundEffects = 0;
        try {
            ${plan.absentCompound} += (++compoundEffects, 1);
            throw new Error("absent compound write did not throw");
        } catch (error) {
            if (!(error instanceof ReferenceError)) throw error;
        }
        if (compoundEffects !== 0 || ${absentCompoundKey} in globalThis) {
            throw new Error("compound reference ordering differs");
        }

        try {
            ${plan.absentUpdate}++;
            throw new Error("absent update did not throw");
        } catch (error) {
            if (!(error instanceof ReferenceError)) throw error;
        }
        if (${absentUpdateKey} in globalThis) throw new Error("absent update created a binding");

        try {
            ${plan.orderedLeft} === (${plan.orderedLeft} = 1);
            throw new Error("strict equality did not evaluate its left reference first");
        } catch (error) {
            if (!(error instanceof ReferenceError)) throw error;
        }
        if (${orderedLeftKey} in globalThis) throw new Error("strict equality evaluated its right operand");

        if ((${plan.created} = 7) !== 7 || ${plan.created} !== 7 || globalThis[${createdKey}] !== 7) {
            throw new Error("sloppy absent PutValue did not create one global property");
        }
        var createdDescriptor = Object.getOwnPropertyDescriptor(globalThis, ${createdKey});
        if (!createdDescriptor || !createdDescriptor.writable || !createdDescriptor.enumerable ||
            !createdDescriptor.configurable) {
            throw new Error("sloppy created global descriptor differs");
        }
        ${plan.created} += 5;
        ${plan.created} &&= 19;
        ${plan.created} ||= 23;
        if (${plan.created}++ !== 19 || ${plan.created} !== 20) {
            throw new Error("created reference operations did not share PutValue");
        }
        if (!delete ${plan.created} || ${createdKey} in globalThis || !delete ${plan.created}) {
            throw new Error("created reference delete differs");
        }

        Object.defineProperty(globalThis, ${immutableKey}, {
            value: 41,
            writable: false,
            enumerable: true,
            configurable: true
        });
        if ((${plan.immutable} = 42) !== 42 || globalThis[${immutableKey}] !== 41) {
            throw new Error("sloppy rejected Set result differs");
        }
        function strictImmutableWrite() {
            "use strict";
            try {
                ${plan.immutable} = 43;
            } catch (error) {
                return error instanceof TypeError;
            }
            return false;
        }
        if (!strictImmutableWrite() || globalThis[${immutableKey}] !== 41) {
            throw new Error("strict rejected Set result differs");
        }
        delete globalThis[${immutableKey}];
    `;
}

function subjectSource(plans: readonly BindingPlan[], references: ReferencePlan): string {
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
        ${deeplyNestedStatement(
            97,
            `var ${deepName} = ${deepValue}; ${references.deep} = 7332;`,
        )}
        if (${deepName} !== ${deepValue} || globalThis[${JSON.stringify(deepName)}] !== ${deepValue}) {
            throw new Error("nested var did not use the canonical binding");
        }
        if (${references.deep} !== 7332 || !delete ${references.deep}) {
            throw new Error("deep dynamic reference did not use the canonical PutValue path");
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

        ${referenceAssertions(references)}

        print("script-global-property-ok");
    `;
}

test("Script bindings share one global-object environment model", async () => {
    const plans = bindingPlans(0xa5f1523d);
    const references = referencePlan(0x5f39d14b);
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-script-global-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/script-global-binding.js#sloppy";
    try {
        await fs.writeFile(entry, subjectSource(plans, references), "utf8");
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
            if (observation.kind !== "normal") {
                throw new Error(`unexpected host observation: ${JSON.stringify(observation)}`);
            }
            expect(observation.kind).toBe("normal");
            expect(observation.stdout).toBe("script-global-property-ok\n");
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

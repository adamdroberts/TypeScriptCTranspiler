import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { hostProtocolVersion, parseHostObservation } from "../test262/protocol";

type BindingValue =
    | { readonly kind: "arrow"; readonly result: string }
    | { readonly kind: "function"; readonly result: string }
    | { readonly kind: "null" }
    | { readonly kind: "undefined" };

function bindingPlan(seed: number, stressLength: number): BindingValue[] {
    let state = seed >>> 0;
    const partitions: BindingValue[] = [
        { kind: "arrow", result: "arrow" },
        { kind: "null" },
        { kind: "function", result: "function" },
        { kind: "undefined" },
    ];
    const worklist = [...partitions];
    while (worklist.length < stressLength) {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        const selected = partitions[state % partitions.length]!;
        worklist.push(
            selected.kind === "arrow" || selected.kind === "function"
                ? { kind: selected.kind, result: `${selected.result}-${worklist.length}` }
                : selected,
        );
    }
    return worklist;
}

function valueSource(value: BindingValue, index: number): string {
    if (value.kind === "null") return "null";
    if (value.kind === "undefined") return "undefined";
    const result = JSON.stringify(value.result);
    return value.kind === "arrow"
        ? `() => ${result}`
        : `function reassigned_${index}() { return ${result}; }`;
}

function expectedValue(value: BindingValue): string {
    if (value.kind === "null") return "object:null";
    if (value.kind === "undefined") return "undefined:undefined";
    return `function:${value.result}`;
}

function subjectSource(plan: readonly BindingValue[]): string {
    const values = plan.map(valueSource).join(",\n");
    return `
        let topLevelBinding = () => "initial";
        const readTopLevelBinding = () => topLevelBinding;

        function describeBinding(value) {
            return typeof value + ":" +
                (typeof value === "function" ? value() : String(value));
        }

        function runLocalBinding(worklist) {
            let localBinding = () => "initial";
            const readLocalBinding = () => localBinding;
            print("local-initial:" + describeBinding(readLocalBinding()));
            for (let index = 0; index < worklist.length; index++) {
                localBinding = worklist[index];
                print("local:" + describeBinding(readLocalBinding()));
            }
        }

        const worklist = [${values}];
        print("top-initial:" + describeBinding(readTopLevelBinding()));
        for (let index = 0; index < worklist.length; index++) {
            topLevelBinding = worklist[index];
            print("top:" + describeBinding(readTopLevelBinding()));
        }
        runLocalBinding(worklist);
    `;
}

function expectedOutput(plan: readonly BindingValue[]): string {
    const modeled = plan.map(expectedValue);
    return [
        "top-initial:function:initial",
        ...modeled.map((value) => `top:${value}`),
        "local-initial:function:initial",
        ...modeled.map((value) => `local:${value}`),
    ].join("\n") + "\n";
}

test("mutable function bindings retain one value representation across their write domain", async () => {
    // The semantic partitions and representative stress tail feed one
    // canonical write worklist; expected observations are reconstructed from
    // descriptors rather than from emitted fixture or pass counts.
    const plan = bindingPlan(0x5eedc0de, 37);
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-mutable-function-binding-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/mutable-function-binding.js#sloppy";
    try {
        await fs.writeFile(entry, subjectSource(plan), "utf8");
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
                stdout: expectedOutput(plan),
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

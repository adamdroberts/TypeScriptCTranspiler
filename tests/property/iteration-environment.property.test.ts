import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";

type Owner = "module" | "function";
type IterationKind = "of" | "in";
type Head = "const" | "let" | "assign";

interface IterationPlan {
    readonly owner: Owner;
    readonly kind: IterationKind;
    readonly head: Head;
}

function semanticPlans(): IterationPlan[] {
    const plans: IterationPlan[] = [];
    for (const owner of ["module", "function"] as const) {
        for (const kind of ["of", "in"] as const) {
            for (const head of ["const", "let", "assign"] as const) {
                plans.push({ owner, kind, head });
            }
        }
    }
    return plans;
}

function planId(plan: IterationPlan): string {
    return `${plan.owner}-${plan.kind}-${plan.head}`;
}

function sourceValues(plan: IterationPlan): string[] {
    return plan.kind === "of"
        ? ["alpha", "7", "Symbol(gamma)", "omega"]
        : ["first", "second", "third"];
}

function expectedLine(plan: IterationPlan): string {
    const values = sourceValues(plan);
    const observed = plan.head === "assign"
        ? values.map(() => values[values.length - 1]!)
        : plan.head === "let"
            ? values.map((value) => `${value}!`)
            : values;
    const observedAgain = plan.head === "let"
        ? values.map((value) => `${value}!!`)
        : observed;
    return `${planId(plan)}:${observed.join(",")}|${observedAgain.join(",")}`;
}

function planBody(plan: IterationPlan, index: number): string {
    const suffix = String(index);
    const valueName = `value_${suffix}`;
    const callbacks = `callbacks_${suffix}`;
    const source = plan.kind === "of"
        ? `/** @type {any[]} */ var source_${suffix} = ["alpha", 7, Symbol("gamma"), "omega"];`
        : `var source_${suffix} = { first: 1, second: 2, third: 3 };`;
    const declaration = plan.head === "assign"
        ? `var ${valueName};`
        : "";
    const head = plan.head === "assign" ? valueName : `${plan.head} ${valueName}`;
    const callback = plan.head === "let"
        ? `function () { ${valueName} = text(${valueName}) + "!"; return text(${valueName}); }`
        : `function () { return text(${valueName}); }`;
    return `
        ${source}
        /** @type {any[]} */ var ${callbacks} = [];
        ${declaration}
        for (${head} ${plan.kind} source_${suffix}) {
            ${callbacks}.push(${callback});
        }
        var first_${suffix} = [];
        var second_${suffix} = [];
        for (var first_index_${suffix} = 0; first_index_${suffix} < ${callbacks}.length; first_index_${suffix}++) {
            first_${suffix}.push(${callbacks}[first_index_${suffix}]());
        }
        for (var second_index_${suffix} = 0; second_index_${suffix} < ${callbacks}.length; second_index_${suffix}++) {
            second_${suffix}.push(${callbacks}[second_index_${suffix}]());
        }
        console.log(${JSON.stringify(planId(plan) + ":")} + first_${suffix}.join(",") + "|" + second_${suffix}.join(","));
    `;
}

function nativeSource(plans: readonly IterationPlan[], stressValues: readonly string[]): string {
    const generated = plans.map((plan, index) => {
        const body = planBody(plan, index);
        return plan.owner === "function"
            ? `function run_${index}() { ${body} }\nrun_${index}();`
            : body;
    }).join("\n");
    return `
        export {};
        function text(value) {
            return typeof value === "symbol" ? value.toString() : String(value);
        }
        ${generated}

        // One representative wide collection follows the same per-iteration
        // allocation path. Its width is a stress guard, not coverage evidence.
        var stress_source = ${JSON.stringify(stressValues)};
        /** @type {any[]} */ var stress_callbacks = [];
        for (const stress_value of stress_source) {
            stress_callbacks.push(function () { return stress_value; });
        }
        var stress_checksum = 0;
        for (var stress_index = 0; stress_index < stress_callbacks.length; stress_index++) {
            stress_checksum += stress_callbacks[stress_index]().length * (stress_index + 1);
        }
        console.log("stress:" + String(stress_checksum));
    `;
}

test("iteration declarations derive fresh closure environments from one binding path", async () => {
    const plans = semanticPlans();
    const stressValues = Array.from(
        { length: 83 },
        (_, index) => `stress_${index.toString(36)}_${((index * 2654435761) >>> 0).toString(16)}`,
    );
    const expected = [
        ...plans.map(expectedLine),
        `stress:${stressValues.reduce((sum, value, index) => sum + value.length * (index + 1), 0)}`,
    ];
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-iteration-environment-property-"));
    const entry = path.join(temporary, "subject.js");
    try {
        await fs.writeFile(entry, nativeSource(plans, stressValues), "utf8");
        for (const noGc of [false, true]) {
            const mode = noGc ? "no-gc" : "gc";
            const executable = path.join(temporary, `subject-${mode}`);
            const diagnostics: string[] = [];
            const result = await compile({
                entry,
                output: executable,
                buildDir: path.join(temporary, `build-${mode}`),
                initializationEntries: [entry],
                moduleRoots: [entry],
                ignoreCheckJsDirectiveRoots: [entry],
                noGc,
                diagnosticWriter: (message) => diagnostics.push(message),
            });
            expect(diagnostics.join("")).toBe("");
            expect(result.exitCode).toBe(0);

            const process = Bun.spawnSync([executable], { stdout: "pipe", stderr: "pipe" });
            expect(process.exitCode).toBe(0);
            expect(process.stderr.toString()).toBe("");
            expect(process.stdout.toString().trimEnd().split("\n")).toEqual(expected);
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

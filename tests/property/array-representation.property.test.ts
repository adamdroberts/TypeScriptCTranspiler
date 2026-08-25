import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";

type ElementKind = "number" | "boolean" | "string";
type Element = number | boolean | string;
type Operation =
    | { readonly kind: "set"; readonly index: number; readonly value: Element }
    | { readonly kind: "delete"; readonly index: number }
    | { readonly kind: "reverse" };

interface RepresentationPlan {
    readonly label: string;
    readonly elementKind: ElementKind;
    readonly initial: readonly Element[];
    readonly operations: readonly Operation[];
}

function stressPlan(): RepresentationPlan {
    let state = 0x43c6ef37;
    const next = (): number => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state;
    };
    const initial = Array.from({ length: 73 }, (_, index) => index * 3 - 17);
    const operations: Operation[] = [];
    for (let index = 0; index < 83; index++) {
        const bits = next();
        if (index % 11 === 0) operations.push({ kind: "reverse" });
        else if ((bits & 3) === 0) operations.push({ kind: "delete", index: bits % initial.length });
        else operations.push({ kind: "set", index: bits % initial.length, value: (next() % 2000) - 1000 });
    }
    return { label: "stress", elementKind: "number", initial, operations };
}

const plans: readonly RepresentationPlan[] = [
    {
        label: "number",
        elementKind: "number",
        initial: [3, 1, 4, 1, 5],
        operations: [
            { kind: "set", index: 2, value: 9 },
            { kind: "delete", index: 1 },
            { kind: "reverse" },
        ],
    },
    {
        label: "boolean",
        elementKind: "boolean",
        initial: [true, false, true, false, true],
        operations: [
            { kind: "set", index: 0, value: false },
            { kind: "delete", index: 3 },
            { kind: "reverse" },
        ],
    },
    {
        label: "string",
        elementKind: "string",
        initial: ["alpha", "beta", "gamma", "delta"],
        operations: [
            { kind: "set", index: 1, value: "changed" },
            { kind: "delete", index: 0 },
            { kind: "reverse" },
        ],
    },
    stressPlan(),
];

function operationLiteral(operation: Operation): string {
    if (operation.kind === "reverse") return '["reverse"]';
    if (operation.kind === "delete") return `["delete", ${operation.index}]`;
    return `["set", ${operation.index}, ${JSON.stringify(operation.value)}]`;
}

function source(): string {
    const declarations = plans.map((plan) => `
        const values_${plan.label}: ${plan.elementKind}[] = ${JSON.stringify(plan.initial)};
        const alias_${plan.label}: any[] = values_${plan.label};
        console.log(${JSON.stringify(`${plan.label}:identity:`)} + String(alias_${plan.label} === values_${plan.label}));
        applyOperations(alias_${plan.label}, [${plan.operations.map(operationLiteral).join(",")}]);
        console.log(${JSON.stringify(`${plan.label}:state:`)} + values_${plan.label}.join("|") + ":" + Object.keys(alias_${plan.label}).join("|"));
    `);
    return `
        function applyOperations(values: any[], operations: any[][]): void {
            for (let index = 0; index < operations.length; index++) {
                const operation = operations[index];
                if (operation[0] === "set") values[Number(operation[1])] = operation[2];
                else if (operation[0] === "delete") delete values[Number(operation[1])];
                else values.reverse();
            }
        }
        ${declarations.join("\n")}
    `;
}

function expectedState(plan: RepresentationPlan): string {
    let entries = new Map<number, Element>(plan.initial.map((value, index) => [index, value]));
    for (const operation of plan.operations) {
        if (operation.kind === "set") entries.set(operation.index, operation.value);
        else if (operation.kind === "delete") entries.delete(operation.index);
        else {
            entries = new Map(
                [...entries].map(([index, value]) => [plan.initial.length - index - 1, value]),
            );
        }
    }
    const joined = Array.from({ length: plan.initial.length }, (_, index) =>
        entries.has(index) ? String(entries.get(index)) : ""
    ).join("|");
    const keys = [...entries.keys()].sort((left, right) => left - right).join("|");
    return `${plan.label}:state:${joined}:${keys}`;
}

test("array aliases share one representation codec", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-array-representation-property-"));
    const entry = path.join(temporary, "subject.ts");
    try {
        await fs.writeFile(entry, source(), "utf8");
        const expected = plans.flatMap((plan) => [
            `${plan.label}:identity:true`,
            expectedState(plan),
        ]);
        for (const noGc of [false, true]) {
            const mode = noGc ? "no-gc" : "gc";
            const executable = path.join(temporary, `subject-${mode}`);
            const diagnostics: string[] = [];
            const result = await compile({
                entry,
                output: executable,
                buildDir: path.join(temporary, `build-${mode}`),
                noGc,
                diagnosticWriter: (message) => diagnostics.push(message),
            });
            expect(diagnostics.join("")).toBe("");
            expect(result.exitCode).toBe(0);

            const process = Bun.spawnSync([executable], { stdout: "pipe", stderr: "pipe" });
            expect(process.stderr.toString()).toBe("");
            expect(process.exitCode).toBe(0);
            expect(process.stdout.toString().trimEnd().split("\n")).toEqual(expected);
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

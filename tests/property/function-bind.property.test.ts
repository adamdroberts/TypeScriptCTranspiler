import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";

interface Layer {
    readonly tag: string;
    readonly arguments: readonly string[];
}

interface BindPlan {
    readonly layers: readonly Layer[];
    readonly callArguments: readonly string[];
}

interface SourceFactory {
    readonly nextInt: (exclusiveMaximum: number) => number;
    readonly nextValue: (prefix: string) => string;
}

function sourceFactory(seed: number): SourceFactory {
    let state = seed >>> 0;
    let serial = 0;
    return {
        nextInt: (exclusiveMaximum) => {
            state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
            return state % exclusiveMaximum;
        },
        nextValue: (prefix) => `${prefix}_${serial++}`,
    };
}

function bindPlan(factory: SourceFactory, budget: number): BindPlan {
    const layers: Layer[] = [];
    for (let remaining = budget; remaining > 0; remaining--) {
        const arguments_: string[] = [];
        const width = factory.nextInt(4);
        for (let index = 0; index < width; index++) {
            arguments_.push(factory.nextValue("bound"));
        }
        layers.push({
            tag: factory.nextValue("receiver"),
            arguments: arguments_,
        });
        if (factory.nextInt(3) === 0) break;
    }
    const callArguments: string[] = [];
    const callWidth = factory.nextInt(5);
    for (let index = 0; index < callWidth; index++) {
        callArguments.push(factory.nextValue("call"));
    }
    return { layers, callArguments };
}

function expectedResult(plan: BindPlan): string {
    const receiver = plan.layers[0]?.tag ?? "none";
    const arguments_ = [
        ...plan.layers.flatMap((layer) => layer.arguments),
        ...plan.callArguments,
    ];
    return `${receiver}:${arguments_.join("|")}`;
}

function nativeSource(plans: readonly BindPlan[]): string {
    const statements = plans.map((plan, index) => {
        const binds = plan.layers.map((layer) =>
            `fn_${index} = fn_${index}.bind({ tag: ${JSON.stringify(layer.tag)} }` +
            `${layer.arguments.map((value) => `, ${JSON.stringify(value)}`).join("")});`
        ).join("\n");
        return `
            let fn_${index}: any = collect;
            ${binds}
            const call_${index}: string[] = ${JSON.stringify(plan.callArguments)};
            console.log(fn_${index}(...call_${index}));
        `;
    }).join("\n");
    return `
        function callableTarget(this: any): string {
            return "unreachable";
        }
        function collectApply(_target: any, receiver: any, values: any[]): string {
            const tag = receiver && receiver.tag ? String(receiver.tag) : "none";
            return tag + ":" + values.join("|");
        }
        const collect: any = new Proxy(callableTarget as any, { apply: collectApply as any });
        ${statements}
    `;
}

test("bound calls preserve the canonical receiver and argument concatenation invariants", async () => {
    // Seeds select semantic partitions; the expected result is reconstructed
    // independently from the recursive bind plan rather than from fixture counts.
    const plans = [0x10203040, 0x55667788, 0x90abcdef, 0xfedcba09].map((seed) =>
        bindPlan(sourceFactory(seed), 7)
    );
    plans.push({ layers: [], callArguments: ["unbound"] });
    plans.push({
        layers: [
            { tag: "first", arguments: [] },
            { tag: "ignored", arguments: ["later"] },
        ],
        callArguments: [],
    });

    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-function-bind-property-"));
    const entry = path.join(temporary, "subject.ts");
    const executable = path.join(temporary, "subject");
    const diagnostics: string[] = [];
    try {
        await fs.writeFile(entry, nativeSource(plans), "utf8");
        const result = await compile({
            entry,
            output: executable,
            buildDir: path.join(temporary, "build"),
            diagnosticWriter: (message) => diagnostics.push(message),
        });
        expect(diagnostics.join("")).toBe("");
        expect(result.exitCode).toBe(0);

        const process = Bun.spawnSync([executable], { stdout: "pipe", stderr: "pipe" });
        expect(process.exitCode).toBe(0);
        expect(process.stderr.toString()).toBe("");
        expect(process.stdout.toString().trimEnd().split("\n")).toEqual(
            plans.map(expectedResult),
        );
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 60_000);

import { expect, test } from "bun:test";
import { analyzeModuleGraph } from "../test262/native-host";

type ResolutionPartition = "direct" | "same-binding" | "ambiguous" | "missing";

interface ModuleGraphPlan {
    readonly partition: ResolutionPartition;
    readonly depth: number;
    readonly namespaceImport: boolean;
}

function graphPlan(seed: number): ModuleGraphPlan {
    let state = seed >>> 0;
    const next = (): number => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state;
    };
    return {
        partition: (["direct", "same-binding", "ambiguous", "missing"] as const)[next() % 4]!,
        depth: 1 + (next() % 11),
        namespaceImport: (next() & 1) !== 0,
    };
}

function addReExportChain(
    sources: Map<string, string>,
    prefix: string,
    depth: number,
    target: string,
): string {
    const first = `test/${prefix}-0.js`;
    for (let index = 0; index < depth; index++) {
        const next = index + 1 < depth ? `./${prefix}-${index + 1}.js` : target;
        sources.set(`test/${prefix}-${index}.js`, `export { token } from ${JSON.stringify(next)};\n`);
    }
    return `./${first.slice("test/".length)}`;
}

function graphSources(plan: ModuleGraphPlan): Map<string, string> {
    const sources = new Map<string, string>();
    sources.set("test/leaf-a.js", "export const token = 1;\n");
    sources.set("test/leaf-b.js", "export const token = 2;\n");
    sources.set("test/empty.js", "export const other = 3;\n");

    const left = addReExportChain(sources, "left", plan.depth, "./leaf-a.js");
    const rightTarget = plan.partition === "same-binding" ? "./leaf-a.js" : "./leaf-b.js";
    const right = addReExportChain(sources, "right", plan.depth + 1, rightTarget);
    const exports = plan.partition === "direct"
        ? `export * from ${JSON.stringify(left)};\n`
        : plan.partition === "missing"
            ? `export { token } from "./empty.js";\n`
            : `export * from ${JSON.stringify(left)};\nexport * from ${JSON.stringify(right)};\n`;
    sources.set("test/aggregate.js", exports);
    sources.set(
        "test/root.js",
        plan.namespaceImport
            ? 'import * as namespace from "./aggregate.js"; void namespace;\n'
            : 'import { token } from "./aggregate.js"; void token;\n',
    );
    return sources;
}

test("module linking resolves generated graph partitions by binding identity", () => {
    for (const seed of [0x10293847, 0x55667788, 0x90abcdef, 0xfedcba09]) {
        for (let offset = 0; offset < 17; offset++) {
            const plan = graphPlan(seed ^ Math.imul(offset + 1, 0x9e3779b1));
            const failure = analyzeModuleGraph("test/root.js", graphSources(plan));
            const expectedFailure = plan.partition === "missing" ||
                (plan.partition === "ambiguous" && !plan.namespaceImport);
            expect(failure !== null).toBe(expectedFailure);
            if (failure) {
                expect(failure.phase).toBe("resolution");
                expect(failure.origin).toBe("module-graph");
            }
        }
    }
});

test("module linking detects circular indirect exports through the shared resolver", () => {
    const sources = new Map<string, string>([
        ["test/root.js", 'import { token } from "./cycle-a.js";\n'],
        ["test/cycle-a.js", 'export { token } from "./cycle-b.js";\n'],
        ["test/cycle-b.js", 'export { token } from "./cycle-a.js";\n'],
    ]);
    expect(analyzeModuleGraph("test/root.js", sources)).toMatchObject({
        phase: "resolution",
        origin: "module-graph",
    });
});

test("module linking uses the same worklists for one representative deep graph", () => {
    const sources = new Map<string, string>();
    const depth = 384;
    sources.set("test/root.js", 'import { token } from "./depth-0.js";\n');
    for (let index = 0; index < depth; index++) {
        sources.set(
            `test/depth-${index}.js`,
            index + 1 < depth
                ? `export * from "./depth-${index + 1}.js";\n`
                : "export const token = 262;\n",
        );
    }
    expect(analyzeModuleGraph("test/root.js", sources)).toBeNull();
});

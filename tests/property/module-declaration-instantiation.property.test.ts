import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";

type DeclarationPartition = "direct" | "block" | "unreached" | "for-init" | "duplicate";

interface BindingPlan {
    readonly name: string;
    readonly initial: number;
    readonly replacement: string;
    readonly partition: DeclarationPartition;
    readonly depth: number;
}

function bindingPlan(seed: number): BindingPlan {
    let state = seed >>> 0;
    const next = (): number => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state;
    };
    return {
        name: `moduleVar_${next().toString(16)}`,
        initial: next() % 10_000,
        replacement: `replacement-${next().toString(16)}`,
        partition: (["direct", "block", "unreached", "for-init", "duplicate"] as const)[next() % 5]!,
        depth: 1 + (next() % 13),
    };
}

function nestedBlocks(depth: number, statement: string): string {
    for (let index = 0; index < depth; index++) statement = `{ ${statement} }`;
    return statement;
}

function declarationSource(plan: BindingPlan): string {
    const initialize = `var ${plan.name} = ${plan.initial};`;
    const declaration = plan.partition === "direct"
        ? initialize
        : plan.partition === "block"
            ? nestedBlocks(plan.depth, initialize)
            : plan.partition === "unreached"
                ? `if (false) { ${initialize} } ${plan.name} = ${plan.initial};`
                : plan.partition === "for-init"
                    ? `for (var ${plan.name} = ${plan.initial}; false;) {}`
                    : `var ${plan.name}; ${nestedBlocks(plan.depth, initialize)} var ${plan.name};`;
    return `
        if (${plan.name} !== undefined) throw new Error("module var was not preinitialized");
        ${declaration}
        if (${plan.name} !== ${plan.initial}) throw new Error("module var initializer did not write its binding");
        ${plan.name} = ${JSON.stringify(plan.replacement)};
        if (${plan.name} !== ${JSON.stringify(plan.replacement)}) {
            throw new Error("module var did not preserve mutable boxed storage");
        }
    `;
}

function subjectSource(plans: readonly BindingPlan[]): string {
    const deepDepth = 113;
    return `
        ${plans.map(declarationSource).join("\n")}

        if (deepModuleVar !== undefined) throw new Error("deep binding was not preinitialized");
        ${nestedBlocks(deepDepth, "var deepModuleVar = 7331;")}
        if (deepModuleVar !== 7331) throw new Error("deep binding used a different storage path");

        if (loopModuleVar !== undefined) throw new Error("loop binding was not preinitialized");
        for (var loopModuleVar = 0; loopModuleVar < 4; loopModuleVar++) {}
        if (loopModuleVar !== 4) throw new Error("for initializer did not use the module binding");

        if (forInModuleVar !== undefined) throw new Error("for-in binding was not preinitialized");
        for (var forInModuleVar in { first: 1, second: 2 }) {}
        if (forInModuleVar !== "second") throw new Error("for-in did not assign the module binding");

        if (forOfModuleVar !== undefined) throw new Error("for-of binding was not preinitialized");
        for (var forOfModuleVar of [3, 5, 8]) {}
        if (forOfModuleVar !== 8) throw new Error("for-of did not assign the module binding");

        console.log("module-declaration-instantiation-ok");
    `;
}

test("Module var bindings share one declaration-instantiation worklist", async () => {
    const plans = [0x10293847, 0x55667788, 0x90abcdef, 0xfedcba09]
        .flatMap((seed) => Array.from(
            { length: 9 },
            (_, offset) => bindingPlan(seed ^ Math.imul(offset + 1, 0x9e3779b1)),
        ));
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-module-instantiation-property-"));
    const entry = path.join(temporary, "subject.js");
    const executable = path.join(temporary, "subject");
    const buildDir = path.join(temporary, "build");
    await fs.writeFile(entry, subjectSource(plans), "utf8");
    try {
        const result = await compile({
            entry,
            output: executable,
            buildDir,
            moduleRoots: [entry],
            ignoreCheckJsDirectiveRoots: [entry],
        });
        expect(result.exitCode).toBe(0);
        for (const noGc of [false, true]) {
            const child = Bun.spawn([executable], {
                stdout: "pipe",
                stderr: "pipe",
                env: { ...process.env, TSC2C_NO_GC: noGc ? "1" : "0" },
            });
            const [exitCode, stdout, stderr] = await Promise.all([
                child.exited,
                new Response(child.stdout).text(),
                new Response(child.stderr).text(),
            ]);
            expect(exitCode).toBe(0);
            expect(stderr).toBe("");
            expect(stdout).toBe("module-declaration-instantiation-ok\n");
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

function cyclicModuleGraph(depth: number): Map<string, string> {
    const sources = new Map<string, string>();
    sources.set(
        "root.js",
        [
            'import { result } from "./cycle-0.js";',
            'if (result !== "undefined:undefined:true:ready") {',
            '    throw new Error("cyclic Module bindings were not instantiated before evaluation: " + result);',
            "}",
            'console.log("cyclic-module-instantiation-ok");',
            "",
        ].join("\n"),
    );
    sources.set(
        "cycle-0.js",
        [
            'import { beforeValue, beforeCall, sawLexicalTdz } from "./cycle-1.js";',
            'export var entryValue = "ready";',
            'export let entryLexical = "lexical-ready";',
            "export function readEntry() { return entryValue; }",
            'export const result = typeof beforeValue + ":" + typeof beforeCall + ":" + sawLexicalTdz + ":" + readEntry();',
            "",
        ].join("\n"),
    );
    for (let index = 1; index + 1 < depth; index++) {
        sources.set(
            `cycle-${index}.js`,
            `export { beforeValue, beforeCall, sawLexicalTdz } from "./cycle-${index + 1}.js";\n`,
        );
    }
    sources.set(
        `cycle-${depth - 1}.js`,
        [
            'import { entryValue, entryLexical, readEntry } from "./cycle-0.js";',
            "export const beforeValue = entryValue;",
            "export const beforeCall = readEntry();",
            "let lexicalTdz = false;",
            "try { entryLexical; } catch (error) { lexicalTdz = error instanceof ReferenceError; }",
            "export const sawLexicalTdz = lexicalTdz;",
            "",
        ].join("\n"),
    );
    return sources;
}

test("cyclic Module graphs instantiate every binding before any evaluation", async () => {
    // This depth is a representative stack-safety guard for the same explicit
    // graph worklist; it is not a completion counter or a fixture family.
    const sources = cyclicModuleGraph(97);
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-module-cycle-property-"));
    try {
        await Promise.all([...sources].map(([relative, source]) =>
            fs.writeFile(path.join(temporary, relative), source, "utf8")
        ));
        const entry = path.join(temporary, "root.js");
        const moduleRoots = [...sources.keys()].map((relative) => path.join(temporary, relative));
        for (const noGc of [false, true]) {
            const mode = noGc ? "no-gc" : "gc";
            const executable = path.join(temporary, `subject-${mode}`);
            const result = await compile({
                entry,
                output: executable,
                buildDir: path.join(temporary, `build-${mode}`),
                initializationEntries: [entry],
                moduleRoots,
                ignoreCheckJsDirectiveRoots: moduleRoots,
                noGc,
            });
            expect(result.exitCode).toBe(0);
            const child = Bun.spawnSync([executable], { stdout: "pipe", stderr: "pipe" });
            expect(child.exitCode).toBe(0);
            expect(child.stderr.toString()).toBe("");
            expect(child.stdout.toString()).toBe("cyclic-module-instantiation-ok\n");
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 120_000);

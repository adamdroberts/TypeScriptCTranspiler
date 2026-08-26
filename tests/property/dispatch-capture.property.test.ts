import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";

interface CapturePartition {
    readonly scope: "top" | "local";
    readonly declaration: string;
    readonly observation: string;
    readonly mutation?: string;
}

const capturePlan: readonly CapturePartition[] = [
    {
        scope: "top",
        declaration: "const topArray: number[] = [1, 2];",
        observation: "topArray.length === 2 && topArray[0] === 1",
        mutation: "topArray.push(9);",
    },
    {
        scope: "top",
        declaration: "const topDynamic: any = { values: [3] };",
        observation: "topDynamic.values.length === 1 && topDynamic.values[0] === 3",
        mutation: "topDynamic.values.push(9);",
    },
    {
        scope: "top",
        declaration: "const topUndefined: any = undefined;",
        observation: "topUndefined === undefined",
    },
    {
        scope: "top",
        declaration: "const topNumber = 11;",
        observation: "topNumber === 11",
    },
    {
        scope: "local",
        declaration: "const localArray: number[] = [4, 5, 6];",
        observation: "localArray.length === 3 && localArray[2] === 6",
        mutation: "localArray.push(9);",
    },
    {
        scope: "local",
        declaration: "const localDynamic: any = { values: [7, 8] };",
        observation: "localDynamic.values.length === 2 && localDynamic.values[1] === 8",
        mutation: "localDynamic.values.push(9);",
    },
    {
        scope: "local",
        declaration: "const localNull: any = null;",
        observation: "localNull === null",
    },
    {
        scope: "local",
        declaration: "const localNumber = 17;",
        observation: "localNumber === 17",
    },
];

function validSource(): string {
    const top = capturePlan.filter((entry) => entry.scope === "top");
    const local = capturePlan.filter((entry) => entry.scope === "local");
    return [
        "export {};",
        "const queue = new DispatchQueue('capture-property');",
        ...top.map((entry) => entry.declaration),
        "async function exercise(): Promise<boolean> {",
        ...local.map((entry) => `    ${entry.declaration}`),
        "    const pending = dispatch.async(queue, () =>",
        `        ${capturePlan.map((entry) => `(${entry.observation})`).join(" &&\n        ")}`,
        "    );",
        ...capturePlan
            .filter((entry) => entry.mutation)
            .map((entry) => `    ${entry.mutation}`),
        "    return await pending;",
        "}",
        "exercise().then(",
        "    (result) => console.log('dispatch capture plan:', result),",
        "    (error) => console.log('dispatch capture error:', String(error)),",
        ");",
        "",
    ].join("\n");
}

const invalidMutableSource = [
    "const queue = new DispatchQueue('capture-invalid');",
    "let mutable: number[] = [1];",
    "void dispatch.async(queue, () => mutable.length);",
    "",
].join("\n");

const uninitializedSnapshotSource = [
    "const queue = new DispatchQueue('capture-tdz');",
    "scheduleBeforeInitialization();",
    "const late: number[] = [1];",
    "scheduleParameterSnapshot(23);",
    "function scheduleBeforeInitialization(): void {",
    "    dispatch.async(queue, () => late.length).then(",
    "        (value) => console.log('dispatch tdz value:', value),",
    "        (error) => console.log('dispatch tdz error:', String(error)),",
    "    );",
    "}",
    "function scheduleParameterSnapshot(value: number): void {",
    "    dispatch.async(queue, () => value).then(",
    "        (result) => console.log('dispatch parameter snapshot:', result),",
    "    );",
    "    value = 99;",
    "}",
    "",
].join("\n");

const moduleLexicalSource = [
    "export {};",
    "const moduleValue = { count: 31 };",
    "const pending = dispatch.async(new DispatchQueue('capture-module'), () => moduleValue.count);",
    "moduleValue.count = 99;",
    "pending.then((result) => console.log('dispatch module snapshot:', result));",
    "",
].join("\n");

test("dispatch tasks snapshot one canonical capture descriptor collection", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-dispatch-capture-"));
    const entry = path.join(temporary, "subject.ts");
    try {
        await fs.writeFile(entry, validSource(), "utf8");
        for (const noGc of [false, true]) {
            const mode = noGc ? "no-gc" : "gc";
            const executable = path.join(temporary, `subject-${mode}`);
            const diagnostics: string[] = [];
            const result = await compile({
                entry,
                output: executable,
                buildDir: path.join(temporary, `build-${mode}`),
                dispatch: "serial",
                noGc,
                diagnosticWriter: (message) => diagnostics.push(message),
            });
            expect(diagnostics.join("")).toBe("");
            expect(result.exitCode).toBe(0);

            const process = Bun.spawnSync([executable], { stdout: "pipe", stderr: "pipe" });
            expect(process.exitCode).toBe(0);
            expect(process.stderr.toString()).toBe("");
            expect(process.stdout.toString()).toBe("dispatch capture plan: true\n");
        }

        const invalidEntry = path.join(temporary, "invalid.ts");
        await fs.writeFile(invalidEntry, invalidMutableSource, "utf8");
        const diagnostics: string[] = [];
        const invalid = await compile({
            entry: invalidEntry,
            output: path.join(temporary, "invalid"),
            buildDir: path.join(temporary, "build-invalid"),
            dispatch: "serial",
            diagnosticWriter: (message) => diagnostics.push(message),
        });
        expect(invalid.exitCode).toBe(3);
        expect(diagnostics.join("")).toContain(
            "dispatch task captures must be const; copy mutable state into a const binding before dispatching",
        );

        const uninitializedEntry = path.join(temporary, "uninitialized.ts");
        await fs.writeFile(uninitializedEntry, uninitializedSnapshotSource, "utf8");
        for (const noGc of [false, true]) {
            const mode = noGc ? "no-gc" : "gc";
            const executable = path.join(temporary, `uninitialized-${mode}`);
            const uninitializedDiagnostics: string[] = [];
            const result = await compile({
                entry: uninitializedEntry,
                output: executable,
                buildDir: path.join(temporary, `build-uninitialized-${mode}`),
                dispatch: "serial",
                noGc,
                diagnosticWriter: (message) => uninitializedDiagnostics.push(message),
            });
            expect(uninitializedDiagnostics.join("")).toBe("");
            expect(result.exitCode).toBe(0);

            const process = Bun.spawnSync([executable], { stdout: "pipe", stderr: "pipe" });
            expect(process.exitCode).toBe(0);
            expect(process.stderr.toString()).toBe("");
            expect(process.stdout.toString()).toBe(
                "dispatch tdz error: ReferenceError: Cannot access 'late' before initialization\n" +
                "dispatch parameter snapshot: 23\n",
            );
        }

        const moduleEntry = path.join(temporary, "module.js");
        await fs.writeFile(moduleEntry, moduleLexicalSource, "utf8");
        for (const noGc of [false, true]) {
            const mode = noGc ? "no-gc" : "gc";
            const executable = path.join(temporary, `module-${mode}`);
            const moduleDiagnostics: string[] = [];
            const result = await compile({
                entry: moduleEntry,
                output: executable,
                buildDir: path.join(temporary, `build-module-${mode}`),
                dispatch: "serial",
                noGc,
                diagnosticWriter: (message) => moduleDiagnostics.push(message),
            });
            expect(moduleDiagnostics.join("")).toBe("");
            expect(result.exitCode).toBe(0);

            const process = Bun.spawnSync([executable], { stdout: "pipe", stderr: "pipe" });
            expect(process.exitCode).toBe(0);
            expect(process.stderr.toString()).toBe("");
            expect(process.stdout.toString()).toBe("dispatch module snapshot: 31\n");
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 120_000);

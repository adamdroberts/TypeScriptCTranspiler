import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";

interface MethodPartition {
    readonly name: string;
    readonly placement: "instance" | "static";
    readonly bias: number;
}

function methodPartitions(): MethodPartition[] {
    const semantic: MethodPartition[] = [
        { name: "instance_capture", placement: "instance", bias: -3 },
        { name: "instance_this", placement: "instance", bias: 0 },
        { name: "instance_argument", placement: "instance", bias: 5 },
        { name: "static_capture", placement: "static", bias: -2 },
        { name: "static_this", placement: "static", bias: 1 },
        { name: "static_argument", placement: "static", bias: 7 },
    ];
    let state = 0x4c415353;
    const worklist = [...semantic];
    while (worklist.length < 31) {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        worklist.push({
            name: `generated_${worklist.length}`,
            placement: (state & 1) === 0 ? "instance" : "static",
            bias: (state % 29) - 14,
        });
    }
    return worklist;
}

function subjectSource(partitions: readonly MethodPartition[]): string {
    const members = partitions.map((partition) => {
        const prefix = partition.placement === "static" ? "static " : "";
        const receiver = partition.placement === "static" ? "this.marker" : "this.offset";
        return `${prefix}${partition.name}(this: any, argument: any): any { ` +
            `return captured + ${receiver} + argument + ${partition.bias}; }`;
    });
    const observations = partitions.map((partition, index) => {
        const receiver = partition.placement === "static" ? "Constructor" : "instance";
        const marker = partition.placement === "static" ? 4 : 3;
        const expected = 40 + marker + index + partition.bias;
        return `if (${receiver}[${JSON.stringify(partition.name)}](${index}) !== ${expected}) ` +
            `throw new Error(${JSON.stringify(`method partition ${partition.name} failed`)});`;
    });
    return `
        function makeClass(captured: any): any {
            return class RuntimeClassExpression {
                ${members.join("\n")}
            };
        }

        const Constructor: any = makeClass(40);
        const Other: any = makeClass(90);
        const instance: any = new Constructor();
        instance.offset = 3;
        Constructor.marker = 4;
        ${observations.join("\n")}

        if (Constructor === Other || new Other() instanceof Constructor) {
            throw new Error("class evaluation did not create fresh identity");
        }
        if (Constructor.name !== "RuntimeClassExpression" || Constructor.length !== 0) {
            throw new Error("class constructor metadata differs");
        }
        if (Constructor.prototype.constructor !== Constructor || !(instance instanceof Constructor)) {
            throw new Error("class prototype identity differs");
        }
        const descriptor = Object.getOwnPropertyDescriptor(Constructor.prototype, "instance_capture");
        const constructorDescriptor = Object.getOwnPropertyDescriptor(Constructor.prototype, "constructor");
        if (!descriptor || descriptor.writable !== true || descriptor.enumerable !== false ||
            descriptor.configurable !== true) {
            throw new Error("class method descriptor differs");
        }
        if (!constructorDescriptor || constructorDescriptor.value !== Constructor ||
            constructorDescriptor.writable !== true || constructorDescriptor.enumerable !== false ||
            constructorDescriptor.configurable !== true) {
            throw new Error("class prototype constructor descriptor differs");
        }
        let rejected = false;
        try { Constructor(); }
        catch (error) { rejected = error instanceof TypeError; }
        if (!rejected) throw new Error("class constructor call was not rejected");

        const Inferred: any = class { value(this: any): any { return 1; } };
        if (Inferred.name !== "Inferred" || new Inferred().value() !== 1) {
            throw new Error("anonymous class name inference differs");
        }
        console.log("class-expression-property-ok");
    `;
}

test("class expressions derive constructor identity and method closures from one member worklist", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-class-expression-property-"));
    const entry = path.join(temporary, "subject.ts");
    const partitions = methodPartitions();
    await fs.writeFile(entry, subjectSource(partitions), "utf8");
    try {
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
            expect(process.exitCode).toBe(0);
            expect(process.stderr.toString()).toBe("");
            expect(process.stdout.toString()).toBe("class-expression-property-ok\n");
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

test("unsupported class-expression partitions fail at the shared definition boundary", async () => {
    const partitions = [
        {
            source: "class Base {}\nfunction make(): any { return class extends Base {}; }\nmake();\n",
            diagnostic: "class expression heritage is not supported by dynamic class definition",
        },
        {
            source: "function make(): any { return class { field: any = 1; }; }\nmake();\n",
            diagnostic: "class expression element is not supported by dynamic class definition",
        },
        {
            source: "const key: any = 'method';\nfunction make(): any { return class { [key](): any { return 1; } }; }\nmake();\n",
            diagnostic: "computed class expression methods are not supported by dynamic class definition",
        },
    ] as const;
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-class-expression-unsupported-"));
    try {
        for (const [index, partition] of partitions.entries()) {
            const entry = path.join(temporary, `unsupported-${index}.ts`);
            await fs.writeFile(entry, partition.source, "utf8");
            const diagnostics: string[] = [];
            const result = await compile({
                entry,
                output: path.join(temporary, `unsupported-${index}`),
                buildDir: path.join(temporary, `build-${index}`),
                emitCOnly: true,
                diagnosticWriter: (message) => diagnostics.push(message),
            });
            expect(result.exitCode).not.toBe(0);
            expect(diagnostics.join("")).toContain(partition.diagnostic);
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
});

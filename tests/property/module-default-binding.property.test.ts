import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";

interface FunctionPartition {
    readonly filename: string;
    readonly declaration: string;
    readonly expectedName: string;
    readonly invocation: string;
}

const functionPartitions: readonly FunctionPartition[] = [
    {
        filename: "ordinary-anonymous.js",
        declaration: "export default function() { return 23; }",
        expectedName: "default",
        invocation: "self()",
    },
    {
        filename: "ordinary-named.js",
        declaration: "export default function namedOrdinary() { return 23; }",
        expectedName: "namedOrdinary",
        invocation: "self()",
    },
    {
        filename: "generator-anonymous.js",
        declaration: "export default function* () { return 23; }",
        expectedName: "default",
        invocation: "self().next().value",
    },
    {
        filename: "generator-named.js",
        declaration: "export default function* namedGenerator() { return 23; }",
        expectedName: "namedGenerator",
        invocation: "self().next().value",
    },
];

function functionModule(partition: FunctionPartition): string {
    return `
        import self from "./${partition.filename}";
        export const observation = [${partition.invocation}, self.name];
        ${partition.declaration}
    `;
}

const expressionModule = `
    import self from "./expression.js";

    let readThrew = false;
    try { self; }
    catch (error) { readThrew = error instanceof ReferenceError; }
    let typeofThrew = false;
    try { typeof self; }
    catch (error) { typeofThrew = error instanceof ReferenceError; }
    export const tdzObservation = [readThrew, typeofThrew];

    export default (() => 41);
    export const initializedObservation = [self(), self.name];
`;

function entrySource(): string {
    const imports = functionPartitions.map((partition, index) =>
        `import { observation as observation${index} } from "./${partition.filename}";`,
    ).join("\n");
    const assertions = functionPartitions.map((partition, index) => `
        if (observation${index}[0] !== 23 || observation${index}[1] !== ${JSON.stringify(partition.expectedName)}) {
            throw new Error("default function instantiation partition differs: ${partition.filename}");
        }
    `).join("\n");
    return `
        ${imports}
        import expressionDefault, { tdzObservation, initializedObservation } from "./expression.js";

        ${assertions}
        if (tdzObservation[0] !== true || tdzObservation[1] !== true) {
            throw new Error("default expression binding bypassed its TDZ");
        }
        if (
            expressionDefault() !== 41 ||
            expressionDefault.name !== "default" ||
            initializedObservation[0] !== 41 ||
            initializedObservation[1] !== "default"
        ) {
            throw new Error("default expression did not initialize its canonical binding");
        }
        console.log("module-default-binding-ok");
    `;
}

test("default exports share declaration-instantiation and evaluation binding semantics", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-module-default-property-"));
    const entry = path.join(temporary, "subject.js");
    const moduleFiles = functionPartitions.map((partition) => path.join(temporary, partition.filename));
    const expression = path.join(temporary, "expression.js");
    await Promise.all([
        fs.writeFile(entry, entrySource(), "utf8"),
        fs.writeFile(expression, expressionModule, "utf8"),
        ...functionPartitions.map((partition, index) =>
            fs.writeFile(moduleFiles[index]!, functionModule(partition), "utf8"),
        ),
    ]);
    const roots = [entry, expression, ...moduleFiles];
    try {
        for (const noGc of [false, true]) {
            const mode = noGc ? "no-gc" : "gc";
            const executable = path.join(temporary, `subject-${mode}`);
            const diagnostics: string[] = [];
            const result = await compile({
                entry,
                output: executable,
                buildDir: path.join(temporary, `build-${mode}`),
                moduleRoots: roots,
                ignoreCheckJsDirectiveRoots: roots,
                noGc,
                diagnosticWriter: (message) => diagnostics.push(message),
            });
            expect(diagnostics.join("")).toBe("");
            expect(result.exitCode).toBe(0);

            const process = Bun.spawnSync([executable], { stdout: "pipe", stderr: "pipe" });
            expect(process.exitCode).toBe(0);
            expect(process.stderr.toString()).toBe("");
            expect(process.stdout.toString()).toBe("module-default-binding-ok\n");
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

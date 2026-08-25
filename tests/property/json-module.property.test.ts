import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";

interface JsonModulePartition {
    readonly label: string;
    readonly source: string;
    readonly observation: string;
    readonly expected: string;
}

const rootPartitions: readonly JsonModulePartition[] = [
    { label: "null", source: "null\n", observation: "value === null", expected: "true" },
    { label: "boolean", source: "true\n", observation: "value === true", expected: "true" },
    { label: "number", source: "262\n", observation: "value === 262", expected: "true" },
    { label: "string", source: '"module value"\n', observation: "value", expected: "module value" },
    {
        label: "array",
        source: "[1,true,null]\n",
        observation: "String(Array.isArray(value)) + ':' + String(value[0]) + ':' + String(value[1]) + ':' + String(value[2] === null)",
        expected: "true:1:true:true",
    },
    {
        label: "object",
        source: '{"answer":42}\n',
        observation: "String(Object.getPrototypeOf(value) === Object.prototype) + ':' + String(value.answer)",
        expected: "true:42",
    },
];

function subjectSource(): string {
    const imports = rootPartitions.map((partition) =>
        `import value_${partition.label} from './${partition.label}.json' with { type: 'json' };`
    );
    const observations = rootPartitions.map((partition) =>
        `console.log(${JSON.stringify(`${partition.label}:`)} + String(${partition.observation.replace(/\bvalue\b/g, `value_${partition.label}`)}));`
    );
    return [
        ...imports,
        "import identity1 from './identity.json' with { type: 'json' };",
        "import { default as identity2 } from './identity.json' with { type: 'json' };",
        "import * as identityNamespace from './identity.json' with { type: 'json' };",
        "import * as numberNamespace from './number.json' with { type: 'json' };",
        ...observations,
        "console.log('identity:' + String(identity1 === identity2) + ':' + String(identityNamespace.default === identity1));",
        "console.log('identity-namespace:' + Object.getOwnPropertyNames(identityNamespace).join(',') + ':' + String(Object.getPrototypeOf(identityNamespace) === null) + ':' + String(Object.isExtensible(identityNamespace)));",
        "console.log('number-namespace:' + String(Object.getOwnPropertyNames(numberNamespace).length) + ':' + String(numberNamespace.default));",
        "identity1.added = 'shared';",
        "console.log('identity-mutation:' + identity2.added + ':' + identityNamespace.default.added);",
        "",
    ].join("\n");
}

test("JSON Modules derive every root partition and import form from one synthetic binding plan", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-json-module-property-"));
    const entry = path.join(temporary, "subject.js");
    const expected = [
        ...rootPartitions.map((partition) => `${partition.label}:${partition.expected}`),
        "identity:true:true",
        "identity-namespace:default:true:false",
        "number-namespace:1:262",
        "identity-mutation:shared:shared",
        "",
    ].join("\n");
    try {
        await Promise.all([
            fs.writeFile(entry, subjectSource(), "utf8"),
            ...rootPartitions.map((partition) =>
                fs.writeFile(path.join(temporary, `${partition.label}.json`), partition.source, "utf8")
            ),
            fs.writeFile(path.join(temporary, "identity.json"), '{"token":"identity"}\n', "utf8"),
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
            expect(process.exitCode).toBe(0);
            expect(process.stderr.toString()).toBe("");
            expect(process.stdout.toString()).toBe(expected);
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

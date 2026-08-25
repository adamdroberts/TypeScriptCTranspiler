import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import ts from "typescript";
import { compile } from "../../src/compile";
import { createEcmaSourceFile } from "../../src/ecmascript-source";
import {
    dynamicImportCalls,
    type DynamicModuleRequestsParseResult,
    moduleRequestsFromDynamicImport,
} from "../../src/module-request";

interface DynamicRequestPartition {
    readonly expression: string;
    readonly options?: string;
    readonly requests: readonly {
        readonly specifier: string;
        readonly attributes: readonly { readonly key: string; readonly value: string }[];
    }[] | null;
    readonly diagnostic?: string;
}

const requestPartitions: readonly DynamicRequestPartition[] = [
    {
        expression: '"./plain.js"',
        requests: [{ specifier: "./plain.js", attributes: [] }],
    },
    {
        expression: 'condition ? "./left.js" : "./right.js"',
        requests: [
            { specifier: "./left.js", attributes: [] },
            { specifier: "./right.js", attributes: [] },
        ],
    },
    {
        expression: '`./${condition ? "left" : "right"}.js`',
        options: '{ with: { mode: "strict", type: "javascript" } }',
        requests: [
            {
                specifier: "./left.js",
                attributes: [
                    { key: "mode", value: "strict" },
                    { key: "type", value: "javascript" },
                ],
            },
            {
                specifier: "./right.js",
                attributes: [
                    { key: "mode", value: "strict" },
                    { key: "type", value: "javascript" },
                ],
            },
        ],
    },
    {
        expression: '"./value.json"',
        options: '{ with: { type: "javascript", "type": "json" } }',
        requests: [{
            specifier: "./value.json",
            attributes: [{ key: "type", value: "json" }],
        }],
    },
    {
        expression: "runtimeSpecifier()",
        requests: null,
        diagnostic: "finite AOT specifier proof",
    },
    {
        expression: '"./plain.js"',
        options: "runtimeOptions",
        requests: null,
        diagnostic: "finite AOT object proof",
    },
    {
        expression: '"./plain.js"',
        options: '{ with: { ...runtimeAttributes } }',
        requests: null,
        diagnostic: "static enumerable data properties",
    },
];

function parseDynamicRequest(partition: DynamicRequestPartition): DynamicModuleRequestsParseResult {
    const source = `void import(${partition.expression}${partition.options ? `, ${partition.options}` : ""});`;
    const sourceFile = createEcmaSourceFile(
        "dynamic-request.ts",
        source,
        ts.ScriptTarget.ESNext,
        true,
        ts.ScriptKind.TS,
    );
    const calls = dynamicImportCalls(sourceFile);
    expect(calls).toHaveLength(1);
    return moduleRequestsFromDynamicImport(calls[0]!)!;
}

test("dynamic import derives semantic request partitions from one canonical ModuleRequest worklist", () => {
    for (const partition of requestPartitions) {
        const parsed = parseDynamicRequest(partition);
        if (partition.requests === null) {
            expect(parsed.requests).toBeNull();
            expect(parsed.error).toContain(partition.diagnostic!);
        } else {
            expect(parsed.error).toBeNull();
            expect(parsed.requests).toEqual(partition.requests);
        }
    }
});

test("dynamic import source traversal uses one representative deeply nested worklist", () => {
    const importCall = ts.factory.createCallExpression(
        ts.factory.createToken(ts.SyntaxKind.ImportKeyword) as ts.Expression,
        undefined,
        [ts.factory.createStringLiteral("./subject.js")],
    );
    let expression: ts.Expression = importCall;
    for (let depth = 0; depth < 2048; depth++) {
        expression = ts.factory.createParenthesizedExpression(expression);
    }
    const root = ts.factory.createExpressionStatement(expression);
    expect(dynamicImportCalls(root)).toEqual([importCall]);
});

function dynamicSubjectSource(): string {
    return [
        'console.log("before");',
        'const first = import("./depth-0.js");',
        'console.log("after");',
        "let importedNamespace: any;",
        "const onImported = (namespace: any) => {",
        "    importedNamespace = namespace;",
        '    console.log("value:" + String(namespace.token));',
        "};",
        "const callbacks: any = {};",
        "callbacks.onImported = onImported;",
        "callbacks.nonCallableHandler = 262;",
        "first.then(callbacks.onImported)",
        '    .then(() => import("./depth-0.js"))',
        '    .then((again) => { console.log("identity:" + String(importedNamespace === again)); })',
        '    .then(() => import("./depth-0.js", { with: { type: "javascript" } }))',
        '    .then((attributed) => { console.log("attribute-identity:" + String(importedNamespace === attributed)); })',
        '    .then(() => import("./value.json", { with: { type: "json" } }))',
        '    .then((json) => { console.log("json:" + String(json.default.answer)); })',
        "    .then(callbacks.nonCallableHandler)",
        '    .then(() => console.log("passthrough"));',
        "",
    ].join("\n");
}

test("dynamic import initializes a generated dependency graph lazily through one graph worklist", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-dynamic-import-property-"));
    const entry = path.join(temporary, "subject.ts");
    const depth = 96;
    const expected = [
        "before",
        "after",
        "leaf-init",
        "value:262",
        "identity:true",
        "attribute-identity:true",
        "json:42",
        "passthrough",
        "",
    ].join("\n");
    try {
        const writes: Promise<void>[] = [
            fs.writeFile(entry, dynamicSubjectSource(), "utf8"),
            fs.writeFile(path.join(temporary, "value.json"), '{"answer":42}\n', "utf8"),
        ];
        for (let index = 0; index < depth; index++) {
            const source = index + 1 < depth
                ? `export { token } from "./depth-${index + 1}.js";\n`
                : 'console.log("leaf-init");\nexport const token = 262;\n';
            writes.push(fs.writeFile(path.join(temporary, `depth-${index}.js`), source, "utf8"));
        }
        await Promise.all(writes);

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

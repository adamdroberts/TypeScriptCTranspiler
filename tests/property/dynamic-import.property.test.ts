import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import ts from "typescript";
import { compile } from "../../src/compile";
import { createEcmaSourceFile } from "../../src/ecmascript-source";
import {
    type DynamicImportSpecifiersParseResult,
    dynamicImportCalls,
    dynamicImportSpecifiersFromCall,
} from "../../src/module-request";

interface DynamicRequestPartition {
    readonly expression: string;
    readonly options?: string;
    readonly specifiers: readonly string[] | null;
    readonly diagnostic?: string;
}

const requestPartitions: readonly DynamicRequestPartition[] = [
    {
        expression: '"./plain.js"',
        specifiers: ["./plain.js"],
    },
    {
        expression: 'condition ? "./left.js" : "./right.js"',
        specifiers: ["./left.js", "./right.js"],
    },
    {
        expression: '`./${condition ? "left" : "right"}.js`',
        options: '{ with: { mode: "strict", type: "javascript" } }',
        specifiers: ["./left.js", "./right.js"],
    },
    {
        expression: '"./value.json"',
        options: '{ with: { type: "javascript", "type": "json" } }',
        specifiers: ["./value.json"],
    },
    {
        expression: "runtimeSpecifier()",
        specifiers: null,
        diagnostic: "finite AOT specifier proof",
    },
    {
        expression: '"./plain.js"',
        options: "runtimeOptions",
        specifiers: ["./plain.js"],
    },
    {
        expression: '"./plain.js"',
        options: '{ with: { ...runtimeAttributes } }',
        specifiers: ["./plain.js"],
    },
];

function parseDynamicSpecifiers(partition: DynamicRequestPartition): DynamicImportSpecifiersParseResult {
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
    return dynamicImportSpecifiersFromCall(calls[0]!)!;
}

test("dynamic import derives its canonical AOT target collection independently of runtime options", () => {
    for (const partition of requestPartitions) {
        const parsed = parseDynamicSpecifiers(partition);
        if (partition.specifiers === null) {
            expect(parsed.specifiers).toBeNull();
            expect(parsed.error).toContain(partition.diagnostic!);
        } else {
            expect(parsed.error).toBeNull();
            expect(parsed.specifiers).toEqual(partition.specifiers);
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

test("dynamic import target derivation is independent of alternative-set width", () => {
    const expected = Array.from({ length: 257 }, (_value, index) => `./target-${index}.js`);
    let specifier: ts.Expression = ts.factory.createStringLiteral(expected[expected.length - 1]!);
    for (let index = expected.length - 2; index >= 0; index--) {
        specifier = ts.factory.createConditionalExpression(
            ts.factory.createIdentifier(`condition${index}`),
            ts.factory.createToken(ts.SyntaxKind.QuestionToken),
            ts.factory.createStringLiteral(expected[index]!),
            ts.factory.createToken(ts.SyntaxKind.ColonToken),
            specifier,
        );
    }
    const call = ts.factory.createCallExpression(
        ts.factory.createToken(ts.SyntaxKind.ImportKeyword) as ts.Expression,
        undefined,
        [specifier],
    );
    expect(dynamicImportSpecifiersFromCall(call)).toEqual({ specifiers: expected, error: null });
});

function dynamicSubjectSource(): string {
    return [
        'console.log("before");',
        "const evaluationOrder: string[] = [];",
        'const runtimeOptions: any = { with: { type: "javascript" } };',
        'const missingSpecifier: any = "";',
        'const withSentinel: any = { name: "with" };',
        'const valueSentinel: any = { name: "value" };',
        'const optionsEvaluationSentinel: any = { name: "options-evaluation" };',
        'const specifierEvaluationSentinel: any = { name: "specifier-evaluation" };',
        "const enumerationTrace: string[] = [];",
        "const collectionTrace: string[] = [];",
        'const first = import(evaluationOrder.push("specifier") ? "./depth-0.js" : "./depth-0.js", (evaluationOrder.push("options"), runtimeOptions));',
        'console.log("evaluation:" + evaluationOrder.join(","));',
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
        "    .then(() => {",
        '        const dynamicBatch: any = [Promise.resolve("left"), "right"];',
        '        return Promise.all(dynamicBatch).then((values: any) => { console.log("dynamic-all:" + values.join(",")); });',
        "    })",
        '    .then(() => import("./depth-0.js", ("test262" in {} || undefined) as any).then(() => { console.log("logical-options:true"); }))',
        '    .then(() => import(missingSpecifier, undefined).then(() => { console.log("unresolved:false"); }, (error: any) => { console.log("unresolved:" + String(error instanceof TypeError)); }))',
        '    .then(() => import("./depth-0.js", 1 as any).then(() => { console.log("options-non-object:false"); }, (error: any) => { console.log("options-non-object:" + String(error instanceof TypeError)); }))',
        "    .then(() => {",
        '        const options: any = { get with() { throw withSentinel; } };',
        '        return import("./depth-0.js", options).then(() => { console.log("with-getter:false"); }, (error: any) => { console.log("with-getter:" + String(error === withSentinel)); });',
        "    })",
        '    .then(() => import("./depth-0.js", { with: 1 as any }).then(() => { console.log("with-non-object:false"); }, (error: any) => { console.log("with-non-object:" + String(error instanceof TypeError)); }))',
        "    .then(() => {",
        "        const attributes: any = new Proxy({}, {",
        '            ownKeys: () => { enumerationTrace.push("ownKeys"); return ["hidden", "type"]; },',
        '            getOwnPropertyDescriptor: (_target: any, key: any) => { enumerationTrace.push("desc:" + String(key)); return { configurable: true, enumerable: key === "type" }; },',
        '            get: (_target: any, key: any) => { enumerationTrace.push("get:" + String(key)); return "javascript"; },',
        "        });",
        '        return import("./depth-0.js", { with: attributes }).then(() => { console.log("enumeration:" + enumerationTrace.join("|")); });',
        "    })",
        "    .then(() => {",
        '        const attributes: any = { get type() { throw valueSentinel; } };',
        '        return import("./depth-0.js", { with: attributes }).then(() => { console.log("value-getter:false"); }, (error: any) => { console.log("value-getter:" + String(error === valueSentinel)); });',
        "    })",
        '    .then(() => import("./depth-0.js", { with: { type: 262 as any } }).then(() => { console.log("value-non-string:false"); }, (error: any) => { console.log("value-non-string:" + String(error instanceof TypeError)); }))',
        "    .then(() => {",
        "        const attributes: any = {};",
        '        Object.defineProperty(attributes, "unsupported", { enumerable: true, get: () => { collectionTrace.push("unsupported"); return "x"; } });',
        '        Object.defineProperty(attributes, "type", { enumerable: true, get: () => { collectionTrace.push("type"); return "javascript"; } });',
        '        return import("./depth-0.js", { with: attributes }).then(() => { console.log("unsupported-key:false"); }, (error: any) => { console.log("unsupported-key:" + String(error instanceof TypeError)); }).then(() => { console.log("collected:" + collectionTrace.join(",")); });',
        "    })",
        '    .then(() => import("./depth-0.js", { with: { type: "json" } }).then(() => { console.log("js-json-mismatch:false"); }, (error: any) => { console.log("js-json-mismatch:" + String(error instanceof TypeError)); }))',
        '    .then(() => import("./value.json").then(() => { console.log("json-missing-type:false"); }, (error: any) => { console.log("json-missing-type:" + String(error instanceof TypeError)); }))',
        "    .then(() => {",
        "        const throwOptions = (): any => { throw optionsEvaluationSentinel; };",
        "        try {",
        '            void import(missingSpecifier, throwOptions());',
        '            console.log("options-evaluation:false");',
        '        } catch (error) { console.log("options-evaluation:" + String(error === optionsEvaluationSentinel)); }',
        "    })",
        "    .then(() => {",
        "        const throwCondition = (): boolean => { throw specifierEvaluationSentinel; };",
        "        try {",
        '            void import(throwCondition() ? "./depth-0.js" : "./depth-0.js", runtimeOptions);',
        '            console.log("specifier-evaluation:false");',
        '        } catch (error) { console.log("specifier-evaluation:" + String(error === specifierEvaluationSentinel)); }',
        "    })",
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
        "evaluation:specifier,options",
        "after",
        "leaf-init",
        "value:262",
        "identity:true",
        "attribute-identity:true",
        "json:42",
        "dynamic-all:left,right",
        "logical-options:true",
        "unresolved:true",
        "options-non-object:true",
        "with-getter:true",
        "with-non-object:true",
        "enumeration:ownKeys|desc:hidden|desc:type|get:type",
        "value-getter:true",
        "value-non-string:true",
        "unsupported-key:true",
        "collected:unsupported,type",
        "js-json-mismatch:true",
        "json-missing-type:true",
        "options-evaluation:true",
        "specifier-evaluation:true",
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

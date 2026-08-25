import { expect, test } from "bun:test";
import ts from "typescript";
import {
    createEcmaSourceFile,
    ecmaImportAttributesParserShadow,
} from "../../src/ecmascript-source";
import {
    type ModuleRequest,
    moduleRequestFromDeclaration,
    moduleRequestsEqual,
    uniqueModuleRequests,
} from "../../src/module-request";
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

type ImportAttributesForm = "side-effect" | "namespace" | "named" | "star-export" | "named-export";

function attributedDeclaration(form: ImportAttributesForm, specifier: string, trivia: string): string {
    const head = form === "side-effect"
        ? `import ${JSON.stringify(specifier)}`
        : form === "namespace"
            ? `import * as namespace from ${JSON.stringify(specifier)}`
            : form === "named"
                ? `import { token } from ${JSON.stringify(specifier)}`
                : form === "star-export"
                    ? `export * from ${JSON.stringify(specifier)}`
                    : `export { token } from ${JSON.stringify(specifier)}`;
    return `${head}${trivia}with { type: "javascript" };\n`;
}

test("import attributes accept line-terminator trivia through one equal-width token worklist", () => {
    const forms: readonly ImportAttributesForm[] = [
        "side-effect",
        "namespace",
        "named",
        "star-export",
        "named-export",
    ];
    const triviaPartitions = [
        "\n",
        "\r\n",
        "\u2028",
        "\u2029",
        " /* block\ncomment */ ",
        " // line comment\n",
    ];
    for (const form of forms) {
        for (const trivia of triviaPartitions) {
            const source = attributedDeclaration(form, "./fixture.js", trivia);
            const shadow = ecmaImportAttributesParserShadow(source);
            expect(shadow.length).toBe(source.length);
            expect(shadow).not.toBe(source);
            const parsed = createEcmaSourceFile(
                `${form}.js`,
                source,
                ts.ScriptTarget.ESNext,
                true,
                ts.ScriptKind.JS,
            );
            expect(parsed.text).toBe(source);
            expect((parsed as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics ?? [])
                .toEqual([]);
            expect(parsed.getLineAndCharacterOfPosition(source.indexOf("with")).line).toBe(1);
        }
    }

    const dynamic = 'import("./fixture.js")\nwith ({});\n';
    expect(ecmaImportAttributesParserShadow(dynamic)).toBe(dynamic);
    const legacyAssert = 'import "./fixture.js"\nassert { type: "javascript" };\n';
    expect(ecmaImportAttributesParserShadow(legacyAssert)).toBe(legacyAssert);
});

test("import attributes parser shadow handles one representative wide module without shape-specific paths", () => {
    const source = Array.from({ length: 512 }, (_, index) =>
        attributedDeclaration("side-effect", `./fixture-${index}.js`, index % 2 === 0 ? "\n" : " /* x\ny */ "),
    ).join("");
    const shadow = ecmaImportAttributesParserShadow(source);
    expect(shadow.length).toBe(source.length);
    const parsed = createEcmaSourceFile(
        "wide.js",
        source,
        ts.ScriptTarget.ESNext,
        true,
        ts.ScriptKind.JS,
    );
    expect(parsed.text).toBe(source);
    expect((parsed as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics ?? [])
        .toEqual([]);
});

test("module linking reaches resolution after an attributed import line terminator", () => {
    const sources = new Map<string, string>([
        ["test/root.js", attributedDeclaration("named", "./fixture.js", "\n")],
        ["test/fixture.js", "export const other = 1;\n"],
    ]);
    expect(analyzeModuleGraph("test/root.js", sources)).toMatchObject({
        phase: "resolution",
        origin: "module-graph",
    });
});

test("module linking derives JSON synthetic-module resolution from strict source syntax", () => {
    const valid = new Map<string, string>([
        ["test/root.js", 'import value from "./value.json" with { type: "json" };\n'],
        ["test/value.json", '{"nested":[1,true,null]}\n'],
    ]);
    expect(analyzeModuleGraph("test/root.js", valid)).toBeNull();

    const named = new Map(valid);
    named.set("test/root.js", 'import { nested } from "./value.json" with { type: "json" };\n');
    expect(analyzeModuleGraph("test/root.js", named)).toMatchObject({
        phase: "resolution",
        origin: "module-graph",
    });

    const invalid = new Map(valid);
    invalid.set("test/value.json", "{ unquoted: true }\n");
    expect(analyzeModuleGraph("test/root.js", invalid)).toMatchObject({
        phase: "resolution",
        origin: "module-graph",
        diagnostics: expect.stringContaining("invalid JSON module"),
    });
});

function parsedModuleRequest(source: string): ModuleRequest {
    const sourceFile = createEcmaSourceFile(
        "request.js",
        source,
        ts.ScriptTarget.ESNext,
        true,
        ts.ScriptKind.JS,
    );
    const declaration = sourceFile.statements[0]!;
    expect(ts.isImportDeclaration(declaration)).toBeTrue();
    const parsed = moduleRequestFromDeclaration(declaration as ts.ImportDeclaration);
    expect(parsed?.error).toBeNull();
    return parsed!.request!;
}

function shuffled<T>(values: readonly T[], seed: number): T[] {
    const result = [...values];
    let state = seed >>> 0;
    for (let index = result.length - 1; index > 0; index--) {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        const other = state % (index + 1);
        [result[index], result[other]] = [result[other]!, result[index]!];
    }
    return result;
}

test("ModuleRequest identity is derived from one sorted attribute collection", () => {
    const attributes = Array.from({ length: 37 }, (_, index) => ({
        key: `key_${String(index).padStart(3, "0")}`,
        value: `value_${(index * 17) % 41}`,
    }));
    for (const seed of [0x10293847, 0x55667788, 0x90abcdef, 0xfedcba09]) {
        const declaration = (entries: readonly typeof attributes[number][]): string =>
            `import "./fixture.js" with { ${entries.map(({ key, value }) =>
                `${JSON.stringify(key)}: ${JSON.stringify(value)}`).join(", ")} };`;
        const left = parsedModuleRequest(declaration(shuffled(attributes, seed)));
        const right = parsedModuleRequest(declaration(shuffled(attributes, seed ^ 0x9e3779b9)));
        expect(left.attributes.map(({ key }) => key)).toEqual(attributes.map(({ key }) => key));
        expect(moduleRequestsEqual(left, right)).toBeTrue();
        expect(moduleRequestsEqual(left, {
            specifier: right.specifier,
            attributes: [...right.attributes].reverse(),
        })).toBeTrue();

        const changed = parsedModuleRequest(declaration([
            ...attributes.slice(0, -1),
            { ...attributes.at(-1)!, value: "different" },
        ]));
        expect(moduleRequestsEqual(left, changed)).toBeFalse();
        expect(uniqueModuleRequests([left, right, changed])).toEqual([left, changed]);
    }
});

test("static ModuleRequest linking covers attribute and resource-type partitions", () => {
    const plans: readonly {
        readonly declaration: string;
        readonly dependencyPath: string;
        readonly dependencySource: string;
        readonly expected: null | { phase: "parse" | "resolution"; origin: "test-source" | "module-graph" };
    }[] = [
        {
            declaration: 'import value from "./value.js";',
            dependencyPath: "test/value.js",
            dependencySource: "export default 1;",
            expected: null,
        },
        {
            declaration: 'import value from "./value.js" with { type: "javascript" };',
            dependencyPath: "test/value.js",
            dependencySource: "export default 1;",
            expected: null,
        },
        {
            declaration: 'import value from "./value.json" with { type: "json" };',
            dependencyPath: "test/value.json",
            dependencySource: "1",
            expected: null,
        },
        {
            declaration: 'import value from "./value.js" with { unknown: "value" };',
            dependencyPath: "test/value.js",
            dependencySource: "export default 1;",
            expected: { phase: "resolution", origin: "module-graph" },
        },
        {
            declaration: 'import value from "./value.json";',
            dependencyPath: "test/value.json",
            dependencySource: "1",
            expected: { phase: "resolution", origin: "module-graph" },
        },
        {
            declaration: 'import value from "./value.json" with { type: "javascript" };',
            dependencyPath: "test/value.json",
            dependencySource: "1",
            expected: { phase: "resolution", origin: "module-graph" },
        },
        {
            declaration: 'import value from "./value.js" with { type: "json" };',
            dependencyPath: "test/value.js",
            dependencySource: "export default 1;",
            expected: { phase: "resolution", origin: "module-graph" },
        },
        {
            declaration: 'import value from "./value.js" with { type: "json", "typ\\u0065": "json" };',
            dependencyPath: "test/value.js",
            dependencySource: "export default 1;",
            expected: { phase: "parse", origin: "test-source" },
        },
        {
            declaration: 'import value from "./value.js" assert { type: "javascript" };',
            dependencyPath: "test/value.js",
            dependencySource: "export default 1;",
            expected: { phase: "parse", origin: "test-source" },
        },
    ];

    for (const plan of plans) {
        const failure = analyzeModuleGraph("test/root.js", new Map([
            ["test/root.js", `${plan.declaration}\nvoid value;\n`],
            [plan.dependencyPath, plan.dependencySource],
        ]));
        if (plan.expected === null) expect(failure).toBeNull();
        else expect(failure).toMatchObject(plan.expected);
    }
});

test("duplicate decoded import-attribute keys in a dependency retain resolution origin", () => {
    const failure = analyzeModuleGraph("test/root.js", new Map([
        ["test/root.js", 'import "./dependency.js";'],
        ["test/dependency.js", 'import "./leaf.js" with { type: "javascript", "typ\\u0065": "javascript" };'],
        ["test/leaf.js", "export {};"],
    ]));
    expect(failure).toMatchObject({ phase: "resolution", origin: "module-graph" });
    expect(failure?.diagnostics).toContain("duplicate import attribute key");
});

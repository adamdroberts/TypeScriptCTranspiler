import { expect, test } from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { earlyControlFlowStaticSemanticsFailure } from "../../src/control-static-semantics";
import { compile } from "../../src/compile";

function subject(source: string): ts.SourceFile {
    return ts.createSourceFile("for-static.js", source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS);
}
function hostAccepts(source: string): boolean {
    try { new Function(source); return true; }
    catch (error) { if (!(error instanceof SyntaxError)) throw error; return false; }
}

const bindings = [
    { name: "bound", value: "0" },
    { name: "[bound, ...rest]", value: "[]" },
    { name: "{item: [bound], ...rest}", value: "{}" },
];
const heads = [
    (name: string, value: string) => `for (let ${name} = ${value}; false;)`,
    (name: string, value: string) => `for (const ${name} = ${value}; false;)`,
    (name: string) => `for (let ${name} of [])`,
    (name: string) => `for (const ${name} in {})`,
];
const contexts = [
    (body: string) => `{ ${body} }`,
    (body: string) => `{ if (false) { ${body} } }`,
    (body: string) => `{ switch (0) { default: ${body} } }`,
    (body: string) => `{ try {} finally { ${body} } }`,
    (body: string) => `{ for (let other = 0; false;) { ${body} } }`,
    (body: string) => `{ function nested() { ${body} } }`,
    (body: string) => `{ class Nested { static { ${body} } } }`,
];

test("lexical iteration early errors follow BoundNames and var-scope boundaries", () => {
    const programs = bindings.flatMap(binding => heads.flatMap(head => contexts.map(context =>
        `${head(binding.name, binding.value)} ${context("var {item: bound} = {};")}`)));
    programs.push(
        "for (let bound = 0; false;) { let bound = 1; }",
        "for (let bound = 0; false;) { for (let bound = 1; false;) {} }",
        "for (let bound = class { static { var bound; } }; false;) {}",
        "for (var bound = 0; false;) { var bound; }",
        "for (let bound = 0; false;) {} var bound;",
        "class C { static { for (let bound = 0; false;) { var bound; } } }",
        "for (let [bound, bound] = []; false;) {}",
        "for (const {a: bound, b: bound} of []) {}",
        "for (let bound = 0, bound = 1; false;) {}",
        "for (const bound; false;) {}",
        "for (let let = 1; false;) {}",
        "for (const {let} of []) {}",
    );
    for (const strict of [false, true]) {
        for (const source of programs) {
            const program = (strict ? '"use strict";\n' : "") + source;
            expect({ source: program, accepted: earlyControlFlowStaticSemanticsFailure(subject(program)) === null })
                .toEqual({ source: program, accepted: hostAccepts(program) });
        }
    }
});

test("ordinary const and binding-pattern heads require the grammar's initializer", () => {
    // Bun/JSC's Function parser accepts an uninitialized pattern here. The
    // pinned LexicalBinding/VariableDeclaration grammars and Node reject it;
    // verify that partition independently of the host acceptance oracle.
    for (const source of ["for (const bound; false;) {}", "for (let [bound]; false;) {}", "for (var {bound}; false;) {}"]) {
        expect(earlyControlFlowStaticSemanticsFailure(subject(source))?.message)
            .toBe("for binding pattern or const declaration requires an initializer");
    }
});

test("one explicit control worklist retains lexical constraints through a deep statement tree", () => {
    const source = subject("for (let bound = 0; false;) { var bound; }");
    const loop = source.statements[0] as ts.ForStatement;
    let body = loop.statement;
    for (let depth = 0; depth < 8192; depth++) body = ts.factory.createBlock([body]);
    const deepLoop = ts.factory.updateForStatement(loop, loop.initializer, loop.condition, loop.incrementor, body);
    const tree = ts.factory.updateSourceFile(source, [deepLoop]);
    expect(earlyControlFlowStaticSemanticsFailure(tree)?.message)
        .toBe("lexical iteration binding 'bound' conflicts with a body var declaration");
});

test("compiler rejects lexical head/body conflicts before emitting unreachable code", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-for-static-"));
    try {
        const entry = path.join(temporary, "subject.js"), diagnostics: string[] = [];
        await fs.writeFile(entry, "for (let [bound] = []; false;) { if (false) { var bound; } }");
        const result = await compile({ entry, output: path.join(temporary, "output"),
            buildDir: path.join(temporary, "build"), diagnosticWriter: message => diagnostics.push(message) });
        expect(result.exitCode).toBe(2); expect(result.mainC).toBe("");
        expect(diagnostics.join("")).toContain("lexical iteration binding 'bound' conflicts with a body var declaration");
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
});

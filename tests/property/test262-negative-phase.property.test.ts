import { expect, test } from "bun:test";
import ts from "typescript";
import { earlyControlFlowFailure } from "../../src/control-static-semantics";
import { createEcmaSourceFile } from "../../src/ecmascript-source";
import { earlyModuleStaticSemanticsFailure } from "../../src/module-static-semantics";

interface ControlFlowPartition {
    readonly source: string;
    readonly diagnostic: string | null;
}

const controlFlowPartitions: readonly ControlFlowPartition[] = [
    { source: "return;\n", diagnostic: "return statement is not contained in a function body" },
    { source: "break;\n", diagnostic: "break statement is not contained in an iteration or switch statement" },
    { source: "continue;\n", diagnostic: "continue statement is not contained in an iteration statement" },
    { source: "break absent;\n", diagnostic: "break target 'absent' is not an active label" },
    { source: "block: { continue block; }\n", diagnostic: "continue target 'block' is not an active iteration label" },
    { source: "same: { same: ; }\n", diagnostic: "duplicate active label 'same'" },
    { source: "++(1);\n", diagnostic: "update expression operand is not a valid assignment target" },
    { source: "function valid() { return; }\n", diagnostic: null },
    { source: "while (false) { continue; break; }\n", diagnostic: null },
    { source: "switch (0) { case 0: break; }\n", diagnostic: null },
    { source: "loop: while (false) { continue loop; }\n", diagnostic: null },
    { source: "block: { break block; }\n", diagnostic: null },
    {
        source: "while (false) { function nested() { break; } }\n",
        diagnostic: "break statement is not contained in an iteration or switch statement",
    },
];

function parsedScript(source: string): ts.SourceFile {
    return createEcmaSourceFile(
        "negative-phase.js",
        source,
        ts.ScriptTarget.ESNext,
        true,
        ts.ScriptKind.JS,
    );
}

interface ModuleStaticSemanticsPartition {
    readonly source: string;
    readonly diagnostic: string | null;
}

const moduleStaticSemanticsPartitions: readonly ModuleStaticSemanticsPartition[] = [
    {
        source: "let { nested: { value } } = { nested: { value: 1 } }; const value = 2;\n",
        diagnostic: "LexicallyDeclaredNames contains duplicate 'value'",
    },
    {
        source: "import { value as local } from './dependency.js'; let local;\n",
        diagnostic: "LexicallyDeclaredNames contains duplicate 'local'",
    },
    {
        source: "let shared; { { var shared; } }\n",
        diagnostic: "LexicallyDeclaredNames and VarDeclaredNames both contain 'shared'",
    },
    {
        source: "let left, right; export { left as duplicate, right as duplicate };\n",
        diagnostic: "ExportedNames contains duplicate 'duplicate'",
    },
    {
        source: "export { absent };\n",
        diagnostic: "exported binding 'absent' is not declared by this Module",
    },
    {
        source: "import { value as eval } from './dependency.js';\n",
        diagnostic: "binding identifier 'eval' is not permitted in Module strict mode",
    },
    {
        source: "function nested(arguments) { return arguments; }\n",
        diagnostic: "binding identifier 'arguments' is not permitted in Module strict mode",
    },
    {
        source: "var public;\n",
        diagnostic: "binding identifier 'public' is not permitted in Module strict mode",
    },
    {
        source: "with (object) { value; }\n",
        diagnostic: "with statements are not permitted in Module strict mode",
    },
    {
        source: "delete unqualified;\n",
        diagnostic: "deleting an unqualified identifier is not permitted in Module strict mode",
    },
    {
        source: "eval = replacement;\n",
        diagnostic: "assignment to 'eval' is not permitted in Module strict mode",
    },
    {
        source: "const inherited = () => new.target;\n",
        diagnostic: "ModuleItemList contains NewTarget",
    },
    {
        source: "super.value;\n",
        diagnostic: "ModuleItemList contains super",
    },
    {
        source: "class Declares { #secret; } new Declares().#secret;\n",
        diagnostic: "private identifier '#secret' is not valid in this lexical private environment",
    },
    {
        source: "function outside() { return receiver.#secret; }\n",
        diagnostic: "private identifier '#secret' is not valid in this lexical private environment",
    },
    {
        source: "import { value as local } from './dependency.js'; export { local };\n",
        diagnostic: null,
    },
    {
        source: "export default function named() { return new.target; }\n",
        diagnostic: null,
    },
    {
        source: "export default function() { return 1; }\n",
        diagnostic: null,
    },
    {
        source: "class Derived extends Base { method() { return super.value; } } export { Derived };\n",
        diagnostic: null,
    },
    {
        source: "class Outer { #secret = 1; method() { const self = this; return class Inner { read() { return self.#secret; } }; } }\n",
        diagnostic: null,
    },
    {
        source: "const object = { public: 1, eval: 2, arguments: 3 }; export { object };\n",
        diagnostic: null,
    },
    {
        source: "const local = 1; export { local as \"\\uD800\" };\n",
        diagnostic: "ModuleExportName StringLiteral is not well-formed Unicode",
    },
    {
        source: "const local = 1; export { local as \"\\uD83D\\uDE00\" };\n",
        diagnostic: null,
    },
];

function parsedModule(source: string): ts.SourceFile {
    return createEcmaSourceFile(
        "module-static-semantics.js",
        source,
        ts.ScriptTarget.ESNext,
        true,
        ts.ScriptKind.JS,
    );
}

test("Test262 parse-phase control-flow classification derives from one contextual source-tree worklist", () => {
    for (const partition of controlFlowPartitions) {
        const diagnostic = earlyControlFlowFailure(parsedScript(partition.source));
        if (partition.diagnostic === null) expect(diagnostic).toBeNull();
        else expect(diagnostic).toContain(partition.diagnostic);
    }

    expect(earlyControlFlowFailure(parsedScript("break;\nreturn;\n")))
        .toContain("negative-phase.js:1:1: break statement");
});

test("Test262 parse-phase classification uses one representative deeply nested AST worklist", () => {
    let statement: ts.Statement = ts.factory.createEmptyStatement();
    for (let depth = 0; depth < 8192; depth++) {
        statement = ts.factory.createBlock([statement]);
    }
    const sourceFile = ts.factory.createSourceFile(
        [statement],
        ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
        ts.NodeFlags.None,
    );
    expect(earlyControlFlowFailure(sourceFile)).toBeNull();
});

test("Module early errors derive from canonical name collections and Contains worklists", () => {
    for (const partition of moduleStaticSemanticsPartitions) {
        const failure = earlyModuleStaticSemanticsFailure(parsedModule(partition.source));
        if (partition.diagnostic === null) expect(failure).toBeNull();
        else expect(failure?.message).toContain(partition.diagnostic);
    }
});

test("Module VarDeclaredNames uses one representative deeply nested statement worklist", () => {
    const lexical = ts.factory.createVariableStatement(
        undefined,
        ts.factory.createVariableDeclarationList(
            [ts.factory.createVariableDeclaration("shared")],
            ts.NodeFlags.Let,
        ),
    );
    let nested: ts.Statement = ts.factory.createVariableStatement(
        undefined,
        ts.factory.createVariableDeclarationList(
            [ts.factory.createVariableDeclaration("shared")],
            ts.NodeFlags.None,
        ),
    );
    for (let depth = 0; depth < 8192; depth++) nested = ts.factory.createBlock([nested]);
    const sourceFile = ts.factory.createSourceFile(
        [lexical, nested],
        ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
        ts.NodeFlags.None,
    );
    expect(earlyModuleStaticSemanticsFailure(sourceFile)?.message)
        .toContain("LexicallyDeclaredNames and VarDeclaredNames both contain 'shared'");
});

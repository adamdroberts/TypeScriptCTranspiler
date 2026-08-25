import { expect, test } from "bun:test";
import ts from "typescript";
import { createEcmaSourceFile } from "../../src/ecmascript-source";
import { earlyControlFlowFailure } from "../test262/native-host";

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

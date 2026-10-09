import { expect, test } from "bun:test";
import ts from "typescript";
import { createEcmaSourceFile, type EcmaParseGoal } from "../../src/ecmascript-source";
import { earlyFunctionStaticSemanticsFailure } from "../../src/function-static-semantics";
import { earlyControlFlowStaticSemanticsFailure } from "../../src/control-static-semantics";

interface Partition { source: string; goal: EcmaParseGoal; valid: boolean; }
const partitions: Partition[] = [];
for (const name of ["await", "aw\\u0061it"]) {
    for (const goal of ["script", "module"] as const) {
        partitions.push({ source: `async function ${name}() { return 1; } ${name} instanceof Function;`, goal, valid: goal === "script" });
        partitions.push({ source: `var ${name} = function () {}; ${name}(1);`, goal, valid: goal === "script" });
        partitions.push({ source: `function ordinary(${name}) { return ${name} + 1; }`, goal, valid: goal === "script" });
        partitions.push({ source: `async function outer() { function ${name}() {} }`, goal, valid: false });
        partitions.push({ source: `async function outer() { const value = function ${name}() {}; }`, goal, valid: goal === "script" });
        partitions.push({ source: `async function outer() { function ordinary(${name}) { return ${name} + 1; } }`, goal, valid: goal === "script" });
        partitions.push({ source: `async function outer() { const { ${name}: value } = {}; return value; }`, goal, valid: true });
        partitions.push({ source: `async function outer() { const { ${name} } = {}; }`, goal, valid: false });
        partitions.push({ source: `async function outer() { const value = (${name}) => 1; }`, goal, valid: false });
        partitions.push({ source: `async function outer(${name}) {}`, goal, valid: false });
    }
}
for (const target of ["(await 1)", "(1 + 2)", "null", "({ value: 1 })", "receiver?.value", "[...(receiver + 1)]", "({ ...{ value } })", "[...rest, value]"]) {
    partitions.push({ source: `async function outer() { ${target} = input; }`, goal: "script", valid: false });
}
for (const target of ["value", "(value)", "receiver.value", "receiver[key]", "[value, { nested: receiver.value }, ...rest]", "{ value, other: [nested = 1], ...rest }"]) {
    partitions.push({ source: `async function outer() { (${target} = input); }`, goal: "script", valid: true });
}
for (const operator of ["+=", "&&=", "||=", "??="])
    partitions.push({ source: `async function outer() { (await 1) ${operator} input; }`, goal: "script", valid: false });
partitions.push({ source: "async function outer(value = await 1) {}", goal: "script", valid: false });
partitions.push({ source: "const value = 1; export { value as await };", goal: "module", valid: true });
partitions.push({ source: 'export { await } from "module";', goal: "module", valid: true });
partitions.push({ source: 'import { await as value } from "module";', goal: "module", valid: true });
partitions.push({ source: 'import value from "module" with { await: "value" };', goal: "module", valid: true });
for (const body of ["var await;", "await(1);", "function await() {}"])
    partitions.push({ source: `class C { static { ${body} } }`, goal: "script", valid: false });
for (const body of ["function ordinary(await) {}", "const value = function await() {};"])
    partitions.push({ source: `class C { static { ${body} } }`, goal: "script", valid: true });

function parsed(partition: Partition): ts.SourceFile {
    return createEcmaSourceFile("await-context.js", partition.source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS, partition.goal);
}
function accepted(partition: Partition): boolean {
    const sourceFile = parsed(partition);
    return !(sourceFile as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics.length &&
        !earlyFunctionStaticSemanticsFailure(sourceFile) && !earlyControlFlowStaticSemanticsFailure(sourceFile);
}

test("Await grammar context is projected through one source tree and preserves exact reference spans", () => {
    for (const partition of partitions) {
        expect({ source: partition.source, goal: partition.goal, accepted: accepted(partition) }).toEqual({
            source: partition.source, goal: partition.goal, accepted: partition.valid });
        const sourceFile = parsed(partition);
        expect(sourceFile.text).toBe(partition.source);
    }
    const source = 'var aw\\u0061it = function () {}; aw\\u0061it instanceof Function;';
    const sourceFile = parsed({ source, goal: "script", valid: true });
    const worklist: ts.Node[] = [sourceFile];
    while (worklist.length) {
        const node = worklist.pop()!;
        if (ts.isIdentifier(node) && node.text === "await") expect(source.slice(node.getStart(sourceFile), node.end)).toBe("aw\\u0061it");
        node.forEachChild(child => { worklist.push(child); });
    }
    // One representative deeply nested input; the worklist reaches the same
    // invalid leaf independently of branch depth and declaration cardinality.
    const deep = parsed({ source: "async function outer() {" + "{".repeat(384) + "(await 1) = input;" + "}".repeat(384) + "}", goal: "script", valid: false });
    expect(earlyControlFlowStaticSemanticsFailure(deep)?.message).toBe("assignment expression left-hand side is not a valid assignment target");
});

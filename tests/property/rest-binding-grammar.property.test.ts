import { expect, test } from "bun:test";
import ts from "typescript";
import { createEcmaSourceFile } from "../../src/ecmascript-source";
import { earlyControlFlowStaticSemanticsFailure } from "../../src/control-static-semantics";
import { nodeAcceptsScripts } from "./node-reference";

function compilerAccepts(source: string): boolean {
    const tree = createEcmaSourceFile("source.js", source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS, "script");
    const diagnostics = (tree as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics;
    return !diagnostics?.length && earlyControlFlowStaticSemanticsFailure(tree) === null;
}

// The reference parser is the reference Node's (one batch, nodeAcceptsScripts).
test("one source-tree validator checks rest grammar at every binding edge", () => {
    const cases: string[] = [];
    const patterns = [
        "[...x]", "[x,...y]", "[...[x,y]]", "[...{length:x}]", "[x=1,...y]",
        "[...x,]", "[...x,y]", "[...x=1]", "[...[x]=[]]", "[...{x}={}]",
        "{...x}", "{a:x,...y}", "{...x,}", "{...x,y}", "{...x={}}", "{...{x}}", "{...a:x}",
    ];
    const owners = [
        (pattern: string) => `var ${pattern}=[];`,
        (pattern: string) => `let ${pattern}=[];`,
        (pattern: string) => `const ${pattern}=[];`,
        (pattern: string) => `function f(${pattern}){}`,
        (pattern: string) => `(${pattern})=>0;`,
        (pattern: string) => `class C{m(${pattern}){}}`,
        (pattern: string) => `try{}catch(${pattern}){}`,
        (pattern: string) => `for(let ${pattern} of []){}`,
    ];
    let state = 0x9a87bc;
    for (const root of patterns) {
        let pattern = root;
        for (let wrap = 0; wrap < 4; wrap++) {
            for (const owner of owners) for (const strict of [false, true]) {
                const source = (strict ? '"use strict";' : "") + owner(pattern);
                cases.push(source);
            }
            state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
            pattern = state & 1 ? `[${pattern}]` : `{p:${pattern}}`;
        }
    }
    for (const parameters of ["...x", "x,...y", "...[x,y]", "...{length:x}", "...x,", "...x,y", "...x=[]", "x,...y={}"]) {
        for (const source of [`function f(${parameters}){}`, `(${parameters})=>0;`, `class C{m(${parameters}){}}`])
            cases.push(source);
    }
    const deep = "[".repeat(256) + "[...x,y]" + "]".repeat(256);
    const source = `try{}catch(${deep}){}`;
    expect(compilerAccepts(source)).toBe(false);
    cases.push(source);
    const native = nodeAcceptsScripts(cases);
    expect(cases.flatMap((source, index) => compilerAccepts(source) === native[index] ? [] : [{ source, native: native[index] }])).toEqual([]);
    expect(native.at(-1)).toBe(false);
});

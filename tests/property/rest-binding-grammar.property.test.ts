import { expect, test } from "bun:test";
import vm from "node:vm";
import ts from "typescript";
import { createEcmaSourceFile } from "../../src/ecmascript-source";
import { earlyControlFlowStaticSemanticsFailure } from "../../src/control-static-semantics";

function nativeAccepts(source: string): boolean {
    try { new vm.Script(source); return true; }
    catch (error) { if (error instanceof SyntaxError) return false; throw error; }
}
function compilerAccepts(source: string): boolean {
    const tree = createEcmaSourceFile("source.js", source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS, "script");
    const diagnostics = (tree as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics;
    return !diagnostics?.length && earlyControlFlowStaticSemanticsFailure(tree) === null;
}

test("one source-tree validator checks rest grammar at every binding edge", () => {
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
                expect({ source, accepted: compilerAccepts(source) }).toEqual({ source, accepted: nativeAccepts(source) });
            }
            state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
            pattern = state & 1 ? `[${pattern}]` : `{p:${pattern}}`;
        }
    }
    for (const parameters of ["...x", "x,...y", "...[x,y]", "...{length:x}", "...x,", "...x,y", "...x=[]", "x,...y={}"]) {
        for (const source of [`function f(${parameters}){}`, `(${parameters})=>0;`, `class C{m(${parameters}){}}`])
            expect({ source, accepted: compilerAccepts(source) }).toEqual({ source, accepted: nativeAccepts(source) });
    }
    const deep = "[".repeat(256) + "[...x,y]" + "]".repeat(256);
    const source = `try{}catch(${deep}){}`;
    expect(compilerAccepts(source)).toBe(false);
    expect(nativeAccepts(source)).toBe(false);
});

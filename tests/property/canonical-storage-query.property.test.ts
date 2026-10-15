import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";
import { buildProgram, resolvePackageRoot } from "../../src/program";
import { buildModuleGraph } from "../../src/resolve";
import { emitProgram } from "../../src/emit";

test("canonical slots, aggregate Values and literal Reference keys precede contextual inference", async () => {
    const root = await mkdtemp(join(tmpdir(), "tsc2c-canonical-query-"));
    try {
        const entry = join(root, "subject.js");
        await writeFile(entry, `
function record(method, value) {
    const owner = {};
    owner.handler = function() { return value; };
    const rows = [method, value];
    return [rows, owner.handler()];
}
console.log(JSON.stringify(record('next', 41)));
`);
        const built = buildProgram({ entry, packageRoot: resolvePackageRoot() });
        const graph = buildModuleGraph(built.program, built.libCoreDts, built.entrySourceFile.fileName);
        const arrays = new Set<ts.Node>(), slots = new Set<ts.Node>(), keys = new Set<ts.Node>();
        const visit = (node: ts.Node): void => {
            if (ts.isArrayLiteralExpression(node)) {
                arrays.add(node);
                for (const element of node.elements) if (ts.isIdentifier(element)) slots.add(element);
            }
            if (ts.isBinaryExpression(node) && ts.isPropertyAccessExpression(node.left)) keys.add(node.left);
            ts.forEachChild(node, visit);
        };
        visit(built.entrySourceFile);
        expect(arrays.size > 0 && slots.size > 0 && keys.size > 0).toBe(true);
        const queried: string[] = [];
        const checker = new Proxy(built.checker, { get(target, key, receiver) {
            if (key === "getContextualType" || key === "getTypeAtLocation") return (node: ts.Node, ...args: unknown[]) => {
                if (key === "getContextualType" && (arrays.has(node) || slots.has(node)) ||
                    key === "getTypeAtLocation" && keys.has(node)) {
                    queried.push(`${String(key)}:${node.getText()}`);
                    throw new Error("canonical producer requested unrelated contextual inference");
                }
                return (Reflect.get(target, key, receiver) as Function)(node, ...args);
            };
            return Reflect.get(target, key, receiver);
        } });
        const emitted = emitProgram(graph, checker);
        expect(emitted.diagnostics).toEqual([]);
        expect(queried).toEqual([]);
        expect(emitted.mainC).toContain("tsc_value_array(");
    } finally { await rm(root, { recursive: true, force: true }); }
});

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { emitterMethodGraph } from "./emitter-method-graph";

const emitterPath = path.resolve(import.meta.dir, "../emit/index.ts");
const sourceText = fs.readFileSync(emitterPath, "utf8");
const program = ts.createProgram([emitterPath], {
    target: ts.ScriptTarget.Latest,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
    noEmit: true,
});
const sourceFile = program.getSourceFile(emitterPath);
if (!sourceFile) throw new Error("could not load emitter source");
const findEmitter = (node: ts.Node): ts.ClassDeclaration | null => {
    if (ts.isClassDeclaration(node) && node.name?.text === "Emitter") {
        return node;
    }
    let found: ts.ClassDeclaration | null = null;
    ts.forEachChild(node, (child) => {
        found ??= findEmitter(child);
    });
    return found;
};
const emitterClass = findEmitter(sourceFile);
if (!emitterClass) throw new Error("could not find Emitter class");

const { methods, reachable } = emitterMethodGraph(program, emitterClass);

const unreachableMethods = [...methods]
    .filter(([name]) => !reachable.has(name))
    .map(([name, declaration]) => ({ name, declaration }));
if (process.argv.includes("--list-all")) {
    for (const { name } of unreachableMethods) console.log(name);
    process.exit(0);
}

if (unreachableMethods.length === 0) process.exit(0);

if (!process.argv.includes("--fix")) {
    for (const { name } of unreachableMethods) console.error(name);
    process.exit(1);
}

const ranges = unreachableMethods
    .map(({ declaration }) => ({ start: declaration.getFullStart(), end: declaration.end }))
    .sort((left, right) => right.start - left.start);
let rewritten = sourceText;
for (const range of ranges) {
    rewritten = rewritten.slice(0, range.start) + rewritten.slice(range.end);
}
fs.writeFileSync(emitterPath, rewritten);

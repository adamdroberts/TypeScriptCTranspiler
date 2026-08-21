import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const emitterPath = path.resolve(import.meta.dir, "../emit/index.ts");
const sourceText = fs.readFileSync(emitterPath, "utf8");
const sourceFile = ts.createSourceFile(
    emitterPath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
);

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

const methods = new Map<string, ts.MethodDeclaration>();
for (const member of emitterClass.members) {
    if (ts.isMethodDeclaration(member) && ts.isIdentifier(member.name)) {
        methods.set(member.name.text, member);
    }
}

const edges = new Map<string, Set<string>>();
for (const [name, method] of methods) {
    const referenced = new Set<string>();
    const visit = (node: ts.Node): void => {
        if (ts.isPropertyAccessExpression(node) &&
            node.expression.kind === ts.SyntaxKind.ThisKeyword &&
            methods.has(node.name.text)) {
            referenced.add(node.name.text);
        } else if (ts.isElementAccessExpression(node) &&
            node.expression.kind === ts.SyntaxKind.ThisKeyword &&
            ts.isStringLiteral(node.argumentExpression) &&
            methods.has(node.argumentExpression.text)) {
            referenced.add(node.argumentExpression.text);
        }
        ts.forEachChild(node, visit);
    };
    if (method.body) visit(method.body);
    edges.set(name, referenced);
}

const reachable = new Set<string>();
const worklist = ["run"];
while (worklist.length > 0) {
    const name = worklist.pop()!;
    if (reachable.has(name)) continue;
    if (!methods.has(name)) throw new Error(`unknown emitter reachability root: ${name}`);
    reachable.add(name);
    for (const referenced of edges.get(name) ?? []) worklist.push(referenced);
}

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

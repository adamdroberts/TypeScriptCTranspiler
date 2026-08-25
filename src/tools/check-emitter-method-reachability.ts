import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

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
const checker = program.getTypeChecker();

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

function unwrapAliasInitializer(expression: ts.Expression): ts.Expression {
    let current = expression;
    while (
        ts.isParenthesizedExpression(current) ||
        ts.isAsExpression(current) ||
        ts.isTypeAssertionExpression(current) ||
        ts.isNonNullExpression(current) ||
        ts.isSatisfiesExpression(current)
    ) {
        current = current.expression;
    }
    return current;
}

function isConstIdentifierDeclaration(node: ts.Node): node is ts.VariableDeclaration & { name: ts.Identifier } {
    return ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        ts.isVariableDeclarationList(node.parent) &&
        (node.parent.flags & ts.NodeFlags.Const) !== 0;
}

function childHasEmitterThis(node: ts.Node, parentHasEmitterThis: boolean): boolean {
    if (ts.isArrowFunction(node)) return parentHasEmitterThis;
    if (ts.isFunctionLike(node) || ts.isClassLike(node)) return false;
    return parentHasEmitterThis;
}

/**
 * Resolve immutable lexical aliases such as `const emitter = this` by symbol
 * identity. Nested ordinary functions may use that alias even though their own
 * `this` is unrelated; arrows retain the surrounding emitter `this`.
 */
function emitterThisAliases(method: ts.MethodDeclaration): Set<ts.Symbol> {
    const aliases = new Set<ts.Symbol>();
    const collectDirectAliases = (node: ts.Node, hasEmitterThis: boolean): void => {
        if (isConstIdentifierDeclaration(node) && node.initializer) {
            const initializer = unwrapAliasInitializer(node.initializer);
            const symbol = checker.getSymbolAtLocation(node.name);
            if (hasEmitterThis && initializer.kind === ts.SyntaxKind.ThisKeyword && symbol) {
                aliases.add(symbol);
            }
        }
        const childContext = childHasEmitterThis(node, hasEmitterThis);
        ts.forEachChild(node, (child) => collectDirectAliases(child, childContext));
    };
    if (method.body) collectDirectAliases(method.body, true);

    let changed = true;
    while (changed) {
        changed = false;
        const collectTransitiveAliases = (node: ts.Node): void => {
            if (isConstIdentifierDeclaration(node) && node.initializer) {
                const initializer = unwrapAliasInitializer(node.initializer);
                const source = ts.isIdentifier(initializer)
                    ? checker.getSymbolAtLocation(initializer)
                    : undefined;
                const target = checker.getSymbolAtLocation(node.name);
                if (source && target && aliases.has(source) && !aliases.has(target)) {
                    aliases.add(target);
                    changed = true;
                }
            }
            ts.forEachChild(node, collectTransitiveAliases);
        };
        if (method.body) collectTransitiveAliases(method.body);
    }
    return aliases;
}

const edges = new Map<string, Set<string>>();
for (const [name, method] of methods) {
    const referenced = new Set<string>();
    const aliases = emitterThisAliases(method);
    const isEmitterReceiver = (node: ts.Expression, hasEmitterThis: boolean): boolean =>
        (node.kind === ts.SyntaxKind.ThisKeyword && hasEmitterThis) ||
        (ts.isIdentifier(node) && aliases.has(checker.getSymbolAtLocation(node)!));
    const visit = (node: ts.Node, hasEmitterThis: boolean): void => {
        if (ts.isPropertyAccessExpression(node) &&
            isEmitterReceiver(node.expression, hasEmitterThis) &&
            methods.has(node.name.text)) {
            referenced.add(node.name.text);
        } else if (ts.isElementAccessExpression(node) &&
            isEmitterReceiver(node.expression, hasEmitterThis) &&
            ts.isStringLiteral(node.argumentExpression) &&
            methods.has(node.argumentExpression.text)) {
            referenced.add(node.argumentExpression.text);
        }
        const childContext = childHasEmitterThis(node, hasEmitterThis);
        ts.forEachChild(node, (child) => visit(child, childContext));
    };
    if (method.body) visit(method.body, true);
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

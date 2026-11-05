import path from "node:path";
import ts from "typescript";

/** PerformEval context of a direct eval call site: whether the this
 * environment is a class field initializer or static block (ContainsArguments
 * is an early error; the specification names only the initializer, V8 and
 * Node reject both while JSC admits the block, and Node wins), whether
 * SuperProperty is admitted (a method, accessor, field initializer, static
 * block or constructor environment) and whether SuperCall is admitted (a
 * derived class constructor). An indirect eval, a Script and a Module admit
 * neither. */
export const EVAL_CONTEXT_FIELD_INITIALIZER = 1;
export const EVAL_CONTEXT_SUPER_PROPERTY = 2;
export const EVAL_CONTEXT_SUPER_CALL = 4;

const fileContexts = new Map<string, number>();

/** Record the context of a compiled direct eval entry file. */
export function setEvalSourceContext(file: string, context: number): void {
    fileContexts.set(path.resolve(file), context);
}

/** The recorded context of an eval entry file, or null for ordinary source. */
export function evalSourceContext(sourceFile: ts.SourceFile): number | null {
    return fileContexts.get(path.resolve(sourceFile.fileName)) ?? null;
}

function isStaticMember(node: ts.Node): boolean {
    return ts.canHaveModifiers(node) && (ts.getModifiers(node)?.some(modifier => modifier.kind === ts.SyntaxKind.StaticKeyword) ?? false);
}

export function classHasHeritage(node: ts.ClassLikeDeclaration): boolean {
    return node.heritageClauses?.some(clause => clause.token === ts.SyntaxKind.ExtendsKeyword) ?? false;
}

/** The context a direct eval at `node` evaluates in, found by one ascent
 * through arrow functions and element keys to the first function, field
 * initializer, static block or source file (an eval entry inherits its own). */
export function directEvalContext(node: ts.Node): number {
    for (let current: ts.Node = node, parent: ts.Node | undefined = node.parent; parent; current = parent, parent = parent.parent) {
        if (ts.isArrowFunction(parent)) continue;
        if ((ts.isFunctionLike(parent) || ts.isPropertyDeclaration(parent) || ts.isPropertyAssignment(parent)) && "name" in parent && parent.name === current) continue;
        if (ts.isPropertyDeclaration(parent)) return EVAL_CONTEXT_FIELD_INITIALIZER | EVAL_CONTEXT_SUPER_PROPERTY;
        if (ts.isClassStaticBlockDeclaration(parent)) return EVAL_CONTEXT_FIELD_INITIALIZER | EVAL_CONTEXT_SUPER_PROPERTY;
        if (ts.isConstructorDeclaration(parent) && !isStaticMember(parent))
            return EVAL_CONTEXT_SUPER_PROPERTY | (ts.isClassLike(parent.parent) && classHasHeritage(parent.parent) ? EVAL_CONTEXT_SUPER_CALL : 0);
        if (ts.isMethodDeclaration(parent) || ts.isGetAccessorDeclaration(parent) || ts.isSetAccessorDeclaration(parent) || ts.isConstructorDeclaration(parent))
            return EVAL_CONTEXT_SUPER_PROPERTY;
        if (ts.isFunctionLike(parent)) return 0;
        if (ts.isSourceFile(parent)) return evalSourceContext(parent) ?? 0;
    }
    return 0;
}

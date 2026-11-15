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

/** The referrer of an ImportCall in code created by eval or the Function
 * constructor is GetActiveScriptOrModule(): the Script or Module whose code
 * made the call (Node and Bun resolve `eval("import('./m.js')")` against
 * the calling script). Each compiled eval or function source entry records the
 * files whose calls create it; a null referrer is a caller the program does
 * not know (a runtime-code manifest entry). */
const evalReferrers = new Map<string, Set<string | null>>();

/** Register a compiled eval or function source entry before its callers are
 * known, so its ImportCalls resolve nowhere until they are. */
export function addEvalSourceEntry(file: string): void {
    const key = path.resolve(file);
    if (!evalReferrers.has(key)) evalReferrers.set(key, new Set());
}

/** Record that `referrer`'s code creates the source compiled at `file`.
 * Returns whether the record is new. */
export function addEvalSourceReferrer(file: string, referrer: string | null): boolean {
    const key = path.resolve(file);
    let referrers = evalReferrers.get(key);
    if (!referrers) { referrers = new Set(); evalReferrers.set(key, referrers); }
    const value = referrer === null ? null : path.resolve(referrer);
    if (referrers.has(value)) return false;
    referrers.add(value);
    return true;
}

/** The file an ImportCall in `fileName` resolves its specifier against: the
 * file itself for ordinary source, and for eval or function source the
 * Script or Module its creating calls come from, followed through nested
 * eval code. Specifier resolution depends only on the referrer's directory,
 * so callers in one directory share a referrer; callers in different
 * directories, an unknown caller, or no caller yet give null and the
 * ImportCall has no AOT candidate (it rejects at runtime). */
export function dynamicImportReferrer(fileName: string): string | null {
    const start = path.resolve(fileName);
    if (!evalReferrers.has(start)) return start;
    const terminals = new Set<string>(), seen = new Set<string>([start]), pending = [start];
    while (pending.length) {
        const file = pending.pop()!;
        for (const referrer of evalReferrers.get(file)!) {
            if (referrer === null) return null;
            if (!evalReferrers.has(referrer)) { terminals.add(referrer); continue; }
            if (!seen.has(referrer)) { seen.add(referrer); pending.push(referrer); }
        }
    }
    const ordered = [...terminals].sort();
    if (!ordered.length || new Set(ordered.map(file => path.dirname(file))).size !== 1) return null;
    return ordered[0]!;
}

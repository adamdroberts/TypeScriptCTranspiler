import ts from "typescript";

/* B.3.2 Block-Level Function Declarations Web Legacy Compatibility Semantics.
 * One candidate collection per var scope (a function body or a Script),
 * shared by the emitter (binding creation and the evaluation-time update)
 * and the source analysis (references the checker leaves unresolved).
 * Strictness and root eligibility are the callers' decision: this module
 * answers the pure static question "would `var F` replace this declaration
 * without an early error, and is F neither a parameter nor `arguments`?". */

export type NamedFunctionDeclaration = ts.FunctionDeclaration & { readonly name: ts.Identifier };
export type AnnexBVarScope = ts.SourceFile | ts.FunctionLikeDeclaration;

/** BoundNames of a BindingName, in source order. */
export function bindingIdentifiers(name: ts.BindingName): ts.Identifier[] {
    const names: ts.Identifier[] = [];
    const worklist: ts.BindingName[] = [name];
    while (worklist.length > 0) {
        const current = worklist.pop()!;
        if (ts.isIdentifier(current)) { names.push(current); continue; }
        for (let index = current.elements.length - 1; index >= 0; index--) {
            const element = current.elements[index];
            if (!element || !ts.isBindingElement(element)) continue;
            worklist.push(element.name);
        }
    }
    return names;
}

/** The var scope a node belongs to: the nearest enclosing function with a
 * Block body, else its Script. Class bodies are strict, so B.3.2 never
 * applies inside one. */
export function annexBFunctionVarScope(node: ts.Node): AnnexBVarScope {
    for (let current = node.parent; current; current = current.parent) {
        if (ts.isFunctionLike(current) && "body" in current && current.body && ts.isBlock(current.body)) return current as ts.FunctionLikeDeclaration;
        if (ts.isSourceFile(current)) return current;
    }
    return node.getSourceFile();
}

/** The node whose statement list holds a declaration: its parent, past the
 * LabelledStatements wrapping it. A label on a function declaration (B.3.1)
 * changes no scope: LexicallyScopedDeclarations, VarScopedDeclarations and
 * B.3.2 all see the labelled item. */
export function declarationContainer(node: ts.Node): ts.Node {
    let parent = node.parent;
    while (ts.isLabeledStatement(parent)) parent = parent.parent;
    return parent;
}

/** A Block, CaseClause, DefaultClause or (B.3.3) IfStatement clause. */
function hasCandidateParent(declaration: ts.FunctionDeclaration): boolean {
    const parent = declarationContainer(declaration);
    return ts.isBlock(parent) || ts.isCaseClause(parent) || ts.isDefaultClause(parent) ||
        (ts.isIfStatement(parent) && (parent.thenStatement === declaration || parent.elseStatement === declaration));
}

/** LexicallyDeclaredNames of a statement list, excluding the replaced
 * declaration; function declarations count only where they are lexical. */
export function directLexicalNames(
    statements: readonly ts.Statement[],
    replaced: ts.FunctionDeclaration,
    functionDeclarationsAreLexical = true,
): Set<string> {
    const names = new Set<string>();
    for (const source of statements) {
        let statement = source;
        while (ts.isLabeledStatement(statement)) statement = statement.statement;
        if (statement === replaced) continue;
        if (ts.isFunctionDeclaration(statement)) {
            if (functionDeclarationsAreLexical && statement.name) names.add(statement.name.text);
            continue;
        }
        if (ts.isClassDeclaration(statement)) {
            if (statement.name) names.add(statement.name.text);
            continue;
        }
        if (!ts.isVariableStatement(statement)) continue;
        if ((statement.declarationList.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let | ts.NodeFlags.Using | ts.NodeFlags.AwaitUsing)) === 0) continue;
        for (const declaration of statement.declarationList.declarations)
            for (const name of bindingIdentifiers(declaration.name)) names.add(name.text);
    }
    return names;
}

export function lexicalLoopHeadContainsName(node: ts.Node, name: string): boolean {
    if (!(ts.isForStatement(node) || ts.isForInStatement(node) || ts.isForOfStatement(node))) return false;
    const initializer = node.initializer;
    if (!initializer || !ts.isVariableDeclarationList(initializer) ||
        (initializer.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let | ts.NodeFlags.Using | ts.NodeFlags.AwaitUsing)) === 0) return false;
    return initializer.declarations.some((declaration) => bindingIdentifiers(declaration.name).some((bound) => bound.text === name));
}

/** The spec's hypothetical `var F` replacement, followed through every
 * enclosing static-semantic scope up to the root; for a function root a
 * parameter name, `arguments` and a body-level lexical name refuse it. */
function replacementAllowed(declaration: NamedFunctionDeclaration, root: AnnexBVarScope): boolean {
    const name = declaration.name.text;
    // In its own Block or CaseBlock, another declaration of the name can only
    // be a function declaration (anything else is a duplicate early error),
    // and Node 26 and Bun hoist such duplicates; B.3.2.1 would count them as
    // conflicts and hoist none. An enclosing block's function declaration
    // still prevents the replacement, as B.3.2.1 and Bun have it.
    const container = declarationContainer(declaration);
    const own = ts.isCaseClause(container) || ts.isDefaultClause(container) ? container.parent : container;
    for (let current: ts.Node | undefined = declaration.parent; current; current = current.parent) {
        if (!ts.isSourceFile(root) && current === root.body) {
            if (name === "arguments") return false;
            if (root.parameters.some(parameter => bindingIdentifiers(parameter.name).some(bound => bound.text === name))) return false;
            return !directLexicalNames((current as ts.Block).statements, declaration, false).has(name);
        }
        if (ts.isBlock(current) && directLexicalNames(current.statements, declaration, current !== own).has(name)) return false;
        if (ts.isCaseBlock(current)) {
            const statements = current.clauses.flatMap((clause) => [...clause.statements]);
            if (directLexicalNames(statements, declaration, current !== own).has(name)) return false;
        }
        if (lexicalLoopHeadContainsName(current, name)) return false;
        if (ts.isCatchClause(current) && current.variableDeclaration &&
            bindingIdentifiers(current.variableDeclaration.name).some((bound) => bound.text === name) &&
            !ts.isIdentifier(current.variableDeclaration.name)) return false;
        if (current === root) return !directLexicalNames((current as ts.SourceFile).statements, declaration, false).has(name);
        if (ts.isFunctionLike(current) || ts.isClassLike(current)) return false;
    }
    return false;
}

const collections = new WeakMap<ts.Node, readonly NamedFunctionDeclaration[]>();

/** The block-level ordinary function declarations of one var scope whose
 * name also gets a var binding there, in source order. The scan visits
 * every candidate regardless of block or branch depth and stops at nested
 * functions and classes; a declaration directly in the root body is already
 * that scope's var-like function. Callers decide strictness and root
 * eligibility. */
export function annexBBlockFunctions(root: AnnexBVarScope): readonly NamedFunctionDeclaration[] {
    const cached = collections.get(root);
    if (cached) return cached;
    const body = ts.isSourceFile(root) ? root : root.body;
    const out: NamedFunctionDeclaration[] = [];
    if (body && (ts.isSourceFile(body) || ts.isBlock(body))) {
        const worklist: ts.Node[] = [...body.statements];
        while (worklist.length > 0) {
            const current = worklist.pop()!;
            if (ts.isFunctionDeclaration(current)) {
                if (current.name && !current.asteriskToken &&
                    !ts.getModifiers(current)?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword) &&
                    declarationContainer(current) !== body && hasCandidateParent(current)) out.push(current as NamedFunctionDeclaration);
                continue;
            }
            if (ts.isFunctionLike(current) || ts.isClassLike(current) || ts.isClassStaticBlockDeclaration(current)) continue;
            ts.forEachChild(current, (child) => { worklist.push(child); });
        }
    }
    const sf = root.getSourceFile();
    const result = out.sort((left, right) => left.getStart(sf) - right.getStart(sf)).filter(declaration => replacementAllowed(declaration, root));
    collections.set(root, result);
    return result;
}

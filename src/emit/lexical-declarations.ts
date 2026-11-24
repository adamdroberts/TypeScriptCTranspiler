import ts from "typescript";

export type NamedScopeLexicalDeclaration =
    | (ts.FunctionDeclaration & { readonly name: ts.Identifier })
    | (ts.ClassDeclaration & { readonly name: ts.Identifier })
    | ts.EnumDeclaration;

/** A TypeScript enum declaration in a Block or CaseBlock (not `const enum`,
 * which has no runtime binding) is TypeScript's `let E;` followed by its
 * initialization: one lexical binding that every merged declaration of the
 * enum in that scope shares. */
export function isScopeEnumDeclaration(node: ts.Node): node is ts.EnumDeclaration {
    return ts.isEnumDeclaration(node) &&
        (ts.getCombinedModifierFlags(node) & (ts.ModifierFlags.Const | ts.ModifierFlags.Ambient)) === 0 &&
        (ts.isBlock(node.parent) || ts.isCaseClause(node.parent) || ts.isDefaultClause(node.parent));
}

export type ScopeLexicalDeclaration = ts.VariableDeclaration | NamedScopeLexicalDeclaration;

/** Lexical heads expose the same source-ordered declaration collection as
 * statement scopes. BoundNames and cell layout are shared by every consumer. */
export function lexicalDeclarationsFromList(list: ts.VariableDeclarationList): readonly ts.VariableDeclaration[] {
    return (list.flags & ts.NodeFlags.BlockScoped) !== 0 ? list.declarations : [];
}

/** One direct declaration collection feeds Block and CaseBlock instantiation,
 * including resumable scope-entry states. Nested scopes own their own list. */
export function directLexicalDeclarations(statements: readonly ts.Statement[]): ScopeLexicalDeclaration[] {
    const declarations: ScopeLexicalDeclaration[] = [];
    for (const source of statements) {
        let statement = source;
        while (ts.isLabeledStatement(statement)) statement = statement.statement;
        if (ts.isVariableStatement(statement)) {
            declarations.push(...lexicalDeclarationsFromList(statement.declarationList));
        } else if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name) {
            declarations.push(statement as NamedScopeLexicalDeclaration);
        } else if (isScopeEnumDeclaration(statement)) {
            declarations.push(statement);
        }
    }
    return declarations;
}

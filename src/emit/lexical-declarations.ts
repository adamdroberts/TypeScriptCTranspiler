import ts from "typescript";

export type NamedScopeLexicalDeclaration =
    | (ts.FunctionDeclaration & { readonly name: ts.Identifier })
    | (ts.ClassDeclaration & { readonly name: ts.Identifier });

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
    for (const statement of statements) {
        if (ts.isVariableStatement(statement)) {
            declarations.push(...lexicalDeclarationsFromList(statement.declarationList));
        } else if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name) {
            declarations.push(statement as NamedScopeLexicalDeclaration);
        }
    }
    return declarations;
}

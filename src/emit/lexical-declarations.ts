import ts from "typescript";

export type NamedScopeLexicalDeclaration =
    | (ts.FunctionDeclaration & { readonly name: ts.Identifier })
    | (ts.ClassDeclaration & { readonly name: ts.Identifier });

export type ScopeLexicalDeclaration = ts.VariableDeclaration | NamedScopeLexicalDeclaration;

/** One direct declaration collection feeds Block and CaseBlock instantiation,
 * including resumable scope-entry states. Nested scopes own their own list. */
export function directLexicalDeclarations(statements: readonly ts.Statement[]): ScopeLexicalDeclaration[] {
    const declarations: ScopeLexicalDeclaration[] = [];
    for (const statement of statements) {
        if (ts.isVariableStatement(statement) &&
            (statement.declarationList.flags & ts.NodeFlags.BlockScoped) !== 0) {
            declarations.push(...statement.declarationList.declarations);
        } else if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name) {
            declarations.push(statement as NamedScopeLexicalDeclaration);
        }
    }
    return declarations;
}

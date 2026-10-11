import ts from "typescript";

/** A checker symbol may also describe assignments or property definitions.
 * Only grammar declarations introduce a declarative source binding. */
export function sourceDeclarationIntroducesBinding(node: ts.Declaration): boolean {
    return ts.isVariableDeclaration(node) || ts.isBindingElement(node) || ts.isParameter(node) ||
        ts.isImportClause(node) || ts.isImportSpecifier(node) || ts.isNamespaceImport(node) ||
        ts.isImportEqualsDeclaration(node) || ts.isEnumDeclaration(node) || ts.isModuleDeclaration(node) ||
        (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) ||
            ts.isClassDeclaration(node) || ts.isClassExpression(node)) && !!node.name;
}

/** Object records remain independent candidates in source flow. Resolving
 * this fallback does not select the runtime Reference's actual base. */
export function declarativeSourceBindingSymbol(checker: ts.TypeChecker, node: ts.Identifier): ts.Symbol | undefined {
    if (ts.isShorthandPropertyAssignment(node.parent) && node.parent.name === node)
        return checker.getShorthandAssignmentValueSymbol(node.parent);
    const parent = node.parent;
    const declaration = (ts.isVariableDeclaration(parent) || ts.isBindingElement(parent) || ts.isParameter(parent) ||
        ts.isFunctionDeclaration(parent) || ts.isFunctionExpression(parent) ||
        ts.isClassDeclaration(parent) || ts.isClassExpression(parent)) && parent.name === node;
    return checker.getSymbolAtLocation(node) ??
        (declaration ? (parent as ts.Node & {symbol?: ts.Symbol}).symbol : undefined) ??
        checker.resolveName(node.text, node, ts.SymbolFlags.Value, false);
}

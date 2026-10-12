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

/** Duplicate simple formals are one Function Environment Record binding.
 * The checker creates recovery symbols for later declarations; resolve the
 * owner's actual binding rather than treating those symbols as new cells. */
export function canonicalParameterBindingSymbol(
    checker: ts.TypeChecker, node: ts.Identifier, symbol: ts.Symbol | undefined,
): ts.Symbol | undefined {
    const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
    return declaration && ts.isParameter(declaration)
        ? checker.resolveName(node.text, declaration, ts.SymbolFlags.Value, false) ?? symbol
        : symbol;
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
    const symbol = checker.getSymbolAtLocation(node) ??
        (declaration ? (parent as ts.Node & {symbol?: ts.Symbol}).symbol : undefined) ??
        checker.resolveName(node.text, node, ts.SymbolFlags.Value, false);
    return canonicalParameterBindingSymbol(checker, node, symbol);
}

/** Follow one alias graph while preserving whether its binding denotes a
 * Module namespace. JSON defaults and namespaces share a checker target. */
export function sourceBindingTarget(checker: ts.TypeChecker, symbol: ts.Symbol | undefined): {
    readonly symbol: ts.Symbol | undefined;
    readonly namespace: boolean;
} {
    let namespace = false;
    const seen = new Set<ts.Symbol>();
    while (symbol && symbol.flags & ts.SymbolFlags.Alias) {
        if (seen.has(symbol)) return { symbol: undefined, namespace };
        seen.add(symbol);
        namespace ||= (symbol.declarations ?? []).some(declaration => ts.isNamespaceImport(declaration) || ts.isNamespaceExport(declaration));
        symbol = checker.getImmediateAliasedSymbol(symbol);
    }
    return { symbol, namespace };
}

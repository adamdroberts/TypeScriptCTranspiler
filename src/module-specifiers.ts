import ts from "typescript";

export function staticStringExpressionText(expr: ts.Expression): string | null {
    const seen = new Set<ts.VariableDeclaration>();

    const resolve = (node: ts.Expression): string | null => {
        while (
            ts.isParenthesizedExpression(node) ||
            ts.isAsExpression(node) ||
            ts.isTypeAssertionExpression(node) ||
            ts.isSatisfiesExpression(node)
        ) {
            node = node.expression;
        }
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
            return node.text;
        }
        if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
            const left = resolve(node.left);
            const right = resolve(node.right);
            return left !== null && right !== null ? left + right : null;
        }
        if (ts.isTemplateExpression(node)) {
            let out = node.head.text;
            for (const span of node.templateSpans) {
                const value = resolve(span.expression);
                if (value === null) return null;
                out += value + span.literal.text;
            }
            return out;
        }
        if (!ts.isIdentifier(node)) return null;
        const decl = topLevelConstStringDeclaration(node);
        if (!decl || !decl.initializer) return null;
        if (seen.has(decl)) return null;
        seen.add(decl);
        return resolve(decl.initializer);
    };

    return resolve(expr);
}

export function requireCallSpecifier(
    expr: ts.Expression,
    requireAliases: Set<string>,
): string | null {
    if (
        ts.isCallExpression(expr) &&
        isCommonJsRequireCallee(expr.expression, requireAliases) &&
        expr.arguments.length === 1
    ) {
        return staticStringExpressionText(expr.arguments[0]!);
    }
    return null;
}

export function isCommonJsRequireCallee(
    expr: ts.Expression,
    requireAliases: Set<string>,
): boolean {
    return (ts.isIdentifier(expr) && (expr.text === "require" || requireAliases.has(expr.text))) ||
        (
            ts.isPropertyAccessExpression(expr) &&
            expr.name.text === "require" &&
            ts.isIdentifier(expr.expression) &&
            expr.expression.text === "module"
        );
}

function topLevelConstStringDeclaration(id: ts.Identifier): ts.VariableDeclaration | null {
    const sf = id.getSourceFile();
    for (const stmt of sf.statements) {
        if (!ts.isVariableStatement(stmt)) continue;
        if ((ts.getCombinedNodeFlags(stmt.declarationList) & ts.NodeFlags.Const) === 0) continue;
        for (const decl of stmt.declarationList.declarations) {
            if (ts.isIdentifier(decl.name) && decl.name.text === id.text) return decl;
        }
    }
    return null;
}

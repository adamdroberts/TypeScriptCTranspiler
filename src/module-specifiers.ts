import ts from "typescript";

const MAX_STATIC_STRING_ALTERNATIVES = 64;

export function staticStringExpressionText(expr: ts.Expression): string | null {
    const texts = staticStringExpressionTexts(expr);
    return texts.length === 1 ? texts[0]! : null;
}

export function staticStringExpressionTexts(expr: ts.Expression): string[] {
    const seen = new Set<ts.VariableDeclaration>();

    const dedupe = (values: string[]): string[] => {
        const out: string[] = [];
        const seenValues = new Set<string>();
        for (const value of values) {
            if (seenValues.has(value)) continue;
            seenValues.add(value);
            out.push(value);
            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
        }
        return out;
    };

    const concat = (left: string[], right: string[]): string[] => {
        if (left.length === 0 || right.length === 0) return [];
        const out: string[] = [];
        for (const l of left) {
            for (const r of right) {
                out.push(l + r);
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return dedupe(out);
    };

    const resolve = (node: ts.Expression): string[] => {
        while (
            ts.isParenthesizedExpression(node) ||
            ts.isAsExpression(node) ||
            ts.isTypeAssertionExpression(node) ||
            ts.isSatisfiesExpression(node)
        ) {
            node = node.expression;
        }
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
            return [node.text];
        }
        if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
            const left = resolve(node.left);
            const right = resolve(node.right);
            return concat(left, right);
        }
        if (ts.isConditionalExpression(node)) {
            return dedupe([...resolve(node.whenTrue), ...resolve(node.whenFalse)]);
        }
        if (ts.isTemplateExpression(node)) {
            let out = [node.head.text];
            for (const span of node.templateSpans) {
                out = concat(concat(out, resolve(span.expression)), [span.literal.text]);
                if (out.length === 0) return [];
            }
            return out;
        }
        if (ts.isElementAccessExpression(node) && node.argumentExpression) {
            return resolveStaticCollectionAccess(node.expression, node.argumentExpression);
        }
        if (ts.isPropertyAccessExpression(node)) {
            return resolveStaticCollectionAccess(node.expression, node.name);
        }
        if (!ts.isIdentifier(node)) return [];
        const decl = earlierConstStringDeclaration(node) ?? topLevelConstStringDeclaration(node);
        if (decl?.initializer) {
            if (seen.has(decl)) return [];
            seen.add(decl);
            const values = resolve(decl.initializer);
            seen.delete(decl);
            if (values.length > 0) return values;
        }
        return stringLiteralUnionIdentifierTexts(node);
    };

    const resolveStaticCollectionAccess = (
        collectionExpr: ts.Expression,
        keyExpr: ts.Expression | ts.Identifier,
    ): string[] => {
        while (
            ts.isParenthesizedExpression(collectionExpr) ||
            ts.isAsExpression(collectionExpr) ||
            ts.isTypeAssertionExpression(collectionExpr) ||
            ts.isSatisfiesExpression(collectionExpr)
        ) {
            collectionExpr = collectionExpr.expression;
        }
        if (!ts.isIdentifier(collectionExpr)) return [];
        const decl = earlierConstStringDeclaration(collectionExpr) ?? topLevelConstStringDeclaration(collectionExpr);
        if (!decl?.initializer || seen.has(decl)) return [];
        seen.add(decl);
        let init = decl.initializer;
        while (
            ts.isParenthesizedExpression(init) ||
            ts.isAsExpression(init) ||
            ts.isTypeAssertionExpression(init) ||
            ts.isSatisfiesExpression(init)
        ) {
            init = init.expression;
        }

        let values: string[] = [];
        if (ts.isArrayLiteralExpression(init)) {
            values = resolveStaticArrayAccess(init, keyExpr);
        } else if (ts.isObjectLiteralExpression(init)) {
            values = resolveStaticObjectAccess(init, keyExpr);
        }
        seen.delete(decl);
        return dedupe(values);
    };

    const resolveStaticArrayAccess = (
        init: ts.ArrayLiteralExpression,
        keyExpr: ts.Expression | ts.Identifier,
    ): string[] => {
        const elements: string[][] = [];
        for (const element of init.elements) {
            if (ts.isSpreadElement(element)) return [];
            const values = resolve(element);
            if (values.length === 0) return [];
            elements.push(values);
        }
        const keys = resolveStaticNumericKeys(keyExpr);
        if (keys.length === 0) return dedupe(elements.flat());
        const out: string[] = [];
        for (const key of keys) {
            const values = elements[key];
            if (!values) return [];
            out.push(...values);
        }
        return dedupe(out);
    };

    const resolveStaticObjectAccess = (
        init: ts.ObjectLiteralExpression,
        keyExpr: ts.Expression | ts.Identifier,
    ): string[] => {
        const entries = new Map<string, string[]>();
        for (const prop of init.properties) {
            if (!ts.isPropertyAssignment(prop)) return [];
            const key = staticPropertyName(prop.name);
            if (key == null) return [];
            const values = resolve(prop.initializer);
            if (values.length === 0) return [];
            entries.set(key, values);
        }
        const keys = resolveKeyTexts(keyExpr);
        if (keys.length === 0) return dedupe([...entries.values()].flat());
        const out: string[] = [];
        for (const key of keys) {
            const values = entries.get(key);
            if (!values) return [];
            out.push(...values);
        }
        return dedupe(out);
    };

    const resolveKeyTexts = (keyExpr: ts.Expression | ts.Identifier): string[] => {
        if (ts.isIdentifier(keyExpr) && ts.isPropertyAccessExpression(keyExpr.parent) && keyExpr.parent.name === keyExpr) {
            return [keyExpr.text];
        }
        return resolve(keyExpr as ts.Expression);
    };

    const resolveStaticNumericKeys = (keyExpr: ts.Expression | ts.Identifier): number[] => {
        if (ts.isNumericLiteral(keyExpr)) return [Number(keyExpr.text)];
        const texts = resolveKeyTexts(keyExpr);
        if (texts.length === 0) return [];
        const keys: number[] = [];
        for (const text of texts) {
            if (!/^(0|[1-9][0-9]*)$/.test(text)) return [];
            keys.push(Number(text));
        }
        return keys;
    };

    return dedupe(resolve(expr));
}

export function requireCallSpecifier(
    expr: ts.Expression,
    requireAliases: Set<string>,
    moduleAliases: Set<string> = new Set(),
): string | null {
    const specs = requireCallSpecifiers(expr, requireAliases, moduleAliases);
    return specs && specs.length === 1 ? specs[0]! : null;
}

export function requireCallSpecifiers(
    expr: ts.Expression,
    requireAliases: Set<string>,
    moduleAliases: Set<string> = new Set(),
): string[] | null {
    if (
        ts.isCallExpression(expr) &&
        isCommonJsRequireCallee(expr.expression, requireAliases, moduleAliases) &&
        expr.arguments.length === 1
    ) {
        return staticStringExpressionTexts(expr.arguments[0]!);
    }
    return null;
}

export function isCommonJsRequireCallee(
    expr: ts.Expression,
    requireAliases: Set<string>,
    moduleAliases: Set<string> = new Set(),
): boolean {
    return (ts.isIdentifier(expr) && (expr.text === "require" || requireAliases.has(expr.text))) ||
        (
            ts.isPropertyAccessExpression(expr) &&
            expr.name.text === "require" &&
            ts.isIdentifier(expr.expression) &&
            (expr.expression.text === "module" || moduleAliases.has(expr.expression.text))
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

function earlierConstStringDeclaration(id: ts.Identifier): ts.VariableDeclaration | null {
    let cur: ts.Node = id;
    while (cur.parent && !ts.isStatement(cur)) cur = cur.parent;
    const stmt = cur;
    const block = stmt.parent;
    if (!ts.isBlock(block) && !ts.isSourceFile(block) && !ts.isModuleBlock(block)) return null;
    for (const sibling of block.statements) {
        if (sibling === stmt) break;
        if (!ts.isVariableStatement(sibling)) continue;
        if ((ts.getCombinedNodeFlags(sibling.declarationList) & ts.NodeFlags.Const) === 0) continue;
        for (const decl of sibling.declarationList.declarations) {
            if (ts.isIdentifier(decl.name) && decl.name.text === id.text) return decl;
        }
    }
    return null;
}

function stringLiteralUnionIdentifierTexts(id: ts.Identifier): string[] {
    const paramValues = parameterStringLiteralUnionTexts(id);
    if (paramValues.length > 0) return paramValues;
    const localValues = earlierVariableStringLiteralUnionTexts(id);
    if (localValues.length > 0) return localValues;
    const topLevelValues = topLevelVariableStringLiteralUnionTexts(id);
    if (topLevelValues.length > 0) return topLevelValues;
    return [];
}

function parameterStringLiteralUnionTexts(id: ts.Identifier): string[] {
    let cur: ts.Node | undefined = id.parent;
    while (cur) {
        if (ts.isFunctionLike(cur)) {
            for (const param of cur.parameters) {
                if (ts.isIdentifier(param.name) && param.name.text === id.text) {
                    return stringLiteralUnionTypeTexts(param.type);
                }
            }
        }
        cur = cur.parent;
    }
    return [];
}

function topLevelVariableStringLiteralUnionTexts(id: ts.Identifier): string[] {
    const sf = id.getSourceFile();
    for (const stmt of sf.statements) {
        if (!ts.isVariableStatement(stmt)) continue;
        for (const decl of stmt.declarationList.declarations) {
            if (ts.isIdentifier(decl.name) && decl.name.text === id.text) {
                return stringLiteralUnionTypeTexts(decl.type);
            }
        }
    }
    return [];
}

function earlierVariableStringLiteralUnionTexts(id: ts.Identifier): string[] {
    let cur: ts.Node = id;
    while (cur.parent && !ts.isStatement(cur)) cur = cur.parent;
    const stmt = cur;
    const block = stmt.parent;
    if (!ts.isBlock(block) && !ts.isSourceFile(block) && !ts.isModuleBlock(block)) return [];
    for (const sibling of block.statements) {
        if (sibling === stmt) break;
        if (!ts.isVariableStatement(sibling)) continue;
        for (const decl of sibling.declarationList.declarations) {
            if (ts.isIdentifier(decl.name) && decl.name.text === id.text) {
                return stringLiteralUnionTypeTexts(decl.type);
            }
        }
    }
    return [];
}

function stringLiteralUnionTypeTexts(
    typeNode: ts.TypeNode | undefined,
    seenAliases = new Set<string>(),
): string[] {
    if (!typeNode) return [];
    if (ts.isParenthesizedTypeNode(typeNode)) {
        return stringLiteralUnionTypeTexts(typeNode.type, seenAliases);
    }
    if (ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)) {
        const aliasName = typeNode.typeName.text;
        if (seenAliases.has(aliasName)) return [];
        const alias = visibleTypeAliasDeclaration(typeNode.typeName, typeNode);
        if (!alias) return [];
        seenAliases.add(aliasName);
        const values = stringLiteralUnionTypeTexts(alias.type, seenAliases);
        seenAliases.delete(aliasName);
        return values;
    }
    if (ts.isTemplateLiteralTypeNode(typeNode)) {
        return templateLiteralTypeTexts(typeNode, seenAliases);
    }
    if (ts.isLiteralTypeNode(typeNode) && ts.isStringLiteral(typeNode.literal)) {
        return [typeNode.literal.text];
    }
    if (!ts.isUnionTypeNode(typeNode)) return [];
    const values: string[] = [];
    const seen = new Set<string>();
    for (const part of typeNode.types) {
        const partValues = stringLiteralUnionTypeTexts(part, seenAliases);
        if (partValues.length === 0) return [];
        for (const value of partValues) {
            if (seen.has(value)) continue;
            seen.add(value);
            values.push(value);
        }
    }
    return values;
}

function templateLiteralTypeTexts(
    typeNode: ts.TemplateLiteralTypeNode,
    seenAliases: Set<string>,
): string[] {
    let values = [typeNode.head.text];
    for (const span of typeNode.templateSpans) {
        const spanValues = templateLiteralSpanTypeTexts(span.type, seenAliases);
        if (spanValues.length === 0) return [];
        values = concatStringAlternatives(values, spanValues);
        if (values.length === 0) return [];
        values = concatStringAlternatives(values, [span.literal.text]);
        if (values.length === 0) return [];
    }
    return dedupeStringAlternatives(values);
}

function templateLiteralSpanTypeTexts(
    typeNode: ts.TypeNode | undefined,
    seenAliases: Set<string>,
): string[] {
    if (!typeNode) return [];
    if (ts.isParenthesizedTypeNode(typeNode)) {
        return templateLiteralSpanTypeTexts(typeNode.type, seenAliases);
    }
    if (ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)) {
        const aliasName = typeNode.typeName.text;
        if (seenAliases.has(aliasName)) return [];
        const alias = visibleTypeAliasDeclaration(typeNode.typeName, typeNode);
        if (!alias) return [];
        seenAliases.add(aliasName);
        const values = templateLiteralSpanTypeTexts(alias.type, seenAliases);
        seenAliases.delete(aliasName);
        return values;
    }
    if (ts.isTemplateLiteralTypeNode(typeNode)) {
        return templateLiteralTypeTexts(typeNode, seenAliases);
    }
    if (ts.isLiteralTypeNode(typeNode)) {
        const literal = typeNode.literal;
        if (ts.isStringLiteral(literal) || ts.isNumericLiteral(literal)) return [literal.text];
        if (literal.kind === ts.SyntaxKind.TrueKeyword) return ["true"];
        if (literal.kind === ts.SyntaxKind.FalseKeyword) return ["false"];
        if (ts.isPrefixUnaryExpression(literal) && ts.isNumericLiteral(literal.operand)) {
            if (literal.operator === ts.SyntaxKind.MinusToken) return [`-${literal.operand.text}`];
            if (literal.operator === ts.SyntaxKind.PlusToken) return [literal.operand.text];
        }
        return [];
    }
    if (!ts.isUnionTypeNode(typeNode)) return [];
    const values: string[] = [];
    const seen = new Set<string>();
    for (const part of typeNode.types) {
        const partValues = templateLiteralSpanTypeTexts(part, seenAliases);
        if (partValues.length === 0) return [];
        for (const value of partValues) {
            if (seen.has(value)) continue;
            seen.add(value);
            values.push(value);
            if (values.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
        }
    }
    return values;
}

function concatStringAlternatives(left: string[], right: string[]): string[] {
    if (left.length === 0 || right.length === 0) return [];
    const out: string[] = [];
    for (const l of left) {
        for (const r of right) {
            out.push(l + r);
            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
        }
    }
    return dedupeStringAlternatives(out);
}

function dedupeStringAlternatives(values: string[]): string[] {
    const out: string[] = [];
    const seenValues = new Set<string>();
    for (const value of values) {
        if (seenValues.has(value)) continue;
        seenValues.add(value);
        out.push(value);
        if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
    }
    return out;
}

function visibleTypeAliasDeclaration(id: ts.Identifier, context: ts.Node): ts.TypeAliasDeclaration | null {
    let cur: ts.Node | undefined = context;
    while (cur) {
        if (ts.isBlock(cur) || ts.isSourceFile(cur) || ts.isModuleBlock(cur)) {
            for (const stmt of cur.statements) {
                if (ts.isTypeAliasDeclaration(stmt) && stmt.name.text === id.text) {
                    return stmt;
                }
            }
        }
        cur = cur.parent;
    }
    return null;
}

function staticPropertyName(name: ts.PropertyName): string | null {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
        return name.text;
    }
    if (ts.isComputedPropertyName(name)) {
        return staticStringExpressionText(name.expression);
    }
    return null;
}

import ts from "typescript";

/** The callable's SourceText is its definition span, independent of member,
 * parameter, statement and nesting cardinality. TypeScript spans use their
 * whitespace-preserving type erasure (Node's strip-only TypeScript mode);
 * spans that erasure cannot represent use the native representation. */
export function callableSourceText(definition: ts.Node | null): string | null {
    if (!definition || definition.pos < 0) return null;
    if (ts.isConstructorDeclaration(definition)) definition = definition.parent;
    const source = definition.getSourceFile();
    const typescript = !!source && /\.[cm]?ts$/i.test(source.fileName);
    if (!source || !typescript && !/\.[cm]?jsx?$/i.test(source.fileName)) return null;
    let start = definition.getStart(source);
    for (const modifier of ts.canHaveModifiers(definition) ? ts.getModifiers(definition) ?? [] : []) {
        if (modifier.kind === ts.SyntaxKind.ExportKeyword || modifier.kind === ts.SyntaxKind.DefaultKeyword ||
            modifier.kind === ts.SyntaxKind.StaticKeyword) start = Math.max(start, modifier.end);
    }
    if (start !== definition.getStart(source)) {
        const scanner = ts.createScanner(ts.ScriptTarget.ESNext, true, ts.LanguageVariant.Standard,
            source.text, undefined, start, definition.end - start);
        scanner.scan(); start = scanner.getTokenPos();
    }
    if (!typescript) return source.text.slice(start, definition.end);
    const erased = eraseTypeScriptSpan(source, definition);
    return erased === null ? null : erased.slice(start - definition.pos, definition.end - definition.pos);
}

const ACCESSIBILITY = new Set([ts.SyntaxKind.PublicKeyword, ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword,
    ts.SyntaxKind.ReadonlyKeyword, ts.SyntaxKind.OverrideKeyword]);

/** Whitespace-preserving erasure of TypeScript-only syntax inside one node's
 * span: every erased character becomes a space and line terminators stay, so
 * source positions are unchanged. Returns null for syntax that has no
 * erasure-only ECMAScript form (enum, namespace, parameter property, angle
 * assertion, import alias), as Node's strip-only mode rejects it. */
export function eraseTypeScriptSpan(source: ts.SourceFile, root: ts.Node): string | null {
    const base = root.pos, chars = source.text.slice(root.pos, root.end).split("");
    const blank = (start: number, end: number): void => {
        for (let index = Math.max(start, base); index < Math.min(end, root.end); index++) {
            const char = chars[index - base]!;
            if (char !== "\n" && char !== "\r" && char !== "\u2028" && char !== "\u2029") chars[index - base] = " ";
        }
    };
    const token = (node: ts.Node, kind: ts.SyntaxKind): ts.Node | undefined =>
        node.getChildren(source).find(child => child.kind === kind);
    const blankAnnotation = (node: ts.Node, type: ts.TypeNode | undefined): void => {
        if (!type) return;
        const colon = token(node, ts.SyntaxKind.ColonToken);
        blank(colon ? colon.getStart(source) : type.getStart(source), type.end);
    };
    const blankTypeArguments = (node: ts.Node, list: ts.NodeArray<ts.Node> | undefined): void => {
        if (!list) return;
        const open = token(node, ts.SyntaxKind.LessThanToken), close = token(node, ts.SyntaxKind.GreaterThanToken);
        blank(open ? open.getStart(source) : list.pos, close ? close.end : list.end);
    };
    const blankModifiers = (node: ts.Node): void => {
        for (const modifier of ts.canHaveModifiers(node) ? ts.getModifiers(node) ?? [] : [])
            if (ACCESSIBILITY.has(modifier.kind) || modifier.kind === ts.SyntaxKind.AbstractKeyword) blank(modifier.getStart(source), modifier.end);
    };
    const hasModifier = (node: ts.Node, kind: ts.SyntaxKind): boolean =>
        ts.canHaveModifiers(node) && !!ts.getModifiers(node)?.some(modifier => modifier.kind === kind);
    let representable = true;
    const visit = (node: ts.Node): void => {
        if (!representable) return;
        if (ts.isEnumDeclaration(node) || ts.isModuleDeclaration(node) && !hasModifier(node, ts.SyntaxKind.DeclareKeyword) ||
            ts.isTypeAssertionExpression(node) || ts.isImportEqualsDeclaration(node) ||
            ts.isParameter(node) && ts.getModifiers(node)?.some(modifier => ACCESSIBILITY.has(modifier.kind))) {
            representable = false; return;
        }
        if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isIndexSignatureDeclaration(node) ||
            hasModifier(node, ts.SyntaxKind.DeclareKeyword) || hasModifier(node, ts.SyntaxKind.AbstractKeyword) && !ts.isClassLike(node) ||
            (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node)) && !node.body && node !== root) {
            blank(node.getStart(source), node.end); return;
        }
        if (ts.isParameter(node)) {
            if (ts.isIdentifier(node.name) && node.name.text === "this") {
                const list = (node.parent as ts.SignatureDeclaration).parameters, next = list[list.indexOf(node) + 1];
                blank(node.getStart(source), next ? next.getStart(source) : node.end); return;
            }
            if (node.questionToken) blank(node.questionToken.getStart(source), node.questionToken.end);
            blankAnnotation(node, node.type);
        } else if (ts.isVariableDeclaration(node) || ts.isPropertyDeclaration(node)) {
            if (node.exclamationToken) blank(node.exclamationToken.getStart(source), node.exclamationToken.end);
            if (ts.isPropertyDeclaration(node) && node.questionToken) blank(node.questionToken.getStart(source), node.questionToken.end);
            if (ts.isPropertyDeclaration(node)) blankModifiers(node);
            blankAnnotation(node, node.type);
        } else if (ts.isFunctionLike(node)) {
            blankModifiers(node);
            if ("questionToken" in node && node.questionToken) blank((node.questionToken as ts.Node).getStart(source), (node.questionToken as ts.Node).end);
            blankTypeArguments(node, node.typeParameters);
            blankAnnotation(node, node.type);
        } else if (ts.isClassLike(node)) {
            blankModifiers(node);
            blankTypeArguments(node, node.typeParameters);
            for (const clause of node.heritageClauses ?? [])
                if (clause.token === ts.SyntaxKind.ImplementsKeyword) blank(clause.getStart(source), clause.end);
        } else if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) {
            blank(node.expression.end, node.end);
        } else if (ts.isNonNullExpression(node)) {
            blank(node.end - 1, node.end);
        } else if (ts.isCallExpression(node) || ts.isNewExpression(node) || ts.isTaggedTemplateExpression(node) || ts.isExpressionWithTypeArguments(node)) {
            blankTypeArguments(node, node.typeArguments);
        }
        ts.forEachChild(node, visit);
    };
    visit(root);
    return representable ? chars.join("") : null;
}

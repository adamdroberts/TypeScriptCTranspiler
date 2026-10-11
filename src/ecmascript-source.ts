import ts from "typescript";

export type EcmaParseGoal = "script" | "module";
export function ecmaParseGoal(sourceFile: ts.SourceFile): EcmaParseGoal {
    return (sourceFile as ts.SourceFile & { ecmaParseGoal?: EcmaParseGoal }).ecmaParseGoal ??
        (ts.isExternalModule(sourceFile) ? "module" : "script");
}

/** Use Strict is a raw directive token, not the cooked String value. */
export function ecmaDirectivePrologueHasUseStrict(statements: readonly ts.Statement[]): boolean {
    for (const statement of statements) {
        if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) return false;
        const token = statement.expression.getText();
        if (token === '"use strict"' || token === "'use strict'") return true;
    }
    return false;
}

/**
 * TypeScript 5.9 treats a LineTerminator before the `with` token of an import
 * attributes clause as the end of the declaration. ECMA-262 permits trivia in
 * that position. Build an equal-width parser shadow in which only that trivia
 * is replaced by spaces; callers retain the exact source text on the returned
 * SourceFile, so node offsets and attested bytes remain unchanged.
 *
 * This is a token worklist, not a source-pattern rewrite: every static import
 * and re-export form reaches the same module-specifier transition, regardless
 * of declaration count or intervening comment shape.
 */
export function ecmaImportAttributesParserShadow(source: string): string {
    type ModuleSpecifierTrivia = { start: number; end: number; hasLineTerminator: boolean };
    const scanner = ts.createScanner(
        ts.ScriptTarget.ESNext,
        false,
        ts.LanguageVariant.Standard,
        source,
    );
    let previousSignificant = ts.SyntaxKind.Unknown;
    let moduleSpecifierTrivia: ModuleSpecifierTrivia | null = null;
    let pendingWithTrivia: ModuleSpecifierTrivia | null = null;
    const replacements: Array<{ start: number; end: number }> = [];

    for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
        const start = scanner.getTokenPos();
        const end = scanner.getTextPos();
        const trivia = token >= ts.SyntaxKind.FirstTriviaToken && token <= ts.SyntaxKind.LastTriviaToken;
        if (trivia) {
            if (moduleSpecifierTrivia) {
                moduleSpecifierTrivia.end = end;
                if (/[\r\n\u2028\u2029]/.test(source.slice(start, end))) {
                    moduleSpecifierTrivia.hasLineTerminator = true;
                }
            }
            continue;
        }

        if (pendingWithTrivia) {
            if (token === ts.SyntaxKind.OpenBraceToken && pendingWithTrivia.hasLineTerminator) {
                replacements.push({ start: pendingWithTrivia.start, end: pendingWithTrivia.end });
            }
            pendingWithTrivia = null;
        }

        if (moduleSpecifierTrivia) {
            if (token === ts.SyntaxKind.WithKeyword) {
                moduleSpecifierTrivia.end = start;
                moduleSpecifierTrivia.hasLineTerminator ||= /[\r\n\u2028\u2029]/.test(
                    source.slice(moduleSpecifierTrivia.start, start),
                );
                pendingWithTrivia = moduleSpecifierTrivia;
            }
            moduleSpecifierTrivia = null;
        }

        if (
            token === ts.SyntaxKind.StringLiteral &&
            (previousSignificant === ts.SyntaxKind.ImportKeyword || previousSignificant === ts.SyntaxKind.FromKeyword)
        ) {
            moduleSpecifierTrivia = { start: end, end, hasLineTerminator: false };
        }
        previousSignificant = token;
    }

    if (replacements.length === 0) return source;
    // Scanner offsets are UTF-16 code-unit offsets, so preserve that indexing
    // even when an earlier comment or string contains an astral code point.
    const shadow = source.split("");
    for (const replacement of replacements) {
        for (let index = replacement.start; index < replacement.end; index++) {
            shadow[index] = " ";
        }
    }
    return shadow.join("");
}

/** Statement children exclude StatementListItem positions, where lexical
 * declarations are legal. Keep that grammar distinction in one predicate. */
export function isStatementBody(parent: ts.Node, child: ts.Node): boolean {
    if (ts.isIfStatement(parent)) return parent.thenStatement === child || parent.elseStatement === child;
    return (ts.isWithStatement(parent) || ts.isWhileStatement(parent) || ts.isDoStatement(parent) ||
        ts.isForStatement(parent) || ts.isForInStatement(parent) || ts.isForOfStatement(parent) ||
        ts.isLabeledStatement(parent)) && parent.statement === child;
}

/** Parse JavaScript or TypeScript with the ECMA-262 import-attributes trivia grammar while
 * exposing the original exact source bytes and original line map to consumers. */
export function createEcmaSourceFile(
    filename: string,
    source: string,
    languageVersion: ts.ScriptTarget | ts.CreateSourceFileOptions,
    setParentNodes: boolean,
    scriptKind: ts.ScriptKind,
    goal?: EcmaParseGoal,
): ts.SourceFile {
    goal ??= /\.c[jt]s$/iu.test(filename) ? "script" : /\.m[jt]s$/iu.test(filename) ? "module" : undefined;
    const parserOptions = goal === "script" && typeof languageVersion === "object"
        ? { ...languageVersion, setExternalModuleIndicator: (_file: ts.SourceFile): void => {} }
        : languageVersion;
    let shadow = ecmaImportAttributesParserShadow(source);
    let sourceFile = ts.createSourceFile(filename, shadow, parserOptions, setParentNodes, scriptKind);
    goal ??= ts.isExternalModule(sourceFile) || /\.m[jt]s$/iu.test(filename) ? "module" : "script";
    // Contextual identifier tokens share one offset-preserving parser shadow.
    // Reparse to a fixed point because correcting one Statement body can
    // expose another body in the recovered tree. Each source token is added
    // once; the algorithm has no nesting or statement-count bound.
    const referenceTokens = new Map<number, string>();
    const javascript = scriptKind === ts.ScriptKind.JS || scriptKind === ts.ScriptKind.JSX;
    if (javascript) {
        for (;;) {
            let changed = false;
            const worklist: Array<{node: ts.Node; parent?: ts.Node; strict: boolean}> = [{
                node: sourceFile, strict: goal === "module" || ecmaDirectivePrologueHasUseStrict(sourceFile.statements),
            }];
            while (worklist.length) {
                const {node, parent, strict: inherited} = worklist.pop()!;
                const strict = inherited || ts.isClassLike(node) || ts.isFunctionLike(node) &&
                    "body" in node && !!node.body && ts.isBlock(node.body) && ecmaDirectivePrologueHasUseStrict(node.body.statements);
                if (goal === "script" && ts.isAwaitExpression(node) && !(node.flags & ts.NodeFlags.AwaitContext)) {
                    const start = node.getStart(sourceFile);
                    if (!referenceTokens.has(start)) { referenceTokens.set(start, "await"); changed = true; }
                }
                if (ts.isVariableStatement(node) && (node.declarationList.flags & ts.NodeFlags.BlockScoped)) {
                    const start = node.getStart(sourceFile);
                    const scanner = ts.createScanner(ts.ScriptTarget.ESNext, true, ts.LanguageVariant.Standard, shadow, undefined, start);
                    const keyword = scanner.scan(), escaped = scanner.hasUnicodeEscape(); scanner.scan();
                    // An escaped spelling is an Identifier, so the raw `let [`
                    // lookahead restriction does not apply. Invalid adjacent
                    // identifiers still fail in the reparsed expression tree.
                    const statementIdentifier = parent && isStatementBody(parent, node) &&
                        scanner.hasPrecedingLineBreak() && scanner.getToken() !== ts.SyntaxKind.OpenBracketToken;
                    if (!strict && keyword === ts.SyntaxKind.LetKeyword && (escaped || statementIdentifier)) {
                        if (!referenceTokens.has(start)) { referenceTokens.set(start, "let"); changed = true; }
                    }
                }
                node.forEachChild(child => { worklist.push({node: child, parent: node, strict}); });
            }
            if (!changed) {
                break;
            }
            const characters = shadow.split("");
            for (const start of referenceTokens.keys()) {
                const scanner = ts.createScanner(ts.ScriptTarget.ESNext, true, ts.LanguageVariant.Standard, shadow, undefined, start);
                scanner.scan();
                for (let index = start; index < scanner.getTextPos(); ++index) characters[index] = index === start ? "a" : "_";
            }
            shadow = characters.join("");
            sourceFile = ts.createSourceFile(filename, shadow, parserOptions, setParentNodes, scriptKind);
        }
        const worklist: ts.Node[] = [sourceFile];
        while (worklist.length) {
            const node = worklist.pop()!;
            if (ts.isIdentifier(node)) {
                const name = referenceTokens.get(node.getStart(sourceFile));
                if (name) (node as ts.Identifier & {escapedText: ts.__String}).escapedText = name as ts.__String;
            }
            node.forEachChild(child => { worklist.push(child); });
        }
    }
    if (shadow !== source) {
        (sourceFile as ts.SourceFile & { text: string }).text = source;
    }
    // ECMA-262 OptionalChain permits ?. PrivateIdentifier. TypeScript builds
    // the correct tree but adds its own TS18030 restriction to parse diagnostics.
    const parsed = sourceFile as ts.SourceFile & { parseDiagnostics?: readonly ts.DiagnosticWithLocation[] };
    if (parsed.parseDiagnostics) parsed.parseDiagnostics = parsed.parseDiagnostics.filter(diagnostic => diagnostic.code !== 18030);
    (sourceFile as ts.SourceFile & { ecmaParseGoal: EcmaParseGoal }).ecmaParseGoal = goal;
    return sourceFile;
}

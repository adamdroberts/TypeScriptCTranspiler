import ts from "typescript";

export type EcmaParseGoal = "script" | "module";
export function ecmaParseGoal(sourceFile: ts.SourceFile): EcmaParseGoal {
    return (sourceFile as ts.SourceFile & { ecmaParseGoal?: EcmaParseGoal }).ecmaParseGoal ??
        (ts.isExternalModule(sourceFile) ? "module" : "script");
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
    // TypeScript speculatively parses an `await` reference followed by an
    // expression-start token as AwaitExpression even under the Script goal.
    // Its parser context flag distinguishes that speculation from the real
    // async grammar. Reparse an equal-width shadow, then restore Identifier
    // names before binding; offsets and exact source text remain unchanged.
    const referenceTokens = new Set<number>();
    if (goal === "script" && (scriptKind === ts.ScriptKind.JS || scriptKind === ts.ScriptKind.JSX)) {
        const worklist: ts.Node[] = [sourceFile];
        while (worklist.length > 0) {
            const node = worklist.pop()!;
            if (ts.isAwaitExpression(node) && !(node.flags & ts.NodeFlags.AwaitContext))
                referenceTokens.add(node.getStart(sourceFile));
            node.forEachChild(child => { worklist.push(child); });
        }
        if (referenceTokens.size > 0) {
            const characters = shadow.split("");
            for (const start of referenceTokens) {
                const scanner = ts.createScanner(ts.ScriptTarget.ESNext, true, ts.LanguageVariant.Standard, shadow, undefined, start);
                scanner.scan();
                const end = scanner.getTextPos();
                for (let index = start; index < end; ++index) characters[index] = index === start ? "a" : "_";
            }
            shadow = characters.join("");
            sourceFile = ts.createSourceFile(filename, shadow, parserOptions, setParentNodes, scriptKind);
            const worklist: ts.Node[] = [sourceFile];
            while (worklist.length > 0) {
                const node = worklist.pop()!;
                if (ts.isIdentifier(node) && referenceTokens.has(node.getStart(sourceFile)))
                    (node as ts.Identifier & { escapedText: ts.__String }).escapedText = "await" as ts.__String;
                node.forEachChild(child => { worklist.push(child); });
            }
        }
    }
    if (shadow !== source) {
        (sourceFile as ts.SourceFile & { text: string }).text = source;
    }
    (sourceFile as ts.SourceFile & { ecmaParseGoal: EcmaParseGoal }).ecmaParseGoal = goal;
    return sourceFile;
}

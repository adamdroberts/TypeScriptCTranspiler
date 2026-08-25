import ts from "typescript";

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
): ts.SourceFile {
    const shadow = ecmaImportAttributesParserShadow(source);
    const sourceFile = ts.createSourceFile(filename, shadow, languageVersion, setParentNodes, scriptKind);
    if (shadow !== source) {
        (sourceFile as ts.SourceFile & { text: string }).text = source;
    }
    return sourceFile;
}

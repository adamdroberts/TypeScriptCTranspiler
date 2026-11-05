import ts from "typescript";

export type EcmaParseGoal = "script" | "module";
export function ecmaParseGoal(sourceFile: ts.SourceFile): EcmaParseGoal {
    return (sourceFile as ts.SourceFile & { ecmaParseGoal?: EcmaParseGoal }).ecmaParseGoal ??
        (ts.isExternalModule(sourceFile) ? "module" : "script");
}

/** Use Strict is a raw directive token, not the cooked String value. */
export function ecmaDirectivePrologueHasUseStrict(statements: readonly ts.Statement[], sourceFile?: ts.SourceFile): boolean {
    for (const statement of statements) {
        if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) return false;
        const token = statement.expression.getText(sourceFile);
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

/** Literal intervals fence a token worklist: text inside regular expression,
 * string and template literal tokens is never lexed as tokens, while template
 * interpolation expressions remain visible. Keyed by literal start offset. */
function ecmaLiteralIntervals(sourceFile: ts.SourceFile): Map<number, number> {
    const literals = new Map<number, number>(), worklist: ts.Node[] = [sourceFile];
    while (worklist.length) {
        const node = worklist.pop()!;
        if (ts.isLiteralExpression(node) || ts.isTemplateLiteralToken(node)) literals.set(node.getStart(sourceFile), node.end);
        ts.forEachChild(node, child => {worklist.push(child);});
    }
    return literals;
}

const LINE_TERMINATOR = /[\r\n\u2028\u2029]/u;

/**
 * Annex B B.1.1 HTML-like comments, which are part of the Script goal only:
 * `<!--` opens a SingleLineHTMLOpenComment wherever a token may start, and
 * `-->` opens an HTMLCloseComment when only WhiteSpace and delimited comments
 * precede it on its line, where the start of the input and a MultiLineComment
 * containing a LineTerminator also begin a line. TypeScript lexes both as
 * operator sequences. Each pass blanks exactly the first such comment (an
 * equal-width space run, so offsets and the line map are unchanged) and
 * reparses: every token before the first HTML-like comment is lexed by the
 * parser exactly as ECMA-262 specifies, so the literal intervals fencing the
 * token worklist are exact up to that comment, while a later line, whose
 * lexing could depend on the recovered parse of the comment line, is only
 * consulted after the comment is gone. One source token is visited per pass;
 * the loop has no comment-count or nesting bound.
 */
function ecmaHtmlCommentParserShadow(
    filename: string,
    shadow: string,
    parserOptions: ts.ScriptTarget | ts.CreateSourceFileOptions,
    setParentNodes: boolean,
    scriptKind: ts.ScriptKind,
    sourceFile: ts.SourceFile,
): { shadow: string; sourceFile: ts.SourceFile } {
    for (;;) {
        const literals = ecmaLiteralIntervals(sourceFile);
        const scanner = ts.createScanner(ts.ScriptTarget.ESNext, false, ts.LanguageVariant.Standard, shadow);
        let lineStart = true, comment = -1;
        for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
            const start = scanner.getTokenPos(), end = scanner.getTextPos(), literalEnd = literals.get(start);
            // A recovered parse may hold a zero-width missing literal; only a
            // forward interval fences the worklist.
            if (literalEnd !== undefined && literalEnd > start) { scanner.setTextPos(literalEnd); lineStart = false; continue; }
            if (token >= ts.SyntaxKind.FirstTriviaToken && token <= ts.SyntaxKind.LastTriviaToken) {
                if (token === ts.SyntaxKind.NewLineTrivia ||
                    token === ts.SyntaxKind.MultiLineCommentTrivia && LINE_TERMINATOR.test(shadow.slice(start, end))) lineStart = true;
                continue;
            }
            // U+2028 and U+2029 are consumed without a NewLineTrivia token; the
            // following token carries the line break instead.
            if (scanner.hasPrecedingLineBreak()) lineStart = true;
            if (shadow.startsWith("<!--", start) || lineStart && shadow.startsWith("-->", start)) { comment = start; break; }
            lineStart = false;
        }
        if (comment < 0) return { shadow, sourceFile };
        let end = comment;
        while (end < shadow.length && !LINE_TERMINATOR.test(shadow[end]!)) end++;
        shadow = shadow.slice(0, comment) + " ".repeat(end - comment) + shadow.slice(end);
        sourceFile = ts.createSourceFile(filename, shadow, parserOptions, setParentNodes, scriptKind);
    }
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
    // A Module goal is a module before any ImportDeclaration or
    // ExportDeclaration is seen: TypeScript reparses top-level `await` as an
    // AwaitExpression only for a file it already knows to be a module.
    const parserOptions = goal === "script" && typeof languageVersion === "object"
        ? { ...languageVersion, setExternalModuleIndicator: (_file: ts.SourceFile): void => {} }
        : goal === "module"
        ? { ...(typeof languageVersion === "object" ? languageVersion : { languageVersion }), setExternalModuleIndicator: (file: ts.SourceFile): void => {
            (file as ts.SourceFile & { externalModuleIndicator?: ts.Node }).externalModuleIndicator ??= file.endOfFileToken;
        } }
        : languageVersion;
    let shadow = ecmaImportAttributesParserShadow(source);
    let sourceFile = ts.createSourceFile(filename, shadow, parserOptions, setParentNodes, scriptKind);
    // HTML-like comments exist only in JavaScript parsed with the Script goal.
    // A known Script goal applies them before any other token worklist; an
    // inferred goal applies them once the goal is settled.
    let htmlComments = false;
    const applyHtmlComments = (): void => {
        htmlComments = true;
        ({ shadow, sourceFile } = ecmaHtmlCommentParserShadow(filename, shadow, parserOptions, setParentNodes, scriptKind, sourceFile));
    };
    if (goal === "script" && scriptKind === ts.ScriptKind.JS) applyHtmlComments();
    // TypeScript rejects ImportMeta as an unparenthesized `new` callee. Parse
    // every ImportMeta through the same length-preserving identifier shadow,
    // then restore the original MetaProperty nodes before binding. Literal
    // intervals keep text in regular expressions and templates out of the
    // token worklist, while their interpolation expressions remain visible.
    const literals = ecmaLiteralIntervals(sourceFile);
    const importMetaTokens = new Set<number>();
    const metaScanner = ts.createScanner(ts.ScriptTarget.ESNext,true,ts.LanguageVariant.Standard,shadow);
    for (;;) {
        const token = metaScanner.scan(); if (token === ts.SyntaxKind.EndOfFileToken) break;
        const start = metaScanner.getTokenPos(), end = metaScanner.getTextPos(), literalEnd = literals.get(start);
        if (literalEnd !== undefined && literalEnd > start) {metaScanner.setTextPos(literalEnd);continue;}
        if (token !== ts.SyntaxKind.ImportKeyword || metaScanner.hasUnicodeEscape()) continue;
        if (metaScanner.scan() === ts.SyntaxKind.DotToken && metaScanner.scan() === ts.SyntaxKind.Identifier && metaScanner.getTokenValue() === "meta") importMetaTokens.add(start);
        metaScanner.setTextPos(end);
    }
    if (importMetaTokens.size) {
        const characters = shadow.split("");
        for (const start of importMetaTokens) characters.splice(start,6,..."_meta_");
        shadow = characters.join("");
        sourceFile = ts.createSourceFile(filename,shadow,parserOptions,setParentNodes,scriptKind);
    }
    goal ??= ts.isExternalModule(sourceFile) || importMetaTokens.size > 0 || /\.m[jt]s$/iu.test(filename) ? "module" : "script";
    if (goal === "script" && scriptKind === ts.ScriptKind.JS && !htmlComments) applyHtmlComments();
    // Contextual identifier tokens share one offset-preserving parser shadow.
    // Reparse to a fixed point because correcting one Statement body can
    // expose another body in the recovered tree. Each source token is added
    // once; the algorithm has no nesting or statement-count bound.
    const referenceTokens = new Map<number, string>();
    const javascript = scriptKind === ts.ScriptKind.JS || scriptKind === ts.ScriptKind.JSX;
    {
        for (;;) {
            let changed = false;
            const worklist: Array<{node: ts.Node; parent?: ts.Node; strict: boolean}> = [{
                node: sourceFile, strict: goal === "module" || ecmaDirectivePrologueHasUseStrict(sourceFile.statements, sourceFile),
            }];
            while (worklist.length) {
                const {node, parent, strict: inherited} = worklist.pop()!;
                const strict = inherited || ts.isClassLike(node) || ts.isFunctionLike(node) &&
                    "body" in node && !!node.body && ts.isBlock(node.body) && ecmaDirectivePrologueHasUseStrict(node.body.statements, sourceFile);
                if (javascript && goal === "script" && ts.isAwaitExpression(node) && !(node.flags & ts.NodeFlags.AwaitContext)) {
                    const start = node.getStart(sourceFile);
                    if (!referenceTokens.has(start)) { referenceTokens.set(start, "await"); changed = true; }
                }
                if (javascript && ts.isVariableStatement(node) && (node.declarationList.flags & ts.NodeFlags.BlockScoped)) {
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
                // The parser calls a static member named "constructor" a
                // ConstructorDeclaration and parses its body without the
                // async or generator context of its modifiers. Shadow the
                // name so the member parses as the static method it is.
                if (ts.isConstructorDeclaration(node)) {
                    const modifiers = ts.getModifiers(node) ?? [];
                    if (modifiers.some(modifier => modifier.kind === ts.SyntaxKind.StaticKeyword)) {
                        const scanner = ts.createScanner(ts.ScriptTarget.ESNext, true, ts.LanguageVariant.Standard, shadow, undefined, modifiers[modifiers.length - 1]!.end);
                        scanner.scan();
                        const start = scanner.getTokenPos();
                        if (scanner.getTokenValue() === "constructor" && !referenceTokens.has(start)) {
                            referenceTokens.set(start, "constructor"); changed = true;
                            // The body was parsed without its await context;
                            // the reparse walks its correct tree.
                            continue;
                        }
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
    const metaWorklist: ts.Node[] = [sourceFile];
    while (metaWorklist.length) {
        const node = metaWorklist.pop()!;
        if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && importMetaTokens.has(node.expression.getStart(sourceFile))) {
            const restored = node as unknown as ts.MetaProperty;
            Object.assign(restored,{kind:ts.SyntaxKind.MetaProperty,keywordToken:ts.SyntaxKind.ImportKeyword});
            (sourceFile as ts.SourceFile & {flags:ts.NodeFlags}).flags |=
                (ts.NodeFlags as typeof ts.NodeFlags & {PossiblyContainsImportMeta:ts.NodeFlags}).PossiblyContainsImportMeta;
            delete (node as unknown as {expression?:ts.Expression}).expression;
            if (goal === "module") (sourceFile as ts.SourceFile & {externalModuleIndicator?:ts.Node}).externalModuleIndicator ??= restored;
        }
        ts.forEachChild(node, child => {metaWorklist.push(child);});
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

/** PropName of a LiteralPropertyName (sec-object-initializer-static-semantics-propname):
 * the IdentifierName's StringValue, the StringLiteral's SV, or ToString of
 * the NumericLiteral's value, a DecimalBigIntegerLiteral included
 * (`{ 0x10n: 1 }` defines "16"). The parser already stores a numeric
 * literal's text in ToString form (`1e21` as "1e+21", `010` as "8") and a
 * BigInt literal's text with its `n` suffix and source radix. Null for a
 * computed, private or pattern name. */
export function literalPropertyKey(name: ts.PropertyName | ts.BindingName | undefined): string | null {
    if (!name) return null;
    if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) return name.text;
    if (ts.isBigIntLiteral(name)) return BigInt(name.text.slice(0, -1)).toString();
    return null;
}

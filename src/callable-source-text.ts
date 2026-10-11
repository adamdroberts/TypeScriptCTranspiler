import ts from "typescript";

/** The callable's SourceText is its definition span, independent of member,
 * parameter, statement and nesting cardinality. Typed spans have no retained
 * ECMAScript erasure and use the native representation instead. */
export function callableSourceText(definition: ts.Node | null): string | null {
    if (!definition || definition.pos < 0) return null;
    if (ts.isConstructorDeclaration(definition)) definition = definition.parent;
    const source = definition.getSourceFile();
    if (!source || !/\.[cm]?jsx?$/i.test(source.fileName)) return null;
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
    return source.text.slice(start, definition.end);
}

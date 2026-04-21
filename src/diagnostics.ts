import ts from "typescript";

export class UnsupportedError extends Error {
    constructor(public node: ts.Node, message: string) {
        super(message);
    }
}

export function formatUnsupported(err: UnsupportedError, sf: ts.SourceFile): string {
    const { line, character } = sf.getLineAndCharacterOfPosition(err.node.getStart(sf));
    return `${sf.fileName}:${line + 1}:${character + 1}: unsupported: ${err.message}`;
}

export function unsupported(node: ts.Node, message: string): never {
    throw new UnsupportedError(node, message);
}

export function formatTsDiagnostics(diags: readonly ts.Diagnostic[]): string {
    const host: ts.FormatDiagnosticsHost = {
        getCurrentDirectory: () => process.cwd(),
        getCanonicalFileName: (f) => f,
        getNewLine: () => "\n",
    };
    return ts.formatDiagnosticsWithColorAndContext(diags, host);
}

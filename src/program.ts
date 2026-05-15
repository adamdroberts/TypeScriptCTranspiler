import ts from "typescript";
import * as path from "node:path";
import * as url from "node:url";

export interface BuildProgramOpts {
    entry: string;
    packageRoot: string;
}

export interface BuiltProgram {
    program: ts.Program;
    checker: ts.TypeChecker;
    entrySourceFile: ts.SourceFile;
    libCoreDts: string;
}

/** Locate package root (where package.json lives) relative to this file. */
export function resolvePackageRoot(): string {
    const thisFile = url.fileURLToPath(import.meta.url);
    // src/program.ts lives at <root>/src/program.ts
    return path.resolve(path.dirname(thisFile), "..");
}

export function buildProgram(opts: BuildProgramOpts): BuiltProgram {
    const libCoreDts = path.resolve(opts.packageRoot, "stdlib/lib.core.d.ts");

    const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        strict: true,
        noImplicitAny: true,
        strictNullChecks: true,
        noEmit: true,
        skipLibCheck: true,
        // Crucial: disable default lib; we supply our own via rootFiles.
        noLib: true,
        types: [],
        allowJs: true,
        checkJs: false,
        maxNodeModuleJsDepth: 5,
    };

    const rootNames = [
        libCoreDts,
        opts.entry,
        ...collectStaticRequireRoots(opts.entry, compilerOptions),
    ];

    const program = ts.createProgram({
        rootNames,
        options: compilerOptions,
    });

    const checker = program.getTypeChecker();
    const entrySourceFile = program.getSourceFile(opts.entry);
    if (!entrySourceFile) {
        throw new Error(`Entry not found in program: ${opts.entry}`);
    }

    return { program, checker, entrySourceFile, libCoreDts };
}

function collectStaticRequireRoots(
    entry: string,
    compilerOptions: ts.CompilerOptions,
): string[] {
    const roots: string[] = [];
    const seen = new Set<string>([path.resolve(entry)]);
    const queue = [path.resolve(entry)];
    while (queue.length > 0) {
        const fileName = queue.shift()!;
        const sourceText = ts.sys.readFile(fileName);
        if (sourceText === undefined) continue;
        const sf = ts.createSourceFile(
            fileName,
            sourceText,
            compilerOptions.target ?? ts.ScriptTarget.ES2022,
            true,
            scriptKindForFile(fileName),
        );
        for (const stmt of sf.statements) {
            for (const spec of staticRequireSpecifiers(stmt)) {
                const resolved = ts.resolveModuleName(spec, fileName, compilerOptions, ts.sys);
                const resolvedFile = resolved.resolvedModule?.resolvedFileName;
                if (!resolvedFile || seen.has(resolvedFile)) continue;
                seen.add(resolvedFile);
                roots.push(resolvedFile);
                queue.push(resolvedFile);
            }
        }
    }
    return roots;
}

function scriptKindForFile(fileName: string): ts.ScriptKind {
    if (/\.[cm]?js$/i.test(fileName)) return ts.ScriptKind.JS;
    if (/\.jsx$/i.test(fileName)) return ts.ScriptKind.JSX;
    if (/\.tsx$/i.test(fileName)) return ts.ScriptKind.TSX;
    return ts.ScriptKind.TS;
}

function staticRequireSpecifiers(stmt: ts.Statement): string[] {
    const specs: string[] = [];
    const visit = (node: ts.Node): void => {
        const spec = ts.isExpression(node) ? requireCallSpecifier(node) : null;
        if (spec) specs.push(spec);
        ts.forEachChild(node, visit);
    };
    visit(stmt);
    return specs;
}

function requireCallSpecifier(expr: ts.Expression): string | null {
    if (
        ts.isCallExpression(expr) &&
        isCommonJsRequireCallee(expr.expression) &&
        expr.arguments.length === 1 &&
        ts.isStringLiteralLike(expr.arguments[0])
    ) {
        return expr.arguments[0].text;
    }
    return null;
}

function isCommonJsRequireCallee(expr: ts.Expression): boolean {
    return (ts.isIdentifier(expr) && expr.text === "require") ||
        (
            ts.isPropertyAccessExpression(expr) &&
            expr.name.text === "require" &&
            ts.isIdentifier(expr.expression) &&
            expr.expression.text === "module"
        );
}

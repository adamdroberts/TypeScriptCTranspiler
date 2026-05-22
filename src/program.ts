import ts from "typescript";
import * as path from "node:path";
import * as url from "node:url";
import {
    isCommonJsRequireCallee,
    requireCallSpecifier as staticRequireCallSpecifier,
} from "./module-specifiers";

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
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
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
        const requireAliases = commonJsRequireAliases(sf);
        for (const stmt of sf.statements) {
            for (const spec of staticRequireSpecifiers(stmt, requireAliases)) {
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

function staticRequireSpecifiers(stmt: ts.Statement, requireAliases: Set<string>): string[] {
    const specs: string[] = [];
    const visit = (node: ts.Node): void => {
        const spec = ts.isExpression(node) ? requireCallSpecifier(node, requireAliases) : null;
        if (spec) specs.push(spec);
        ts.forEachChild(node, visit);
    };
    visit(stmt);
    return specs;
}

function requireCallSpecifier(expr: ts.Expression, requireAliases: Set<string>): string | null {
    return staticRequireCallSpecifier(expr, requireAliases);
}

function commonJsRequireAliases(sf: ts.SourceFile): Set<string> {
    const aliases = new Set<string>();
    const visit = (node: ts.Node): void => {
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
            let init = node.initializer;
            while (ts.isParenthesizedExpression(init)) init = init.expression;
            if (isCommonJsRequireAliasInitializer(init)) aliases.add(node.name.text);
        }
        ts.forEachChild(node, visit);
    };
    visit(sf);
    return aliases;
}

function isCommonJsRequireAliasInitializer(expr: ts.Expression): boolean {
    return isCommonJsRequireCallee(expr, new Set());
}

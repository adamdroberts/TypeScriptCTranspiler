import ts from "typescript";
import * as path from "node:path";
import * as url from "node:url";
import {
    isCommonJsRequireCallee,
    requireCallSpecifier as staticRequireCallSpecifier,
    requireCallSpecifiers as staticRequireCallSpecifiers,
} from "./module-specifiers";
import {
    dynamicRequireManifestHasEntries,
    type DynamicRequireManifest,
} from "./dynamic-require";
import { resolveCommonJsRequireModuleName } from "./commonjs-resolve";

export interface BuildProgramOpts {
    entry: string;
    packageRoot: string;
    dynamicRequires?: DynamicRequireManifest;
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
        customConditions: ["node-addons", "node", "module-sync"],
        allowJs: true,
        checkJs: false,
        maxNodeModuleJsDepth: 5,
    };

    const rootNames = [
        libCoreDts,
        opts.entry,
        ...collectStaticRequireRoots(opts.entry, compilerOptions, opts.dynamicRequires),
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
    dynamicRequires: DynamicRequireManifest | undefined,
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
        const moduleAliases = commonJsModuleAliases(sf);
        const requireAliases = commonJsRequireAliases(sf, moduleAliases);
        for (const stmt of sf.statements) {
            for (const spec of staticRequireSpecifiers(stmt, requireAliases, moduleAliases, dynamicRequires)) {
                const resolvedFile = resolveCommonJsRequireModuleName(spec, fileName, compilerOptions);
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

function staticRequireSpecifiers(
    stmt: ts.Statement,
    requireAliases: Set<string>,
    moduleAliases: Set<string>,
    dynamicRequires: DynamicRequireManifest | undefined,
): string[] {
    const specs: string[] = [];
    const visit = (node: ts.Node): void => {
        const nodeSpecs = ts.isExpression(node) ? requireCallSpecifiers(node, requireAliases, moduleAliases) : null;
        if (nodeSpecs) {
            if (nodeSpecs.length > 0) {
                specs.push(...nodeSpecs);
            } else if (dynamicRequires && dynamicRequireManifestHasEntries(dynamicRequires)) {
                specs.push(...dynamicRequires.specifiers);
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(stmt);
    return specs;
}

function requireCallSpecifier(expr: ts.Expression, requireAliases: Set<string>, moduleAliases: Set<string>): string | null {
    return staticRequireCallSpecifier(expr, requireAliases, moduleAliases);
}

function requireCallSpecifiers(expr: ts.Expression, requireAliases: Set<string>, moduleAliases: Set<string>): string[] | null {
    return staticRequireCallSpecifiers(expr, requireAliases, moduleAliases);
}

function commonJsModuleAliases(sf: ts.SourceFile): Set<string> {
    const aliases = new Set<string>();
    const visit = (node: ts.Node): void => {
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
            let init = node.initializer;
            while (ts.isParenthesizedExpression(init)) init = init.expression;
            if (ts.isIdentifier(init) && init.text === "module") aliases.add(node.name.text);
        }
        ts.forEachChild(node, visit);
    };
    visit(sf);
    return aliases;
}

function commonJsRequireAliases(sf: ts.SourceFile, moduleAliases: Set<string>): Set<string> {
    const aliases = new Set<string>();
    const visit = (node: ts.Node): void => {
        if (ts.isVariableDeclaration(node) && node.initializer) {
            let init: ts.Expression = node.initializer;
            while (ts.isParenthesizedExpression(init)) init = init.expression;
            if (ts.isIdentifier(node.name) && isCommonJsRequireAliasInitializer(init, moduleAliases, aliases)) {
                aliases.add(node.name.text);
            }
            if (ts.isObjectBindingPattern(node.name) && isCommonJsModuleAliasInitializer(init, moduleAliases)) {
                for (const element of node.name.elements) {
                    if (!ts.isIdentifier(element.name) || element.initializer || element.dotDotDotToken) continue;
                    if (staticPropertyName(element.propertyName ?? element.name) === "require") {
                        aliases.add(element.name.text);
                    }
                }
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(sf);
    return aliases;
}

function isCommonJsRequireAliasInitializer(
    expr: ts.Expression,
    moduleAliases: Set<string>,
    requireAliases: Set<string>,
): boolean {
    return isCommonJsRequireCallee(expr, requireAliases, moduleAliases);
}

function isCommonJsModuleAliasInitializer(expr: ts.Expression, moduleAliases: Set<string>): boolean {
    return ts.isIdentifier(expr) && (expr.text === "module" || moduleAliases.has(expr.text));
}

function staticPropertyName(name: ts.PropertyName | ts.BindingName): string | null {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
    return null;
}

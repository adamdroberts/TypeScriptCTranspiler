import ts from "typescript";
import * as path from "node:path";
import * as url from "node:url";
import {
    commonJsRequireSpecifierArgument,
    filterSpecifiersByStaticAffix,
    isCommonJsRequireCallee,
    requireCallSpecifier as staticRequireCallSpecifier,
    requireCallSpecifiers as staticRequireCallSpecifiers,
} from "./module-specifiers";
import {
    dynamicRequireManifestHasEntries,
    dynamicRequireSpecifiersForFile,
    type DynamicRequireManifest,
} from "./dynamic-require";
import { resolveCommonJsRequireModuleName } from "./commonjs-resolve";
import { createEcmaSourceFile, ecmaImportAttributesParserShadow } from "./ecmascript-source";
import {
    dynamicImportCalls,
    dynamicImportSpecifiersFromCall,
} from "./module-request";

export interface BuildProgramOpts {
    entry: string;
    packageRoot: string;
    /** Additional independent source records compiled in the same program. */
    additionalRoots?: readonly string[];
    /** Source records that must be parsed/bound with the ECMAScript Module goal. */
    moduleRoots?: readonly string[];
    /** Exact JavaScript records whose source-level `@ts-check` directive is ignored out of band. */
    ignoreCheckJsDirectiveRoots?: readonly string[];
    dynamicRequires?: DynamicRequireManifest;
    customConditions?: string[];
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

    const customConditions = [...new Set([
        "node-addons",
        "node",
        "module-sync",
        ...(opts.customConditions ?? []),
    ])];

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
        resolveJsonModule: true,
        customConditions,
        allowJs: true,
        checkJs: false,
        maxNodeModuleJsDepth: 5,
    };

    const sourceRoots = [...new Set([
        opts.entry,
        ...(opts.additionalRoots ?? []),
    ].map((filename) => path.resolve(filename)))];
    const discoveredRoots = sourceRoots.flatMap((root) =>
        collectStaticRequireRoots(root, compilerOptions, opts.dynamicRequires)
    );
    const rootNames = [libCoreDts, ...new Set([...sourceRoots, ...discoveredRoots])];

    const moduleRoots = new Set((opts.moduleRoots ?? []).map((filename) => path.resolve(filename)));
    const ignoreCheckJsDirectiveRoots = new Set(
        (opts.ignoreCheckJsDirectiveRoots ?? []).map((filename) => path.resolve(filename)),
    );
    const compilerHost = ts.createCompilerHost(compilerOptions);
    const getSourceFile = compilerHost.getSourceFile.bind(compilerHost);
    compilerHost.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
        let sourceFile = getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
        if (
            sourceFile &&
            !sourceFile.isDeclarationFile &&
            /\.[cm]?[jt]sx?$/i.test(sourceFile.fileName) &&
            ecmaImportAttributesParserShadow(sourceFile.text) !== sourceFile.text
        ) {
            const original = sourceFile;
            sourceFile = createEcmaSourceFile(
                fileName,
                original.text,
                languageVersion,
                true,
                (original as ts.SourceFile & { scriptKind?: ts.ScriptKind }).scriptKind ?? scriptKindForFile(fileName),
            );
            (sourceFile as ts.SourceFile & { impliedNodeFormat?: ts.ResolutionMode }).impliedNodeFormat =
                (original as ts.SourceFile & { impliedNodeFormat?: ts.ResolutionMode }).impliedNodeFormat;
        }
        if (sourceFile && moduleRoots.has(path.resolve(sourceFile.fileName))) {
            // TypeScript otherwise infers the goal from import/export syntax. Test262
            // also contains empty or syntax-free Module records, so bind the requested
            // goal out of band without changing one source byte.
            (sourceFile as ts.SourceFile & { externalModuleIndicator?: ts.Node }).externalModuleIndicator ??= sourceFile;
        }
        if (sourceFile && ignoreCheckJsDirectiveRoots.has(path.resolve(sourceFile.fileName))) {
            // Test262 harness files contain editor-facing `@ts-check` directives.
            // Disable only the compiler metadata flag: SourceFile.text and the
            // runner-attested input bytes remain exactly unchanged.
            (sourceFile as ts.SourceFile & { checkJsDirective?: ts.CheckJsDirective }).checkJsDirective = {
                enabled: false,
                pos: 0,
                end: 0,
            };
        }
        return sourceFile;
    };

    const program = ts.createProgram({
        rootNames,
        options: compilerOptions,
        host: compilerHost,
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
            const importSpec = moduleImportSpecifier(stmt);
            if (importSpec) {
                const resolvedFile = resolveTypeScriptModuleName(importSpec, fileName, compilerOptions);
                if (resolvedFile && !seen.has(resolvedFile)) {
                    seen.add(resolvedFile);
                    roots.push(resolvedFile);
                    queue.push(resolvedFile);
                }
            }
            for (const specifier of dynamicModuleSpecifiers(stmt)) {
                const resolvedFile = resolveTypeScriptModuleName(specifier, fileName, compilerOptions);
                if (resolvedFile && !seen.has(resolvedFile)) {
                    seen.add(resolvedFile);
                    roots.push(resolvedFile);
                    queue.push(resolvedFile);
                }
            }
            for (const spec of staticRequireSpecifiers(stmt, requireAliases, moduleAliases, dynamicRequires, fileName)) {
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

function dynamicModuleSpecifiers(root: ts.Node): string[] {
    const specifiers: string[] = [];
    for (const call of dynamicImportCalls(root)) {
        const parsed = dynamicImportSpecifiersFromCall(call);
        if (parsed?.specifiers) specifiers.push(...parsed.specifiers);
    }
    return specifiers;
}

function moduleImportSpecifier(stmt: ts.Statement): string | null {
    if (!ts.isImportDeclaration(stmt) && !ts.isExportDeclaration(stmt)) return null;
    if (isTypeOnlyModuleEdge(stmt)) return null;
    const spec = stmt.moduleSpecifier;
    return spec && ts.isStringLiteral(spec) ? spec.text : null;
}

function isTypeOnlyModuleEdge(stmt: ts.ImportDeclaration | ts.ExportDeclaration): boolean {
    if (ts.isImportDeclaration(stmt)) return stmt.importClause?.isTypeOnly === true;
    return stmt.isTypeOnly === true;
}

function resolveTypeScriptModuleName(
    spec: string,
    containingFile: string,
    compilerOptions: ts.CompilerOptions,
): string | null {
    const resolved = ts.resolveModuleName(spec, containingFile, compilerOptions, ts.sys).resolvedModule;
    return resolved?.resolvedFileName ?? null;
}

function scriptKindForFile(fileName: string): ts.ScriptKind {
    if (/\.json$/i.test(fileName)) return ts.ScriptKind.JSON;
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
    fileName: string,
): string[] {
    const specs: string[] = [];
    const visit = (
        node: ts.Node,
        activeRequireAliases: Set<string>,
        activeModuleAliases: Set<string>,
    ): void => {
        const nodeSpecs = ts.isExpression(node)
            ? requireCallSpecifiers(node, activeRequireAliases, activeModuleAliases)
            : null;
        if (nodeSpecs) {
            if (nodeSpecs.length > 0) {
                specs.push(...nodeSpecs);
            } else if (dynamicRequires && dynamicRequireManifestHasEntries(dynamicRequires)) {
                let fileSpecs = dynamicRequireSpecifiersForFile(dynamicRequires, fileName);
                if (ts.isCallExpression(node)) {
                    const specifierArg = commonJsRequireSpecifierArgument(
                        node,
                        activeRequireAliases,
                        activeModuleAliases,
                    );
                    if (specifierArg) fileSpecs = filterSpecifiersByStaticAffix(fileSpecs, specifierArg);
                }
                specs.push(...fileSpecs);
            }
        }
        if (ts.isCallExpression(node)) {
            const factoryScoped = commonJsFactoryWrapperScopedAliases(node, activeRequireAliases, activeModuleAliases);
            if (factoryScoped) {
                for (const arg of node.arguments) {
                    if (arg !== factoryScoped.factoryArgument) visit(arg, activeRequireAliases, activeModuleAliases);
                }
                const body = factoryScoped.fn.body;
                if (!body) return;
                if (ts.isBlock(body)) {
                    for (const child of body.statements) {
                        visit(child, factoryScoped.requireAliases, factoryScoped.moduleAliases);
                    }
                } else {
                    visit(body, factoryScoped.requireAliases, factoryScoped.moduleAliases);
                }
                return;
            }
            const directFactoryScoped = commonJsDirectFactoryScopedAliases(node, activeRequireAliases, activeModuleAliases);
            if (directFactoryScoped) {
                for (const arg of node.arguments) visit(arg, activeRequireAliases, activeModuleAliases);
                if (!directFactoryScoped.fn.body) return;
                if (ts.isBlock(directFactoryScoped.fn.body)) {
                    for (const child of directFactoryScoped.fn.body.statements) {
                        visit(child, directFactoryScoped.requireAliases, directFactoryScoped.moduleAliases);
                    }
                } else {
                    visit(directFactoryScoped.fn.body, directFactoryScoped.requireAliases, directFactoryScoped.moduleAliases);
                }
                return;
            }
            const scoped = commonJsIifeScopedAliases(node, activeRequireAliases, activeModuleAliases);
            if (scoped) {
                for (const arg of node.arguments) visit(arg, activeRequireAliases, activeModuleAliases);
                if (ts.isBlock(scoped.fn.body)) {
                    for (const child of scoped.fn.body.statements) {
                        visit(child, scoped.requireAliases, scoped.moduleAliases);
                    }
                } else {
                    visit(scoped.fn.body, scoped.requireAliases, scoped.moduleAliases);
                }
                return;
            }
        }
        ts.forEachChild(node, (child) => visit(child, activeRequireAliases, activeModuleAliases));
    };
    visit(stmt, requireAliases, moduleAliases);
    return specs;
}

function commonJsFactoryWrapperScopedAliases(
    call: ts.CallExpression,
    requireAliases: Set<string>,
    moduleAliases: Set<string>,
): {
    fn: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction;
    factoryArgument: ts.Expression;
    requireAliases: Set<string>;
    moduleAliases: Set<string>;
} | null {
    const wrapper = commonJsFactoryWrapperInvocation(call);
    if (!wrapper || wrapper.args.length < wrapper.fn.parameters.length) return null;
    let nextRequireAliases: Set<string> | null = null;
    let nextModuleAliases: Set<string> | null = null;
    for (let index = 0; index < wrapper.fn.parameters.length; index++) {
        const param = wrapper.fn.parameters[index]!;
        if (!ts.isIdentifier(param.name)) continue;
        const arg = wrapper.args[index]!;
        if (isCommonJsRequireCallee(arg, requireAliases, moduleAliases)) {
            nextRequireAliases ??= new Set(requireAliases);
            nextRequireAliases.add(param.name.text);
            continue;
        }
        if (commonJsModuleArgument(arg, moduleAliases)) {
            nextModuleAliases ??= new Set(moduleAliases);
            nextModuleAliases.add(param.name.text);
        }
    }
    if (!nextRequireAliases && !nextModuleAliases) return null;
    return {
        fn: wrapper.fn,
        factoryArgument: wrapper.factoryArgument,
        requireAliases: nextRequireAliases ?? requireAliases,
        moduleAliases: nextModuleAliases ?? moduleAliases,
    };
}

function commonJsDirectFactoryScopedAliases(
    call: ts.CallExpression,
    requireAliases: Set<string>,
    moduleAliases: Set<string>,
): {
    fn: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction;
    requireAliases: Set<string>;
    moduleAliases: Set<string>;
} | null {
    const invocation = commonJsDirectFactoryInvocation(call);
    if (!invocation || invocation.args.length < invocation.fn.parameters.length) return null;
    const fn = invocation.fn;
    let nextRequireAliases: Set<string> | null = null;
    let nextModuleAliases: Set<string> | null = null;
    for (let index = 0; index < fn.parameters.length; index++) {
        const param = fn.parameters[index]!;
        if (!ts.isIdentifier(param.name)) continue;
        const arg = invocation.args[index]!;
        if (isCommonJsRequireCallee(arg, requireAliases, moduleAliases)) {
            nextRequireAliases ??= new Set(requireAliases);
            nextRequireAliases.add(param.name.text);
        } else if (commonJsModuleArgument(arg, moduleAliases)) {
            nextModuleAliases ??= new Set(moduleAliases);
            nextModuleAliases.add(param.name.text);
        }
    }
    if (!nextRequireAliases && !nextModuleAliases) return null;
    return {
        fn,
        requireAliases: nextRequireAliases ?? requireAliases,
        moduleAliases: nextModuleAliases ?? moduleAliases,
    };
}

function commonJsDirectFactoryFunction(
    call: ts.CallExpression,
): ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction | null {
    if (!ts.isIdentifier(call.expression)) return null;
    return commonJsDirectFactoryFunctionForName(call.getSourceFile(), call.expression.text);
}

function commonJsDirectFactoryFunctionForName(
    sourceFile: ts.SourceFile,
    name: string,
    seen: Set<string> = new Set(),
): ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction | null {
    if (seen.has(name)) return null;
    seen.add(name);
    for (const stmt of sourceFile.statements) {
        if (ts.isFunctionDeclaration(stmt) && stmt.name?.text === name) return stmt;
        if (!ts.isVariableStatement(stmt)) continue;
        for (const decl of stmt.declarationList.declarations) {
            if (!ts.isIdentifier(decl.name) || decl.name.text !== name || !decl.initializer) continue;
            if (ts.isFunctionExpression(decl.initializer) || ts.isArrowFunction(decl.initializer)) {
                return decl.initializer;
            }
            let init = decl.initializer;
            while (ts.isParenthesizedExpression(init)) init = init.expression;
            if (ts.isIdentifier(init)) {
                return commonJsDirectFactoryFunctionForName(sourceFile, init.text, seen);
            }
        }
    }
    return null;
}

function commonJsDirectFactoryFunctionForExpression(
    sourceFile: ts.SourceFile,
    expr: ts.Expression,
): ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction | null {
    let cur = expr;
    while (ts.isParenthesizedExpression(cur)) cur = cur.expression;
    if (ts.isFunctionExpression(cur) || ts.isArrowFunction(cur)) return cur;
    return ts.isIdentifier(cur) ? commonJsDirectFactoryFunctionForName(sourceFile, cur.text) : null;
}

function commonJsDirectFactoryInvocation(call: ts.CallExpression): {
    fn: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction;
    args: readonly ts.Expression[];
} | null {
    let callee: ts.Expression = call.expression;
    while (ts.isParenthesizedExpression(callee)) callee = callee.expression;
    if (ts.isIdentifier(callee)) {
        const fn = commonJsDirectFactoryFunction(call);
        return fn ? { fn, args: call.arguments } : null;
    }
    if (ts.isFunctionExpression(callee) || ts.isArrowFunction(callee)) {
        return { fn: callee, args: call.arguments };
    }
    if (ts.isPropertyAccessExpression(callee)) {
        let target: ts.Expression = callee.expression;
        while (ts.isParenthesizedExpression(target)) target = target.expression;
        if (!ts.isIdentifier(target) && !ts.isFunctionExpression(target) && !ts.isArrowFunction(target)) return null;
        const reflectApply = ts.isIdentifier(target) && target.text === "Reflect" && callee.name.text === "apply";
        const fn = reflectApply
            ? (() => {
                let factoryArg = call.arguments[0];
                while (factoryArg && ts.isParenthesizedExpression(factoryArg)) factoryArg = factoryArg.expression;
                return factoryArg ? commonJsDirectFactoryFunctionForExpression(call.getSourceFile(), factoryArg) : null;
            })()
            : commonJsDirectFactoryFunctionForExpression(call.getSourceFile(), target);
        if (!fn) return null;
        if (reflectApply) {
            let argArray = call.arguments[2];
            while (argArray && ts.isParenthesizedExpression(argArray)) argArray = argArray.expression;
            return argArray && ts.isArrayLiteralExpression(argArray)
                ? { fn, args: argArray.elements }
                : null;
        }
        if (callee.name.text === "call") return { fn, args: call.arguments.slice(1) };
        if (callee.name.text === "apply" && call.arguments.length >= 2) {
            let argArray = call.arguments[1]!;
            while (ts.isParenthesizedExpression(argArray)) argArray = argArray.expression;
            return ts.isArrayLiteralExpression(argArray) ? { fn, args: argArray.elements } : null;
        }
        return null;
    }
    if (ts.isCallExpression(callee)) {
        let bindCallee: ts.Expression = callee.expression;
        while (ts.isParenthesizedExpression(bindCallee)) bindCallee = bindCallee.expression;
        if (!ts.isPropertyAccessExpression(bindCallee)) return null;
        let bindTarget: ts.Expression = bindCallee.expression;
        while (ts.isParenthesizedExpression(bindTarget)) bindTarget = bindTarget.expression;
        if (bindCallee.name.text !== "bind") return null;
        const fn = commonJsDirectFactoryFunctionForExpression(call.getSourceFile(), bindTarget);
        return fn ? { fn, args: call.arguments } : null;
    }
    return null;
}

function commonJsFactoryWrapperInvocation(call: ts.CallExpression): {
    fn: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction;
    factoryArgument: ts.Expression;
    args: readonly ts.Expression[];
} | null {
    const outer = commonJsIifeCallee(call.expression);
    if (!outer || !ts.isBlock(outer.body) || call.arguments.length < outer.parameters.length) return null;
    const factories = new Map<string, {
        fn: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction;
        argument: ts.Expression;
    }>();
    for (let index = 0; index < outer.parameters.length; index++) {
        const param = outer.parameters[index]!;
        if (!ts.isIdentifier(param.name)) continue;
        let arg: ts.Expression = call.arguments[index]!;
        while (ts.isParenthesizedExpression(arg)) arg = arg.expression;
        const fn = commonJsDirectFactoryFunctionForExpression(call.getSourceFile(), arg);
        if (fn) factories.set(param.name.text, { fn, argument: call.arguments[index]! });
    }
    if (factories.size === 0) return null;
    const invocations: {
        fn: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction;
        factoryArgument: ts.Expression;
        args: readonly ts.Expression[];
    }[] = [];
    const visit = (node: ts.Node): void => {
        if (
            node !== outer &&
            (
                ts.isFunctionExpression(node) ||
                ts.isFunctionDeclaration(node) ||
                ts.isArrowFunction(node) ||
                ts.isMethodDeclaration(node) ||
                ts.isGetAccessorDeclaration(node) ||
                ts.isSetAccessorDeclaration(node)
            )
        ) {
            return;
        }
        if (ts.isCallExpression(node)) {
            let callee: ts.Expression = node.expression;
            while (ts.isParenthesizedExpression(callee)) callee = callee.expression;
            if (ts.isIdentifier(callee)) {
                const factory = factories.get(callee.text);
                if (factory) {
                    invocations.push({ fn: factory.fn, factoryArgument: factory.argument, args: node.arguments });
                }
            } else if (ts.isPropertyAccessExpression(callee)) {
                let target: ts.Expression = callee.expression;
                while (ts.isParenthesizedExpression(target)) target = target.expression;
                if (ts.isIdentifier(target)) {
                    if (target.text === "Reflect" && callee.name.text === "apply" && node.arguments.length >= 3) {
                        let factoryArg = node.arguments[0]!;
                        while (ts.isParenthesizedExpression(factoryArg)) factoryArg = factoryArg.expression;
                        if (ts.isIdentifier(factoryArg)) {
                            const factory = factories.get(factoryArg.text);
                            if (factory) {
                                let argArray = node.arguments[2]!;
                                while (ts.isParenthesizedExpression(argArray)) argArray = argArray.expression;
                                if (ts.isArrayLiteralExpression(argArray)) {
                                    invocations.push({ fn: factory.fn, factoryArgument: factory.argument, args: argArray.elements });
                                }
                            }
                        }
                    } else {
                        const factory = factories.get(target.text);
                        if (factory && callee.name.text === "call") {
                            invocations.push({ fn: factory.fn, factoryArgument: factory.argument, args: node.arguments.slice(1) });
                        } else if (factory && callee.name.text === "apply" && node.arguments.length >= 2) {
                            let argArray = node.arguments[1]!;
                            while (ts.isParenthesizedExpression(argArray)) argArray = argArray.expression;
                            if (ts.isArrayLiteralExpression(argArray)) {
                                invocations.push({ fn: factory.fn, factoryArgument: factory.argument, args: argArray.elements });
                            }
                        }
                    }
                }
            } else if (ts.isCallExpression(callee)) {
                let bindCallee: ts.Expression = callee.expression;
                while (ts.isParenthesizedExpression(bindCallee)) bindCallee = bindCallee.expression;
                if (ts.isPropertyAccessExpression(bindCallee)) {
                    let bindTarget: ts.Expression = bindCallee.expression;
                    while (ts.isParenthesizedExpression(bindTarget)) bindTarget = bindTarget.expression;
                    if (ts.isIdentifier(bindTarget) && bindCallee.name.text === "bind") {
                        const factory = factories.get(bindTarget.text);
                        if (factory) {
                            invocations.push({ fn: factory.fn, factoryArgument: factory.argument, args: node.arguments });
                        }
                    }
                }
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(outer.body);
    return invocations.length === 1 ? invocations[0]! : null;
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
        if (ts.isParameter(node) && ts.isIdentifier(node.name)) {
            const arg = commonJsIifeParameterArgument(node);
            if (arg && commonJsModuleArgument(arg, aliases)) aliases.add(node.name.text);
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
        if (ts.isParameter(node) && ts.isIdentifier(node.name)) {
            const arg = commonJsIifeParameterArgument(node);
            if (arg && isCommonJsRequireCallee(arg, aliases, moduleAliases)) aliases.add(node.name.text);
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

function commonJsIifeScopedAliases(
    call: ts.CallExpression,
    requireAliases: Set<string>,
    moduleAliases: Set<string>,
): { fn: ts.FunctionExpression | ts.ArrowFunction; requireAliases: Set<string>; moduleAliases: Set<string> } | null {
    const fn = commonJsIifeCallee(call.expression);
    if (!fn || call.arguments.length < fn.parameters.length) return null;
    let nextRequireAliases: Set<string> | null = null;
    let nextModuleAliases: Set<string> | null = null;
    for (let index = 0; index < fn.parameters.length; index++) {
        const param = fn.parameters[index]!;
        if (!ts.isIdentifier(param.name)) continue;
        const arg = call.arguments[index]!;
        if (isCommonJsRequireCallee(arg, requireAliases, moduleAliases)) {
            nextRequireAliases ??= new Set(requireAliases);
            nextRequireAliases.add(param.name.text);
            continue;
        }
        if (commonJsModuleArgument(arg, moduleAliases)) {
            nextModuleAliases ??= new Set(moduleAliases);
            nextModuleAliases.add(param.name.text);
        }
    }
    if (!nextRequireAliases && !nextModuleAliases) return null;
    return {
        fn,
        requireAliases: nextRequireAliases ?? requireAliases,
        moduleAliases: nextModuleAliases ?? moduleAliases,
    };
}

function commonJsIifeCallee(expr: ts.Expression): ts.FunctionExpression | ts.ArrowFunction | null {
    let cur = expr;
    while (ts.isParenthesizedExpression(cur)) cur = cur.expression;
    return ts.isFunctionExpression(cur) || ts.isArrowFunction(cur) ? cur : null;
}

function commonJsModuleArgument(expr: ts.Expression, moduleAliases: Set<string>): boolean {
    let cur = expr;
    while (ts.isParenthesizedExpression(cur)) cur = cur.expression;
    return ts.isIdentifier(cur) && (cur.text === "module" || moduleAliases.has(cur.text));
}

function commonJsIifeParameterArgument(param: ts.ParameterDeclaration): ts.Expression | null {
    if (!ts.isIdentifier(param.name)) return null;
    const fn = param.parent;
    if (!ts.isFunctionExpression(fn) && !ts.isArrowFunction(fn)) return null;
    const index = fn.parameters.indexOf(param);
    if (index < 0) return null;
    const call = commonJsIifeCallForFunction(fn);
    if (call && index < call.arguments.length) return call.arguments[index]!;
    const wrapper = commonJsFactoryWrapperInvocationForFunction(fn);
    return wrapper && index < wrapper.args.length ? wrapper.args[index]! : null;
}

function commonJsIifeCallForFunction(fn: ts.FunctionExpression | ts.ArrowFunction): ts.CallExpression | null {
    let expr: ts.Expression = fn;
    let parent: ts.Node | undefined = fn.parent;
    while (parent && ts.isParenthesizedExpression(parent)) {
        expr = parent;
        parent = parent.parent;
    }
    return parent && ts.isCallExpression(parent) && parent.expression === expr ? parent : null;
}

function commonJsFactoryWrapperInvocationForFunction(fn: ts.FunctionExpression | ts.ArrowFunction): {
    args: readonly ts.Expression[];
} | null {
    let cur: ts.Node = fn;
    while (cur.parent) {
        const parent = cur.parent;
        if (ts.isCallExpression(parent)) {
            const wrapper = commonJsFactoryWrapperInvocation(parent);
            if (wrapper?.fn === fn) return { args: wrapper.args };
        }
        if (ts.isSourceFile(parent)) return null;
        cur = parent;
    }
    return null;
}

function staticPropertyName(name: ts.PropertyName | ts.BindingName): string | null {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
    return null;
}

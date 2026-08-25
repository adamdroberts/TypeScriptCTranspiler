import ts from "typescript";
import { execFile } from "node:child_process";
import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { promisify } from "node:util";
import { buildProgram, resolvePackageRoot } from "./program";
import { buildModuleGraph } from "./resolve";
import {
    emitProgram,
    type Test262NativeObservationPlan,
} from "./emit/index";
import { invokeCc } from "./link/cc";
import { staticStringExpressionText, staticStringExpressionTexts } from "./module-specifiers";
import {
    type NativeAddonManifest,
    loadNativeAddonManifest,
    nativeAddonManifestHasEntries,
    nativeAddonPathForSpecifier,
} from "./native-addons";
import {
    dynamicRequireManifestHasEntries,
    dynamicRequireSpecifiersForFile,
    loadDynamicRequireManifest,
    type DynamicRequireManifest,
} from "./dynamic-require";
import {
    loadRuntimeCodeManifest,
    parseAotEvalConstant,
    parseAotFunctionBodyConstant,
    runtimeCodeManifestHasEval,
    runtimeCodeManifestHasFunctions,
    type RuntimeCodeManifest,
} from "./runtime-code-aot";
import {
    formatTsDiagnostics,
    formatUnsupported,
    UnsupportedError,
} from "./diagnostics";

export interface CompileOptions {
    entry: string;
    output: string;
    /** Independent source records that share this compilation/Realm boundary. */
    additionalRoots?: readonly string[];
    /** Ordered roots to initialize; dependencies are traversed by the module graph. */
    initializationEntries?: readonly string[];
    /** Exact files whose parse/binding goal is Module even without import/export syntax. */
    moduleRoots?: readonly string[];
    /** Native structured observation mode used only by the non-delegating Test262 host. */
    test262Observation?: Test262NativeObservationPlan;
    /** Override compiler diagnostic output without changing its contents. */
    diagnosticWriter?: (message: string) => void;
    emitCOnly?: boolean;
    buildDir?: string;
    verbose?: boolean;
    /** If true, link without Boehm GC (uses leaking malloc fallback). */
    noGc?: boolean;
    /** If true, optimize for smaller release binaries and strip symbols. */
    release?: boolean;
    /** If true, lower eval/Function to the embedded Node bridge. Requires libnode when linking. */
    unsafeEval?: boolean;
    /** JSON allow-list mapping native addon specifiers to concrete .node paths. */
    nativeAddonManifest?: string;
    /** JSON allow-list of finite dynamic require specifiers compiled into the AOT graph. */
    dynamicRequireManifest?: string;
    /** JSON allow-list of runtime code strings compiled into AOT dispatch. */
    runtimeCodeManifest?: string;
    /** Additional package exports/imports conditions to include in AOT module resolution. */
    customConditions?: string[];
    /** Dispatch backend: threaded libdispatch (default) or single-threaded fallback. */
    dispatch?: "threaded" | "serial";
}

export interface CompileResult {
    exitCode: number;
    buildDir: string;
    mainC: string;
}

const RUNTIME_SOURCES = [
    "tsc_core.c",
    "tsc_value.c",
    "tsc_string.c",
    "tsc_array.c",
    "tsc_object.c",
    "tsc_map_set.c",
    "tsc_builtin.c",
    "tsc_node.c",
    "tsc_promise.c"
];
const NODE_EMBED_RUNTIME_SOURCES = ["tsc_node_embed.cc"];
const DISPATCH_RUNTIME_SOURCES = ["tsc_dispatch.c"];
const TEST262_RUNTIME_SOURCES = ["tsc_test262.c"];
const RUNTIME_HEADERS = ["tsc_runtime.h", "tsc_internal.h"];
const execFileAsync = promisify(execFile);
const DYNAMIC_REQUIRE_AOT_MESSAGE =
    "dynamic require(variable) needs a finite AOT specifier proof or --dynamic-require-manifest allow-list";
const UNKNOWN_EVAL_AOT_MESSAGE =
    "unknown eval() source requires --runtime-code-manifest allow-list or gated --unsafe-eval embedded Node bridge";
const UNKNOWN_FUNCTION_AOT_MESSAGE =
    "unknown Function() source requires --runtime-code-manifest allow-list or gated --unsafe-eval embedded Node bridge";
const UNKNOWN_NEW_FUNCTION_AOT_MESSAGE =
    "unknown new Function() source requires --runtime-code-manifest allow-list or gated --unsafe-eval embedded Node bridge";

interface Pcre2Flags {
    compileFlags: string[];
    linkFlags: string[];
    useDefaultLib: boolean;
}

async function pcre2Flags(): Promise<Pcre2Flags> {
    try {
        const [cflags, libs] = await Promise.all([
            execFileAsync("pcre2-config", ["--cflags"]),
            execFileAsync("pcre2-config", ["--libs8"]),
        ]);
        const libFlags = splitCompilerFlags(libs.stdout);
        const libDirs = libFlags
            .filter((flag) => flag.startsWith("-L"))
            .map((flag) => flag.slice(2));
        const exactLib = await findExactLibrary(libDirs, "pcre2-8");
        return {
            compileFlags: pcre2IncludeFlags(splitCompilerFlags(cflags.stdout)),
            linkFlags: exactLib ? [exactLib] : [],
            useDefaultLib: !exactLib,
        };
    } catch (e) {
        if (require('node:fs').existsSync('/home/adam/miniconda3/include/pcre2.h')) {
            return {
                compileFlags: ['-I/home/adam/miniconda3/include'],
                linkFlags: ['-L/home/adam/miniconda3/lib', '-Wl,-rpath,/home/adam/miniconda3/lib', '-lpcre2-8'],
                useDefaultLib: false
            };
        }
        return { compileFlags: [], linkFlags: [], useDefaultLib: true };
    }
}

function splitCompilerFlags(text: string): string[] {
    return text.trim().split(/\s+/).filter(Boolean);
}

function pcre2IncludeFlags(flags: readonly string[]): string[] {
    const out: string[] = [];
    for (let i = 0; i < flags.length; i++) {
        const flag = flags[i]!;
        if (flag === "-I" && i + 1 < flags.length) {
            out.push("-idirafter", flags[++i]!);
        } else if (flag.startsWith("-I") && flag.length > 2) {
            out.push("-idirafter", flag.slice(2));
        } else {
            out.push(flag);
        }
    }
    return out;
}

async function findExactLibrary(
    dirs: readonly string[],
    name: string,
): Promise<string | null> {
    for (const dir of dirs) {
        for (const suffix of [".so", ".a"]) {
            const candidate = path.join(dir, `lib${name}${suffix}`);
            try {
                await fs.access(candidate);
                return candidate;
            } catch {
                // try next candidate
            }
        }
    }
    return null;
}

interface PermanentLimitDiagnostic {
    node: ts.Node;
    message: string;
}

function permanentLimitDiagnostics(
    program: ts.Program,
    libCoreDts: string,
    opts: {
        unsafeEval?: boolean;
        nativeAddons?: NativeAddonManifest;
        dynamicRequires?: DynamicRequireManifest;
        runtimeCode?: RuntimeCodeManifest;
    } = {},
): PermanentLimitDiagnostic[] {
    const diagnostics: PermanentLimitDiagnostic[] = [];
    const checker = program.getTypeChecker();
    for (const sf of program.getSourceFiles()) {
        if (sf.isDeclarationFile || sf.fileName === libCoreDts) continue;
        const visit = (node: ts.Node): void => {
            if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
                const spec = node.moduleSpecifier;
                if (spec && ts.isStringLiteral(spec) && isNativeAddonSpecifier(spec.text)) {
                    if (!opts.nativeAddons || !nativeAddonPathForSpecifier(opts.nativeAddons, spec.text, sf.fileName)) {
                        diagnostics.push({
                            node: spec,
                            message:
                                "native C++ addon modules (*.node) require --native-addon-manifest allow-list entry",
                        });
                    }
                } else if (spec && ts.isStringLiteral(spec)) {
                    const message = nativeAddonPackageMessage(spec.text, sf.fileName, opts.nativeAddons);
                    if (message) diagnostics.push({ node: spec, message });
                }
            } else if (ts.isCallExpression(node)) {
                const expr = node.expression;
                if (ts.isIdentifier(expr)) {
                    if (expr.text === "eval" && isUnshadowedGlobalBindingIdentifier(expr, checker)) {
                        const source = node.arguments[0] ? runtimeCodeStringText(node.arguments[0]!) : "";
                        const canDispatchRuntimeManifest =
                            source === null &&
                            !!(opts.runtimeCode && runtimeCodeManifestHasEval(opts.runtimeCode));
                        if (
                            !opts.unsafeEval &&
                            !canAotCompileEvalCall(node) &&
                            !canDispatchRuntimeManifest
                        ) {
                            diagnostics.push({
                                node,
                                message: UNKNOWN_EVAL_AOT_MESSAGE,
                            });
                        }
                    } else if (expr.text === "Function" && isUnshadowedGlobalBindingIdentifier(expr, checker)) {
                        const body = functionConstructorBodyText(node);
                        const canDispatchRuntimeManifest =
                            body === null &&
                            !!(opts.runtimeCode && runtimeCodeManifestHasFunctions(opts.runtimeCode) && canAotDispatchFunctionManifest(node));
                        if (
                            !opts.unsafeEval &&
                            !canAotCompileFunctionConstructor(node) &&
                            !canDispatchRuntimeManifest
                        ) {
                            diagnostics.push({
                                node,
                                message: UNKNOWN_FUNCTION_AOT_MESSAGE,
                            });
                        }
                    } else if (expr.text === "require") {
                        const spec = node.arguments[0];
                        const literalSpecs = spec ? stringSpecifierTexts(spec) : [];
                        if (literalSpecs.length > 0) {
                            addNativeAddonDiagnostics(node, literalSpecs, sf.fileName, opts, diagnostics);
                        } else if (opts.dynamicRequires && dynamicRequireManifestHasEntries(opts.dynamicRequires)) {
                            const specifiers = dynamicRequireSpecifiersForFile(opts.dynamicRequires, sf.fileName);
                            if (specifiers.length > 0) {
                                addNativeAddonDiagnostics(node, specifiers, sf.fileName, opts, diagnostics);
                            } else {
                                diagnostics.push({
                                    node,
                                    message: DYNAMIC_REQUIRE_AOT_MESSAGE,
                                });
                            }
                        } else {
                            diagnostics.push({
                                node,
                                message: DYNAMIC_REQUIRE_AOT_MESSAGE,
                            });
                        }
                    }
                } else if (isModuleRequireAccess(expr)) {
                    const spec = node.arguments[0];
                    const literalSpecs = spec ? stringSpecifierTexts(spec) : [];
                    if (literalSpecs.length > 0) {
                        addNativeAddonDiagnostics(node, literalSpecs, sf.fileName, opts, diagnostics);
                    } else if (opts.dynamicRequires && dynamicRequireManifestHasEntries(opts.dynamicRequires)) {
                        const specifiers = dynamicRequireSpecifiersForFile(opts.dynamicRequires, sf.fileName);
                        if (specifiers.length > 0) {
                            addNativeAddonDiagnostics(node, specifiers, sf.fileName, opts, diagnostics);
                        } else {
                            diagnostics.push({
                                node,
                                message: DYNAMIC_REQUIRE_AOT_MESSAGE,
                            });
                        }
                    } else {
                        diagnostics.push({
                            node,
                            message: DYNAMIC_REQUIRE_AOT_MESSAGE,
                        });
                    }
                } else if (expr.kind === ts.SyntaxKind.ImportKeyword) {
                    const spec = node.arguments[0];
                    const literalSpec = spec ? stringSpecifierText(spec) : null;
                    if (literalSpec && isNativeAddonSpecifier(literalSpec)) {
                        if (!opts.nativeAddons || !nativeAddonPathForSpecifier(opts.nativeAddons, literalSpec, sf.fileName)) {
                            diagnostics.push({
                                node,
                                message:
                                    "native C++ addon modules (*.node) require --native-addon-manifest allow-list entry",
                            });
                        }
                    } else if (literalSpec) {
                        const message = nativeAddonPackageMessage(literalSpec, sf.fileName, opts.nativeAddons);
                        if (message) diagnostics.push({ node, message });
                    }
                }
            } else if (
                ts.isNewExpression(node) &&
                ts.isIdentifier(node.expression) &&
                node.expression.text === "Function" &&
                isUnshadowedGlobalBindingIdentifier(node.expression, checker)
            ) {
                const body = functionConstructorBodyText(node);
                const canDispatchRuntimeManifest =
                    body === null &&
                    !!(opts.runtimeCode && runtimeCodeManifestHasFunctions(opts.runtimeCode) && canAotDispatchFunctionManifest(node));
                if (
                    !opts.unsafeEval &&
                    !canAotCompileFunctionConstructor(node) &&
                    !canDispatchRuntimeManifest
                ) {
                    diagnostics.push({
                        node,
                        message: UNKNOWN_NEW_FUNCTION_AOT_MESSAGE,
                    });
                }
            } else if (
                ts.isIdentifier(node) &&
                (node.text === "eval" || node.text === "Function") &&
                !opts.unsafeEval &&
                isGlobalEvalOrFunctionValueReference(node, checker)
            ) {
                diagnostics.push({
                    node,
                    message: node.text === "eval" ? UNKNOWN_EVAL_AOT_MESSAGE : UNKNOWN_FUNCTION_AOT_MESSAGE,
                });
            }
            ts.forEachChild(node, visit);
        };
        visit(sf);
    }
    return diagnostics;
}

function isGlobalEvalOrFunctionValueReference(node: ts.Identifier, checker: ts.TypeChecker): boolean {
    const parent = node.parent;
    if (!parent) return false;

    if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
        return ts.isIdentifier(parent.expression) && parent.expression.text === "globalThis";
    }
    if (ts.isPropertyAssignment(parent) && parent.name === node) return false;
    if (ts.isMethodDeclaration(parent) && parent.name === node) return false;
    if (ts.isPropertyDeclaration(parent) && parent.name === node) return false;
    if (ts.isPropertySignature(parent) && parent.name === node) return false;
    if (ts.isMethodSignature(parent) && parent.name === node) return false;
    if (ts.isBindingElement(parent) && parent.propertyName === node) return false;
    if (ts.isImportSpecifier(parent) && parent.name === node) return false;
    if (ts.isExportSpecifier(parent) && parent.name === node) return false;
    if (ts.isNamespaceImport(parent) && parent.name === node) return false;
    if (ts.isImportClause(parent) && parent.name === node) return false;
    if (ts.isCallExpression(parent) && parent.expression === node) return false;
    if (ts.isNewExpression(parent) && parent.expression === node) return false;

    // Reading the intrinsic prototype cannot itself compile or execute source
    // text. The runtime exposes a fail-closed Function constructor through its
    // `constructor` property, so this exemption cannot bypass the AOT gate.
    if (
        node.text === "Function" &&
        ts.isPropertyAccessExpression(parent) &&
        parent.expression === node &&
        parent.name.text === "prototype"
    ) {
        return false;
    }

    return isUnshadowedGlobalBindingIdentifier(node, checker);
}

function isUnshadowedGlobalBindingIdentifier(node: ts.Identifier, checker: ts.TypeChecker): boolean {
    const sym = checker.getSymbolAtLocation(node);
    if (!sym) return true;
    const source = node.getSourceFile();
    return !(sym.declarations ?? []).some((decl) => decl.getSourceFile() === source);
}

interface DispatchLinkOptions {
    includeDir: string;
    libDir: string;
}

/** Locate an installed libdispatch (swift-corelibs-libdispatch). Honors
 *  TSC2C_LIBDISPATCH_PREFIX, then falls back to conventional prefixes. */
export function findDispatchLinkOptions(): DispatchLinkOptions | null {
    const prefixes = process.env.TSC2C_LIBDISPATCH_PREFIX
        ? [process.env.TSC2C_LIBDISPATCH_PREFIX]
        : ["/usr/local", "/usr", "/usr/share/swift/usr", "/usr/local/swift/usr"];
    for (const prefix of prefixes) {
        const layouts = [
            {
                includeDir: path.join(prefix, "include"),
                libDirs: [path.join(prefix, "lib"), path.join(prefix, "lib64"), path.join(prefix, "lib", "x86_64-linux-gnu")],
            },
            {
                includeDir: path.join(prefix, "lib", "swift"),
                libDirs: [path.join(prefix, "lib", "swift", "linux")],
            },
        ];
        for (const layout of layouts) {
            if (!fsSync.existsSync(path.join(layout.includeDir, "dispatch", "dispatch.h"))) continue;
            for (const libDir of layout.libDirs) {
                if (
                    fsSync.existsSync(path.join(libDir, "libdispatch.so")) ||
                    fsSync.existsSync(path.join(libDir, "libdispatch.a"))
                ) {
                    return { includeDir: layout.includeDir, libDir };
                }
            }
        }
    }
    return null;
}

interface NodeEmbedLinkOptions {
    includeDir: string;
    libnode: string;
    rpath?: string;
}

interface LibuvLinkOptions {
    library: string;
    rpath?: string;
}

/** Locate a runtime libuv shared library. The distribution image may ship the
 * SONAME without the development symlink, so this checks the versioned file
 * directly instead of relying on `-luv`. */
export function findLibuvLinkOptions(): LibuvLinkOptions | null {
    const explicit = process.env.TSC2C_LIBUV;
    const candidates = explicit
        ? [explicit]
        : [
            "/usr/lib/x86_64-linux-gnu/libuv.so.1",
            "/lib/x86_64-linux-gnu/libuv.so.1",
            "/usr/lib64/libuv.so.1",
            "/lib64/libuv.so.1",
            "/usr/local/lib/libuv.so.1",
        ];
    const standardDirs = new Set([
        "/lib",
        "/lib64",
        "/usr/lib",
        "/usr/lib64",
        "/lib/x86_64-linux-gnu",
        "/usr/lib/x86_64-linux-gnu",
    ]);
    for (const candidate of candidates) {
        if (!fsSync.existsSync(candidate)) continue;
        const dir = path.dirname(candidate);
        return { library: candidate, rpath: standardDirs.has(dir) ? undefined : dir };
    }
    return null;
}

function findNodeEmbedLinkOptions(): NodeEmbedLinkOptions | null {
    const includeDir =
        process.env.TSC2C_NODE_INCLUDE ??
        path.resolve(path.dirname(process.execPath), "..", "include", "node");
    if (!fsSync.existsSync(path.join(includeDir, "node.h"))) return null;

    const explicit = process.env.TSC2C_LIBNODE;
    if (explicit && fsSync.existsSync(explicit)) {
        return { includeDir, libnode: explicit, rpath: path.dirname(explicit) };
    }

    const roots = [
        path.resolve(path.dirname(process.execPath), ".."),
        "/usr",
        "/usr/local",
    ];
    for (const root of roots) {
        for (const libDir of [path.join(root, "lib"), path.join(root, "lib64")]) {
            try {
                const match = fsSync
                    .readdirSync(libDir)
                    .find((name) => /^libnode\.(so|dylib|a)(\.|$)/.test(name));
                if (match) {
                    return {
                        includeDir,
                        libnode: path.join(libDir, match),
                        rpath: match.endsWith(".a") ? undefined : libDir,
                    };
                }
            } catch {
                // try next lib directory
            }
        }
    }
    return null;
}

function stringSpecifierText(expr: ts.Expression): string | null {
    return staticStringExpressionText(expr);
}

function stringSpecifierTexts(expr: ts.Expression): string[] {
    return staticStringExpressionTexts(expr);
}

function canAotCompileEvalCall(call: ts.CallExpression): boolean {
    if (call.arguments.length === 0) return true;
    const source = call.arguments[0] ? runtimeCodeStringText(call.arguments[0]!) : null;
    return source !== null && parseAotEvalConstant(source) !== null;
}

function canAotCompileFunctionConstructor(call: ts.CallExpression | ts.NewExpression): boolean {
    const body = functionConstructorBodyText(call);
    return body !== null && parseAotFunctionBodyConstant(body) !== null;
}

function canAotDispatchFunctionManifest(call: ts.CallExpression | ts.NewExpression): boolean {
    return functionConstructorBodyArg(call) !== null;
}

function functionConstructorBodyText(call: ts.CallExpression | ts.NewExpression): string | null {
    const args = call.arguments ?? [];
    if (args.length === 0) return "";
    const bodyArg = functionConstructorBodyArg(call);
    return bodyArg ? runtimeCodeStringText(bodyArg) : null;
}

function functionConstructorBodyArg(call: ts.CallExpression | ts.NewExpression): ts.Expression | null {
    const args = call.arguments ?? [];
    if (args.length < 1) return null;
    for (let i = 0; i < args.length - 1; i++) {
        if (runtimeCodeStringText(args[i]!) === null) return null;
    }
    return args[args.length - 1]!;
}

function runtimeCodeStringText(expr: ts.Expression): string | null {
    return staticStringExpressionText(expr);
}

function addNativeAddonDiagnostics(
    node: ts.Node,
    specs: string[],
    containingFile: string,
    opts: { nativeAddons?: NativeAddonManifest },
    diagnostics: PermanentLimitDiagnostic[],
): void {
    for (const spec of specs) {
        if (isNativeAddonSpecifier(spec)) {
            if (!opts.nativeAddons || !nativeAddonPathForSpecifier(opts.nativeAddons, spec, containingFile)) {
                diagnostics.push({
                    node,
                    message:
                        "native C++ addon modules (*.node) require --native-addon-manifest allow-list entry",
                });
            }
        } else {
            const message = nativeAddonPackageMessage(spec, containingFile, opts.nativeAddons);
            if (message) diagnostics.push({ node, message });
        }
    }
}

function isModuleRequireAccess(expr: ts.Expression): boolean {
    return ts.isPropertyAccessExpression(expr) &&
        expr.name.text === "require" &&
        ts.isIdentifier(expr.expression) &&
        expr.expression.text === "module";
}

function isNativeAddonSpecifier(spec: string): boolean {
    return spec.endsWith(".node");
}

function nativeAddonPackageMessage(
    spec: string,
    containingFile: string,
    manifest: NativeAddonManifest | undefined,
): string | null {
    if (spec.startsWith("#")) {
        return nativeAddonPackageImportMessage(spec, containingFile, manifest);
    }
    if (spec.startsWith(".") || spec.startsWith("/") || spec.startsWith("node:")) {
        return null;
    }
    const packageName = packageNameFromSpecifier(spec);
    if (!packageName) return null;
    const packageRoot = findNodeModulePackage(packageName, path.dirname(containingFile));
    if (!packageRoot) return null;
    if (!packageContainsNativeAddon(packageRoot)) return null;
    if (manifest && nativeAddonPathForSpecifier(manifest, spec, containingFile)) return null;
    return `native C++ addon package '${packageName}' contains or resolves to a .node binary and requires --native-addon-manifest allow-list entry`;
}

function nativeAddonPackageImportMessage(
    spec: string,
    containingFile: string,
    manifest: NativeAddonManifest | undefined,
): string | null {
    if (manifest && nativeAddonPathForSpecifier(manifest, spec, containingFile)) return null;
    const packageRoot = findNearestPackageRoot(path.dirname(containingFile));
    if (!packageRoot) return null;
    const importsTarget = packageImportTarget(packageRoot, spec);
    if (
        !containsNativeAddonReference(importsTarget) &&
        !containsNativeAddonPackageReference(importsTarget, packageRoot)
    ) {
        return null;
    }
    return `native C++ addon package import '${spec}' resolves to a .node binary and requires --native-addon-manifest allow-list entry`;
}

function packageNameFromSpecifier(spec: string): string | null {
    const parts = spec.split("/");
    if (spec.startsWith("@")) {
        if (parts.length < 2 || !parts[0] || !parts[1]) return null;
        return `${parts[0]}/${parts[1]}`;
    }
    return parts[0] || null;
}

function findNearestPackageRoot(fromDir: string): string | null {
    let dir = path.resolve(fromDir);
    while (true) {
        const packageJson = path.join(dir, "package.json");
        if (fsSync.existsSync(packageJson) && fsSync.statSync(packageJson).isFile()) {
            return dir;
        }
        const parent = path.dirname(dir);
        if (parent === dir) return null;
        dir = parent;
    }
}

function findNodeModulePackage(
    packageName: string,
    fromDir: string,
): string | null {
    let dir = path.resolve(fromDir);
    while (true) {
        const candidate = path.join(dir, "node_modules", packageName);
        if (fsSync.existsSync(candidate) && fsSync.statSync(candidate).isDirectory()) {
            return candidate;
        }
        const parent = path.dirname(dir);
        if (parent === dir) return null;
        dir = parent;
    }
}

function packageContainsNativeAddon(packageRoot: string): boolean {
    const releaseDir = path.join(packageRoot, "build", "Release");
    try {
        if (
            fsSync.statSync(releaseDir).isDirectory() &&
            fsSync.readdirSync(releaseDir).some((name) => name.endsWith(".node"))
        ) {
            return true;
        }
    } catch {
        // no conventional native-addon build output
    }

    try {
        const raw = fsSync.readFileSync(path.join(packageRoot, "package.json"), "utf8");
        const pkg = JSON.parse(raw) as {
            main?: unknown;
            module?: unknown;
            exports?: unknown;
            imports?: unknown;
            bin?: unknown;
        };
        return [pkg.main, pkg.module, pkg.exports, pkg.imports, pkg.bin].some(
            containsNativeAddonReference,
        );
    } catch {
        return false;
    }
}

function packageImportTarget(packageRoot: string, spec: string): unknown {
    try {
        const raw = fsSync.readFileSync(path.join(packageRoot, "package.json"), "utf8");
        const pkg = JSON.parse(raw) as { imports?: unknown };
        const imports = pkg.imports;
        if (!imports || typeof imports !== "object" || Array.isArray(imports)) return undefined;
        const importMap = imports as Record<string, unknown>;
        if (Object.prototype.hasOwnProperty.call(importMap, spec)) return importMap[spec];
        for (const [key, value] of Object.entries(importMap)) {
            const star = key.indexOf("*");
            if (star < 0) continue;
            const prefix = key.slice(0, star);
            const suffix = key.slice(star + 1);
            if (spec.startsWith(prefix) && spec.endsWith(suffix)) return value;
        }
        return undefined;
    } catch {
        return undefined;
    }
}

function containsNativeAddonReference(value: unknown): boolean {
    if (typeof value === "string") return value.endsWith(".node");
    if (Array.isArray(value)) return value.some(containsNativeAddonReference);
    if (value && typeof value === "object") {
        return Object.values(value).some(containsNativeAddonReference);
    }
    return false;
}

function containsNativeAddonPackageReference(value: unknown, packageRoot: string): boolean {
    if (typeof value === "string") {
        if (value.startsWith(".") || value.startsWith("/") || value.startsWith("#") || value.startsWith("node:")) {
            return false;
        }
        const packageName = packageNameFromSpecifier(value);
        if (!packageName) return false;
        const targetRoot = findNodeModulePackage(packageName, path.dirname(packageRoot));
        return targetRoot ? packageContainsNativeAddon(targetRoot) : false;
    }
    if (Array.isArray(value)) {
        return value.some((entry) => containsNativeAddonPackageReference(entry, packageRoot));
    }
    if (value && typeof value === "object") {
        return Object.values(value).some((entry) => containsNativeAddonPackageReference(entry, packageRoot));
    }
    return false;
}

export async function compile(opts: CompileOptions): Promise<CompileResult> {
    const writeDiagnostic = opts.diagnosticWriter ?? ((message: string) => process.stderr.write(message));
    const dispatchMode = opts.dispatch ?? "threaded";
    if (dispatchMode !== "threaded" && dispatchMode !== "serial") {
        writeDiagnostic(`tsc2c: unsupported dispatch mode: ${dispatchMode}\n`);
        return { exitCode: 3, buildDir: opts.buildDir ?? "", mainC: "" };
    }
    const pkg = resolvePackageRoot();
    const buildDir =
        opts.buildDir ?? (await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-")));
    if (opts.verbose) console.error(`[tsc2c] build dir: ${buildDir}`);
    await fs.mkdir(buildDir, { recursive: true });
    let nativeAddons: NativeAddonManifest;
    let dynamicRequires: DynamicRequireManifest;
    let runtimeCode: RuntimeCodeManifest;
    try {
        nativeAddons = await loadNativeAddonManifest(opts.nativeAddonManifest);
        dynamicRequires = await loadDynamicRequireManifest(opts.dynamicRequireManifest);
        runtimeCode = await loadRuntimeCodeManifest(opts.runtimeCodeManifest);
    } catch (e) {
        writeDiagnostic(`tsc2c: ${(e as Error).message}\n`);
        return { exitCode: 3, buildDir, mainC: "" };
    }
    const usesNodeEmbed = !!opts.unsafeEval || nativeAddonManifestHasEntries(nativeAddons);

    const { program, checker, entrySourceFile, libCoreDts } = buildProgram({
        entry: opts.entry,
        packageRoot: pkg,
        additionalRoots: opts.additionalRoots,
        moduleRoots: opts.moduleRoots,
        dynamicRequires,
        customConditions: opts.customConditions,
    });
    const permanent = permanentLimitDiagnostics(program, libCoreDts, {
        unsafeEval: opts.unsafeEval,
        nativeAddons,
        dynamicRequires,
        runtimeCode,
    });
    if (permanent.length > 0) {
        for (const d of permanent) {
            writeDiagnostic(
                formatUnsupported(
                    new UnsupportedError(d.node, d.message),
                    d.node.getSourceFile(),
                ) + "\n",
            );
        }
        return { exitCode: 3, buildDir, mainC: "" };
    }

    const pre = ts.getPreEmitDiagnostics(program);
    if (pre.length > 0) {
        writeDiagnostic(formatTsDiagnostics(pre));
        return { exitCode: 2, buildDir, mainC: "" };
    }

    const graph = buildModuleGraph(program, libCoreDts, entrySourceFile.fileName, {
        dynamicRequires,
        initializationEntries: opts.initializationEntries,
    });
    if (opts.verbose) {
        console.error(
            `[tsc2c] modules: ${[...graph.modules.keys()].join(", ")}`,
        );
        console.error(`[tsc2c] topo: ${graph.topoOrder.join(" -> ")}`);
    }

    const { mainC, diagnostics, usesDispatch, usesLibuv } = emitProgram(graph, checker, {
        nativeAddons,
        dynamicRequires,
        runtimeCode,
        unsafeEval: opts.unsafeEval,
        test262Observation: opts.test262Observation,
    });
    if (diagnostics.length > 0) {
        for (const d of diagnostics) writeDiagnostic(d + "\n");
        return { exitCode: 3, buildDir, mainC: "" };
    }
    const libuv = usesLibuv ? findLibuvLinkOptions() : null;
    if (usesLibuv && !libuv) {
        writeDiagnostic(
            "tsc2c: this program uses a libuv-backed fs.promises subset, but libuv was not found.\n" +
            "tsc2c: install libuv or set TSC2C_LIBUV to an installed libuv shared library.\n",
        );
        if (opts.buildDir === undefined) fsSync.rmSync(buildDir, { recursive: true, force: true });
        return { exitCode: 3, buildDir, mainC };
    }
    const mainPath = path.join(buildDir, "main.c");
    await fs.writeFile(mainPath, mainC, "utf8");
    if (opts.verbose) console.error(`[tsc2c] wrote ${mainPath}`);

    const runtimeSrc = path.join(pkg, "runtime");
    const runtimeSources = [
        ...RUNTIME_SOURCES,
        ...(usesNodeEmbed ? NODE_EMBED_RUNTIME_SOURCES : []),
        ...(usesDispatch ? DISPATCH_RUNTIME_SOURCES : []),
        ...(opts.test262Observation ? TEST262_RUNTIME_SOURCES : []),
    ];
    for (const f of runtimeSources) {
        await fs.copyFile(path.join(runtimeSrc, f), path.join(buildDir, f));
    }
    for (const f of RUNTIME_HEADERS) {
        await fs.copyFile(path.join(runtimeSrc, f), path.join(buildDir, f));
    }

    if (opts.emitCOnly) {
        if (opts.verbose) console.error(`[tsc2c] --emit-c-only: skipping gcc.`);
        return { exitCode: 0, buildDir, mainC };
    }

    const pcFlags = await pcre2Flags();
    const dispatchLink = usesDispatch && dispatchMode === "threaded" ? findDispatchLinkOptions() : null;
    if (usesDispatch && dispatchMode === "threaded" && !dispatchLink) {
        writeDiagnostic(
            "tsc2c: this program uses the dispatch API, which requires libdispatch (swift-corelibs-libdispatch).\n" +
            "tsc2c: install it (build https://github.com/swiftlang/swift-corelibs-libdispatch with clang+cmake,\n" +
            "tsc2c: then `ninja install`), or point TSC2C_LIBDISPATCH_PREFIX at an install prefix containing\n" +
            "tsc2c: include/dispatch/dispatch.h and lib/libdispatch.so.\n",
        );
        if (opts.buildDir === undefined) fsSync.rmSync(buildDir, { recursive: true, force: true });
        return { exitCode: 3, buildDir, mainC };
    }
    const nodeEmbed = usesNodeEmbed ? findNodeEmbedLinkOptions() : null;
    if (usesNodeEmbed && !nodeEmbed) {
        writeDiagnostic(
            "tsc2c: embedded Node bridge requires link inputs; set TSC2C_LIBNODE to libnode.so/libnode.a and optionally TSC2C_NODE_INCLUDE to Node headers\n",
        );
        if (opts.buildDir === undefined) fsSync.rmSync(buildDir, { recursive: true, force: true });
        return { exitCode: 3, buildDir, mainC };
    }
    const baseLibs = opts.noGc
        ? ["m", "resolv", "ssl", "crypto", "icuuc", "icudata", "gmp"]
        : ["gc", "m", "resolv", "ssl", "crypto", "icuuc", "icudata", "gmp"];
    const libs = pcFlags.useDefaultLib ? [...baseLibs, "pcre2-8"] : baseLibs;
    const cc = await invokeCc({
        sources: [mainPath, ...runtimeSources.map((f) => path.join(buildDir, f))],
        output: opts.output,
        includeDirs: nodeEmbed ? [buildDir, nodeEmbed.includeDir] : [buildDir],
        libs,
        extraFlags: [
            ...(opts.noGc ? ["-DTSC_NO_GC"] : []),
            ...(opts.unsafeEval ? ["-DTSC_UNSAFE_EVAL"] : []),
            ...(usesNodeEmbed ? ["-DTSC_HAS_LIBNODE"] : []),
            ...(usesLibuv ? ["-DTSC_HAS_LIBUV"] : []),
            ...(usesDispatch && dispatchMode === "serial" ? ["-DTSC_DISPATCH_SERIAL"] : []),
            ...(dispatchLink ? ["-DTSC_THREADS", "-pthread", `-I${dispatchLink.includeDir}`] : []),
            ...pcFlags.compileFlags,
        ],
        linkFlags: [
            ...pcFlags.linkFlags,
            ...(dispatchLink
                ? [`-L${dispatchLink.libDir}`, "-ldispatch", `-Wl,-rpath,${dispatchLink.libDir}`]
                : []),
            ...(nodeEmbed
                ? [nodeEmbed.libnode, ...(nodeEmbed.rpath ? [`-Wl,-rpath,${nodeEmbed.rpath}`] : [])]
                : []),
            ...(libuv
                ? [libuv.library, ...(libuv.rpath ? [`-Wl,-rpath,${libuv.rpath}`] : [])]
                : []),
        ],
        release: !!opts.release,
        verbose: !!opts.verbose,
        stderrWriter: writeDiagnostic,
    });
    if (cc.exitCode !== 0) {
        writeDiagnostic(`tsc2c: gcc exited ${cc.exitCode}\n`);
        if (opts.buildDir === undefined) fsSync.rmSync(buildDir, { recursive: true, force: true });
        return { exitCode: cc.exitCode, buildDir, mainC };
    }
    if (opts.verbose) console.error(`[tsc2c] wrote ${opts.output}`);
    if (opts.buildDir === undefined) fsSync.rmSync(buildDir, { recursive: true, force: true });
    return { exitCode: 0, buildDir, mainC };
}

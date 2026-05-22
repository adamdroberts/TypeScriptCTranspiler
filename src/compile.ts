import ts from "typescript";
import { execFile } from "node:child_process";
import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { promisify } from "node:util";
import { buildProgram, resolvePackageRoot } from "./program";
import { buildModuleGraph } from "./resolve";
import { emitProgram } from "./emit/index";
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
const RUNTIME_HEADERS = ["tsc_runtime.h", "tsc_internal.h"];
const execFileAsync = promisify(execFile);
const DYNAMIC_REQUIRE_AOT_MESSAGE =
    "dynamic require(variable) needs a finite AOT specifier proof or --dynamic-require-manifest allow-list";

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
                    if (expr.text === "eval") {
                        if (
                            !opts.unsafeEval &&
                            !canAotCompileEvalCall(node) &&
                            !(opts.runtimeCode && runtimeCodeManifestHasEval(opts.runtimeCode))
                        ) {
                            diagnostics.push({
                                node,
                                message:
                                    "runtime code compilation via eval() cannot be AOT-compiled without --unsafe-eval",
                            });
                        }
                    } else if (expr.text === "Function") {
                        if (
                            !opts.unsafeEval &&
                            !canAotCompileFunctionConstructor(node) &&
                            !(opts.runtimeCode && runtimeCodeManifestHasFunctions(opts.runtimeCode))
                        ) {
                            diagnostics.push({
                                node,
                                message:
                                    "runtime code compilation via Function() cannot be AOT-compiled without --unsafe-eval",
                            });
                        }
                    } else if (expr.text === "require") {
                        const spec = node.arguments[0];
                        const literalSpecs = spec ? stringSpecifierTexts(spec) : [];
                        if (literalSpecs.length > 0) {
                            addNativeAddonDiagnostics(node, literalSpecs, sf.fileName, opts, diagnostics);
                        } else if (opts.dynamicRequires && dynamicRequireManifestHasEntries(opts.dynamicRequires)) {
                            addNativeAddonDiagnostics(node, opts.dynamicRequires.specifiers, sf.fileName, opts, diagnostics);
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
                        addNativeAddonDiagnostics(node, opts.dynamicRequires.specifiers, sf.fileName, opts, diagnostics);
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
                node.expression.text === "Function"
            ) {
                if (
                    !opts.unsafeEval &&
                    !canAotCompileFunctionConstructor(node) &&
                    !(opts.runtimeCode && runtimeCodeManifestHasFunctions(opts.runtimeCode))
                ) {
                    diagnostics.push({
                        node,
                        message:
                            "runtime code compilation via new Function() cannot be AOT-compiled without --unsafe-eval",
                    });
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(sf);
    }
    return diagnostics;
}

interface NodeEmbedLinkOptions {
    includeDir: string;
    libnode: string;
    rpath?: string;
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
    const source = call.arguments[0] ? stringSpecifierText(call.arguments[0]!) : null;
    return source !== null && parseAotEvalConstant(source) !== null;
}

function canAotCompileFunctionConstructor(call: ts.CallExpression | ts.NewExpression): boolean {
    const args = call.arguments ?? [];
    if (args.length !== 1) return false;
    const body = stringSpecifierText(args[0]!);
    return body !== null && parseAotFunctionBodyConstant(body) !== null;
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
    if (!containsNativeAddonReference(importsTarget)) return null;
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

export async function compile(opts: CompileOptions): Promise<CompileResult> {
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
        process.stderr.write(`tsc2c: ${(e as Error).message}\n`);
        return { exitCode: 3, buildDir, mainC: "" };
    }
    const usesNodeEmbed = !!opts.unsafeEval || nativeAddonManifestHasEntries(nativeAddons);

    const { program, checker, entrySourceFile, libCoreDts } = buildProgram({
        entry: opts.entry,
        packageRoot: pkg,
        dynamicRequires,
    });
    const permanent = permanentLimitDiagnostics(program, libCoreDts, {
        unsafeEval: opts.unsafeEval,
        nativeAddons,
        dynamicRequires,
        runtimeCode,
    });
    if (permanent.length > 0) {
        for (const d of permanent) {
            process.stderr.write(
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
        process.stderr.write(formatTsDiagnostics(pre));
        return { exitCode: 2, buildDir, mainC: "" };
    }

    const graph = buildModuleGraph(program, libCoreDts, entrySourceFile.fileName, {
        dynamicRequires,
    });
    if (opts.verbose) {
        console.error(
            `[tsc2c] modules: ${[...graph.modules.keys()].join(", ")}`,
        );
        console.error(`[tsc2c] topo: ${graph.topoOrder.join(" -> ")}`);
    }

    const { mainC, diagnostics } = emitProgram(graph, checker, { nativeAddons, dynamicRequires, runtimeCode });
    if (diagnostics.length > 0) {
        for (const d of diagnostics) process.stderr.write(d + "\n");
        return { exitCode: 3, buildDir, mainC: "" };
    }
    const mainPath = path.join(buildDir, "main.c");
    await fs.writeFile(mainPath, mainC, "utf8");
    if (opts.verbose) console.error(`[tsc2c] wrote ${mainPath}`);

    const runtimeSrc = path.join(pkg, "runtime");
    const runtimeSources = usesNodeEmbed
        ? [...RUNTIME_SOURCES, ...NODE_EMBED_RUNTIME_SOURCES]
        : RUNTIME_SOURCES;
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
    const nodeEmbed = usesNodeEmbed ? findNodeEmbedLinkOptions() : null;
    if (usesNodeEmbed && !nodeEmbed) {
        process.stderr.write(
            "tsc2c: embedded Node bridge requires link inputs; set TSC2C_LIBNODE to libnode.so/libnode.a and optionally TSC2C_NODE_INCLUDE to Node headers\n",
        );
        if (opts.buildDir === undefined) fsSync.rmSync(buildDir, { recursive: true, force: true });
        return { exitCode: 3, buildDir, mainC };
    }
    const baseLibs = opts.noGc
        ? ["m", "crypto", "icuuc", "icudata", "gmp"]
        : ["gc", "m", "crypto", "icuuc", "icudata", "gmp"];
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
            ...pcFlags.compileFlags,
        ],
        linkFlags: [
            ...pcFlags.linkFlags,
            ...(nodeEmbed
                ? [nodeEmbed.libnode, ...(nodeEmbed.rpath ? [`-Wl,-rpath,${nodeEmbed.rpath}`] : [])]
                : []),
        ],
        release: !!opts.release,
        verbose: !!opts.verbose,
    });
    if (cc.exitCode !== 0) {
        process.stderr.write(`tsc2c: gcc exited ${cc.exitCode}\n`);
        if (opts.buildDir === undefined) fsSync.rmSync(buildDir, { recursive: true, force: true });
        return { exitCode: cc.exitCode, buildDir, mainC };
    }
    if (opts.verbose) console.error(`[tsc2c] wrote ${opts.output}`);
    if (opts.buildDir === undefined) fsSync.rmSync(buildDir, { recursive: true, force: true });
    return { exitCode: 0, buildDir, mainC };
}

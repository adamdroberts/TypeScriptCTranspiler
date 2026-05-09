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
}

export interface CompileResult {
    exitCode: number;
    buildDir: string;
    mainC: string;
}

const RUNTIME_SOURCES = ["tsc_runtime.c"];
const RUNTIME_HEADERS = ["tsc_runtime.h"];
const execFileAsync = promisify(execFile);

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
    } catch {
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
): PermanentLimitDiagnostic[] {
    const diagnostics: PermanentLimitDiagnostic[] = [];
    for (const sf of program.getSourceFiles()) {
        if (sf.isDeclarationFile || sf.fileName === libCoreDts) continue;
        if (sf.fileName.includes("/node_modules/")) continue;
        const visit = (node: ts.Node): void => {
            if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
                const spec = node.moduleSpecifier;
                if (spec && ts.isStringLiteral(spec) && isNativeAddonSpecifier(spec.text)) {
                    diagnostics.push({
                        node: spec,
                        message:
                            "native C++ addon modules (*.node) cannot be AOT-compiled",
                    });
                } else if (spec && ts.isStringLiteral(spec)) {
                    const message = nativeAddonPackageMessage(spec.text, sf.fileName);
                    if (message) diagnostics.push({ node: spec, message });
                }
            } else if (ts.isCallExpression(node)) {
                const expr = node.expression;
                if (ts.isIdentifier(expr)) {
                    if (expr.text === "eval") {
                        diagnostics.push({
                            node,
                            message:
                                "runtime code compilation via eval() cannot be AOT-compiled",
                        });
                    } else if (expr.text === "Function") {
                        diagnostics.push({
                            node,
                            message:
                                "runtime code compilation via Function() cannot be AOT-compiled",
                        });
                    } else if (expr.text === "require") {
                        const spec = node.arguments[0];
                        const literalSpec = spec ? stringSpecifierText(spec) : null;
                        if (literalSpec && isNativeAddonSpecifier(literalSpec)) {
                            diagnostics.push({
                                node,
                                message:
                                    "native C++ addon modules (*.node) cannot be AOT-compiled",
                            });
                        } else if (literalSpec) {
                            const message = nativeAddonPackageMessage(literalSpec, sf.fileName);
                            if (message) diagnostics.push({ node, message });
                        } else if (!literalSpec) {
                            diagnostics.push({
                                node,
                                message:
                                    "dynamic require(variable) cannot be AOT-compiled; use a string-literal specifier",
                            });
                        }
                    }
                } else if (expr.kind === ts.SyntaxKind.ImportKeyword) {
                    const spec = node.arguments[0];
                    const literalSpec = spec ? stringSpecifierText(spec) : null;
                    if (literalSpec && isNativeAddonSpecifier(literalSpec)) {
                        diagnostics.push({
                            node,
                            message:
                                "native C++ addon modules (*.node) cannot be AOT-compiled",
                        });
                    } else if (literalSpec) {
                        const message = nativeAddonPackageMessage(literalSpec, sf.fileName);
                        if (message) diagnostics.push({ node, message });
                    }
                }
            } else if (
                ts.isNewExpression(node) &&
                ts.isIdentifier(node.expression) &&
                node.expression.text === "Function"
            ) {
                diagnostics.push({
                    node,
                    message:
                        "runtime code compilation via new Function() cannot be AOT-compiled",
                });
            }
            ts.forEachChild(node, visit);
        };
        visit(sf);
    }
    return diagnostics;
}

function isStringSpecifier(
    expr: ts.Expression,
): expr is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral {
    return ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr);
}

function stringSpecifierText(expr: ts.Expression): string | null {
    return isStringSpecifier(expr) ? expr.text : null;
}

function isNativeAddonSpecifier(spec: string): boolean {
    return spec.endsWith(".node");
}

function nativeAddonPackageMessage(
    spec: string,
    containingFile: string,
): string | null {
    if (spec.startsWith(".") || spec.startsWith("/") || spec.startsWith("node:")) {
        return null;
    }
    const packageName = packageNameFromSpecifier(spec);
    if (!packageName) return null;
    const packageRoot = findNodeModulePackage(packageName, path.dirname(containingFile));
    if (!packageRoot) return null;
    if (!packageContainsNativeAddon(packageRoot)) return null;
    return `native C++ addon package '${packageName}' contains or resolves to a .node binary and cannot be AOT-compiled; use a pure-JS alternative`;
}

function packageNameFromSpecifier(spec: string): string | null {
    const parts = spec.split("/");
    if (spec.startsWith("@")) {
        if (parts.length < 2 || !parts[0] || !parts[1]) return null;
        return `${parts[0]}/${parts[1]}`;
    }
    return parts[0] || null;
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
            bin?: unknown;
        };
        return [pkg.main, pkg.module, pkg.exports, pkg.bin].some(
            containsNativeAddonReference,
        );
    } catch {
        return false;
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

    const { program, checker, entrySourceFile, libCoreDts } = buildProgram({
        entry: opts.entry,
        packageRoot: pkg,
    });
    const permanent = permanentLimitDiagnostics(program, libCoreDts);
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

    const graph = buildModuleGraph(program, libCoreDts, entrySourceFile.fileName);
    if (opts.verbose) {
        console.error(
            `[tsc2c] modules: ${[...graph.modules.keys()].join(", ")}`,
        );
        console.error(`[tsc2c] topo: ${graph.topoOrder.join(" -> ")}`);
    }

    const { mainC, diagnostics } = emitProgram(graph, checker);
    if (diagnostics.length > 0) {
        for (const d of diagnostics) process.stderr.write(d + "\n");
        return { exitCode: 3, buildDir, mainC: "" };
    }
    const mainPath = path.join(buildDir, "main.c");
    await fs.writeFile(mainPath, mainC, "utf8");
    if (opts.verbose) console.error(`[tsc2c] wrote ${mainPath}`);

    const runtimeSrc = path.join(pkg, "runtime");
    for (const f of RUNTIME_SOURCES) {
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
    const baseLibs = opts.noGc
        ? ["m", "crypto", "icuuc", "icudata", "gmp"]
        : ["gc", "m", "crypto", "icuuc", "icudata", "gmp"];
    const libs = pcFlags.useDefaultLib ? [...baseLibs, "pcre2-8"] : baseLibs;
    const cc = await invokeCc({
        sources: [mainPath, ...RUNTIME_SOURCES.map((f) => path.join(buildDir, f))],
        output: opts.output,
        includeDirs: [buildDir],
        libs,
        extraFlags: opts.noGc ? ["-DTSC_NO_GC", ...pcFlags.compileFlags] : pcFlags.compileFlags,
        linkFlags: pcFlags.linkFlags,
        release: !!opts.release,
        verbose: !!opts.verbose,
    });
    if (cc.exitCode !== 0) {
        process.stderr.write(`tsc2c: gcc exited ${cc.exitCode}\n`);
        return { exitCode: cc.exitCode, buildDir, mainC };
    }
    if (opts.verbose) console.error(`[tsc2c] wrote ${opts.output}`);
    return { exitCode: 0, buildDir, mainC };
}

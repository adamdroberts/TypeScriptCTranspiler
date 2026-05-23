import * as fs from "node:fs";
import * as path from "node:path";
import ts from "typescript";

const COMMONJS_CONDITIONS = new Set(["node-addons", "require", "node", "default"]);
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

export function resolveCommonJsRequireModuleName(
    spec: string,
    containingFile: string,
    compilerOptions: ts.CompilerOptions,
): string | null {
    const packageResolved = resolvePackageTarget(spec, containingFile);
    if (packageResolved) return packageResolved;
    return ts.resolveModuleName(spec, containingFile, compilerOptions, ts.sys).resolvedModule?.resolvedFileName ?? null;
}

function resolvePackageTarget(spec: string, containingFile: string): string | null {
    if (spec.startsWith("#")) {
        return resolvePackageImportsTarget(spec, containingFile);
    }
    if (spec.startsWith(".") || spec.startsWith("/") || spec.startsWith("node:")) {
        return null;
    }

    const parsed = packageSpecifierParts(spec);
    if (!parsed) return null;
    const packageRoot = findNodeModulePackage(parsed.packageName, path.dirname(containingFile));
    if (!packageRoot) return null;
    const pkg = readPackageJson(packageRoot);
    if (!pkg) return null;

    if (pkg.exports !== undefined) {
        const target = resolveExportsMap(packageRoot, pkg.exports, parsed.subpath);
        if (target) return target;
    }
    return null;
}

function resolvePackageImportsTarget(spec: string, containingFile: string): string | null {
    const packageRoot = findNearestPackageRoot(path.dirname(containingFile));
    if (!packageRoot) return null;
    const pkg = readPackageJson(packageRoot);
    const imports = pkg?.imports;
    if (!imports || typeof imports !== "object" || Array.isArray(imports)) return null;
    const target = lookupSubpathTarget(imports as Record<string, unknown>, spec);
    return target ? resolveConditionalPackageTarget(packageRoot, target) : null;
}

function resolveExportsMap(packageRoot: string, exportsField: unknown, subpath: string): string | null {
    if (
        subpath === "." &&
        (typeof exportsField === "string" ||
            Array.isArray(exportsField) ||
            isConditionMap(exportsField))
    ) {
        return resolveConditionalPackageTarget(packageRoot, exportsField);
    }
    if (!exportsField || typeof exportsField !== "object" || Array.isArray(exportsField)) return null;
    const target = lookupSubpathTarget(exportsField as Record<string, unknown>, subpath);
    return target ? resolveConditionalPackageTarget(packageRoot, target) : null;
}

function lookupSubpathTarget(map: Record<string, unknown>, subpath: string): unknown {
    if (Object.prototype.hasOwnProperty.call(map, subpath)) return map[subpath];
    let best: { prefix: string; suffix: string; target: unknown } | null = null;
    for (const [key, target] of Object.entries(map)) {
        const star = key.indexOf("*");
        if (star < 0) continue;
        const prefix = key.slice(0, star);
        const suffix = key.slice(star + 1);
        if (!subpath.startsWith(prefix) || !subpath.endsWith(suffix)) continue;
        if (!best || prefix.length > best.prefix.length) best = { prefix, suffix, target };
    }
    if (!best) return undefined;
    const matched = subpath.slice(best.prefix.length, subpath.length - best.suffix.length);
    return substitutePatternTarget(best.target, matched);
}

function substitutePatternTarget(target: unknown, matched: string): unknown {
    if (typeof target === "string") return target.replaceAll("*", matched);
    if (Array.isArray(target)) return target.map((item) => substitutePatternTarget(item, matched));
    if (target && typeof target === "object") {
        const out: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(target)) {
            out[key] = substitutePatternTarget(value, matched);
        }
        return out;
    }
    return target;
}

function resolveConditionalPackageTarget(packageRoot: string, target: unknown): string | null {
    if (typeof target === "string") return resolvePackageTargetString(packageRoot, target);
    if (Array.isArray(target)) {
        for (const entry of target) {
            const resolved = resolveConditionalPackageTarget(packageRoot, entry);
            if (resolved) return resolved;
        }
        return null;
    }
    if (!target || typeof target !== "object") return null;
    for (const [condition, value] of Object.entries(target)) {
        if (!COMMONJS_CONDITIONS.has(condition)) continue;
        const resolved = resolveConditionalPackageTarget(packageRoot, value);
        if (resolved) return resolved;
    }
    return null;
}

function resolvePackageTargetString(packageRoot: string, target: string): string | null {
    if (!target.startsWith("./")) return null;
    return resolveSourceFile(path.resolve(packageRoot, target));
}

function resolveSourceFile(basePath: string): string | null {
    const candidates = [basePath];
    if (!SOURCE_EXTENSIONS.some((ext) => basePath.endsWith(ext))) {
        for (const ext of SOURCE_EXTENSIONS) candidates.push(basePath + ext);
        for (const ext of SOURCE_EXTENSIONS) candidates.push(path.join(basePath, "index" + ext));
    }
    for (const candidate of candidates) {
        try {
            if (fs.statSync(candidate).isFile() && SOURCE_EXTENSIONS.some((ext) => candidate.endsWith(ext))) {
                return candidate;
            }
        } catch {
            // try next candidate
        }
    }
    return null;
}

function isConditionMap(value: unknown): boolean {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    return Object.keys(value).every((key) => !key.startsWith("."));
}

function packageSpecifierParts(spec: string): { packageName: string; subpath: string } | null {
    const parts = spec.split("/");
    if (spec.startsWith("@")) {
        if (parts.length < 2 || !parts[0] || !parts[1]) return null;
        const packageName = `${parts[0]}/${parts[1]}`;
        const rest = parts.slice(2).join("/");
        return { packageName, subpath: rest ? `./${rest}` : "." };
    }
    if (!parts[0]) return null;
    const rest = parts.slice(1).join("/");
    return { packageName: parts[0], subpath: rest ? `./${rest}` : "." };
}

function findNodeModulePackage(packageName: string, fromDir: string): string | null {
    let dir = path.resolve(fromDir);
    while (true) {
        const candidate = path.join(dir, "node_modules", packageName);
        try {
            if (fs.statSync(candidate).isDirectory()) return candidate;
        } catch {
            // try parent
        }
        const parent = path.dirname(dir);
        if (parent === dir) return null;
        dir = parent;
    }
}

function findNearestPackageRoot(fromDir: string): string | null {
    let dir = path.resolve(fromDir);
    while (true) {
        try {
            if (fs.statSync(path.join(dir, "package.json")).isFile()) return dir;
        } catch {
            // try parent
        }
        const parent = path.dirname(dir);
        if (parent === dir) return null;
        dir = parent;
    }
}

function readPackageJson(packageRoot: string): { exports?: unknown; imports?: unknown } | null {
    try {
        return JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8")) as {
            exports?: unknown;
            imports?: unknown;
        };
    } catch {
        return null;
    }
}
